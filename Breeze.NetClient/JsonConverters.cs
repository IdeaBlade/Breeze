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

  public class JsonEntityConverter : JsonCreationConverter {
  
    public JsonEntityConverter(EntityManager entityManager, MergeStrategy mergeStrategy) {
      _entityManager = entityManager;
      _metadataStore = entityManager.MetadataStore;
      _mergeStrategy = mergeStrategy;
    }


    protected override Object Create(Type objectType, JObject jObject, JsonSerializer serializer, JsonContext jsonContext) {
      
      var entityType =  _metadataStore.GetEntityType(objectType);
      Object result; 
      if (entityType != null) {
        JToken refToken = null;
        if (jObject.TryGetValue("$ref", out refToken)) {
          jsonContext.AlreadyPopulated = true;
          return _refMap[refToken.Value<String>()];
        }
        jsonContext.StructuralType = entityType;
        var keyValues = entityType.KeyProperties
          .Select(p => jObject[p.Name].ToObject(p.ClrType))
          .ToArray();
        var entityKey = new EntityKey(entityType, keyValues, false);
        result = _entityManager.FindEntityByKey(entityKey);
        if (result == null) {
          result = Activator.CreateInstance(objectType);
        }
      } else {
        result =  Activator.CreateInstance(objectType);
      }
      JToken idToken = null;
      if (jObject.TryGetValue("$id", out idToken)) {
        _refMap[idToken.Value<String>()] = result;
      }
      return result;

    }

    protected override Object Populate(Object target, JObject jObject, JsonSerializer serializer, JsonContext jsonContext) {
      
      var entity = target as BaseEntity;
      if (entity != null) {
        // causes additional deserialization.
        var backing = ToDictionary(jObject, jsonContext.StructuralType, serializer);
        // need to handle MergeStrategy here.
        
        entity.SetBacking(backing);
        if (entity.EntityAspect == null) {
          _entityManager.AttachQueriedEntity(entity, (EntityType)jsonContext.StructuralType);
        } else if ( _mergeStrategy == MergeStrategy.OverwriteChanges || entity.EntityAspect.EntityState == EntityState.Unchanged) {
          entity.SetBacking(backing);
        } else {
          // preserveChanges handling
          // do nothing; 
        }
      } else {
        // Populate the object properties directly
        serializer.Populate(jObject.CreateReader(), target);
      }

      return target;
    }

    public override bool CanConvert(Type objectType) {
      return _metadataStore.IsEntityOrComplexType(objectType);
    }

    public Dictionary<String, Object> ToDictionary(JObject jObject, StructuralType structuralType, JsonSerializer serializer) {
      var dict = (IDictionary<String, JToken>)jObject;
      return dict.ToDictionary(kvp => kvp.Key, kvp => {
        var prop = structuralType.GetProperty(kvp.Key);
        if (prop != null) {
          if (prop.IsDataProperty) {
            return kvp.Value.ToObject(prop.ClrType);
          } else {
            // TODO: nest serialization
            var np = (NavigationProperty)prop;
            if (kvp.Value.HasValues) {
              if (np.IsScalar) {
                var nestedOb = (JObject)kvp.Value;
                return serializer.Deserialize(nestedOb.CreateReader(), prop.ClrType);
              } else {
                var nestedArray = (JArray)kvp.Value;
                var ctype = typeof(NavigationSet<>).MakeGenericType(prop.ClrType);
                return serializer.Deserialize(nestedArray.CreateReader(), ctype);
              }
            } else {
              if (!np.IsScalar) {
                return TypeFns.ConstructGenericInstance(typeof(NavigationSet<>), prop.ClrType);
              } else {
                return null;
              }
            }
          }
        } else {
          return kvp.Value.ToObject<Object>();
        }

      });
    }

    private EntityManager _entityManager;
    private MetadataStore _metadataStore;
    private MergeStrategy _mergeStrategy;
    private Dictionary<String, Object> _refMap = new Dictionary<string, object>();
  }

  public abstract class JsonCreationConverter : JsonConverter {
    /// <summary>
    /// Create an instance of objectType, based properties in the JSON object
    /// </summary>
    /// <param name="objectType">type of object expected</param>
    /// <param name="jObject">contents of JSON object that will be deserialized</param>
    /// <returns></returns>
    protected abstract Object Create(Type objectType, JObject jObject,JsonSerializer serializer, JsonContext jsonContext);

    protected virtual Object Populate(Object target, JObject jObject, JsonSerializer serializer, JsonContext jsonContext) {
      serializer.Populate(jObject.CreateReader(), target);
      return target;
    }

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer) {
      
      if (reader.TokenType != JsonToken.Null) {

        // Load JObject from stream
        var jObject = JObject.Load(reader);

        var jsonContext = new JsonContext();
        // Create target object based on JObject
        var target = Create(objectType, jObject, serializer, jsonContext);
        if (target != null && !jsonContext.AlreadyPopulated) {
          Populate(target, jObject, serializer, jsonContext);
        }

        return target;
      } else {
        return  null;
      }
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer) {
      throw new NotImplementedException();
    }

    
  }

  public class JsonContext {
    
    public StructuralType StructuralType { get; set; }
    public bool AlreadyPopulated { get; set; }

  }
}

