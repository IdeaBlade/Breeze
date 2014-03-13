using Breeze.Core;
using System;
using System.Linq;

namespace Breeze.NetClient {

  public class ValidationErrorCollection : MapCollection<String, ValidationError> {
    public ValidationErrorCollection(EntityAspect entityAspect) {
      EntityAspect = entityAspect;
    }

    protected override String GetKeyForItem(ValidationError item) {
      return item.Key;
    }

    public override void Add(ValidationError item) {
      if (!this.Contains(item)) {
        base.Add(item);
        EntityAspect.OnErrorsChanged(item);
      } 
    }

    public override bool Remove(ValidationError item) {
      if (base.Remove(item)) {
        EntityAspect.OnErrorsChanged(item);
        return true;
      } else {
        return false;
      }
    }

    public override bool RemoveKey(string key) {
      var removedError = this[key];
      if (removedError != null) {
        base.RemoveKey(key);
        EntityAspect.OnErrorsChanged(removedError);
        return true;
      } else {
        return false;
      }
    }

    public override void Clear() {
      var oldErrors = this.ToList();
      base.Clear();
      oldErrors.ForEach(ve => EntityAspect.OnErrorsChanged(ve));
    }

    public EntityAspect EntityAspect {
      get;
      set;
    }
  }

  /// <summary>
  /// 
  /// </summary>
  public class ValidationError {

    public ValidationError(Validator validator, ValidationContext context, String message = null, String key = null) {
      Validator = validator;
      // clone it if mutated.
      Context = context.IsMutable ? new ValidationContext(context) : context;
      _message = message;
      _key = key;
    }

    public Validator Validator { get; private set; }
    public ValidationContext Context { get; internal set; }
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
          _key = GetKey(Validator, Context.PropertyPath);
        }
        return _key;
      }
      set {
        _key = value;
      }
    }
    public bool IsServerError { get; internal set; }

    // To obtain a key that can be used to remove an item from a validationErrorsCollection
    public static String GetKey(Validator validator, String propertyPath = null) {
      if (propertyPath != null) {
        return validator.Name + "_" + propertyPath;
      } else {
        return validator.Name;
      }
    }

    private String _key; 
    private String _message;


  }

}
