using System;
using System.Collections;
using System.Collections.Generic;

namespace Breeze.Core {

  // similar to the HashSet but will smaller surface and customizable 
  // should be subclassed to expose unique collections where the consumer
  // has the ability to add/remove items.
  public abstract class SetCollection<U> : ICollection<U> {
    public SetCollection() {
      
    }

    public SetCollection(IEnumerable<U> values) {
      values.ForEach(v => this.Add(v));
    }

    public virtual void Add(U value) {
      _set.Add( value);
    }

    public virtual void Clear() {
      _set.Clear();
    }

    public virtual bool Contains(U item) {
      return _set.Contains(item);
    }
    
    public void CopyTo(U[] array, int arrayIndex) {
      _set.CopyTo(array, arrayIndex);
    }

    public int Count {
      get { return _set.Count; }
    }

    public bool IsReadOnly {
      get { return false; }
    }

    public virtual bool Remove(U item) {
      return _set.Remove(item);
    }


    IEnumerator<U> IEnumerable<U>.GetEnumerator() {
      return _set.GetEnumerator();
    }

    IEnumerator IEnumerable.GetEnumerator() {
      return _set.GetEnumerator();
    }

    private HashSet<U> _set = new HashSet<U>();

  }

}
