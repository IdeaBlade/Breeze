using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.Core {

  public abstract class KeyedMap<T,U> : KeyedCollection<T, U> {
    public KeyedMap() {
     
    }

    public KeyedMap(KeyedMap<T, U> map) : this() {
      foreach (var value in map) {
        this.Add(value);
      }
    }
    
  }


}
