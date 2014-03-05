using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;
using System.Resources;

namespace Breeze.NetClient {

  /// <summary>
  /// 
  /// </summary>
  public abstract class ValidationRule {

    protected ValidationRule(String name) {
      Name = name;
    }

    public static ResourceManager DefaultResourceManager {
      get;
      set;
    }

    public String Name {
      get;
      private set; 
    }

    public ResourceManager ResourceManager {
      get {
        return _resourceManager ?? DefaultResourceManager;
      }
      set {
        _resourceManager = value;
        _messageTemplate = null;
      }
    }

    

    public virtual IEnumerable<ValidationError> Validate(ValidationContext context) {
      if (ValidateCore(context)) return EmptyErrors;
      return GetDefaultValidationErrors(context);
    }

    public virtual String GetErrorMessage(ValidationContext validationContext) {
      return MessageTemplate ?? "Error with rule " + this.Name;
    }

    protected String FormatMessage(String defaultTemplate, params Object[] parameters) {
      // '**' indicates that a defaultTemplate was used - i.e. a MessageTemplate could not be found.
      var template =  String.IsNullOrEmpty(MessageTemplate) ? defaultTemplate + " **" : MessageTemplate;
      return String.Format(template, parameters);
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
        _messageTemplate = value;
      }
    }

    

    protected abstract bool ValidateCore(ValidationContext context);
    

    protected IEnumerable<ValidationError> GetDefaultValidationErrors(ValidationContext context) {
      return Enumerable.Repeat(new ValidationError(this, context), 1) ;
    }


    public static readonly IEnumerable<ValidationError> EmptyErrors = Enumerable.Empty<ValidationError>();

    private ResourceManager _resourceManager;
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

  public class RequiredValidationRule : ValidationRule  {
    public RequiredValidationRule(bool treatEmptyStringAsNull = true) 
      : base("Required") {
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
      return FormatMessage("{0} is a required field.*", context.DisplayName);
    }
   
    public bool TreatEmptyStringAsNull {
      get;
      private set;
    }
  }

  public class PrimitiveTypeValidationRule<T> : ValidationRule {
    public PrimitiveTypeValidationRule(Type type) : base(type.Name) {
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
     public MaxLengthValidationRule(int maxLength) : base("MaxLength") {
      MaxLength = maxLength;  
    }

     protected override bool ValidateCore(ValidationContext context) {
       var value = context.PropertyValue;
       if (value == null) return true;
       return ((String) value).Length <= MaxLength;
     }

     public override String GetErrorMessage(ValidationContext context) {
       return FormatMessage("'{0}' must be {1} character(s) or less.", context.DisplayName, MaxLength);
     }
    
    public int MaxLength { get; private set; }
  }
 
}
