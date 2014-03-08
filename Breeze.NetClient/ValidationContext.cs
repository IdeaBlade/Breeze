using System;

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

    public ValidationContext(ValidationContext vc) {
      Instance = vc.Instance;
      PropertyValue = vc.PropertyValue;
      Property = vc.Property;
    }

    public Object Instance { get; set; }
    public Object PropertyValue { get; set; }
    // May be null
    public StructuralProperty Property { get; set; }

    // should be set manually if this context is going to be changed after it is created.
    // this tells any object that recieve a ref to this object to clone it before saving it.
    // This is for perf reasons to avoid excessive creation of new ValidationContext objects,
    // by allowing them to be mutated as long as any other objects that store refs to these object
    // knows to clone them first;
    internal bool IsMutable {
      get;
      set;
    }

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
