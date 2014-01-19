using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Breeze.Core;
using Breeze.NetClient;

namespace Breeze.NetClient {
  public class MetadataStore {
    public MetadataStore() {
      NamingConvention = NamingConvention.Default;
      ClrEntityTypes = new HashSet<Type>();
      _dataServiceMap = new Dictionary<String, string>();
    }

    public IEnumerable<EntityType> EntityTypes {
      get { return _structuralTypes.OfType<EntityType>(); }
    }
    public HashSet<Type> ClrEntityTypes {
      get;
      set;
    }


    public IEnumerable<ComplexType> ComplexTypes {
      get { return _structuralTypes.OfType<ComplexType>(); }
    }

    public NamingConvention NamingConvention { get; set; }

    private readonly AsyncSemaphore _asyncSemaphore = new AsyncSemaphore(1);

    public async Task<String> FetchMetadata(DataService dataService) {

      var serviceName = dataService.ServiceName;
      if (_dataServiceMap.ContainsKey(serviceName)) {
        return _dataServiceMap[serviceName];
      }

      await _asyncSemaphore.WaitAsync();
      try {
        if (_dataServiceMap.ContainsKey(serviceName)) {
          return _dataServiceMap[serviceName];
        }
      
        var metadata = await dataService.GetAsync("Metadata");

        _dataServiceMap[serviceName] = metadata;
        var metadataProcessor = new CsdlMetadataProcessor(this, metadata);

        return metadata;

      } finally {
        _asyncSemaphore.Release(); 
      }


    }


    public EntityType GetEntityType(String typeName, bool okIfNotFound = false) {
      return GetStructuralType<EntityType>(typeName, okIfNotFound);
    }

    public ComplexType GetComplexType(String typeName, bool okIfNotFound = false) {
      return GetStructuralType<ComplexType>(typeName, okIfNotFound);
    }



    public EntityType AddEntityType(EntityType entityType) {

      if (entityType.KeyProperties.Count() == 0 && !entityType.IsAbstract) {
        throw new Exception("Unable to add " + entityType.Name +
            " to this MetadataStore.  An EntityType must have at least one property designated as a key property - See the 'DataProperty.isPartOfKey' property.");
      }

      AddStructuralType(entityType);

      return entityType;
    }

    public ComplexType AddComplexType(ComplexType complexType) {
      AddStructuralType(complexType);
      return complexType;
    }

    public String GetEntityTypeNameForResourceName(String resourceName) {
      String entityTypeName;
      _resourceNameEntityTypeMap.TryGetValue(resourceName, out entityTypeName);
      return entityTypeName;
    }

    public void SetEntityTypeForResourceName(String resourceName, String entityTypeName) {
      _resourceNameEntityTypeMap[resourceName] = entityTypeName;
    }

    public String GetResourceNameForEntityTypeName(String entityTypeName) {
      String resourceName = null;
      _entityTypeResourceNameMap.TryGetValue(entityTypeName, out resourceName);
      return resourceName;
    }

    public static String ANONTYPE_PREFIX = "_IB_";

    // Private and Internal --------------

    private T GetStructuralType<T>(String typeName, bool okIfNotFound = false) where T : class {
      if (_structuralTypes.Contains(typeName)) {
        var t = _structuralTypes[typeName];
        var result = t as T;
        if (result == null) {
          throw new Exception("A type by this name exists but is not a " + typeof(T).Name);
        }
        return result;
      } else if (okIfNotFound) {
        return (T)null;
      } else {
        throw new Exception("Unable to locate Type: " + typeName);
      }
    }

    private void AddStructuralType(StructuralType structuralType) {
      structuralType.MetadataStore = this;
      //// don't register anon types
      if (!structuralType.IsAnonymous) {
        if (_structuralTypes.Contains(structuralType.Name)) {
          throw new Exception("Type " + structuralType.Name + " already exists in this MetadataStore.");
        }

        _structuralTypes.Add(structuralType);
        _shortNameMap[structuralType.ShortName] = structuralType.Name;
      }

      structuralType.Properties.ForEach(prop => {
        structuralType.UpdateClientServerNames(this.NamingConvention, prop);
      });

      UpdateComplexProperties(structuralType);

      var entityType = structuralType as EntityType;
      if (entityType != null) {

        UpdateNavigationProperties(entityType);
        // give the type it's base's resource name if it doesn't have its own.

        var defResourceName = entityType.DefaultResourceName;
        if (String.IsNullOrEmpty(defResourceName) && entityType.BaseEntityType != null) {
          defResourceName = entityType.BaseEntityType.DefaultResourceName;
        }
        entityType.DefaultResourceName = defResourceName;

        if (defResourceName != null && GetEntityTypeNameForResourceName(defResourceName) == null) {
          SetEntityTypeForResourceName(defResourceName, entityType.Name);
        }

        // check if this structural type's name, short version or qualified version has a registered ctor.
        //  structuralType.getEntityCtor();
        if (entityType.BaseEntityType != null) {
          entityType.BaseEntityType._subtypes.Add(entityType);
        }
      }

    }

    internal void UpdateNavigationProperties(EntityType entityType) {
      entityType.NavigationProperties.ForEach(np => {
        if (np.EntityType != null) return;
        if (!ResolveNp(np)) {
          AddIncompleteNavigationProperty(np.EntityTypeName, np);
        }
      });

      GetIncompleteNavigationProperties(entityType.Name).ForEach(np => ResolveNp(np));
      _incompleteTypeMap.Remove(entityType.Name);
    }

    private bool ResolveNp(NavigationProperty np) {
      var entityType = GetEntityType(np.EntityTypeName, true);
      if (entityType == null) return false;
      np.EntityType = entityType;
      var invNp = entityType.NavigationProperties.FirstOrDefault(altNp => {
        // Can't do this because of possibility of comparing a base class np with a subclass altNp.
        //return altNp.associationName === np.associationName
        //    && altNp !== np;
        // So use this instead.
        return altNp.AssociationName == np.AssociationName &&
            (altNp.Name != np.Name || altNp.EntityTypeName != np.EntityTypeName);
      });
      np.Inverse = invNp;
      if (invNp == null) {
        // unidirectional 1-n relationship
        np.InvForeignKeyNames.ForEach(invFkName => {
          var fkProp = entityType.GetDataProperty(invFkName);
          var invEntityType = (EntityType)np.ParentType;
          fkProp.InverseNavigationProperty = invEntityType.NavigationProperties.FirstOrDefault(np2 => {
            return np2.InvForeignKeyNames != null && np2.InvForeignKeyNames.IndexOf(fkProp.Name) >= 0 && np2.EntityType == fkProp.ParentType;
          });

          entityType._foreignKeyProperties.Add(fkProp);
        });
      }

      ResolveRelated(np);
      return true;
    }

    // sets navigation property: relatedDataProperties and dataProperty: relatedNavigationProperty
    private void ResolveRelated(NavigationProperty np) {

      var fkNames = np.ForeignKeyNames;
      if (fkNames.Count == 0) return;

      var parentEntityType = (EntityType)np.ParentType;
      var fkProps = fkNames.Select(fkName => parentEntityType.GetDataProperty(fkName));

      var fkPropCollection = parentEntityType._foreignKeyProperties;
      // Array.prototype.push.apply(parentEntityType.foreignKeyProperties, fkProps);

      fkProps.ForEach(dp => {
        fkPropCollection.Add(dp);
        dp.RelatedNavigationProperty = np;
        np._relatedDataProperties.Add(dp);
      });
    }

    internal void UpdateComplexProperties(StructuralType structuralType) {

      structuralType.ComplexProperties.ForEach(cp => {
        if (cp.ComplexType != null) return;
        if (!ResolveCp(cp)) {
          AddIncompleteComplexProperty(cp.ComplexTypeName, cp);
        }
      });

      if (!structuralType.IsEntityType) {
        var incompleteProps = GetIncompleteComplexProperties(structuralType.Name);
        incompleteProps.ForEach(cp => ResolveCp(cp));
      }
    }

    private bool ResolveCp(DataProperty cp) {
      var complexType = GetComplexType(cp.ComplexTypeName, true);
      if (complexType == null) return false;
      cp.DataType = null;
      cp.ComplexType = complexType;
      cp.DefaultValue = null;
      return true;
    }

    private IEnumerable<NavigationProperty> GetIncompleteNavigationProperties(String entityTypeName) {
      List<NavigationProperty> results;
      if (_incompleteTypeMap.TryGetValue(entityTypeName, out results)) {
        return results;
      } else {
        return Enumerable.Empty<NavigationProperty>();
      }
    }


    private IEnumerable<DataProperty> GetIncompleteComplexProperties(String structuralTypeName) {
      // destructive get routine - deliberately
      List<DataProperty> results;
      if (_incompleteComplexTypeMap.TryGetValue(structuralTypeName, out results)) {
        _incompleteComplexTypeMap.Remove(structuralTypeName);
        return results;
      } else {
        return Enumerable.Empty<DataProperty>();
      }
    }

    private void AddIncompleteNavigationProperty(String entityTypeName, NavigationProperty np) {
      List<NavigationProperty> results;
      if (_incompleteTypeMap.TryGetValue(entityTypeName, out results)) {
        results.Add(np);
      } else {
        _incompleteTypeMap.Add(entityTypeName, new List<NavigationProperty> { np });
      }
    }

    private void AddIncompleteComplexProperty(String structuralTypeName, DataProperty dp) {
      List<DataProperty> results;
      if (_incompleteComplexTypeMap.TryGetValue(structuralTypeName, out results)) {
        results.Add(dp);
      } else {
        _incompleteComplexTypeMap.Add(structuralTypeName, new List<DataProperty> { dp });
      }
    }

    private StructuralTypeCollection _structuralTypes = new StructuralTypeCollection();
    private Dictionary<String, String> _shortNameMap = new Dictionary<string, string>();
    private Dictionary<String, String> _entityTypeResourceNameMap = new Dictionary<string, string>();
    private Dictionary<String, String> _resourceNameEntityTypeMap = new Dictionary<string, string>();
    private Dictionary<String, List<NavigationProperty>> _incompleteTypeMap = new Dictionary<string, List<NavigationProperty>>(); // key is typeName
    private Dictionary<String, List<DataProperty>> _incompleteComplexTypeMap = new Dictionary<string, List<DataProperty>>();   // key is typeName
    private Dictionary<String, String> _dataServiceMap;

  }







}
