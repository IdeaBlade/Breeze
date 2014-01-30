using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;

namespace Breeze.NetClient {

  // This class is ThreadSafe
  // and every object returned by it is immutable after being associated with this class.

  public class MetadataStore {

    #region Ctor related 

    internal MetadataStore() { }
     // Explicit static constructor to tell C# compiler
    // not to mark type as beforefieldinit
    static MetadataStore() {     }

    public static MetadataStore Instance {
      get {
        return _instance;
      }
    }

    private static readonly MetadataStore _instance = new MetadataStore();

    #endregion

    public List<EntityType> EntityTypes {
      get {
        lock (_structuralTypes) {
          return _structuralTypes.OfType<EntityType>().ToList();
        }
      }
    }

    public List<ComplexType> ComplexTypes {
      get {
        lock (_structuralTypes) {
          return _structuralTypes.OfType<ComplexType>().ToList();
        }
      }
    }

    public NamingConvention NamingConvention {
      get { 
        lock( _lock) {
          return _namingConvention;
        }
      }
      set {
        lock (_lock) {
          _namingConvention = value;
        }
      } 
    }

    public async Task<String> FetchMetadata(DataService dataService) {
      String serviceName;

      serviceName = dataService.ServiceName;
      var metadata = GetDataService(serviceName);
      if (metadata != null) return metadata;
        

      await _asyncSemaphore.WaitAsync();

      try {
        metadata = GetDataService(serviceName);
        if (metadata != null) return metadata;

        metadata = await dataService.GetAsync("Metadata");

        lock (_dataServiceMap) {
          _dataServiceMap[serviceName] = metadata;
        }
        var metadataProcessor = new CsdlMetadataProcessor(this, metadata);

        return metadata;

      } finally {
        _asyncSemaphore.Release();
      }


    }

    public EntityType GetEntityType(Type clrEntityType, bool okIfNotFound = false) {
      return GetStructuralType<EntityType>(clrEntityType, okIfNotFound);
    }

    public EntityType GetEntityType(String etName, bool okIfNotFound = false) {
      return GetStructuralType<EntityType>(etName, okIfNotFound);
    }

    public ComplexType GetComplexType(Type clrComplexType, bool okIfNotFound = false) {
      return GetStructuralType<ComplexType>(clrComplexType, okIfNotFound);
    }

    public ComplexType GetComplexType(String ctName, bool okIfNotFound = false) {
      return GetStructuralType<ComplexType>(ctName, okIfNotFound);
    }

    public StructuralType GetStructuralType(Type clrType, bool okIfNotFound = false) {
      lock (_structuralTypes) {
        if (IsStructuralType(clrType)) {
          var stType = _clrTypeMap.GetStructuralType(clrType);
          if (stType != null) return stType;

          // Not sure if this is needed.
          //if (ProbeAssemblies(new Assembly[] { clrType.GetTypeInfo().Assembly })) {
          //  stType = _clrTypeMap.GetStructuralType(clrType);
          //  if (stType != null) return stType;
          //}
        }

        if (okIfNotFound) return null;
        throw new Exception("Unable to find a matching EntityType or ComplexType for " + clrType.Name);
      }
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
      lock (_resourceNameEntityTypeMap) {
        String entityTypeName;
        _resourceNameEntityTypeMap.TryGetValue(resourceName, out entityTypeName);
        return entityTypeName;
      }
    }

    public void SetEntityTypeForResourceName(String resourceName, String entityTypeName) {
      lock (_resourceNameEntityTypeMap) {
        _resourceNameEntityTypeMap[resourceName] = entityTypeName;
        // TODO: complete next line
        // _entityTypeResourceNameMap[???] = resourceName;
      }
    }

    public String GetResourceNameForEntityTypeName(String entityTypeName) {
      lock (_resourceNameEntityTypeMap) {
        String resourceName = null;
        _entityTypeResourceNameMap.TryGetValue(entityTypeName, out resourceName);
        return resourceName;
      }
    }

    public static bool IsStructuralType(Type clrType) {
      return typeof(IStructuralObject).IsAssignableFrom(clrType);
    }

    public static String ANONTYPE_PREFIX = "_IB_";

    // Private and Internal --------------

    internal Type GetClrTypeFor(StructuralType stType) {
      lock (_structuralTypes) {
        return _clrTypeMap.GetClrType(stType);
      }
    }

    // T is either <ComplexType> or <EntityType>
    private T GetStructuralType<T>(Type clrType, bool okIfNotFound = false) where T : class {
      var stype = GetStructuralType(clrType, okIfNotFound);
      var ttype = stype as T;
      if (ttype != null) {
        return ttype;
      } else {
        if (okIfNotFound) return null;
        throw new Exception("Unable to find a matching " + typeof(T).Name + " for " + clrType.Name);
      }
    }

    // T is either <ComplexType> or <EntityType>
    private T GetStructuralType<T>(String typeName, bool okIfNotFound = false) where T : class {
      lock (_structuralTypes) {
        var t = _structuralTypes[typeName];
        if (t != null) {
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
    }

    private String GetDataService(String serviceName) {
      lock (_dataServiceMap) {
        if (_dataServiceMap.ContainsKey(serviceName)) {
          return _dataServiceMap[serviceName];
        } else {
          return null;
        }
      }
    }

    private void AddStructuralType(StructuralType stType) {
      lock (_structuralTypes) {
        stType.MetadataStore = this;
        _clrTypeMap.GetClrType(stType);
        //// don't register anon types
        if (!stType.IsAnonymous) {
          if (_structuralTypes.ContainsKey(stType.Name)) {
            throw new Exception("Type " + stType.Name + " already exists in this MetadataStore.");
          }

          _structuralTypes.Add(stType);
          _shortNameMap[stType.ShortName] = stType.Name;
        }

        stType.Properties.ForEach(prop => stType.UpdateClientServerFkNames(prop));

        UpdateComplexProperties(stType);

        var entityType = stType as EntityType;
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
            entityType.BaseEntityType.AddSubEntityType(entityType);
          }
        }
      }
    }

    //private bool MatchType(Type clrType, StructuralType stType) {
    //  return (clrType.Name == stType.ShortName && clrType.Namespace == stType.Namespace);
    //}

    private void UpdateNavigationProperties(EntityType entityType) {
      entityType.NavigationProperties.ForEach(np => {
        if (np.EntityType != null) return;
        if (!ResolveNp(np)) {
          AddIncompleteNavigationProperty(np.EntityTypeName, np);
        }
      });

      GetIncompleteNavigationProperties(entityType).ForEach(np => ResolveNp(np));
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
        np.InvForeignKeyProperties.ForEach(invFkProp => {
          
          invFkProp.IsForeignKey = true;
          var invEntityType = (EntityType)np.ParentType;
          
          invFkProp.InverseNavigationProperty = invEntityType.NavigationProperties.FirstOrDefault(np2 => {
            return np2.InvForeignKeyNames.IndexOf(invFkProp.Name) >= 0 && np2.EntityType == invFkProp.ParentType;
          });


        });
      }

      ResolveRelated(np);
      return true;
    }

    // sets navigation property: relatedDataProperties and dataProperty: relatedNavigationProperty
    private void ResolveRelated(NavigationProperty np) {

      var fkProps = np.ForeignKeyProperties;

      fkProps.ForEach(dp => {
        dp.RelatedNavigationProperty = np;
        dp.IsForeignKey = true;
        np._relatedDataProperties.Add(dp);
      });
    }

    private void UpdateComplexProperties(StructuralType structuralType) {

      structuralType.ComplexProperties.ForEach(cp => {
        if (cp.ComplexType != null) return;
          cp.DataType = null;
          cp.DefaultValue = null;
          var complexType = GetComplexType(cp.ComplexTypeName, true);
          if (complexType == null) {
            AddIncompleteComplexProperty(cp.ComplexTypeName, cp);
          } else {
            cp.ComplexType = complexType;
        }
      });

      if (!structuralType.IsEntityType) {
        var incompleteProps = GetIncompleteComplexProperties(structuralType.Name);
        incompleteProps.ForEach(cp => cp.ComplexType = GetComplexType(cp.ComplexTypeName));
      }
    }

    private IEnumerable<NavigationProperty> GetIncompleteNavigationProperties(EntityType entityType) {
      List<NavigationProperty> results;
      if (_incompleteTypeMap.TryGetValue(entityType.Name, out results)) {
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



    // inner class
    internal class ClrTypeMap {
      public ClrTypeMap() { }

      public StructuralType GetStructuralType(Type clrType) {
        var stName = StructuralType.ClrTypeToStructuralTypeName(clrType);
        TypePair tp;
        if (_map.TryGetValue(stName, out tp)) {
          var stType = tp.StructuralType;
          if (tp.ClrType == null) {
            tp.ClrType = clrType;
            ProbeAssemblies(new Assembly[] { clrType.GetTypeInfo().Assembly });
          }
          return stType;
        } else {
          _map.Add(stName, new TypePair() { ClrType = clrType });
          return null;
        }
      }

      public Type GetClrType(StructuralType stType) {
        TypePair tp;
        if (_map.TryGetValue(stType.Name, out tp)) {
          stType.ClrType = tp.ClrType;
          return tp.ClrType;
        } else {
          _map.Add(stType.Name, new TypePair() { StructuralType = stType });
          return null;
        }
      }

      private bool ProbeAssemblies(IEnumerable<Assembly> assembliesToProbe) {
        // ToList is important on next line
        var assemblies = assembliesToProbe.Except(_probedAssemblies).ToList();
        if (assemblies.Any()) {
          assemblies.ForEach(a => _probedAssemblies.Add(a));
          TypeFns.GetTypesImplementing(typeof(IEntity), assemblies).ForEach(t => GetStructuralType(t));
          TypeFns.GetTypesImplementing(typeof(IComplexObject), assemblies).ForEach(t => GetStructuralType(t));
          return true;
        } else {
          return false;
        }
      }

      private Dictionary<String, TypePair> _map = new Dictionary<String, TypePair>();
      private HashSet<Assembly> _probedAssemblies = new HashSet<Assembly>();
      private class TypePair {
        public Type ClrType;
        public StructuralType StructuralType;
      }
    }


    private readonly AsyncSemaphore _asyncSemaphore = new AsyncSemaphore(1);
    private Object _lock = new Object();

    // lock using _dataServiceMap
    private Dictionary<String, String> _dataServiceMap = new Dictionary<String, string>();
    private NamingConvention _namingConvention = NamingConvention.Default;
    // locked using _structuralTypes
    private ClrTypeMap _clrTypeMap = new ClrTypeMap();
    private StructuralTypeCollection _structuralTypes = new StructuralTypeCollection();
    private Dictionary<String, String> _shortNameMap = new Dictionary<string, string>();
    private Dictionary<String, List<NavigationProperty>> _incompleteTypeMap = new Dictionary<String, List<NavigationProperty>>(); // key is typeName
    private Dictionary<String, List<DataProperty>> _incompleteComplexTypeMap = new Dictionary<String, List<DataProperty>>();   // key is typeName

    // locked using _resourceNameEntityTypeMap
    private Dictionary<String, String> _entityTypeResourceNameMap = new Dictionary<string, string>();
    private Dictionary<String, String> _resourceNameEntityTypeMap = new Dictionary<string, string>();





  }







}
