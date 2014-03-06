using Breeze.Core;
using Breeze.NetClient.Core;
using Newtonsoft.Json;     // need because of JsonIgnore attribute
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Breeze.NetClient {

  // TODO: need to figure out how to correctly serialize/deserialize any changes to the default LocalizedMessage
  // right now these changes will be lost thru serialization.

  /// <summary>
  /// 
  /// </summary>
  public abstract class Validator : IJsonSerializable {

    protected Validator() {
      Name = TypeToValidatorName(this.GetType());
    }

    public String Name {
      get;
      private set;
    }

    [JsonIgnore]
    public String LocalizedKey {
      get { return "Val_" + Name; }
    }

    [JsonIgnore]
    public LocalizedMessage LocalizedMessage {
      get;
      protected set;
    }

    public static T FindOrCreate<T>(params Object[] parameters) where T:Validator {
      return (T)FindOrCreate(typeof(T), parameters);
    }

    public static T GetCachedVersion<T>(T validator) where T : Validator {
      var jNode = ((IJsonSerializable)validator).ToJNode(null);
      RegisterValidators(validator.GetType().GetTypeInfo().Assembly);
      return (T)FindOrCreate(jNode);
    }

    public static Validator FindOrCreate(Type type, params Object[] parameters) {
      var key = new ParamsWrapper(parameters);
      Validator vr;
      lock (__validatorParamsCache) {
        if (__validatorParamsCache.TryGetValue(key, out vr)) {
          return vr;
        }
        try {
          vr = (Validator)Activator.CreateInstance(type, parameters);
        } catch (Exception e) {
          throw new Exception("Unabled to create " + type.Name + " with the provided parameters", e);
        }
        __validatorParamsCache[key] = vr;
        return vr;
      }
    }

    public static Validator FindOrCreate(JNode jNode) {
      lock (__validatorJsonCache) {
        Validator vr;
        var key = jNode.ToString();
        if (__validatorJsonCache.TryGetValue(key, out vr)) {
          return vr;
        }

        var vrName = jNode.Get<String>("name");
        Type vrType;
        if (!__validatorMap.TryGetValue(vrName, out vrType)) {
          throw new Exception("Unable to create a validator for " + vrName);
        }
        // Deserialize the object
        // TODO: look at directing deserialization thru the params version of CreateOrFind
        vr = (Validator)jNode.ToObject(vrType, true);
        __validatorJsonCache[key] = vr;
        return vr;
      }
    }

    public virtual IEnumerable<ValidationError> Validate(ValidationContext context) {
      if (ValidateCore(context)) return EmptyErrors;
      return GetDefaultValidationErrors(context);
    }

    protected abstract bool ValidateCore(ValidationContext context);


    protected IEnumerable<ValidationError> GetDefaultValidationErrors(ValidationContext context) {
      // return Enumerable.Repeat(new ValidationError(this, context), 1);
      return UtilFns.ToArray(new ValidationError(this, context));
    }

    public abstract String GetErrorMessage(ValidationContext validationContext);


    public static void RegisterValidators(Assembly assembly) {
      lock (__lock) {
        if (__assembliesProbed.Contains(assembly)) return;
        var vrTypes = TypeFns.GetTypesImplementing(typeof(Validator), Enumerable.Repeat(assembly, 1))
          .Where(t => {
            var ti = t.GetTypeInfo();
            return (!ti.IsAbstract) && ti.GenericTypeParameters.Length == 0;
          });
        vrTypes.ForEach(t => {
          var key = TypeToValidatorName(t);
          __validatorMap[key] = t;
        });
        __assembliesProbed.Add(assembly);
      }
    }

    JNode IJsonSerializable.ToJNode(object config) {
      // TODO: think about caching this - assuming that the Validator is immutable.
      var jNode = JNode.FromObject(this, true);
      return jNode;
    }


    private static String TypeToValidatorName(Type type) {
      var typeName = type.Name;
      var name = (typeName.EndsWith("Validator")) ? typeName.Substring(0, typeName.Length - "Validator".Length) : typeName;
      name = ToCamelCase(name);
      return name;
    }

    private static String ToCamelCase(String s) {
      if (s.Length > 1) {
        return s.Substring(0, 1).ToLower() + s.Substring(1);
      } else if (s.Length == 1) {
        return s.Substring(0, 1).ToLower();
      } else {
        return s;
      }
    }

    private class ParamsWrapper {
      public ParamsWrapper(params Object[] values) {
        _values = values;
      }

      public override bool Equals(object obj) {
        if (obj == this) return true;
        var other = obj as ParamsWrapper;
        if (other == null) return false;
        return _values.SequenceEqual(other._values);
      }

      public override int GetHashCode() {
        return _values.GetAggregateHashCode();
      }

      private Object[] _values;
    }

    private static Object __lock = new Object();
    private static HashSet<Assembly> __assembliesProbed = new HashSet<Assembly>();
    private static Dictionary<String, Type> __validatorMap = new Dictionary<string, Type>();
    private static Dictionary<String, Validator> __validatorJsonCache = new Dictionary<String, Validator>();
    private static Dictionary<ParamsWrapper, Validator> __validatorParamsCache = new Dictionary<ParamsWrapper, Validator>();
    private static readonly IEnumerable<ValidationError> EmptyErrors = Enumerable.Empty<ValidationError>();


  }


}
