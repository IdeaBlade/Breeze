using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;
using System.Collections;
using System.Runtime.CompilerServices;
using System.Collections.ObjectModel;

namespace Breeze.NetClient {
  public interface IHasBackingStore {
    IDictionary<String, Object> BackingStore { get; set; }
  }

  public abstract class StructuralAspect {

    public StructuralAspect(IStructuralObject stObj) {
      _backingStore = (stObj is IHasBackingStore) ? null : new Dictionary<String, Object>();
    }

    #region Public/protected properties 

    public abstract EntityState EntityState { get; set; }

    public abstract EntityVersion EntityVersion { get; internal set;  }
     
    public abstract StructuralType StructuralType { get; }

    protected abstract IStructuralObject StructuralObject { get; }

    protected internal IDictionary<String, Object> BackingStore {
      get {
        return _backingStore ?? ((IHasBackingStore)StructuralObject).BackingStore;
      }
      set {
        if (_backingStore != null) {
          _backingStore = value;
        } else {
          ((IHasBackingStore)StructuralObject).BackingStore = value;
        }

      }
    }

    #endregion

    #region Get/Set value

    protected internal Object GetRawValue(String propertyName) {
      Object val = null;
      BackingStore.TryGetValue(propertyName, out val);
      return val;
    }

    protected internal void SetRawValue(string propertyName, Object value) {
      BackingStore[propertyName] = value;
    }

    public Object GetValue(String propertyName) {
      // TODO: will be different when we add property interception.
      return GetRawValue(propertyName);
    }

    public Object GetValue(StructuralProperty prop) {
      return GetValue(prop.Name);
    }

    public T GetValue<T>(StructuralProperty prop) {
      return (T) GetRawValue(prop.Name);
    }

    public T GetValue<T>(String propertyName) {
      return (T) GetRawValue(propertyName);
    }

    public Object GetValue(DataProperty property, EntityVersion version) {

      if (version == EntityVersion.Default) {
        version = EntityVersion;
      }

      Object result;
      if (version == EntityVersion.Current) {
        if (this.EntityVersion == EntityVersion.Proposed) {
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
        if (co.ComplexAspect.Parent == null || co.ComplexAspect.Parent != this.StructuralObject) {
          co.ComplexAspect.Parent = this.StructuralObject;
          co.ComplexAspect.ParentProperty = property;
        }
        return co;
      } else {
        return result;
      }
    }

    public abstract void SetValue(String propertyName, object newValue);

    protected internal abstract void SetDpValue(DataProperty dp, object newValue);

    protected internal Object[] GetValues(IEnumerable<DataProperty> properties = null) {
      if (properties == null) {
        properties = this.StructuralType.DataProperties;
      }
      return properties.Select(p => this.GetValue(p)).ToArray();
    }

    #endregion

    #region event handling

    #endregion

    #region Validation

    public IEnumerable<ValidationError> Validate() {
      var vc = new ValidationContext(this.StructuralObject);
      vc.IsMutable = true;
      
      // PERF: 
      // Not using LINQ here because we want to reuse the same
      // vc property for perf reasons and this
      // would cause closure issues with a linq expression unless 
      // we kept resolving with toList.  This is actually simpler code.
      
      var errors = new List<ValidationError>();
      var properties = this.StructuralType.Properties;
      foreach (var prop in properties) {
        vc.Property = prop;
        vc.PropertyValue = this.GetValue(prop);
        
        var co = vc.PropertyValue as IComplexObject;
        vc.ComplexObject = co;
        if (co != null) {
          var coErrors = co.ComplexAspect.Validate();
          errors.AddRange(coErrors);
        }
        foreach (var vr in prop.Validators) {
          var ve = ValidateCore(vr, vc);
          if (ve != null) {
            errors.Add(ve);
          }
        }
      }

      vc.Property = null;
      vc.PropertyValue = null;
      foreach (var vr in this.StructuralType.Validators) {
        var ve = ValidateCore(vr, vc);
        if (ve != null) {
          errors.Add(ve);
        }
      }

      return errors;
    }

    public IEnumerable<ValidationError> ValidateProperty(StructuralProperty prop) {
      var value = this.GetValue(prop);
      return ValidateProperty(prop, value).ToList();
    }

    // called internally by property set logic
    internal IEnumerable<ValidationError> ValidateProperty(StructuralProperty prop, Object value) {
      IEnumerable<ValidationError> errors = null;
      var co = value as IComplexObject;
      if (co != null) {
        errors = co.ComplexAspect.Validate();
      }
      var vc = new ValidationContext(this.StructuralObject, prop, value);
      var itemErrors = prop.Validators.Select(vr => ValidateCore(vr, vc)).Where(ve => ve != null);
      return errors == null ? itemErrors : errors.Concat(itemErrors);

    }

    // insures that validation events get fired and _validators collection is updated.
    protected abstract ValidationError ValidateCore(Validator vr, ValidationContext vc);

    internal virtual String GetPropertyPath(String propName) {
      return propName;
    }

    #endregion

    #region other misc

    protected void RejectChangesCore() {
      if (_originalValuesMap == null) return;
      _originalValuesMap.ForEach(kvp => {
        SetValue(kvp.Key, kvp.Value);
      });
      this.ProcessComplexProperties(co => co.ComplexAspect.RejectChangesCore());
    }

    protected void ProcessComplexProperties(Action<IComplexObject> action) {
      this.StructuralType.ComplexProperties.ForEach(cp => {
        var cos = this.GetValue(cp.Name);
        if (cp.IsScalar) {
          var co = (IComplexObject)cos;
          action(co);
        } else {
          ((IEnumerable)cos).Cast<IComplexObject>().ForEach(co => action(co));
        }
      });
    }

    #endregion

    #region Backup version members

    protected void UpdateBackupVersion(DataProperty property, Object oldValue) {
      // We actually do want to track Proposed changes when Detached ( or Added) but we do not track an Original for either
      if (this.EntityState.IsAdded() || this.EntityState.IsDetached()) {
        if (this.EntityVersion == EntityVersion.Proposed) {
          BackupProposedValueIfNeeded(property, oldValue);
        }
      } else {
        if (this.EntityVersion == EntityVersion.Current) {
          BackupOriginalValueIfNeeded(property, oldValue);
        } else if (this.EntityVersion == EntityVersion.Proposed) {
          // need to do both
          BackupOriginalValueIfNeeded(property, oldValue);
          BackupProposedValueIfNeeded(property, oldValue);
        }
      }
    }

    protected Object GetOriginalValue(DataProperty property) {
      object result;
      if (property.IsComplexProperty) {
        var co = (IComplexObject)GetValue(property, EntityVersion.Current);
        return co.ComplexAspect.GetOriginalVersion();
      } else {
        if (_originalValuesMap != null && _originalValuesMap.TryGetValue(property.Name, out result)) {
          return result;
        } else {
          return GetValue(property);
        }
      }
    }

    protected Object GetPreproposedValue(DataProperty property) {
      object result;
      if (_preproposedValuesMap != null && _preproposedValuesMap.TryGetValue(property.Name, out result)) {
        return result;
      } else {
        return GetValue(property);
      }
    }

    protected internal virtual void ClearBackupVersion(EntityVersion version) {

      if (version == EntityVersion.Original) {
        if (_originalValuesMap != null) {
          ClearComplexBackupVersions(version);
          _originalValuesMap = null;
        }
      } else if (version == EntityVersion.Proposed) {
        if (_preproposedValuesMap != null) {
          ClearComplexBackupVersions(version);
          _preproposedValuesMap = null;
        }
      }
    }

    private void ClearComplexBackupVersions(EntityVersion version) {
      this.StructuralType.DataProperties.Where(dp => dp.IsComplexProperty).ForEach(dp => {
        var co = GetValue<IComplexObject>(dp);
        co.ComplexAspect.ClearBackupVersion(version);
      });
    }

    protected internal virtual void RestoreBackupVersion(EntityVersion version) {
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

    internal virtual void RestoreOriginalValues(BackupValuesMap backupMap, EntityVersion version) {
      backupMap.ForEach(kvp => {
        var value = kvp.Value;
        if (value is IComplexObject) {
          ((IComplexObject)value).ComplexAspect.RestoreBackupVersion(version);
        }
        var dp = this.StructuralType.GetDataProperty(kvp.Key);

        if (GetValue(dp) != value) {
            SetDpValue(dp, value);
            OnDataPropertyRestore(dp);
        }
      });
    }
    
    internal virtual void OnDataPropertyRestore(DataProperty dp) {
      // deliberate noop here;
    }



    private void BackupOriginalValueIfNeeded(DataProperty property, Object oldValue) {
      if (_originalValuesMap == null) {
        _originalValuesMap = new BackupValuesMap();
      } else {
        if (_originalValuesMap.ContainsKey(property.Name)) return;
      }
      // reference copy of complex object is deliberate - actual original values will be stored in the co itself.
      _originalValuesMap.Add(property.Name, oldValue);
    }

    private void BackupProposedValueIfNeeded(DataProperty property, Object oldValue) {
      if (_preproposedValuesMap == null) {
        _preproposedValuesMap = new BackupValuesMap();
      } else {
        if (_preproposedValuesMap.ContainsKey(property.Name)) return;
      }
      _preproposedValuesMap.Add(property.Name, oldValue);
    }

    //private BackupValuesMap CreateIfNeeded(ref BackupValuesMap map) {
    //  if (map == null) map = new BackupValuesMap();
    //  return map;
    //}

    public ReadOnlyDictionary<String, Object> OriginalValuesMap {
      get { return HandleNull(_originalValuesMap); }
    }

    public ReadOnlyDictionary<String, Object> PreproposedValuesMap {
      get { return HandleNull(_preproposedValuesMap); }
    }

    private ReadOnlyDictionary<String, Object> HandleNull(BackupValuesMap map) {
      return (map ?? BackupValuesMap.Empty).ReadOnlyDictionary;
    }
    
    internal BackupValuesMap _originalValuesMap;
    internal BackupValuesMap _preproposedValuesMap;


    #endregion

    #region Private 

    private IDictionary<String, Object> _backingStore;

    #endregion
  }
}
