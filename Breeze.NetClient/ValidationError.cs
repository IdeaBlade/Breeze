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
    public String Key {
      get {
        if (_key == null) {
          _key = GetKey(Rule, Context.Property);
        }
        return _key;
      }
      set {
        _key = value;
      }
    }

    // To obtain a key that can be used to remove an item from a validationErrorsCollection
    public static String GetKey(ValidationRule rule, StructuralProperty property = null) {
      if (property != null) {
        return rule.Name + "_" + property.Name;
      } else {
        return rule.Name;
      }
    }

    private String _key; 
    private String _message;


  }

}
