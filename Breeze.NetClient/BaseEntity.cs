using Newtonsoft.Json.Linq;
using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public abstract class BaseEntity : IEntity, IBackingStore {

    protected BaseEntity() {
      EntityAspect = new EntityAspect(this, null);
    }

    void IBackingStore.SetBacking(IDictionary<String, Object> backingStore) {
      _backingStore = backingStore;
    }

    protected IDictionary<String, Object> BackingStore {
      get {
        if (_backingStore == null) {
          _backingStore = new Dictionary<String, Object>();
        }
        return _backingStore;
      }
    }
    private IDictionary<String, Object> _backingStore;

    public EntityAspect EntityAspect {
      get;
      set;
    }

    protected T PropGet<T>([CallerMemberName] string propertyName = "") {
      return (T) EntityAspect.GetValue(propertyName);
    }

    protected void PropSet(Object value, [CallerMemberName] string propertyName = "") {
      EntityAspect.SetValue(propertyName, value);
    }

    object IStructuralObject.GetValue(string propertyName) {
      Object result = null;
      BackingStore.TryGetValue(propertyName, out result);
      return result;
    }

    void IStructuralObject.SetValue(string propertyName, object newValue) {
      BackingStore[propertyName] = newValue;
    }

    void IEditableObject.BeginEdit() {
      ((IEditableObject)EntityAspect).BeginEdit();
    }

    void IEditableObject.CancelEdit() {
      ((IEditableObject)EntityAspect).CancelEdit();
    }

    void IEditableObject.EndEdit() {
      ((IEditableObject)EntityAspect).EndEdit();
    }

    void IChangeTracking.AcceptChanges() {
      ((IChangeTracking)EntityAspect).AcceptChanges();
    }

    bool IChangeTracking.IsChanged {
      get { return ((IChangeTracking)EntityAspect).IsChanged; }
    }

    void IRevertibleChangeTracking.RejectChanges() {
      ((IRevertibleChangeTracking)EntityAspect).RejectChanges();
    }

    event PropertyChangedEventHandler INotifyPropertyChanged.PropertyChanged {
      // EntityAspect.PropertyChanged is a different event that tracks changes to the EntityAspect itself.
      add { EntityAspect.EntityPropertyChanged += value; }
      remove { EntityAspect.EntityPropertyChanged += value; ; }
    }

    event EventHandler<DataErrorsChangedEventArgs> INotifyDataErrorInfo.ErrorsChanged {
      add { INotifyDataErrorInfoImpl.ErrorsChanged += value; }
      remove { INotifyDataErrorInfoImpl.ErrorsChanged -= value; }
    }

    IEnumerable INotifyDataErrorInfo.GetErrors(string propertyName) {
      return INotifyDataErrorInfoImpl.GetErrors(propertyName);
    }

    bool INotifyDataErrorInfo.HasErrors {
      get { return INotifyDataErrorInfoImpl.HasErrors; }
    }

    int IComparable.CompareTo(object obj) {
      throw new NotImplementedException();
    }

    private INotifyDataErrorInfo INotifyDataErrorInfoImpl {
      get {
        return (INotifyDataErrorInfo)EntityAspect;
      }
    }
  }

  
}