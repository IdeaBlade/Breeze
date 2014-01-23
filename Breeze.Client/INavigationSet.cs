using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Breeze.Net {
  public interface INavigationSet<T> : ISet<T>, INavigationSet where T:class {

  }

  public interface INavigationSet {
    void Add(Object o);
  }

  public class NavigationSet<T> : HashSet<T>, INavigationSet {
    public void Add(Object o) {
      this.Add((T)o);
    }
  }
}
