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
  public class ComplexAspect : INotifyDataErrorInfo  {

    private ComplexAspect() { }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="obj"></param>
    [Conditional("DEBUG")]
    public static void ViolationCheck(object obj) {
      if (obj is ComplexAspect) {
        throw new InvalidOperationException("A ComplexAspect instance should not get here.");
      }
    }

    // Note: the Parent and ParentProperty properties are assigned either when a IComplexObject is assigned to a parent
    // or when it is first created via a Get from its parent.

    /// <summary>
    /// Wraps the provided <see cref="IComplexObject"/>.
    /// </summary>
    /// <param name="co"></param>
    /// <returns></returns>
    public static ComplexAspect Wrap(IComplexObject co) {
      ViolationCheck(co);

      if (co.ComplexAspect == null) {
        return new ComplexAspect(co);
      } else {
        return co.ComplexAspect;
      }
    }

    internal ComplexAspect(IComplexObject co) {
      ViolationCheck(co);
      _complexObject = co;
    }

    // Note that this method creates a child and updates its refs to the parent but does
    // NOT update the parent. This is deliberate because instances of OriginalVersions should not be stored
    // in the parent objects refs whereas CurrentVersions should.
    internal static IComplexObject Create(IStructuralObject parent, DataProperty parentProperty, bool initializeDefaultValues) {
      // the initializeDefaultValues flag should only be set to false, if all of the properties of this 
      // complex object are going to be set immediately after this call.
      EntityAspect.ViolationCheck(parent);
      ComplexAspect.ViolationCheck(parent);
      var co = (IComplexObject)Activator.CreateInstance(parentProperty.DataType.ClrType);
      var aspect = co.ComplexAspect;
      aspect.Parent = parent;
      aspect.ParentProperty = parentProperty;
      if (initializeDefaultValues) {
        aspect.InitializeDefaultValues();
      } else {
        // since we are bypassing defaultValueInitialization insure that we don't trigger
        // defaultValue creation later. 
        aspect._defaultValuesInitialized = true;
      }
      return co;
    }

    #region Public properties


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
      internal set {
        ComplexAspect.ViolationCheck(value);
        _parent = value;
      }
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
        return ParentEntity.EntityAspect.InternalEntityManager;
      }
    }

    public ComplexType ComplexType {
      get;
      private set;
    }

    #endregion


    #region INotifyDataErrorInfo

    /// <summary>
    /// True if there are any validation errors.
    /// </summary>
    bool INotifyDataErrorInfo.HasErrors {
      get {
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
          _propertyPathPrefix = GetPropertyPathPrefix();
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

 
    private String GetPropertyPathPrefix() {
      var name = this.ParentProperty.Name;
      var parent = this.Parent as IComplexObject;
      if (parent == null) {
        return name + ".";
      } else {
        return parent.ComplexAspect.PropertyPathPrefix + name + ".";
      }
    }



    private String _propertyPathPrefix;
    private bool _inErrorsChanged = false;
    private event EventHandler<DataErrorsChangedEventArgs> _errorsChangedHandler;

    #endregion



    internal object GetValueRaw(DataProperty property, EntityVersion version) {
      InitializeDefaultValues();

      if (version == EntityVersion.Default) {
        version = ParentEntity == null ? EntityVersion.Current : ParentEntity.EntityAspect.EntityVersion;
      }
      Object result;
      if (version == EntityVersion.Current) {
        if (this.ParentEntity != null && this.ParentEntity.EntityAspect.EntityVersion == EntityVersion.Proposed) {
          result = GetPreproposedValue(property);
        } else {
          result = this.ComplexObject.GetValueRaw(property.Name);
        }
      } else if (version == EntityVersion.Original) {
        result = GetOriginalValue(property);
      } else if (version == EntityVersion.Proposed) {
        result = this.ComplexObject.GetValueRaw(property.Name);
      } else {
        throw new ArgumentException("Invalid entity version");
      }

      if (property.IsComplexProperty) {
        var co = (IComplexObject)result;
        if (co == null) {
          co = Create(this.ComplexObject, property, true);
          this.ComplexObject.SetValueRaw(property.Name, co);
          return co;
        } else if (co.ComplexAspect.Parent == null || co.ComplexAspect.Parent != _complexObject) {
          co.ComplexAspect.Parent = _complexObject;
          co.ComplexAspect.ParentProperty = property;
        }
        return co;
      } else {
        return result;
      }
    }

    internal void InitializeDefaultValues() {

      if (_defaultValuesInitialized) return;

      IEnumerable<DataProperty> properties = ComplexType.DataProperties;

      _defaultValuesInitialized = true;

      properties.ForEach(dp => {
        try {
          
          if (dp.IsComplexProperty) {
            this.ComplexObject.SetValueRaw(dp.Name, ComplexAspect.Create(this.ComplexObject, dp, true));
          } else if (dp.DefaultValue != null) {
            this.ComplexObject.SetValueRaw(dp.Name, dp.DefaultValue);
          }
        } catch (Exception e) {
          Debug.WriteLine("Exception caught during initialization of {0}.{1}: {2}", this.ComplexObject.GetType().Name, dp.Name, e.Message);
        }
      });
    }


    internal void SetValueWithChangeNotification(DataProperty property, object newValue) {
      var oldValue = GetValueRaw(property, EntityVersion.Default);
      if (Object.Equals(oldValue, newValue)) return;
      EntityGroup entityGroup = null;
      if (ParentEntity != null) {
        entityGroup = this.ParentEntity.EntityAspect.EntityGroup;

        if (!this.ParentEntity.EntityAspect.FireEntityChanging(EntityAction.Change)) return;
        // TODO: problem here is that if this is a nested property on a nested complex object - we need to send the
        // change event to the top level parent entity regarding the top level parent entity property ( not the property that is actually changing)
        // In turn we also need to send the "top level" complex object that is changing- but to do this we need to clone the
        // entire complex object - because it may be rejected. 

        var propArgs = new EntityPropertyChangingEventArgs(this.ParentEntity.EntityAspect, this.ParentEntityProperty, this, property, newValue);

        entityGroup.OnEntityPropertyChanging(propArgs);
        if (propArgs.Cancel) return;
      }

      SetValueWithChangeTracking(property, newValue);

      if (ParentEntity != null) {
        if (ParentEntity.EntityAspect.EntityState.IsUnchanged() && (EntityManager != null && !EntityManager.IsLoadingEntity) ) {
          ParentEntity.EntityAspect.SetEntityStateCore(EntityState.Modified);
        }

        entityGroup.OnEntityPropertyChanged(new EntityPropertyChangedEventArgs(ParentEntity.EntityAspect, this.ParentEntityProperty, this, property, newValue));
        entityGroup.OnEntityChanged(new EntityChangedEventArgs(ParentEntity.EntityAspect, EntityAction.Change));
      }
    }

    internal void SetValueWithChangeTracking(DataProperty property, Object newValue) {
      TrackChange(property);
      SetValueRaw(property, newValue);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="property"></param>
    /// <param name="newValue"></param>
    internal void SetValueRaw(DataProperty property, object newValue) {
      InitializeDefaultValues();

      if ( property.IsComplexProperty) {
        var thisAspect = ((IComplexObject) this.ComplexObject.GetValueRaw(property.Name)).ComplexAspect;
        var newAspect = ((IComplexObject)newValue).ComplexAspect;
        thisAspect.AbsorbCurrentValues(newAspect);
      } else {
        this.ComplexObject.SetValueRaw(property.Name, newValue);
      }
    }

    internal IComplexObject GetOriginalVersion() {
      var originalClone = Create(this.Parent, this.ParentProperty, false);
      var cloneAspect = originalClone.ComplexAspect;

      this.ComplexType.DataProperties.ForEach(p => {
        var ov = this.GetOriginalValue(p);
        cloneAspect.ComplexObject.SetValueRaw(p.Name, ov);
      });
      return originalClone;
    }



    private Object GetOriginalValue(DataProperty property) {
      object result;
      if (property.IsComplexProperty) {
        var co = (IComplexObject)GetValueRaw(property, EntityVersion.Current);
        return co.ComplexAspect.GetOriginalVersion();
      } else {
        if (_originalValuesMap != null && _originalValuesMap.TryGetValue(property.Name, out result)) {
          return result;
        } else {
          return this.ComplexObject.GetValueRaw(property.Name);
        }
      }
    }

    private Object GetPreproposedValue(DataProperty property) {
      object result;
      if (_preproposedValuesMap != null && _preproposedValuesMap.TryGetValue(property.Name, out result)) {
        return result;
      } else {
        return this.ComplexObject.GetValueRaw(property.Name);
      }
    }

    private DateTime ConvertToSqlDateTime(DateTime dt) {
      var ticks = ((long)1E5) * (dt.Ticks / (long)1E5);
      var newDt = new DateTime(ticks);
      return newDt;
    }


    #region TrackChanges methods

    internal void TrackChange(DataProperty property) {
      if (ParentEntity == null) return;
      // need to tell parent about this but the parent is not actually
      // going to hold the backup data - the complex object is.
      this.ParentEntity.EntityAspect.TrackChange(this.ParentEntityProperty);
      if (this.ParentEntity.EntityAspect.EntityVersion == EntityVersion.Current) {
        BackupOriginalValueIfNeeded(property);
      } else if (this.ParentEntity.EntityAspect.EntityVersion == EntityVersion.Proposed) {
        // need to do both
        BackupOriginalValueIfNeeded(property);
        BackupProposedValueIfNeeded(property);
      }
    }

    private void BackupOriginalValueIfNeeded(DataProperty property) {
      if (ParentEntity.EntityAspect.EntityState.IsAdded()) return;
      if (ParentEntity.EntityAspect.EntityState.IsDetached()) return;
      if (_originalValuesMap == null) {
        _originalValuesMap = new OriginalValuesMap();
      }

      if (_originalValuesMap.ContainsKey(property.Name)) return;
      // reference copy of complex object is deliberate - actual original values will be stored in the co itself.
      _originalValuesMap.Add(property.Name, this.ComplexObject.GetValueRaw(property.Name));
    }

    private void BackupProposedValueIfNeeded(DataProperty property) {
      if (_preproposedValuesMap == null) {
        _preproposedValuesMap = new BackupValuesMap();
      }

      if (_preproposedValuesMap.ContainsKey(property.Name)) return;
      _preproposedValuesMap.Add(property.Name, this.ComplexObject.GetValueRaw(property.Name));
    }

    #endregion

    #region Backup version members

    /// <summary>
    /// 
    /// </summary>
    /// <param name="version"></param>
    internal void ClearBackupVersion(EntityVersion version) {

      if (version == EntityVersion.Original) {
        // this will only occur on an accept changes call.
        if (_originalValuesMap != null) {
          ClearBackupVersionCore(version);
          _originalValuesMap = null;
        }
      } else if (version == EntityVersion.Proposed) {
        if (_preproposedValuesMap != null) {
          ClearBackupVersionCore(version);
          _preproposedValuesMap = null;
        }
      }
    }

    private void ClearBackupVersionCore(EntityVersion version) {
      this.ComplexType.DataProperties.Where(dp => dp.IsComplexProperty).ForEach(dp => {
        var co = (IComplexObject) this.ComplexObject.GetValueRaw(dp.Name);
        if (co != null) {
          co.ComplexAspect.ClearBackupVersion(version);
        }
      });
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="version"></param>
    internal void RestoreBackupVersion(EntityVersion version) {
      if (version == EntityVersion.Original) {
        if (_originalValuesMap != null) {
          RestoreOriginalValues(_originalValuesMap, version);
          _originalValuesMap = null;
        }
      } else if (version == EntityVersion.Proposed) {
        if (_preproposedValuesMap != null) {
          RestoreOriginalValues(_preproposedValuesMap, version);
          _preproposedValuesMap = null;
        }
      }
    }

    private void RestoreOriginalValues(BackupValuesMap backupMap, EntityVersion version) {
      backupMap.ForEach(kvp => {
        var value = kvp.Value;
        if (value is IComplexObject) {
          ((IComplexObject)value).ComplexAspect.RestoreBackupVersion(version);
        }
        this.ComplexObject.SetValueRaw(kvp.Key, value);
        
      });
    }


    #endregion

    #region Misc private and internal methods/properties

    private IStructuralObject ParentToStructuralObject(Object parent) {
      if (parent is IEntity) {
        return ((IEntity)parent).EntityAspect;
      } else {
        return ((IComplexObject)parent).ComplexAspect;
      }
    }

    internal void AbsorbCurrentValues(ComplexAspect sourceAspect, bool isCloning = false) {
      if (isCloning) {
        if (sourceAspect._originalValuesMap != null) {
          this._originalValuesMap = new OriginalValuesMap(sourceAspect._originalValuesMap);
        }
      }

      this.ComplexType.DataProperties.ForEach(p => {
        var sourceValue = sourceAspect.ComplexObject.GetValueRaw(p.Name);
        if (p.IsComplexProperty) {
          var thisChildCo = (IComplexObject) this.ComplexObject.GetValueRaw(p.Name);
          if (thisChildCo == null) {
            thisChildCo = ComplexAspect.Create(this.ComplexObject, p, true);
            this.ComplexObject.SetValueRaw(p.Name, thisChildCo);
          }
          var thisChildAspect = thisChildCo.ComplexAspect;

          var sourceCo = (IComplexObject)sourceValue;
          if (sourceCo == null) {
            sourceCo = ComplexAspect.Create(sourceAspect.ComplexObject, p, true);
            sourceAspect.ComplexObject.SetValueRaw(p.Name, sourceCo);
          }
          var sourceChildAspect = sourceCo.ComplexAspect;

          thisChildAspect.AbsorbCurrentValues(sourceChildAspect, isCloning);
        } else {
          var so = this as IStructuralObject;
          so.SetValueWithChangeNotification(p, sourceValue);
        }
      });
    }

    

    internal Object[] GetCurrentValues() {
      var props = ComplexType.DataProperties;
      var currentValues = props.Select(p => this.ComplexObject.GetValueRaw(p.Name)).ToArray();
      return currentValues;
    }

    #endregion

    #region Equals and HashCode

    /// <summary>
    /// Equality comparison .  No two independent Complex objects are ever equal - Reference equality is used.
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    /// <remarks>Do NOT override this implementation because it can cause Entity Framework saves to fail.  The 
    /// Entity framework assumes reference equality for Complex types.</remarks>
    public override bool Equals(object obj) {
      return Object.ReferenceEquals(this, obj);
    }


    /// <summary>
    /// 
    /// </summary>
    /// <returns></returns>
    public override int GetHashCode() {
      return base.GetHashCode();
    }

    /// <summary>
    /// Performs an equality comparison of complex objects determined by their constituent values.
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public bool StructuralEquals(object obj) {
      var aspect = obj as ComplexAspect;
      if (aspect == null) return false;
      var areEqual = this.GetCurrentValues().Zip(aspect.GetCurrentValues(), (o1, o2) => {
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
    
    private bool _defaultValuesInitialized;
    private IComplexObject _complexObject;
    
    // private Object[] _currentValues;
    // Required on Server in order to determine what props have changed.
    
    internal OriginalValuesMap _originalValuesMap;
    private BackupValuesMap _preproposedValuesMap;

    // do not need to be serialized
    private IStructuralObject _parent;
    private DataProperty _parentProperty;
    
    #endregion

  }

}
