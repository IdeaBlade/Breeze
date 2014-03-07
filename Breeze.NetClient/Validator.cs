using Breeze.Core;
using Newtonsoft.Json;     // need because of JsonIgnore attribute
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Resources;

namespace Breeze.NetClient {

  // TODO: need to figure out how to correctly serialize/deserialize any changes to the default LocalizedMessage
  // right now these changes will be lost thru serialization.

  /// <summary>
  /// Validators are by convention immutable - if this convention is violated your app WILL break.
  /// You can use 'With' methods to change the message.  i.e. new RequiredValidator().With(new LocalizedMessage("foo"));
  /// </summary>
  public abstract class Validator : IJsonSerializable {

    static Validator() {
      RegisterValidators(typeof(Validator).GetTypeInfo().Assembly);
    }

    protected Validator() {
      Name = TypeToValidatorName(this.GetType());
      LocalizedMessage = new LocalizedMessage(LocalizedKey);
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
      internal protected set;
    }

    public static Validator FindOrCreate(JNode jNode) {
      lock (__validatorJNodeCache) {
        Validator vr;
        
        if (__validatorJNodeCache.TryGetValue(jNode, out vr)) {
          return vr;
        }

        vr = FromJNode(jNode);
        __validatorJNodeCache[jNode] = vr;
        return vr;
      }
    }

    public virtual ValidationError Validate(ValidationContext context) {
      return (ValidateCore(context)) ? null : new ValidationError(this, context);
    }

    protected abstract bool ValidateCore(ValidationContext context);


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

    internal static T Intern<T>(T validator) where T : Validator {
      if (validator._isInterned) return validator;
      var jNode = validator.ToJNode();

      lock (__validatorJNodeCache) {
        Validator cachedValidator;
        if (__validatorJNodeCache.TryGetValue(jNode, out cachedValidator)) {
          cachedValidator._isInterned = true;
          return (T)cachedValidator;
        } else {
          __validatorJNodeCache[jNode] = validator;
          validator._isInterned = true;
          return validator;
        }
      }
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

    private static Validator FromJNode(JNode jNode) {
      var vrName = jNode.Get<String>("name");
      Type vrType;
      if (!__validatorMap.TryGetValue(vrName, out vrType)) {
        throw new Exception("Unable to create a validator for " + vrName);
      }
      // Deserialize the object
      var vr = (Validator)jNode.ToObject(vrType, true);
      return vr;
    }

    internal JNode ToJNode() {
      // This ONLY works because of the immutability convention for all Validators.
      if (_jNode == null) {
        _jNode = JNode.FromObject(this, true);
      }
      return _jNode;
    }

    JNode IJsonSerializable.ToJNode(object config) {
      return ToJNode();
    }

    public override bool Equals(object obj) {
      if (obj == this) return true;
      var other = obj as Validator;
      if (other == null) return false;
      return this.ToJNode().Equals(other.ToJNode());
    }

    public override int GetHashCode() {
      // This ONLY works because of the immutability convention for all Validators.
      if (_hashCode == 0) {
        _hashCode = this.ToJNode().GetHashCode();
      }
      return _hashCode;
    }

    private JNode _jNode;
    private int _hashCode;
    private bool _isInterned;

    private static Object __lock = new Object();
    private static HashSet<Assembly> __assembliesProbed = new HashSet<Assembly>();
    private static Dictionary<String, Type> __validatorMap = new Dictionary<string, Type>();
    private static Dictionary<JNode, Validator> __validatorJNodeCache = new Dictionary<JNode, Validator>();
    private static readonly IEnumerable<ValidationError> EmptyErrors = Enumerable.Empty<ValidationError>();

    #region Not currently used 

    //public static T FindOrCreate<T>(params Object[] parameters) where T : Validator {
    //  return (T)FindOrCreate(typeof(T), parameters);
    //}

    //public static Validator FindOrCreate(Type type, params Object[] parameters) {
    //  var key = new ParamsWrapper(parameters);
    //  Validator vr;
    //  lock (__validatorParamsCache) {
    //    if (__validatorParamsCache.TryGetValue(key, out vr)) {
    //      return vr;
    //    }
    //    try {
    //      vr = (Validator)Activator.CreateInstance(type, parameters);
    //    } catch (Exception e) {
    //      throw new Exception("Unabled to create " + type.Name + " with the provided parameters", e);
    //    }
    //    __validatorParamsCache[key] = vr;
    //    return vr;
    //  }
    //}

    //private class ParamsWrapper {
    //  public ParamsWrapper(params Object[] values) {
    //    _values = values;
    //  }

    //  public override bool Equals(object obj) {
    //    if (obj == this) return true;
    //    var other = obj as ParamsWrapper;
    //    if (other == null) return false;
    //    return _values.SequenceEqual(other._values);
    //  }

    //  public override int GetHashCode() {
    //    return _values.GetAggregateHashCode();
    //  }

    //  private Object[] _values;
    //}

    //private static Dictionary<ParamsWrapper, Validator> __validatorParamsCache = new Dictionary<ParamsWrapper, Validator>();

    #endregion
  }

  public static class ValidatorExtns {
    public static T WithMessage<T>(this T validator, String message) where T: Validator {
      return WithMessage(validator, new LocalizedMessage(message));
    }

    public static T WithMessage<T>(this T validator, Type resourceType) where T:Validator {
      return WithMessage(validator, new LocalizedMessage(key: validator.LocalizedKey, resourceType: resourceType));
    }

    public static T WithMessage<T>(this T validator, String baseName, Assembly assembly) where T : Validator {
      return WithMessage(validator, new LocalizedMessage(key: validator.LocalizedKey, baseName: baseName, assembly: assembly));
    }

    // returns a new Validator cloned from the original with a new localizedMessage;
    public static T WithMessage<T>(this T validator, LocalizedMessage localizedMessage) where T:Validator {
      // Deserialize the object - poor mans clone;
      var vr = (Validator) validator.ToJNode().ToObject(validator.GetType(), true);
      vr.LocalizedMessage = localizedMessage;
      return (T) vr;
    }

    public static T Intern<T>(this T validator) where T : Validator {
      return Validator.Intern<T>(validator);
    }
  }

  public class ValidatorCollection : MapCollection<Validator, Validator> {

    public ValidatorCollection() : base() { }
    public ValidatorCollection(IEnumerable<Validator> validators) : base(validators) { }
    protected override Validator GetKeyForItem(Validator item) {
      return item.Intern();
    }

    public override void Add(Validator value) {
      value = value.Intern();
      base.Add(value);
    }

  }
}
