using Breeze.Core;
using System;

namespace Breeze.NetClient {

  public class ValidationErrorCollection : MapCollection<String, ValidationError> {
    protected override String GetKeyForItem(ValidationError item) {
      return item.Key;
    }
  }

  /// <summary>
  /// 
  /// </summary>
  public class ValidationError {

    public ValidationError(Validator validator, ValidationContext context, String message = null, String key = null) {
      Validator = validator;
      Context = context;
      _message = message;
      key = key ?? validator.Name;
    }

    public Validator Validator { get; private set; }
    public ValidationContext Context { get; private set; }
    public String Message {
      get {
        if (_message == null) {
          _message = Validator.GetErrorMessage(Context);
        }
        return _message;
      }
    }
    public String Key {
      get {
        if (_key == null) {
          _key = GetKey(Validator, Context.Property);
        }
        return _key;
      }
      set {
        _key = value;
      }
    }

    // To obtain a key that can be used to remove an item from a validationErrorsCollection
    public static String GetKey(Validator validator, StructuralProperty property = null) {
      if (property != null) {
        return validator.Name + "_" + property.Name;
      } else {
        return validator.Name;
      }
    }

    private String _key; 
    private String _message;


  }

}
