using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;

namespace Breeze.NetClient {
  /// <summary>
  /// Provides entity services to a <see cref="ComplexObject"/>.
  /// </summary>
  /// <remarks>
  /// The <b>ComplexAspect</b> provides verification and change tracking capaibilities to the ComplexObject.
  /// </remarks>
  public class ComplexAspect : StructuralAspect, INotifyDataErrorInfo {

    #region Ctors

    internal ComplexAspect(IComplexObject co, ComplexType complexType = null) 
      : base(co) {
      ComplexObject = co;
      co.ComplexAspect = this;
      ComplexType = complexType ?? MetadataStore.Instance.GetComplexType(co.GetType());
      InitializeDefaultValues();
    }

    // Note: the Parent and ParentProperty properties are assigned (if assigned) when it is first created within the context of a parentEntity
    // A complexAspect without these properties will be absorbed by a complexAspect with these properties during any assignment.

    // Note that this method creates a child and updates its refs to the parent but does
    // NOT update the parent. This is deliberate because instances of OriginalVersions should not be stored
    // in the parent objects refs whereas CurrentVersions should.
    internal static IComplexObject Create(IStructuralObject parent, DataProperty parentProperty) {
      var co = (IComplexObject)Activator.CreateInstance(parentProperty.ClrType);
      
      var aspect = co.ComplexAspect;
      
      aspect.ComplexType = parentProperty.ComplexType;
      aspect.Parent = parent;
      aspect.ParentProperty = parentProperty;
      
      return co;

    }

    #endregion

    #region Public properties

    public ComplexType ComplexType {
      get {
        return _complexType;
      }
      internal set {
        _complexType = value;
      }
    }
    

    /// <summary>
    /// Returns the wrapped IComplexObject.
    /// </summary>
    public IComplexObject ComplexObject {
      get { return _complexObject; }
      internal set { _complexObject = value; }
    }

    /// <summary>
    /// The parent object (either an Entity or a ComplexObject) to this ComplexObject.
    /// </summary>
    public IStructuralObject Parent {
      get { return _parent; }
      internal set { _parent = value; }
    }

    /// <summary>
    /// The EntityProperty of the <see cref="Parent"/> that contains this object.
    /// </summary>
    public DataProperty ParentProperty {
      get { return _parentProperty; }
      internal set { _parentProperty = value; }
    }

    /// <summary>
    /// The top level parent <see cref="IEntity"/> that owns this complex object.
    /// </summary>
    public IEntity ParentEntity {
      get {
        if (Parent == null) return null;
        var parentEntity = Parent as IEntity;
        if (parentEntity != null) {
          return parentEntity;
        } else {
          return (Parent as IComplexObject).ComplexAspect.ParentEntity;
        }
      }
    }

    /// <summary>
    /// The property on the top level parent entity that owns this complex object.
    /// </summary>
    public DataProperty ParentEntityProperty {
      get {
        if (Parent == null) return null;
        var parentCo = Parent as IComplexObject;
        if (parentCo == null) {
          return this.ParentProperty;
        } else {
          return parentCo.ComplexAspect.ParentEntityProperty;
        }
      }
    }

    /// <summary>
    /// The <see cref="T:IdeaBlade.EntityModel.EntityManager"/> that manages the <see cref="ParentEntity"/>.
    /// </summary>
    public EntityManager EntityManager {
      get {
        if (ParentEntity == null) return null;
        return ParentEntity.EntityAspect.EntityManager;
      }
    }

    private EntityAspect EntityAspect {
      get {
        if (ParentEntity == null) return null;
        return ParentEntity.EntityAspect;
      }
    }

    public override EntityVersion EntityVersion {
      get {
        if (ParentEntity == null) return EntityVersion.Current;
        return ParentEntity.EntityAspect.EntityVersion;
      }
      internal set {
        if (ParentEntity == null) return;
        ParentEntity.EntityAspect.EntityVersion = value;
      }
    }

    public override EntityState EntityState {
      get {
        if (ParentEntity == null) return EntityState.Detached;
        return ParentEntity.EntityAspect.EntityState;
      }
      set {
        if (ParentEntity == null) return;
        ParentEntity.EntityAspect.EntityState = value;
      }
    }

    #endregion

    #region internal and protected 

    internal bool IsDetached {
      get { return ParentEntity == null || ParentEntity.EntityAspect.IsDetached; }
    }

    internal bool IsAttached {
      get { return ParentEntity != null && ParentEntity.EntityAspect.IsAttached; }
    }

    internal void AbsorbCurrentValues(ComplexAspect sourceAspect) {

      this.ComplexType.DataProperties.ForEach(p => {
        var sourceValue = sourceAspect.GetValue(p);
        if (p.IsComplexProperty) {
          var targetChildCo = GetValue<IComplexObject>(p);
          var targetChildAspect = targetChildCo.ComplexAspect;
          var sourceChildAspect = ((IComplexObject) sourceValue).ComplexAspect;
          targetChildAspect.AbsorbCurrentValues(sourceChildAspect);
        } else {
          SetDpValue(p, sourceValue);
        }
      });
    }

    protected override StructuralType StructuralType {
      get { return this.ComplexType; }
    }

    protected override IStructuralObject StructuralObject {
      get { return this.ComplexObject; ; }
    }

    #endregion

    #region Get/Set Value

    internal void InitializeDefaultValues() {

      ComplexType.DataProperties.ForEach(dp => {
        try {         
          if (dp.IsComplexProperty) {
            SetDpValue(dp, ComplexAspect.Create(this.ComplexObject, dp));
          } else if (dp.DefaultValue != null) {
            SetDpValue(dp, dp.DefaultValue);
          }
        } catch (Exception e) {
          Debug.WriteLine("Exception caught during initialization of {0}.{1}: {2}", this.ComplexObject.GetType().Name, dp.Name, e.Message);
        }
      });
    }

    public override void SetValue(String propertyName, object newValue) {
      var prop = ComplexType.GetDataProperty(propertyName);
      if (prop != null) {
        SetDpValue(prop, newValue);
      } else {
        throw new Exception("Unable to locate property: " + ComplexType.Name + ":" + propertyName);
      }
    }

    protected internal override void SetDpValue(DataProperty property, object newValue) {
      if (this.IsDetached) {
        SetRawValue(property.Name, newValue);
        return;
      }

      if (!property.IsScalar) {
        throw new Exception("Nonscalar data properties are readonly - items may be added or removed but the collection may not be changed.");
      }

      var oldValue = GetValue(property);
      if (Object.Equals(oldValue, newValue)) return;
      EntityGroup entityGroup = null;

      if (ParentEntity != null) {
        entityGroup = EntityAspect.EntityGroup;

        // var changeNotificationEnabled = EntityState != EntityState.Detached && this.EntityGroup.ChangeNotificationEnabled;
        var changeNotificationEnabled = entityGroup.ChangeNotificationEnabled;

        if (changeNotificationEnabled) {
          if (! EntityAspect.FireEntityChanging(EntityAction.PropertyChange)) return;

          var propArgs = new EntityPropertyChangingEventArgs(this.ParentEntity, this.ParentEntityProperty, this.ComplexObject, property, newValue);

          entityGroup.OnEntityPropertyChanging(propArgs);
          if (propArgs.Cancel) return;
        }
      }

      if (property.IsComplexProperty) {
        SetDpValueComplex(property, newValue, oldValue);
      } else {
        SetDpValueSimple(property, newValue, oldValue);
      }

      if (ParentEntity != null) {
        if (EntityState.IsUnchanged() && !EntityManager.IsLoadingEntity) {
          EntityAspect.SetEntityStateCore(EntityState.Modified);
        }

        entityGroup.OnEntityPropertyChanged(new EntityPropertyChangedEventArgs(ParentEntity, this.ParentEntityProperty, this.ComplexObject, property, newValue));
        entityGroup.OnEntityChanged(new EntityChangedEventArgs(ParentEntity, EntityAction.PropertyChange));
      }


    }

    private void SetDpValueSimple(DataProperty property, object newValue, object oldValue) {
      
      // Actually set the value;
      SetRawValue(property.Name, newValue);

      UpdateBackupVersion(property, oldValue);

      if (this.IsAttached && !EntityManager.IsLoadingEntity) {

        //if (entityManager.validationOptions.validateOnPropertyChange) {
        //    entityAspect._validateProperty(newValue,
        //        { entity: entity, property: property, propertyName: propPath, oldValue: oldValue });
        //}
      }

    }

    private void SetDpValueComplex(DataProperty property, object newValue, object oldValue) {
      if (property.IsScalar) {
        if (newValue == null) {
          throw new Exception(String.Format("You cannot set the '{0}' property to null because it's datatype is the ComplexType: '{1}'", property.Name, property.ComplexType.Name));
        }
        var oldCo = (IComplexObject)oldValue;
        var newCo = (IComplexObject)newValue;
        oldCo.ComplexAspect.AbsorbCurrentValues(newCo.ComplexAspect);
      } else {
        throw new Exception(String.Format("You cannot set the non-scalar complex property: '{0}' on the type: '{1}'." +
            "Instead get the property and use collection functions like 'Add' and 'Remove' to change its contents.",
            property.Name, property.ParentType.Name));
      }

    }

    internal IComplexObject GetOriginalVersion() {
      var originalClone = Create(this.Parent, this.ParentProperty);
      var cloneAspect = originalClone.ComplexAspect;

      this.ComplexType.DataProperties.ForEach(p => {
        var ov = this.GetOriginalValue(p);
        cloneAspect.SetDpValue(p, ov);
      });
      return originalClone;
    }


    //private DateTime ConvertToSqlDateTime(DateTime dt) {
    //  var ticks = ((long)1E5) * (dt.Ticks / (long)1E5);
    //  var newDt = new DateTime(ticks);
    //  return newDt;
    //}

    #endregion

    #region INotifyDataErrorInfo

    /// <summary>
    /// True if there are any validation errors.
    /// </summary>
    bool INotifyDataErrorInfo.HasErrors {
      get {
        // TODO: implement this
        return false;

      }
    }

    /// <summary>
    /// Raised when validation errors have changed for a property or the object.
    /// </summary>
    event EventHandler<DataErrorsChangedEventArgs> INotifyDataErrorInfo.ErrorsChanged {
      add {
        _errorsChangedHandler += value;
      }
      remove {
        _errorsChangedHandler -= value;
      }
    }

    IEnumerable INotifyDataErrorInfo.GetErrors(string propertyName) {
      return null;
    }

    internal String PropertyPathPrefix {
      get {
        if (_propertyPathPrefix == null) {
          var name = this.ParentProperty.Name;
          var parent = this.Parent as IComplexObject;
          if (parent == null) {
            _propertyPathPrefix = name + ".";
          } else {
            _propertyPathPrefix = parent.ComplexAspect.PropertyPathPrefix + name + ".";
          }
        }
        return _propertyPathPrefix;
      }
    }

    /// <summary>
    /// Raises the ErrorsChanged event.
    /// </summary>
    /// <param name="propertyName"></param>
    private void OnErrorsChanged(String propertyName) {
      // _inErrorsChanged is needed because SL tries to reinvoke validation every time in the ErrorsChanged event fires.
      if (_inErrorsChanged) return;
      _inErrorsChanged = true;
      try {
        var handler = _errorsChangedHandler;
        if (handler != null) {
          handler(this, new DataErrorsChangedEventArgs(propertyName));
        }
      } finally {
        _inErrorsChanged = false;
      }
    }

    #endregion

    #region StructuralEquals

    /// <summary>
    /// Performs an equality comparison of complex objects determined by their constituent values.
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public bool StructuralEquals(Object obj) {
      var otherAspect = obj as ComplexAspect;
      if (otherAspect == null) return false;
      var theseValues = GetValues();
      var otherValues = otherAspect.GetValues();
      var areEqual = theseValues.Zip(otherValues, (o1, o2) => {
        if (o1 is IComplexObject) {
          return (((IComplexObject)o1).ComplexAspect).StructuralEquals(((IComplexObject)o2).ComplexAspect);
        } else {
          return Object.Equals(o1, o2);
        }
      }).All(b => b);
      return areEqual;
    }

    #endregion

    #region Fields

    private ComplexType _complexType;
    private IComplexObject _complexObject;
    private IStructuralObject _parent;
    private DataProperty _parentProperty;

    private String _propertyPathPrefix;
    private bool _inErrorsChanged = false;
    private event EventHandler<DataErrorsChangedEventArgs> _errorsChangedHandler;
    
    #endregion

  }

}
