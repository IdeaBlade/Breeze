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
  public class ComplexAspect : StructuralAspect, INotifyDataErrorInfo  {

    private ComplexAspect() { }

    protected override StructuralType StructuralType {
      get { return this.ComplexType; }
    }

    protected override IStructuralObject StructuralObject {
      get { return this.ComplexObject; ; }
    }



    internal void RejectChangesCore() {
      var co = this.ComplexObject;
      if (this.OriginalValuesMap != null) {
        this.OriginalValuesMap.ForEach(kvp => {
          SetValue(kvp.Key, kvp.Value);
        });
      }
      this.ProcessComplexProperties(co2 => co2.ComplexAspect.RejectChangesCore());
    }

    internal bool IsDetached {
      get { return ParentEntity == null || ParentEntity.EntityAspect.IsDetached; }
    }

    internal bool IsAttached {
      get { return ParentEntity != null && ParentEntity.EntityAspect.IsAttached; }
    }

    // Note: the Parent and ParentProperty properties are assigned either when a IComplexObject is assigned to a parent
    // or when it is first created via a Get from its parent.

    /// <summary>
    /// Wraps the provided <see cref="IComplexObject"/>.
    /// </summary>
    /// <param name="co"></param>
    /// <returns></returns>
    public static ComplexAspect Wrap(IComplexObject co) {
      if (co.ComplexAspect == null) {
        return new ComplexAspect(co);
      } else {
        return co.ComplexAspect;
      }
    }

    internal ComplexAspect(IComplexObject co) {
      _complexObject = co;
    }

    // Note that this method creates a child and updates its refs to the parent but does
    // NOT update the parent. This is deliberate because instances of OriginalVersions should not be stored
    // in the parent objects refs whereas CurrentVersions should.
    internal static IComplexObject Create(IStructuralObject parent, DataProperty parentProperty, bool initializeDefaultValues) {
      // the initializeDefaultValues flag should only be set to false, if all of the properties of this 
      // complex object are going to be set immediately after this call.
      var co = (IComplexObject)Activator.CreateInstance(parentProperty.ClrType);
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



    internal object GetValue(DataProperty property, EntityVersion version) {
      InitializeDefaultValues();

      if (version == EntityVersion.Default) {
        version = ParentEntity == null ? EntityVersion.Current : ParentEntity.EntityAspect.EntityVersion;
      }
      Object result;
      if (version == EntityVersion.Current) {
        if (this.ParentEntity != null && this.ParentEntity.EntityAspect.EntityVersion == EntityVersion.Proposed) {
          result = GetPreproposedValue(property);
        } else {
          result = GetValue(property);
        }
      } else if (version == EntityVersion.Original) {
        result = GetOriginalValue(property);
      } else if (version == EntityVersion.Proposed) {
        result = GetValue(property);
      } else {
        throw new ArgumentException("Invalid entity version");
      }

      if (property.IsComplexProperty) {
        var co = (IComplexObject)result;
        if (co == null) {
          co = Create(this.ComplexObject, property, true);
          SetValue(property, co);
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
            SetValue(dp, ComplexAspect.Create(this.ComplexObject, dp, true));
          } else if (dp.DefaultValue != null) {
            SetValue(dp, dp.DefaultValue);
          }
        } catch (Exception e) {
          Debug.WriteLine("Exception caught during initialization of {0}.{1}: {2}", this.ComplexObject.GetType().Name, dp.Name, e.Message);
        }
      });
    }


    internal void SetValueWithChangeNotification(DataProperty property, object newValue) {
      var oldValue = GetValue(property, EntityVersion.Default);
      if (Object.Equals(oldValue, newValue)) return;
      EntityGroup entityGroup = null;
      if (ParentEntity != null) {
        entityGroup = this.ParentEntity.EntityAspect.EntityGroup;

        if (!this.ParentEntity.EntityAspect.FireEntityChanging(EntityAction.PropertyChange)) return;
        // TODO: problem here is that if this is a nested property on a nested complex object - we need to send the
        // change event to the top level parent entity regarding the top level parent entity property ( not the property that is actually changing)
        // In turn we also need to send the "top level" complex object that is changing- but to do this we need to clone the
        // entire complex object - because it may be rejected. 

        var propArgs = new EntityPropertyChangingEventArgs(this.ParentEntity, this.ParentEntityProperty, this.ComplexObject, property, newValue);

        entityGroup.OnEntityPropertyChanging(propArgs);
        if (propArgs.Cancel) return;
      }

      SetValueWithChangeTracking(property, newValue);

      if (ParentEntity != null) {
        if (ParentEntity.EntityAspect.EntityState.IsUnchanged() && !EntityManager.IsLoadingEntity)  {
          ParentEntity.EntityAspect.SetEntityStateCore(EntityState.Modified);
        }

        entityGroup.OnEntityPropertyChanged(new EntityPropertyChangedEventArgs(ParentEntity, this.ParentEntityProperty, this.ComplexObject, property, newValue));
        entityGroup.OnEntityChanged(new EntityChangedEventArgs(ParentEntity, EntityAction.PropertyChange));
      }
    }

    internal void SetValueWithChangeTracking(DataProperty property, Object newValue) {
      TrackChange(property);
      SetValue(property, newValue);
    }

    public override void SetValue(String propertyName, object newValue) {
      SetValue(ComplexType.GetDataProperty(propertyName), newValue);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="property"></param>
    /// <param name="newValue"></param>
    internal void SetValue(DataProperty property, object newValue) {
      InitializeDefaultValues();

      if ( property.IsComplexProperty) {
        var thisAspect = GetValue<IComplexObject>(property).ComplexAspect;
        var newAspect = ((IComplexObject)newValue).ComplexAspect;
        thisAspect.AbsorbCurrentValues(newAspect);
      } else {
        SetValue(property, newValue);
      }
    }

    internal IComplexObject GetOriginalVersion() {
      var originalClone = Create(this.Parent, this.ParentProperty, false);
      var cloneAspect = originalClone.ComplexAspect;

      this.ComplexType.DataProperties.ForEach(p => {
        var ov = this.GetOriginalValue(p);
        cloneAspect.SetValue(p, ov);
      });
      return originalClone;
    }



    private Object GetOriginalValue(DataProperty property) {
      object result;
      if (property.IsComplexProperty) {
        var co = (IComplexObject)GetValue(property, EntityVersion.Current);
        return co.ComplexAspect.GetOriginalVersion();
      } else {
        if (OriginalValuesMap != null && OriginalValuesMap.TryGetValue(property.Name, out result)) {
          return result;
        } else {
          return GetValue(property);
        }
      }
    }

    private Object GetPreproposedValue(DataProperty property) {
      object result;
      if ( PreproposedValuesMap != null && PreproposedValuesMap.TryGetValue(property.Name, out result)) {
        return result;
      } else {
        return GetValue(property);
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
      if (OriginalValuesMap == null) {
        OriginalValuesMap = new OriginalValuesMap();
      }

      if (OriginalValuesMap.ContainsKey(property.Name)) return;
      // reference copy of complex object is deliberate - actual original values will be stored in the co itself.
      OriginalValuesMap.Add(property.Name, GetValue(property.Name));
    }

    private void BackupProposedValueIfNeeded(DataProperty property) {
      if (PreproposedValuesMap == null) {
        PreproposedValuesMap = new BackupValuesMap();
      }

      if (PreproposedValuesMap.ContainsKey(property.Name)) return;
      PreproposedValuesMap.Add(property.Name, GetValue(property.Name));
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
        if (OriginalValuesMap != null) {
          ClearBackupVersionCore(version);
          OriginalValuesMap = null;
        }
      } else if (version == EntityVersion.Proposed) {
        if (PreproposedValuesMap != null) {
          ClearBackupVersionCore(version);
          PreproposedValuesMap = null;
        }
      }
    }

    private void ClearBackupVersionCore(EntityVersion version) {
      this.ComplexType.DataProperties.Where(dp => dp.IsComplexProperty).ForEach(dp => {
        var co = GetValue<IComplexObject>(dp);
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
        if (OriginalValuesMap != null) {
          RestoreOriginalValues(OriginalValuesMap, version);
          OriginalValuesMap = null;
        }
      } else if (version == EntityVersion.Proposed) {
        if (PreproposedValuesMap != null) {
          RestoreOriginalValues(PreproposedValuesMap, version);
          PreproposedValuesMap = null;
        }
      }
    }

    private void RestoreOriginalValues(BackupValuesMap backupMap, EntityVersion version) {
      backupMap.ForEach(kvp => {
        var value = kvp.Value;
        if (value is IComplexObject) {
          ((IComplexObject)value).ComplexAspect.RestoreBackupVersion(version);
        }
        SetValue(kvp.Key, value);
        
      });
    }


    #endregion

    #region Misc private and internal methods/properties


    internal void AbsorbCurrentValues(ComplexAspect sourceAspect, bool isCloning = false) {
      if (isCloning) {
        if (sourceAspect.OriginalValuesMap != null) {
          this.OriginalValuesMap = new OriginalValuesMap(sourceAspect.OriginalValuesMap);
        }
      }

      this.ComplexType.DataProperties.ForEach(p => {
        var sourceValue = sourceAspect.GetValue(p);
        if (p.IsComplexProperty) {
          var thisChildCo = (IComplexObject) GetValue(p);
          if (thisChildCo == null) {
            thisChildCo = ComplexAspect.Create(this.ComplexObject, p, true);
            SetValue(p.Name, thisChildCo);
          }
          var thisChildAspect = thisChildCo.ComplexAspect;

          var sourceCo = (IComplexObject)sourceValue;
          if (sourceCo == null) {
            sourceCo = ComplexAspect.Create(sourceAspect.ComplexObject, p, true);
            sourceAspect.SetValue(p, sourceCo);
          }
          var sourceChildAspect = sourceCo.ComplexAspect;

          thisChildAspect.AbsorbCurrentValues(sourceChildAspect, isCloning);
        } else {
          SetValue(p, sourceValue);
        }
      });
    }

    

    internal Object[] GetCurrentValues() {
      var props = ComplexType.DataProperties;
      var currentValues = props.Select(p => GetValue(p)).ToArray();
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
    
    
    private IComplexObject _complexObject;
    
    // private Object[] _currentValues;
    // Required on Server in order to determine what props have changed.
    

    // do not need to be serialized
    private IStructuralObject _parent;
    private DataProperty _parentProperty;
    
    #endregion

  }

}
