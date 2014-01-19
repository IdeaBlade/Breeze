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
  
    public JsonEntityConverter(MetadataStore metadataStore) {
      _metadataStore = metadataStore;
    }

    protected override Object Create(Type objectType, JObject jObject) {
      return Activator.CreateInstance(objectType);
    }

    public override bool CanConvert(Type objectType) {
      return _metadataStore.ClrEntityTypes.Contains(objectType);
    }

    private bool FieldExists(string fieldName, JObject jObject) {
      return jObject[fieldName] != null;
    }

    private MetadataStore _metadataStore;
  }

  public abstract class JsonCreationConverter : JsonConverter {
    /// <summary>
    /// Create an instance of objectType, based properties in the JSON object
    /// </summary>
    /// <param name="objectType">type of object expected</param>
    /// <param name="jObject">contents of JSON object that will be deserialized</param>
    /// <returns></returns>
    protected abstract Object Create(Type objectType, JObject jObject);

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer) {
      
      if (reader.TokenType != JsonToken.Null) {

        // Load JObject from stream
        JObject jObject = JObject.Load(reader);

        // Create target object based on JObject
        var target = Create(objectType, jObject);

        // Populate the object properties
        serializer.Populate(jObject.CreateReader(), target);
        return target;
      } else {
        return  null;
      }
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer) {
      throw new NotImplementedException();
    }
  }


  
}
