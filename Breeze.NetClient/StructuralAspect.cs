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

    protected internal IDictionary<String, Object> BackingStore {
      get {
        return _backingStore ?? ((IHasBackingStore) StructuralObject).BackingStore;
      }
      set {
        if (_backingStore != null) {
          _backingStore = value;
        } else {
          ((IHasBackingStore)StructuralObject).BackingStore = value;
        }
        
      }
    }
    
    protected abstract StructuralType StructuralType { get; }

    protected abstract IStructuralObject StructuralObject { get; }

    protected internal Object GetRawValue(String propertyName) {
      Object val = null;
      BackingStore.TryGetValue(propertyName, out val);
      return val;
    }

    protected internal void SetRawValue(string propertyName, Object value) {
      BackingStore[propertyName] = value;
    }

    public Object GetValue(StructuralProperty prop) {
      return GetValue(prop.Name);
    }

    public Object GetValue(String propertyName) {
      // TODO: will be different when we add property interception.
      return GetRawValue(propertyName);
    }

    public T GetValue<T>(StructuralProperty prop) {
      return (T) GetRawValue(prop.Name);
    }

    public T GetValue<T>(String propertyName) {
      var val = (T) GetRawValue(propertyName);
      if (val == null && typeof(T).IsAssignableFrom(typeof(INavigationSet))) {
        val = Activator.CreateInstance<T>();
        ((INavigationSet) val).ParentEntity = (IEntity)this.StructuralObject;
      }
      return val;
    }

    public abstract void SetValue(String propertyName, object newValue);

    protected void ProcessComplexProperties( Action<IComplexObject> action) {
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

    protected internal OriginalValuesMap OriginalValuesMap {
      get;
      set;
    }

    protected internal BackupValuesMap PreproposedValuesMap {
      get;
      set;
    }

    private IDictionary<String, Object> _backingStore;
    protected bool _defaultValuesInitialized;

    
  }
}
