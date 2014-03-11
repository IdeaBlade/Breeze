using System;
using System.Collections;
using System.Collections.Generic;

namespace Breeze.Core {

  // similar to the .NET KeyedCollection class ( but different ...) 
  public abstract class MapCollection<T,U> : ICollection<U> {
    public MapCollection() {
      
    }

    public MapCollection(IEnumerable<U> values) {
      values.ForEach(v => this.Add(v));
    }

    protected abstract T GetKeyForItem(U value);

    public virtual void Add(U value) {
      var key = GetKeyForItem(value);
      _map.Add(key, value);
    }

    public ICollection<U> ReadOnlyValues {
      get { return _map.Values; }
    }

    public U this[T key] {
      get {
        U value;
        if (_map.TryGetValue(key, out value)) {
          return value;
        } else {
          return default(U);
        }
      }
      internal set {
        _map[key] = value;
      }
    }

    public virtual void Clear() {
      _map.Clear();
    }

    public bool Contains(U item) {
      return _map.ContainsKey(GetKeyForItem(item));
    }

    public bool ContainsKey(T key) {
      return _map.ContainsKey(key);
    }

    public void CopyTo(U[] array, int arrayIndex) {
      _map.Values.CopyTo(array, arrayIndex);
    }

    public int Count {
      get { return _map.Count; }
    }

    public bool IsReadOnly {
      get { return false; }
    }

    public virtual bool Remove(U item) {
      return _map.Remove(GetKeyForItem(item));
    }

    public virtual bool RemoveKey(T key) {
      return _map.Remove(key);
    }

    IEnumerator<U> IEnumerable<U>.GetEnumerator() {
      return _map.Values.GetEnumerator();
    }

    IEnumerator IEnumerable.GetEnumerator() {
      return _map.Values.GetEnumerator();
    }

    private Dictionary<T, U> _map = new Dictionary<T, U>();

  }

}
