using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;

namespace Breeze.NetClient {

  internal class UnattachedChildrenMap {

    public UnattachedChildrenMap() {
      _map = new Dictionary<EntityKey, List<NavChildren>>();
    }

    internal class NavChildren {
      public NavigationProperty NavigationProperty;
      public HashSet<IEntity> Children;
    }

    public List<NavChildren> GetNavChildrenList(EntityKey entityKey, bool createIfNotFound) {
      List<NavChildren> navChildrenList = null;

      if (_map.TryGetValue(entityKey, out navChildrenList)) {
        return navChildrenList;
      } else {
        if (createIfNotFound) {
          navChildrenList = new List<NavChildren>();
          _map.Add(entityKey, navChildrenList);
        }
      }
      return navChildrenList;
    }

    public HashSet<IEntity> GetNavChildren(EntityKey entityKey, NavigationProperty navProp, bool createIfNotFound) {
      List<NavChildren> navChildrenList = GetNavChildrenList(entityKey, createIfNotFound);
      if (navChildrenList == null) return null;
      
      var navChildren = navChildrenList.FirstOrDefault(uc => uc.NavigationProperty == navProp);
      if (navChildren == null && createIfNotFound) {
        navChildren = new NavChildren() {NavigationProperty = navProp, Children = new HashSet<IEntity>() };
        navChildrenList.Add(navChildren);
      }

      var children = navChildren.Children;
      children.RemoveWhere( entity => entity.EntityAspect.EntityState.IsDetached());

      return children;
    }

    

    public void AddChild(EntityKey parentEntityKey, NavigationProperty navProp, IEntity child) {
      var navChildren = GetNavChildren(parentEntityKey, navProp, true);
      navChildren.Add(child);
    
    }

    public void RemoveChildren(EntityKey parentEntityKey, NavigationProperty navProp) {
      var navChildrenList = GetNavChildrenList(parentEntityKey, false);
      if (navChildrenList == null) return;
      var ix = navChildrenList.IndexOf(nc => nc.NavigationProperty == navProp);
      if (ix != -1) return;
      navChildrenList.RemoveAt(ix);
      if (navChildrenList.Count == 0) {
        _map.Remove(parentEntityKey);
      }
    }

    private Dictionary<EntityKey, List<NavChildren>> _map;
  }
}
