using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;
using System.Collections;
using System.Runtime.CompilerServices;

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
     
    protected abstract StructuralType StructuralType { get; }

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

    protected internal Object[] GetValues(IEnumerable<DataProperty> properties) {
      return properties.Select(p => this.GetValue(p)).ToArray();
    }

    #endregion

    #region other misc

    protected void RejectChangesCore() {
      if (this.OriginalValuesMap == null) return;
      this.OriginalValuesMap.ForEach(kvp => {
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

    protected void TrackChange(DataProperty property) {
      TrackChange(property, GetValue(property));
    }

    protected void TrackChange(DataProperty property, Object oldValue) {
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
        if (OriginalValuesMap != null && OriginalValuesMap.TryGetValue(property.Name, out result)) {
          return result;
        } else {
          return GetValue(property);
        }
      }
    }

    protected Object GetPreproposedValue(DataProperty property) {
      object result;
      if (PreproposedValuesMap != null && PreproposedValuesMap.TryGetValue(property.Name, out result)) {
        return result;
      } else {
        return GetValue(property);
      }
    }

    protected internal virtual void ClearBackupVersion(EntityVersion version) {

      if (version == EntityVersion.Original) {
        if (OriginalValuesMap != null) {
          ClearComplexBackupVersions(version);
          OriginalValuesMap = null;
        }
      } else if (version == EntityVersion.Proposed) {
        if (PreproposedValuesMap != null) {
          ClearComplexBackupVersions(version);
          PreproposedValuesMap = null;
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
      if (OriginalValuesMap == null) {
        OriginalValuesMap = new OriginalValuesMap();
      }

      if (OriginalValuesMap.ContainsKey(property.Name)) return;
      // reference copy of complex object is deliberate - actual original values will be stored in the co itself.
      OriginalValuesMap.Add(property.Name, oldValue);
    }

    private void BackupProposedValueIfNeeded(DataProperty property, Object oldValue) {
      if (PreproposedValuesMap == null) {
        PreproposedValuesMap = new BackupValuesMap();
      }

      if (PreproposedValuesMap.ContainsKey(property.Name)) return;
      PreproposedValuesMap.Add(property.Name, oldValue);
    }

    protected internal OriginalValuesMap OriginalValuesMap {
      get;
      set;
    }

    protected internal BackupValuesMap PreproposedValuesMap {
      get;
      set;
    }


    #endregion

    #region Private 

    private IDictionary<String, Object> _backingStore;
    protected bool _defaultValuesInitialized;

    #endregion
  }
}
