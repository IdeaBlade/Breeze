using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.Core {

  public abstract class KeyedMap<T,U> : ICollection<U> {
    public KeyedMap() {
      
    }

    public KeyedMap(IEnumerable<U> values) {
      values.ForEach(v => this.Add(v));
    }

    protected abstract T GetKeyForItem(U value);

    public void Add(U value) {
      var key = GetKeyForItem(value);
      _map.Add(key, value);
    }

    public ICollection<U> AsReadOnly() {
      return _map.Values;
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
      set {
        _map[key] = value;
      }
    }

    public void Clear() {
      _map.Clear();
    }

    public bool Contains(U item) {
      return _map.ContainsKey(GetKeyForItem(item));
    }

    public bool ContainsKey(T key) {
      return _map.ContainsKey(key);
    }

    public void CopyTo(U[] array, int arrayIndex) {
      throw new NotImplementedException();
    }

    public int Count {
      get { return _map.Count; }
    }

    public bool IsReadOnly {
      get { return false; }
    }

    public bool Remove(U item) {
      return _map.Remove(GetKeyForItem(item));
    }

    public bool RemoveKey(T key) {
      return _map.Remove(key);
    }

    public IEnumerator<U> GetEnumerator() {
      return _map.Values.GetEnumerator();
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() {
      return _map.Values.GetEnumerator();
    }

    private Dictionary<T, U> _map = new Dictionary<T, U>();

  }

}
