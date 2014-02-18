
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;

using Breeze.Core;

namespace Breeze.NetClient {

  public interface IJsonSerializable {
    JNode ToJNode(Object config);
    void FromJNode(JNode jNode);
  }

  public class JNode {
    public JNode() {
      _jo = new JObject();
    }

    public JNode(JObject jo) {
      _jo = jo;
    }

    public JNode(String json) {
      // _jo = JObject.Parse(text);
      _jo = Parse(json);
    }

    public bool IsEmpty {
      get {
        return !_jo.Values().Any();
      }
    }

    public static JNode ToJNode<T>(IDictionary<String, T> map) {
      var jn = new JNode();
      map.ForEach(kvp => {
        var val = CvtValue(kvp.Value);
        if (val != null) {
          if (val is JToken) {
            jn.AddRaw(kvp.Key, (JToken)val);
          } else {
            jn.AddRaw(kvp.Key, new JValue(val));
          }
        }
      });
      return jn;
    }

    public static JArray ToJArray<T>(IEnumerable<T> items) {
      var ja = new JArray();
      items.ForEach(v => ja.Add(CvtValue(v)));
      return ja;
    }

         
    public Object Config {
      get;
      set;
    }
    
    // needed because we need to set the DateParseHandling to work with DataTimeOffsets
    public static JObject Parse(string json)     {
      var reader = (JsonReader)new JsonTextReader(new StringReader(json));
      reader.DateParseHandling = DateParseHandling.DateTimeOffset;
      var jobject = JObject.Load(reader);
      if (reader.Read() && reader.TokenType != JsonToken.Comment) {
        JObject.Parse(json);
      }
      return jobject;
    }

    public void AddPrimitive(String propName, Object value, Object defaultValue = null) {
      if (value == null) return;
      if (value != null && value.Equals(defaultValue)) return;
      Object val;
      if (value is DateTimeOffset) {
        var dummy = value;
      }
      AddRaw(propName, new JValue(value));
    }

    public void AddObject(String propName, IJsonSerializable item) {
      if (item == null) return;
      var jn = item.ToJNode(null);
      AddRaw(propName, jn._jo);
    }

    public void AddArray<T>(String propName, IEnumerable<T> items) {
      if (!items.Any()) return;
      var ja = ToJArray(items);
      AddRaw(propName, ja);
    }

    public void AddMap<T>(String propName, IDictionary<String, T> map) {
      if (map == null) return;
      if (!map.Values.Any()) return;
      var jn = ToJNode(map);
      AddRaw(propName, jn._jo);
    }

    public void AddJNode(String propName, JNode jn) {
      if (jn == null) return;
      if (jn.IsEmpty) return;
      AddRaw(propName, jn._jo);
    }

    private void AddRaw(String propName, JToken jt) {
      _jo.Add(propName, jt);
    }

    public Object Get(String propName, Type objectType) {
      var prop = _jo.Property(propName);
      if (prop == null) return null;
      var val = prop.Value.ToObject(objectType);
      if (val is DateTimeOffset) {
        var test = val;
      }
      return val;
    }

    public T Get<T>(String propName, T defaultValue = default(T)) {
      var prop = _jo.Property(propName);
      if (prop == null) return defaultValue;
      var val = prop.Value.ToObject<T>();
      if (val is DateTimeOffset) {
        var test = val;
      }
      return val;
    }

    private T GetToken<T>(String propName ) where T: JToken {
      var prop = _jo.Property(propName);
      if (prop == null) return null;
      return (T)prop.Value;

    }

    public TEnum GetEnum<TEnum>(String propName, TEnum defaultValue = default(TEnum)) {
      var val = Get<String>(propName);
      if (val == null) {
        return defaultValue;
      } else {
        return (TEnum)Enum.Parse(typeof(TEnum), val);
      }
    }

    // for non newable types like String, Int etc..
    public IEnumerable<T> GetPrimitiveArray<T>(String propName)  {
      var items = GetToken<JArray>(propName);
      if (items == null) {
        return Enumerable.Empty<T>();
      } else {
        return items.Select(item => {
          return item.Value<T>();
        });
      }
    }

    public T GetObject<T>(String propName) where T : new() {
      return GetObject<T>(propName, (jn) => new T());
    }

    public T GetObject<T>(String propName, Func<JNode, T> ctorFn)  {
      var item = (JObject)GetToken<JObject>(propName);
      T t;
      var jNode = new JNode(item);
      t = ctorFn(jNode);

      ((IJsonSerializable)t).FromJNode(jNode);
      return t;
    }

    public IEnumerable<T> GetObjectArray<T>(String propName) where T : new() {
      return GetObjectArray<T>(propName, (jn) => new T());
    }

    public IEnumerable<T> GetObjectArray<T>(String propName, Func<JNode, T> ctorFn) {
      var items = GetToken<JArray>(propName);
      if (items == null) {
        return Enumerable.Empty<T>();
      } else {
        return items.Select(item => {
          T t;
          var jNode = new JNode((JObject)item);
          t = ctorFn(jNode);

          ((IJsonSerializable)t).FromJNode(jNode);
          return t;
        });
      }
    }

    public IDictionary<String, T> GetMap<T>(String propName) {
      var rmap = new Dictionary<String, T>();
      var map = (JObject) GetToken<JObject>(propName);
      foreach (var kvp in map) {
        rmap.Add(kvp.Key, kvp.Value.Value<T>());
      }
      return rmap;
    }



    public String ToJson() {
      // TODO: change to Formatting.None in production
      return _jo.ToString(Formatting.Indented);
    }

    // pass in a simple value, a JNode or a IJsonSerializable and returns either a simple value or a JObject or a JArray
    private static Object CvtValue(Object value) {
      var jn = value as JNode;
      if (jn != null) {
        return jn._jo;
      }

      var nodes = value as IEnumerable<JNode>;
      if (nodes != null) {
        return ToJArray(nodes);
      }

      var js = value as IJsonSerializable;
      if (js != null) {
        return js.ToJNode(null)._jo;
      }

      
      return value;
    }

    private JObject _jo;
  }

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
      return MetadataStore.IsStructuralType(objectType);
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
        // an entity type
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
        // anonymous type
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
            if (backingStore != null) {
              var dp = (DataProperty)prop;
              if (dp.IsComplexProperty) {
                var newCo = (IComplexObject) kvp.Value.ToObject(dp.ClrType);
                var co = (IComplexObject)backingStore[key];
                var coBacking = co.ComplexAspect.BackingStore;
                newCo.ComplexAspect.BackingStore.ForEach(kvp2 => {
                  coBacking[kvp2.Key] = kvp2.Value;
                });
              } else {
                backingStore[key] = kvp.Value.ToObject(dp.ClrType);
              }
            }
          } else {
            // prop is a ComplexObject
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

  public static class JsonFns {

    public static JsonSerializerSettings SerializerSettings {
      get {
        var settings = new JsonSerializerSettings() {

          //NullValueHandling = NullValueHandling.Include,
          //PreserveReferencesHandling = PreserveReferencesHandling.Objects,
          //ReferenceLoopHandling = ReferenceLoopHandling.Serialize,
          //TypeNameHandling = TypeNameHandling.Objects,
          //TypeNameAssemblyFormat = FormatterAssemblyStyle.Simple,
        };
        settings.Converters.Add(new IsoDateTimeConverter());
        // settings.Converters.Add(new JsonEntityConverter(em));
        return settings;
      }
    }
  }

}

