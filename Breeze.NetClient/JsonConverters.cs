using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Reflection;


namespace Breeze.NetClient {

  



  public class JsonEntityConverter : JsonCreationConverter {
  
    public JsonEntityConverter(EntityManager entityManager) {
      _entityManager = entityManager;
      _metadataStore = entityManager.MetadataStore;
    }

    private Dictionary<String, Object> _refMap = new Dictionary<string, object>();

    public JsonEntityConverter NewInstance() {
      return new JsonEntityConverter(this._entityManager);
    }

    public Dictionary<String, Object> ToDictionary(JObject jObject, StructuralType structuralType) {
      var dict = (IDictionary<String, JToken>) jObject;
      return dict.ToDictionary(kvp => kvp.Key, kvp => {
        var dp = structuralType.GetDataProperty(kvp.Key);
        var dataType = (dp != null) ? dp.ClrType : typeof(Object);
        var value = kvp.Value.ToObject(dataType);
        return value;
      });
    }
    

    protected override Object Create(Type objectType, JObject jObject, JsonContext jsonContext) {
            
      var entityType =  _metadataStore.GetEntityType(objectType);
      Object result; 
      if (entityType != null) {
        jsonContext.StructuralType = entityType;

        JToken refToken = null;
        if (jObject.TryGetValue("$ref", out refToken)) {
          jsonContext.AlreadyPopulated = true;
          return _refMap[refToken.Value<String>()];
        }

        var backing = ToDictionary(jObject, entityType);
        jsonContext.Backing = backing;
        var keyValues = entityType.KeyProperties.Select(p => backing[p.Name]);
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
        entity.SetBacking(jsonContext.Backing);
        if (entity.EntityAspect == null) {
          entity.EntityAspect = new EntityAspect(entity, (EntityType)jsonContext.StructuralType);
          _entityManager.AttachEntity(entity, EntityState.Unchanged);
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

    private EntityManager _entityManager;
    private MetadataStore _metadataStore;
  }

  public abstract class JsonCreationConverter : JsonConverter {
    /// <summary>
    /// Create an instance of objectType, based properties in the JSON object
    /// </summary>
    /// <param name="objectType">type of object expected</param>
    /// <param name="jObject">contents of JSON object that will be deserialized</param>
    /// <returns></returns>
    protected abstract Object Create(Type objectType, JObject jObject, JsonContext jsonContext);

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
        var target = Create(objectType, jObject, jsonContext);
        if (!jsonContext.AlreadyPopulated) {
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
    public Dictionary<String, Object> Backing { get; set; }
  }
}

