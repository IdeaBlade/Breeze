using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {


  public interface INavigationSet {
    void Add(IEntity entity);
    void Remove(IEntity entity);
  }

  public class NavigationSet<T> : HashSet<T>, INavigationSet where T:IEntity {
    

    void INavigationSet.Add(IEntity entity) {
      Add((T)entity);
    }

    void INavigationSet.Remove(IEntity entity) {
      Remove((T)entity);
    }
  }
}

