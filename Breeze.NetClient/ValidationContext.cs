using System;

namespace Breeze.NetClient {

  /// <summary>
  /// 
  /// </summary>
  public class ValidationContext {

    public ValidationContext(IStructuralObject so) {
      Entity = so as IEntity;
      if (Entity == null) {
        ComplexObject = (IComplexObject)so;
        Entity = ComplexObject.ComplexAspect.ParentEntity;
      }
    }

    public ValidationContext(IStructuralObject so, StructuralProperty property, Object propertyValue) 
      : this(so) {
      Property = property;
      PropertyValue = propertyValue;
    }


    public ValidationContext(ValidationContext vc) {
      Entity = vc.Entity;
      Property = vc.Property;
      PropertyValue = vc.PropertyValue;
      ComplexObject = vc.ComplexObject;
    }

    public IEntity Entity { get; set; }
    public Object PropertyValue { get; set; }
    // May be null
    public StructuralProperty Property { get; set; }
    public IComplexObject ComplexObject { get; set; }

    public String PropertyPath {
      get {
        if (Property == null) return null;
        if (ComplexObject == null) return Property.Name;
        return ComplexObject.ComplexAspect.GetPropertyPath(Property.Name);
      }
    }

    // should be set manually if this context is going to be changed after it is created.
    // this tells any object that recieve a ref to this object to clone it before storing it.
    // This is for perf reasons to avoid excessive creation of new ValidationContext objects,
    // by allowing them to be mutated as long as any other objects know that they are mutable
    // and that if they need to store refs to these objects that they should clone them first;
    internal bool IsMutable {
      get;
      set;
    }

    public String DisplayName {
      get {
        return _displayName ?? (Property == null ? Entity.ToString() : Property.DisplayName);
      }
      set {
        _displayName = value;
      }
    }

    private String _displayName;
  }

}
