using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.Core {

  // Dictionary with a ReadOnly property
  // should be used for internal list variable whose contents will need to be exposed 
  // as a ReadOnlyCollection<T>
  public class SafeDictionary<K, V> : Dictionary<K, V> {
    public SafeDictionary() : base() { 
    }
    public SafeDictionary(Dictionary<K, V> map) : base(map) {
    }

    public ReadOnlyDictionary<K,V> ReadOnlyDictionary {
      get {
        if (_map == null) {
          _map = new ReadOnlyDictionary<K, V>(this);
        }
        return _map; 
      }
    }

    private ReadOnlyDictionary<K, V> _map;
  }



}
