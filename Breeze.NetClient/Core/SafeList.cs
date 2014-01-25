using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.Core {

  // List<T> with a ReadOnlyValues property
  public class SafeList<T> : List<T> {
    public SafeList() : base() { 
     _values = new ReadOnlyCollection<T>(this);
    }
    public SafeList(IEnumerable<T> enumerable) : base(enumerable) {
     _values = new ReadOnlyCollection<T>(this);
    }
    public ReadOnlyCollection<T> ReadOnlyValues {
      get { return _values;  }
    }

    private ReadOnlyCollection<T> _values;
  }



}
