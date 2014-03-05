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

namespace Breeze.NetClient {

  /// <summary>
  /// 
  /// </summary>
  public abstract class ValidationRule  {

    protected ValidationRule() {
      Name = TypeToRuleName(this.GetType());
    }

    

    public String Name {
      get;
      private set;
    }

    internal bool IsFrozen {
      get;
      set;
    }

    public static void RegisterRules(Assembly assembly) {
      lock (__lock) {
        var vrTypes = TypeFns.GetTypesImplementing(typeof(ValidationRule), Enumerable.Repeat(assembly, 1))
          .Where(t => {
            var ti = t.GetTypeInfo();
            return (!ti.IsAbstract) && ti.GenericTypeArguments.Length == 0;
          });
        vrTypes.ForEach(t => {
          var key = TypeToRuleName(t);
          __validationRuleMap[key] = t;
        });
      }
    }

    public JNode ToJNode() {
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
        vr = (ValidationRule) jNode.ToObject(vrType, true);
        __validationRuleCache[jNodeKey] = vr;
        return vr;
      }
    }

    private static String TypeToRuleName(Type type) {
      var typeName = type.Name;
      var name = (typeName.EndsWith("ValidationRule")) ? typeName.Substring(0, typeName.Length - 12) : typeName;
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

    public virtual IEnumerable<ValidationError> Validate(ValidationContext context) {
      if (ValidateCore(context)) return EmptyErrors;
      return GetDefaultValidationErrors(context);
    }

    protected abstract bool ValidateCore(ValidationContext context);


    protected IEnumerable<ValidationError> GetDefaultValidationErrors(ValidationContext context) {
      // return Enumerable.Repeat(new ValidationError(this, context), 1);
      return UtilFns.ToArray(new ValidationError(this, context));
    }

    #region Message handling

    public virtual String GetErrorMessage(ValidationContext validationContext) {
      return MessageTemplate ?? "Error with rule " + this.Name;
    }

    public Type ResourceType {
      get {
        return _resourceType;
      }
      set {
        ErrorIfFrozen();
        _resourceType = value;
        _resourceManager = null;
        _messageTemplate = null;
      }
    }

    public ResourceManager ResourceManager {
      get {
        if (_resourceManager == null) {
          _resourceManager = (ResourceType != null)
            ? new ResourceManager(ResourceType)
            : new ResourceManager("Breeze.NetClient.ValidationMessages", this.GetType().GetTypeInfo().Assembly);
        }
        return _resourceManager;
      }
      set {
        ErrorIfFrozen();
        _resourceManager = value;
        _messageTemplate = null;
      }
    }

    public String MessageTemplate {
      get {
        if (_messageTemplate != null) return _messageTemplate;
        var rm = ResourceManager;
        if (rm != null) {
          _messageTemplate = rm.GetString("Val_" + this.Name);
        } else {
          _messageTemplate = String.Empty;
        }

        return _messageTemplate;
      }
      private set {
        ErrorIfFrozen();
        _messageTemplate = value;
      }
    }

    protected String FormatMessage(String defaultTemplate, params Object[] parameters) {
      // '**' indicates that a defaultTemplate was used - i.e. a MessageTemplate could not be found.
      var template = String.IsNullOrEmpty(MessageTemplate) ? defaultTemplate + " **" : MessageTemplate;
      return String.Format(template, parameters);
    }

    #endregion

    /// <summary>
    /// Should be called by every public "Set" property or method.
    /// </summary>
    protected internal void ErrorIfFrozen() {
      if (IsFrozen) {
        throw new Exception("ValidationRule: " + this.Name + " is frozen.\nNo properties may be set on a frozen ValidationRule. ");
      }
    }


    public static readonly IEnumerable<ValidationError> EmptyErrors = Enumerable.Empty<ValidationError>();

    private ResourceManager _resourceManager;
    private Type _resourceType;
    private String _messageTemplate;
  }

  

  /// <summary>
  /// 
  /// </summary>
  public class ValidationContext {
    public ValidationContext(Object instance) {
      Instance = instance;
    }

    public ValidationContext(Object instance, Object propertyValue, StructuralProperty property = null) {
      Instance = instance;
      PropertyValue = propertyValue;
      Property = property;
    }

    public Object Instance { get; set; }
    public Object PropertyValue { get; set; }
    // May be null
    public StructuralProperty Property { get; set; }

    public String DisplayName {
      get {
        return _displayName ?? (Property == null ? Instance.ToString() : Property.DisplayName);
      }
      set {
        _displayName = value;
      }
    }

    private String _displayName;
  }

  /// <summary>
  /// 
  /// </summary>
  public class ValidationError {
    public ValidationError(ValidationRule rule, ValidationContext context, String message = null, String key = null) {
      Rule = rule;
      Context = context;
      _message = message;
      key = key ?? rule.Name;
    }
    public ValidationRule Rule { get; private set; }
    public ValidationContext Context { get; private set; }
    public String Message {
      get {
        if (_message == null) {
          _message = Rule.GetErrorMessage(Context);
        }
        return _message;
      }
    }
    public String Key { get; private set; }
    private String _message;


  }

  public class RequiredValidationRule : ValidationRule {
    public RequiredValidationRule(bool treatEmptyStringAsNull = true) {
      TreatEmptyStringAsNull = treatEmptyStringAsNull;
    }

    protected override bool ValidateCore(ValidationContext context) {
      var value = context.PropertyValue;
      if (value == null) return false;
      if (value.GetType() == typeof(String) && String.IsNullOrEmpty((String)value) && TreatEmptyStringAsNull) {
        return false;
      }
      return true;
    }

    public override String GetErrorMessage(ValidationContext context) {
      return FormatMessage("{0} is a required field.", context.DisplayName);
    }

    public bool TreatEmptyStringAsNull {
      get;
      private set;
    }
  }

  public class PrimitiveTypeValidationRule<T> : ValidationRule {
    public PrimitiveTypeValidationRule(Type type) {
      ValidationType = type;
    }

    protected override bool ValidateCore(ValidationContext context) {
      var value = context.PropertyValue;
      if (value == null) return true;
      if (value.GetType() == ValidationType) return true;
      return true;
    }

    public override String GetErrorMessage(ValidationContext context) {
      return FormatMessage("'{0}' value is not of type: {1}.", context.DisplayName, ValidationType.Name);
    }

    public Type ValidationType { get; private set; }
  }

  public class MaxLengthValidationRule : ValidationRule {
    public MaxLengthValidationRule(int maxLength) {
      MaxLength = maxLength;
    }

    //public MaxLengthValidationRule(JNode jNode) : base("MaxLength") {
    //  MaxLength = jNode.Get<Int32>("maxlength");
    //}

    //public JNode IJsonSerializable.ToJNode() {
    //  var jn = new JNode();
    //  jn.AddPrimitive("name", this.Name);
    //  jn.AddPrimitive("maxlength", this.MaxLength);
    //  return jn;
    //}

    protected override bool ValidateCore(ValidationContext context) {
      var value = context.PropertyValue;
      if (value == null) return true;
      return ((String)value).Length <= MaxLength;
    }

    public override String GetErrorMessage(ValidationContext context) {
      return FormatMessage("'{0}' must be {1} character(s) or less.", context.DisplayName, MaxLength);
    }

    public int MaxLength { get; private set; }
  }

  //public class RangeValidationRule<T> : ValidationRule {
  //  public RangeValidationRule(T? min, T? max, bool includeMinEndPoint = true, bool includeMaxEndPoint = true)
  //    : base("Range") {
  //    Min = min;
  //    Max = max;
  //    IncludeMinEndPoint = includeMinEndPoint;
  //    IncludeMaxEndPoint = includeMinEndPoint;
  //  }



  //  public T? Min {
  //    get;
  //    private set;
  //  }

  //  public bool IncludeMinEndPoint {
  //    get;
  //    private set;
  //  }

  //  public T? Max {
  //    get;
  //    private set;
  //  }

  //  public bool IncludeMaxEndPoint {
  //    get;
  //    private set;
  //  }

  //}

}
