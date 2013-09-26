using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Configuration;
using System.Data;
using System.Data.Common;
using System.Data.Entity;
using System.Data.Entity.Infrastructure;
using System.Data.Entity.Validation;
using System.Data.EntityClient;
using System.Data.Metadata.Edm;
using System.Data.Objects;
using System.Data.Objects.DataClasses;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Xml;
using System.Xml.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;

using Breeze.WebApi;

namespace Breeze.WebApi.EF {

  public interface IEFContextProvider {
    ObjectContext ObjectContext { get; }
    String GetEntitySetName(Type entityType);
  }

  // T is either a subclass of DbContext or a subclass of ObjectContext
  public class EFContextProvider<T> : ContextProvider, IEFContextProvider where T : class, new() {

    public EFContextProvider() {

    }

    [Obsolete("The contextName is no longer needed. This overload will be removed after Dec 31st 2012.")]
    public EFContextProvider(string contextName) {

    }

    public T Context {
      get {
        if (_context == null) {
          _context = CreateContext();
          // Disable lazy loading and proxy creation as this messes up the data service.
          if (typeof(ObjectContext).IsAssignableFrom(typeof(T))) {
            var objCtx = (ObjectContext)(Object)_context;
            objCtx.ContextOptions.LazyLoadingEnabled = false;
          } else {
            var dbCtx = (DbContext)(Object)_context;
            dbCtx.Configuration.ProxyCreationEnabled = false;
            dbCtx.Configuration.LazyLoadingEnabled = false;
          }
        }
        return _context;
      }
    }

    protected virtual T CreateContext() {
      return new T();
    }

    public ObjectContext ObjectContext {
      get {
        if (Context is DbContext) {
          return ((IObjectContextAdapter)Context).ObjectContext;
        } else {
          return (ObjectContext)(Object)Context;
        }
      }
    }

    /// <summary>Gets the EntityConnection from the ObjectContext.</summary>
    public DbConnection EntityConnection {
      get {
        return (DbConnection)GetDbConnection();
      }
    }

    /// <summary>Gets the StoreConnection from the ObjectContext.</summary>
    public DbConnection StoreConnection {
      get {
        return ((EntityConnection)GetDbConnection()).StoreConnection;
      }
    }

    /// <summary>Gets the current transaction, if one is in progress.</summary>
    public EntityTransaction EntityTransaction {
      get; private set;
    }


    /// <summary>Gets the EntityConnection from the ObjectContext.</summary>
    public override IDbConnection GetDbConnection() {
      return ObjectContext.Connection;
    }

    /// <summary>
    /// Opens the DbConnection used by the Context.
    /// If the connection will be used outside of the DbContext, this method should be called prior to DbContext 
    /// initialization, so that the connection will already be open when the DbContext uses it.  This keeps
    /// the DbContext from closing the connection, so it must be closed manually.
    /// See http://blogs.msdn.com/b/diego/archive/2012/01/26/exception-from-dbcontext-api-entityconnection-can-only-be-constructed-with-a-closed-dbconnection.aspx
    /// </summary>
    /// <returns></returns>
    protected override void OpenDbConnection() {
      var ec = ObjectContext.Connection as EntityConnection;
      if (ec.State == ConnectionState.Closed) ec.Open();
    }

    protected override void CloseDbConnection() {
      if (_context != null) {
        var ec = ObjectContext.Connection as EntityConnection;
        ec.Close();
        ec.Dispose();
      }
    }

    // Override BeginTransaction so we can keep the current transaction in a property
    protected override IDbTransaction BeginTransaction(System.Data.IsolationLevel isolationLevel) {
      var conn = GetDbConnection();
      if (conn == null) return null;
      EntityTransaction = (EntityTransaction) conn.BeginTransaction(isolationLevel);
      return EntityTransaction;
    }


    #region Base implementation overrides

    protected override string BuildJsonMetadata() {
      var json = GetMetadataFromContext(Context);
      var altMetadata = BuildAltJsonMetadata();
      if (altMetadata != null) {
        json = "{ \"altMetadata\": " + altMetadata + "," + json.Substring(1);
      }
      return json;
    }

    protected virtual string BuildAltJsonMetadata() {
      // default implementation
      return null; // "{ \"foo\": 8, \"bar\": \"xxx\" }";
    }

    protected override EntityInfo CreateEntityInfo() {
      return new EFEntityInfo();
    }

    public override object[] GetKeyValues(EntityInfo entityInfo) {
      return GetKeyValues(entityInfo.Entity);
    }

    public object[] GetKeyValues(object entity) {
      string esName;
      try {
        esName = GetEntitySetName(entity.GetType());
      } catch (Exception ex) {
        throw new ArgumentException("EntitySet not found for type " + entity.GetType(), ex);
      }
      var key = ObjectContext.CreateEntityKey(esName, entity);
      var keyValues = key.EntityKeyValues.Select(km => km.Value).ToArray();
      return keyValues;
    }

    protected override void SaveChangesCore(SaveWorkState saveWorkState) {
      var saveMap = saveWorkState.SaveMap;
      var deletedEntities = ProcessSaves(saveMap);

      if (deletedEntities.Any()) {
        ProcessAllDeleted(deletedEntities);
      }
      ProcessAutogeneratedKeys(saveWorkState.EntitiesWithAutoGeneratedKeys);

      int count;
      try {
        if (Context is DbContext) {
          count = ((DbContext)(object)Context).SaveChanges();
        } else {
          count = ObjectContext.SaveChanges(System.Data.Objects.SaveOptions.AcceptAllChangesAfterSave);
        }
      } catch (DbEntityValidationException e) {
        var entityErrors = new List<EntityError>();
        foreach (var eve in e.EntityValidationErrors) {
          var entity = eve.Entry.Entity;
          var entityTypeName = entity.GetType().FullName;
          Object[] keyValues;
          var key = ObjectContext.ObjectStateManager.GetObjectStateEntry(entity).EntityKey;
          if (key.EntityKeyValues != null) {
            keyValues = key.EntityKeyValues.Select(km => km.Value).ToArray();
          } else {
            var entityInfo = saveWorkState.EntitiesWithAutoGeneratedKeys.FirstOrDefault(ei => ei.Entity == entity);
            if (entityInfo != null) {
              keyValues = new Object[] { entityInfo.AutoGeneratedKey.TempValue };
            } else {
              // how can this happen?
              keyValues = null;
            }
          }
          foreach (var ve in eve.ValidationErrors) {
            var entityError = new EntityError() {
              EntityTypeName = entityTypeName,
              KeyValues = keyValues,
              ErrorMessage = ve.ErrorMessage,
              PropertyName = ve.PropertyName
            };
            entityErrors.Add(entityError);
          }

        }
        saveWorkState.EntityErrors = entityErrors;

      } catch (Exception) {
        throw;
      }

      saveWorkState.KeyMappings = UpdateAutoGeneratedKeys(saveWorkState.EntitiesWithAutoGeneratedKeys);
    }




    #endregion

    #region Save related methods

    private List<EFEntityInfo> ProcessSaves(Dictionary<Type, List<EntityInfo>> saveMap) {
      var deletedEntities = new List<EFEntityInfo>();
      foreach (var kvp in saveMap) {
        var entityType = kvp.Key;
        var entitySetName = GetEntitySetName(entityType);
        foreach (EFEntityInfo entityInfo in kvp.Value) {
          // entityInfo.EFContextProvider = this;  may be needed eventually.
          entityInfo.EntitySetName = entitySetName;
          ProcessEntity(entityInfo);
          if (entityInfo.EntityState == EntityState.Deleted) {
            deletedEntities.Add(entityInfo);
          }
        }
      }
      return deletedEntities;
    }

    private void ProcessAllDeleted(List<EFEntityInfo> deletedEntities) {
      deletedEntities.ForEach(entityInfo => {

        RestoreOriginal(entityInfo);
        var entry = GetOrAddObjectStateEntry(entityInfo);
        entry.ChangeState(System.Data.EntityState.Deleted);
        entityInfo.ObjectStateEntry = entry;
      });
    }

    private void ProcessAutogeneratedKeys(List<EntityInfo> entitiesWithAutoGeneratedKeys) {
      var tempKeys = entitiesWithAutoGeneratedKeys.Cast<EFEntityInfo>().Where(
        entityInfo => entityInfo.AutoGeneratedKey.AutoGeneratedKeyType == AutoGeneratedKeyType.KeyGenerator)
        .Select(ei => new TempKeyInfo(ei))
        .ToList();
      if (tempKeys.Count == 0) return;
      if (this.KeyGenerator == null) {
        this.KeyGenerator = GetKeyGenerator();
      }
      this.KeyGenerator.UpdateKeys(tempKeys);
      tempKeys.ForEach(tki => {
        // Clever hack - next 3 lines cause all entities related to tki.Entity to have 
        // their relationships updated. So all related entities for each tki are updated.
        // Basically we set the entity to look like a preexisting entity by setting its
        // entityState to unchanged.  This is what fixes up the relations, then we set it back to added
        // Now when we update the pk - all fks will get changed as well.  Note that the fk change will only
        // occur during the save.
        var entry = GetObjectStateEntry(tki.Entity);
        entry.ChangeState(System.Data.EntityState.Unchanged);
        entry.ChangeState(System.Data.EntityState.Added);
        var val = ConvertValue(tki.RealValue, tki.Property.PropertyType);
        tki.Property.SetValue(tki.Entity, val, null);
      });
    }

    private IKeyGenerator GetKeyGenerator() {
      var generatorType = KeyGeneratorType.Value;
      return (IKeyGenerator)Activator.CreateInstance(generatorType, StoreConnection);
    }

    private EntityInfo ProcessEntity(EFEntityInfo entityInfo) {
      ObjectStateEntry ose;
      if (entityInfo.EntityState == EntityState.Modified) {
        ose = HandleModified(entityInfo);
      } else if (entityInfo.EntityState == EntityState.Added) {
        ose = HandleAdded(entityInfo);
      } else if (entityInfo.EntityState == EntityState.Deleted) {
        // for 1st pass this does NOTHING 
        ose = HandleDeletedPart1(entityInfo);
      } else {
        // needed for many to many to get both ends into the objectContext
        ose = HandleUnchanged(entityInfo);
      }
      entityInfo.ObjectStateEntry = ose;
      return entityInfo;
    }

    private ObjectStateEntry HandleAdded(EFEntityInfo entityInfo) {
      var entry = AddObjectStateEntry(entityInfo);
      if (entityInfo.AutoGeneratedKey != null) {
        entityInfo.AutoGeneratedKey.TempValue = GetOsePropertyValue(entry, entityInfo.AutoGeneratedKey.PropertyName);
      }
      entry.ChangeState(System.Data.EntityState.Added);
      return entry;
    }

    private ObjectStateEntry HandleModified(EFEntityInfo entityInfo) {
      var entry = AddObjectStateEntry(entityInfo);
      // EntityState will be changed to modified during the update from the OriginalValuesMap
      // Do NOT change this to EntityState.Modified because this will cause the entire record to update.

      entry.ChangeState(System.Data.EntityState.Unchanged);

      // updating the original values is necessary under certain conditions when we change a foreign key field
      // because the before value is used to determine ordering.
      UpdateOriginalValues(entry, entityInfo);

      //foreach (var dep in GetModifiedComplexTypeProperties(entity, metadata)) {
      //  entry.SetModifiedProperty(dep.Name);
      //}

      if ((int)entry.State != (int)EntityState.Modified || entityInfo.ForceUpdate) {
        // _originalValusMap can be null if we mark entity.SetModified but don't actually change anything.
        entry.ChangeState(System.Data.EntityState.Modified);
      }
      return entry;
    }

    private ObjectStateEntry HandleUnchanged(EFEntityInfo entityInfo) {
      var entry = AddObjectStateEntry(entityInfo);
      entry.ChangeState(System.Data.EntityState.Unchanged);
      return entry;
    }

    private ObjectStateEntry HandleDeletedPart1(EntityInfo entityInfo) {
      return null;
    }

    private EntityInfo RestoreOriginal(EntityInfo entityInfo) {
      // fk's can get cleared depending on the order in which deletions occur -
      // EF needs the original values of these fk's under certain circumstances - ( not sure entirely what these are). 
      // so we restore the original fk values right before we attach the entity 
      // shouldn't be any side effects because we delete it immediately after.
      // concurrency values also need to be restored in some cases. 
      // This method restores more than it actually needs to because we don't
      // have metadata easily avail here, but usually a deleted entity will
      // not have much in the way of OriginalValues.
      if (entityInfo.OriginalValuesMap == null || entityInfo.OriginalValuesMap.Keys.Count == 0) {
        return entityInfo;
      }
      var entity = entityInfo.Entity;

      entityInfo.OriginalValuesMap.ToList().ForEach(kvp => {
        SetPropertyValue(entity, kvp.Key, kvp.Value);
      });

      return entityInfo;
    }

    private static void UpdateOriginalValues(ObjectStateEntry entry, EntityInfo entityInfo) {
      var originalValuesMap = entityInfo.OriginalValuesMap;
      if (originalValuesMap == null || originalValuesMap.Keys.Count == 0) return;

      var originalValuesRecord = entry.GetUpdatableOriginalValues();
      originalValuesMap.ToList().ForEach(kvp => {
        var propertyName = kvp.Key;
        var originalValue = kvp.Value;

        try {
          entry.SetModifiedProperty(propertyName);
          if (originalValue is JObject) {
            // only really need to perform updating original values on key properties
            // and a complex object cannot be a key.
          } else {
            var ordinal = originalValuesRecord.GetOrdinal(propertyName);
            var fieldType = originalValuesRecord.GetFieldType(ordinal);
            var originalValueConverted = ConvertValue(originalValue, fieldType);

            if (originalValueConverted == null) {
              // bug - hack because of bug in EF - see 
              // http://social.msdn.microsoft.com/Forums/nl/adodotnetentityframework/thread/cba1c425-bf82-4182-8dfb-f8da0572e5da
              var temp = entry.CurrentValues[ordinal];
              entry.CurrentValues.SetDBNull(ordinal);
              entry.ApplyOriginalValues(entry.Entity);
              entry.CurrentValues.SetValue(ordinal, temp);
            } else {
              originalValuesRecord.SetValue(ordinal, originalValueConverted);
            }
          }
        } catch (Exception) {
          // this can happen for "custom" data entity properties.
        }
      });

    }

    private List<KeyMapping> UpdateAutoGeneratedKeys(List<EntityInfo> entitiesWithAutoGeneratedKeys) {
      // where clause is necessary in case the Entities were suppressed in the beforeSave event.
      var keyMappings = entitiesWithAutoGeneratedKeys.Cast<EFEntityInfo>()
        .Where(entityInfo => entityInfo.ObjectStateEntry != null)
        .Select(entityInfo => {
          var autoGeneratedKey = entityInfo.AutoGeneratedKey;
          if (autoGeneratedKey.AutoGeneratedKeyType == AutoGeneratedKeyType.Identity) {
            autoGeneratedKey.RealValue = GetOsePropertyValue(entityInfo.ObjectStateEntry, autoGeneratedKey.PropertyName);
          }
          return new KeyMapping() {
            EntityTypeName = entityInfo.Entity.GetType().FullName,
            TempValue = autoGeneratedKey.TempValue,
            RealValue = autoGeneratedKey.RealValue
          };
        });
      return keyMappings.ToList();
    }

    private Object GetOsePropertyValue(ObjectStateEntry ose, String propertyName) {
      var currentValues = ose.CurrentValues;
      var ix = currentValues.GetOrdinal(propertyName);
      return currentValues[ix];
    }

    private void SetOsePropertyValue(ObjectStateEntry ose, String propertyName, Object value) {
      var currentValues = ose.CurrentValues;
      var ix = currentValues.GetOrdinal(propertyName);
      currentValues.SetValue(ix, value);
    }

    private void SetPropertyValue(Object entity, String propertyName, Object value) {
      var propInfo = entity.GetType().GetProperty(propertyName,
                                                  BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
      // exit if unmapped property.
      if (propInfo == null) return;
      if (propInfo.CanWrite) {
        var val = ConvertValue(value, propInfo.PropertyType);
        propInfo.SetValue(entity, val, null);
      } else {
        throw new Exception(String.Format("Unable to write to property '{0}' on type: '{1}'", propertyName,
                                          entity.GetType()));
      }
    }

    private static Object ConvertValue(Object val, Type toType) {
      Object result;
      // TODO: handle nullables
      if (val == null) return val;
      if (toType == val.GetType()) return val;

      if (typeof(IConvertible).IsAssignableFrom(toType)) {
        result = Convert.ChangeType(val, toType, System.Threading.Thread.CurrentThread.CurrentCulture);
      } else if (val is JObject) {
        var serializer = new JsonSerializer();
        result = serializer.Deserialize(new JTokenReader((JObject)val), toType);
      } else {
        // Guids fail above - try this
        TypeConverter typeConverter = TypeDescriptor.GetConverter(toType);
        result = typeConverter.ConvertFrom(val);
      }
      return result;
    }

    private ObjectStateEntry GetOrAddObjectStateEntry(EFEntityInfo entityInfo) {
      ObjectStateEntry entry;
      if (ObjectContext.ObjectStateManager.TryGetObjectStateEntry(entityInfo.Entity, out entry)) return entry;

      return AddObjectStateEntry(entityInfo);
    }

    private ObjectStateEntry AddObjectStateEntry(EFEntityInfo entityInfo) {
      var ose = GetObjectStateEntry(entityInfo.Entity, false);
      if (ose != null) return ose;
      ObjectContext.AddObject(entityInfo.EntitySetName, entityInfo.Entity);
      // Attach has lots of side effect - add has far fewer.
      return GetObjectStateEntry(entityInfo);
    }

    private ObjectStateEntry AttachObjectStateEntry(EFEntityInfo entityInfo) {
      ObjectContext.AttachTo(entityInfo.EntitySetName, entityInfo.Entity);
      // Attach has lots of side effect - add has far fewer.
      return GetObjectStateEntry(entityInfo);
    }

    private ObjectStateEntry GetObjectStateEntry(EFEntityInfo entityInfo) {
      return GetObjectStateEntry(entityInfo.Entity);
    }

    private ObjectStateEntry GetObjectStateEntry(Object entity, bool errorIfNotFound = true) {
      ObjectStateEntry entry;
      if (!ObjectContext.ObjectStateManager.TryGetObjectStateEntry(entity, out entry)) {
        if (errorIfNotFound) {
          throw new Exception("unable to add to context: " + entity);
        }
      }
      return entry;
    }


    #endregion

    #region Metadata methods

    public static String GetMetadataFromDbFirstAssembly(Assembly assembly, String resourcePrefix = "") {
      var xDoc = GetEmbeddedXDoc(assembly, resourcePrefix + ".csdl");
      // This is needed because the raw edmx has a different namespace than the CLR types that it references.
      xDoc = UpdateCSpaceOSpaceMapping(xDoc, assembly, resourcePrefix);

      return XDocToJson(xDoc);
    }

    public static String GetMetadataFromContext(Object context) {
      if (context is DbContext) {
        return GetMetadataFromDbContext(context);
      } else {
        return GetMetadataFromObjectContext(context);
      }
    }

    private static String GetMetadataFromDbContext(Object context) {
      var dbContext = (DbContext)context;
      XElement xele;

      try {
        using (var swriter = new StringWriter()) {
          using (var xwriter = new XmlTextWriter(swriter)) {
            EdmxWriter.WriteEdmx(dbContext, xwriter);
            xele = XElement.Parse(swriter.ToString());
          }
        }
      } catch (Exception e) {
        if (e is NotSupportedException) {
          // DbContext that fails on WriteEdmx is likely a DataBase first DbContext.
          return GetMetadataFromObjectContext(dbContext);
        } else {
          throw;
        }
      }

      var ns = xele.Name.Namespace;
      var conceptualEle = xele.Descendants(ns + "ConceptualModels").First();
      var schemaEle = conceptualEle.Elements().First(ele => ele.Name.LocalName == "Schema");
      var xDoc = XDocument.Load(schemaEle.CreateReader());

      var objectContext = ((IObjectContextAdapter)dbContext).ObjectContext;
      // This is needed because the raw edmx has a different namespace than the CLR types that it references.
      xDoc = UpdateCSpaceOSpaceMapping(xDoc, objectContext);
      return XDocToJson(xDoc);
    }

    private static String GetMetadataFromObjectContext(Object context) {

      var ocAssembly = context.GetType().Assembly;
      var ocNamespace = context.GetType().Namespace;

      var objectContext = GetObjectContext(context);
      var normalizedResourceName = ExtractResourceName(objectContext);
      var xDoc = GetEmbeddedXDoc(ocAssembly, normalizedResourceName);

      // This is needed because the raw edmx has a different namespace than the CLR types that it references.
      xDoc = UpdateCSpaceOSpaceMapping(xDoc, objectContext);
      return XDocToJson(xDoc);
    }

    private static ObjectContext GetObjectContext(Object context) {
      ObjectContext objectContext;
      if (context is DbContext) {
        var dbContext = (DbContext)context;
        objectContext = ((IObjectContextAdapter)dbContext).ObjectContext;
      } else {
        objectContext = (ObjectContext)context;
      }
      return objectContext;
    }

    private static string ExtractResourceName(ObjectContext objectContext) {
      var ec = objectContext.Connection as EntityConnection;

      if (ec == null) {
        throw new Exception("Unable to create an EntityConnection for this ObjectContext");
      }
      var ecBuilder = new EntityConnectionStringBuilder(ec.ConnectionString);
      var metadataString = "";
      if (!String.IsNullOrEmpty(ecBuilder.Name)) {
        metadataString = GetConnectionStringFromConfig(ecBuilder.Name);
      } else if (!String.IsNullOrEmpty(ecBuilder.Metadata)) {
        metadataString = ecBuilder.Metadata;
      } else {
        throw new Exception("Unable to locate EDMX metadata for " + ec.ConnectionString);
      }

      var csdlResource = metadataString.Split('|', ';', '=')
        .FirstOrDefault(s => {
          s = s.Trim();
          return s.StartsWith(ResourcePrefix) && s.EndsWith(".csdl");
        });
      if (csdlResource == null) {
        throw new Exception("Unable to locate a 'csdl' resource within this connection:" + ec.ConnectionString);
      }

      var parts = csdlResource.Split('/', '.');
      var normalizedResourceName = String.Join(".", parts.Skip(parts.Length - 2));
      return normalizedResourceName;
    }

    private static XDocument GetEmbeddedXDoc(Assembly ocAssembly, String resourceSuffix) {

      var resourceNames = ocAssembly.GetManifestResourceNames();
      var manifestResourceName = resourceNames.FirstOrDefault(n => n.EndsWith(resourceSuffix));

      if (manifestResourceName == null) {
        manifestResourceName = resourceNames.FirstOrDefault(n =>
          n == "System.Data.Resources.DbProviderServices.ConceptualSchemaDefinition.csdl"
        );
        if (manifestResourceName == null) {
          throw new Exception("Unable to locate an embedded resource with the name " +
                              "'System.Data.Resources.DbProviderServices.ConceptualSchemaDefinition.csdl'" +
                              " or a resource that ends with: " + resourceSuffix);
        }
      }
      XDocument xDoc;
      using (var mmxStream = ocAssembly.GetManifestResourceStream(manifestResourceName)) {
        xDoc = XDocument.Load(mmxStream);
      }

      return xDoc;
    }

    private static XDocument UpdateCSpaceOSpaceMapping(XDocument xDoc, ObjectContext oc) {
      var metadataWs = oc.MetadataWorkspace;

      // ForceOSpaceLoad
      var asm = oc.GetType().Assembly;
      metadataWs.LoadFromAssembly(asm);

      return UpdateCSpaceOSpaceMappingCore(xDoc, metadataWs);

    }

    private static XDocument UpdateCSpaceOSpaceMapping(XDocument xDoc, Assembly assembly, String resourcePrefix) {

      String[] res;
      if (resourcePrefix == "") {
        res = new string[] { "res://*/" };
      } else {
        var pre = "res://*/" + resourcePrefix;
        res = new String[] { pre + ".csdl", pre + ".msl", pre + ".ssdl" };
      }
      var metadataWs = new MetadataWorkspace(
        res,
        new Assembly[] { assembly });

      // force an OSpace load - UGH - this was hard to find.... need to create the object item collection before loading assembly
      metadataWs.RegisterItemCollection(new ObjectItemCollection());
      metadataWs.LoadFromAssembly(assembly);

      return UpdateCSpaceOSpaceMappingCore(xDoc, metadataWs);

    }

    private static XDocument UpdateCSpaceOSpaceMappingCore(XDocument xDoc, MetadataWorkspace metadataWs) {
      var cspaceTypes = metadataWs.GetItems<System.Data.Metadata.Edm.StructuralType>(DataSpace.CSpace);
      var tpls = cspaceTypes
          .Where(st => !(st is AssociationType))
          .Select(st => {
            var ost = metadataWs.GetObjectSpaceType(st);
            return new[] { st.FullName, ost.FullName };
          })
          .ToList();
      var ocMapping = JsonConvert.SerializeObject(tpls);
      xDoc.Root.SetAttributeValue("CSpaceOSpaceMapping", ocMapping);
      return xDoc;
    }


    protected static String GetConnectionStringFromConfig(String connectionName) {
      var item = ConfigurationManager.ConnectionStrings[connectionName];
      return item.ConnectionString;
    }

    #endregion

    // TODO: may want to improve perf on this later ( cache the mappings maybe).
    public String GetEntitySetName(Type entityType) {
      var metaWs = ObjectContext.MetadataWorkspace;
      EntityType cspaceEntityType;
      var ospaceEntityTypes = metaWs.GetItems<EntityType>(DataSpace.OSpace);
      if (ospaceEntityTypes.Any()) {
        var ospaceEntityType = ospaceEntityTypes.First(oet => oet.FullName == entityType.FullName);
        cspaceEntityType = (EntityType)metaWs.GetEdmSpaceType(ospaceEntityType);
      } else {
        // Old EDMX ObjectContext has empty OSpace, so we get cspaceEntityType directly
        var cspaceEntityTypes = metaWs.GetItems<EntityType>(DataSpace.CSpace);
        cspaceEntityType = cspaceEntityTypes.First(et => et.FullName == entityType.FullName);
      }

      // note CSpace below - not OSpace - evidently the entityContainer is only in the CSpace.
      var entitySets = metaWs.GetItems<EntityContainer>(DataSpace.CSpace)
          .SelectMany(c => c.BaseEntitySets.Where(es => es.ElementType.BuiltInTypeKind == BuiltInTypeKind.EntityType)).ToList();

      return GetDefaultEntitySetName(cspaceEntityType, entitySets);
    }

    private static string GetDefaultEntitySetName(EntityType cspaceEntityType, IList<EntitySetBase> entitySets) {
      // 1st entity set with matching entity type, otherwise with matching assignable type.
      EdmType baseType = cspaceEntityType;
      EntitySetBase entitySet = null;
      while (baseType != null) {
        entitySet = entitySets.FirstOrDefault(es => es.ElementType == baseType);
        if (entitySet != null) return entitySet.Name;
        baseType = baseType.BaseType;
      }
      return string.Empty;
    }

    //var entityTypes = key.MetadataWorkspace.GetItems<EntityType>(DataSpace.OSpace);
    //// note CSpace below - not OSpace - evidently the entityContainer is only in the CSpace.
    //var entitySets = key.MetadataWorkspace.GetItems<EntityContainer>(DataSpace.CSpace)
    //    .SelectMany(c => c.BaseEntitySets.Where(es => es.ElementType.BuiltInTypeKind == BuiltInTypeKind.EntityType)).ToList();

    //private EntitySet GetDefaultEntitySet(EntityType cspaceEntityType) {
    //  var entitySet = _cspaceContainers.First().BaseEntitySets.OfType<EntitySet>().Where(es => es.ElementType == cspaceEntityType).FirstOrDefault();
    //  if (entitySet == null) {
    //    var baseEntityType = cspaceEntityType.BaseType as EntityType;
    //    if (baseEntityType != null) {
    //      return GetDefaultEntitySet(baseEntityType);
    //    } else {
    //      return null;
    //    }
    //  }
    //  return entitySet;
    //}


    //// from DF


    private const string ResourcePrefix = @"res://";

    private T _context;
  }




  public class EFEntityInfo : EntityInfo {
    internal EFEntityInfo() {
    }

    internal String EntitySetName;
    internal ObjectStateEntry ObjectStateEntry;
  }

  public class EFEntityError : EntityError {
    public EFEntityError(EntityInfo entityInfo, String errorName, String errorMessage, String propertyName) {


      if (entityInfo != null) {
        this.EntityTypeName = entityInfo.Entity.GetType().FullName;
        this.KeyValues = GetKeyValues(entityInfo);
      }
      ErrorName = ErrorName;
      ErrorMessage = errorMessage;
      PropertyName = propertyName;
    }

    private Object[] GetKeyValues(EntityInfo entityInfo) {
      return entityInfo.ContextProvider.GetKeyValues(entityInfo);
    }
  }

}