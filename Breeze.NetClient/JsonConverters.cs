using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Reflection;
using System.Runtime.Serialization.Formatters;
using Breeze.Core;
using System.Runtime.Serialization;
using System.Collections;


namespace Breeze.NetClient {

  
  //public static class JsonFns {

  //  public static JsonSerializerSettings GetSerializerSettings(EntityManager em) {
  //    var settings = new JsonSerializerSettings() {
  //      NullValueHandling = NullValueHandling.Include,
  //      PreserveReferencesHandling = PreserveReferencesHandling.Objects,
  //      ReferenceLoopHandling = ReferenceLoopHandling.Serialize,
  //      TypeNameHandling = TypeNameHandling.Objects,
  //      TypeNameAssemblyFormat = FormatterAssemblyStyle.Simple,
  //    };
  //    settings.Converters.Add(new JsonEntityConverter(em));
  //    return settings;
  //  }
  //}

  public class JsonEntityConverter : JsonConverter {
  
    public JsonEntityConverter(EntityManager entityManager, MergeStrategy mergeStrategy) {
      _entityManager = entityManager;
      _metadataStore = entityManager.MetadataStore;
      _mergeStrategy = mergeStrategy;
    }

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer) {
      if (reader.TokenType != JsonToken.Null) {
        // Load JObject from stream
        var jObject = JObject.Load(reader);

        var jsonContext = new JsonContext { JObject = jObject, ObjectType = objectType, Serializer = serializer };
        // Create target object based on JObject
        var target = CreateAndPopulate( jsonContext);
        return target;
      } else {
        return null;
      }
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer) {
      throw new NotImplementedException();
    }


    public override bool CanConvert(Type objectType) {
      return _metadataStore.IsEntityOrComplexType(objectType);
    }


    protected virtual Object CreateAndPopulate(JsonContext jsonContext) {
      var jObject = jsonContext.JObject;

      JToken refToken = null;
      if (jObject.TryGetValue("$ref", out refToken)) {
        return _refMap[refToken.Value<String>()];
      }

      var objectType = jsonContext.ObjectType;
      var entityType =  _metadataStore.GetEntityType(objectType);
      
      if (entityType != null) {
        jsonContext.StructuralType = entityType;
        var keyValues = entityType.KeyProperties
          .Select(p => jObject[p.Name].ToObject(p.ClrType))
          .ToArray();
        var entityKey = new EntityKey(entityType, keyValues);
        var entity = _entityManager.FindEntityByKey(entityKey);
        if (entity == null) {
          entity = (IEntity) Activator.CreateInstance(objectType);
        }
        // must be called before populate
        UpdateRefMap(jObject, entity);
        return PopulateEntity(jsonContext, entity );
      } else {
        var target =  Activator.CreateInstance(objectType);
        // must be called before populate
        UpdateRefMap(jObject, target);
        // Populate the object properties directly
        jsonContext.Serializer.Populate(jObject.CreateReader(), target);
        return target;
      }

    }

    private void UpdateRefMap(JObject jObject, Object target) {
      JToken idToken = null;
      if (jObject.TryGetValue("$id", out idToken)) {
        _refMap[idToken.Value<String>()] = target;
      }
    }

    protected virtual Object PopulateEntity(JsonContext jsonContext, IEntity entity) {
      
      var aspect = entity.EntityAspect;
      if (aspect.EntityManager == null) {
        // new to this entityManager
        ParseObject(jsonContext, aspect);
        _entityManager.AttachQueriedEntity(entity, (EntityType) jsonContext.StructuralType);
      } else if (_mergeStrategy == MergeStrategy.OverwriteChanges || aspect.EntityState == EntityState.Unchanged) {
        // overwrite existing entityManager
        ParseObject(jsonContext, aspect);
      } else {
        // preserveChanges handling - we still want to handle expands.
        ParseObject(jsonContext, null );
      }

      return entity;
    }

    private void ParseObject(JsonContext jsonContext, EntityAspect targetAspect) {
      // backingStore will be null if not allowed to overwrite the entity.
      var backingStore = (targetAspect == null) ? null : targetAspect.BackingStore;
      var dict = (IDictionary<String, JToken>) jsonContext.JObject;
      var structuralType = jsonContext.StructuralType;
      dict.ForEach(kvp => {
        var key = kvp.Key;
        var prop = structuralType.GetProperty(key);
        if (prop != null) {
          if (prop.IsDataProperty) {
            if (backingStore != null) backingStore[key] = kvp.Value.ToObject(prop.ClrType);
          } else {
            // TODO: nest serialization
            var np = (NavigationProperty)prop;
            
            if (kvp.Value.HasValues) {
              JsonContext newContext;
              if (np.IsScalar) {
                var nestedOb = (JObject)kvp.Value;
                newContext = new JsonContext() { JObject = nestedOb, ObjectType = prop.ClrType, Serializer = jsonContext.Serializer }; 
                var entity = (IEntity)CreateAndPopulate(newContext);
                if (backingStore != null) backingStore[key] = entity;
              } else {
                var nestedArray = (JArray)kvp.Value;
                var navSet = (INavigationSet) TypeFns.CreateGenericInstance(typeof(NavigationSet<>), prop.ClrType);
                
                nestedArray.Cast<JObject>().ForEach(jo => {
                  newContext = new JsonContext() { JObject=jo, ObjectType = prop.ClrType, Serializer = jsonContext.Serializer };
                  var entity = (IEntity)CreateAndPopulate(newContext);
                  navSet.Add(entity);
                });
                // add to existing nav set if there is one otherwise just set it. 
                object tmp;
                if (backingStore.TryGetValue(key, out tmp)) {
                  var backingNavSet = (INavigationSet) tmp;
                  navSet.Cast<IEntity>().ForEach(e => backingNavSet.Add(e));
                } else {
                  navSet.NavigationProperty = np;
                  navSet.ParentEntity = targetAspect.Entity;
                  backingStore[key] = navSet;
                }
              }
            } else {
              // do nothing
              //if (!np.IsScalar) {
              //  return TypeFns.ConstructGenericInstance(typeof(NavigationSet<>), prop.ClrType);
              //} else {
              //  return null;
              //}
            }
          }
        } else {
          if (backingStore != null) backingStore[key] = kvp.Value.ToObject<Object>();
        }
      });
      
    }

    protected class JsonContext {
      public JObject JObject;
      public Type ObjectType;
      public StructuralType StructuralType;
      public JsonSerializer Serializer;
    }

    private EntityManager _entityManager;
    private MetadataStore _metadataStore;
    private MergeStrategy _mergeStrategy;
    private Dictionary<String, Object> _refMap = new Dictionary<string, object>();
  }


}

