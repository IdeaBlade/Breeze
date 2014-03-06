using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;
using System.Resources;
using System.Reflection;
using Breeze.NetClient.Core;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using Newtonsoft.Json.Linq;
using System.Globalization;

namespace Breeze.NetClient {

  /// <summary>
  /// 
  /// </summary>
  public abstract class ValidationRule : IJsonSerializable {

    protected ValidationRule() {
      Name = TypeToRuleName(this.GetType());
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


    public static void RegisterRules(Assembly assembly) {
      lock (__lock) {
        var vrTypes = TypeFns.GetTypesImplementing(typeof(ValidationRule), Enumerable.Repeat(assembly, 1))
          .Where(t => {
            var ti = t.GetTypeInfo();
            return (!ti.IsAbstract) && ti.GenericTypeParameters.Length == 0;
          });
        vrTypes.ForEach(t => {
          var key = TypeToRuleName(t);
          __validationRuleMap[key] = t;
        });
      }
    }

    JNode IJsonSerializable.ToJNode(object config) {
      var jNode = JNode.FromObject(this, true);
      return jNode;
    }

    public static ValidationRule FromJNode(JNode jNode) {
      lock (__lock) {

        var name = jNode.Get<String>("name");
        ValidationRule vr;
        var jNodeKey = jNode.ToString();
        if (__validationRuleCache.TryGetValue(jNodeKey, out vr)) {
          return vr;
        }

        Type vrType;
        if (!__validationRuleMap.TryGetValue(name, out vrType)) {
          throw new Exception("Unable to create a validation rule for " + name);
        }
        vr = (ValidationRule)jNode.ToObject(vrType, true);
        __validationRuleCache[jNodeKey] = vr;
        return vr;
      }
    }

    public static ValidationRule FromRule(ValidationRule rule) {
      return FromJNode(((IJsonSerializable) rule).ToJNode(null));
    }

    private static String TypeToRuleName(Type type) {
      var typeName = type.Name;
      var name = (typeName.EndsWith("ValidationRule")) ? typeName.Substring(0, typeName.Length - 14) : typeName;
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

    private static Object __lock = new Object();
    private static Dictionary<String, Type> __validationRuleMap = new Dictionary<string, Type>();
    private static Dictionary<String, ValidationRule> __validationRuleCache = new Dictionary<String, ValidationRule>();
    private static readonly IEnumerable<ValidationError> EmptyErrors = Enumerable.Empty<ValidationError>();

    
  }


}
