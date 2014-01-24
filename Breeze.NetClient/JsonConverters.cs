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
    

    protected override Object Create(Type objectType, JObject jObject, JsonContext jsonContext) {
            
      var entityType =  _metadataStore.GetEntityType(objectType);
      if (entityType != null) {
        jsonContext.StructuralType = entityType;
        var keyValues = entityType.KeyProperties.Select(p => jObject[p.Name].ToObject(p.DataType.ClrType));
        var entityKey = new EntityKey(entityType, keyValues, false);
        var entity = _entityManager.FindEntityByKey(entityKey);
        if (entity != null) {
          return entity;
        } else {
          return Activator.CreateInstance(objectType);
        }
      } else {
        return Activator.CreateInstance(objectType);
      }
      
    }

    protected override Object Populate(Object target, JObject jObject, JsonSerializer serializer, JsonContext jsonContext) {
      var entity = target as JsonEntity;
      if (entity != null) {
        entity.SetBacking(jObject);
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

        Populate(target, jObject, serializer, jsonContext);

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
    
    public StructuralType StructuralType {
      get;
      set;
    }
  }
}

