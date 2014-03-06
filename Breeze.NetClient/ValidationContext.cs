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


}
