using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;

namespace Breeze.NetClient {


  public interface INavigationSet : IEnumerable {
    IEntity ParentEntity { get; set; }
    NavigationProperty NavigationProperty { get; set; }
    void Add(IEntity entity);
    void Remove(IEntity entity);
    void Clear();
  }

  public class NavigationSet<T> : HashSet<T>, INavigationSet where T:IEntity {

    public NavigationSet() {

    }

    public NavigationSet(IEntity parentEntity, NavigationProperty navigationProperty) {
      ((INavigationSet) this).ParentEntity = parentEntity;
    }

    void INavigationSet.Add(IEntity entity) {
      Add((T)entity);
    }

    void INavigationSet.Remove(IEntity entity) {
      Remove((T)entity);
    }

    public IEntity ParentEntity {
      get; 
      set;
    }

    public NavigationProperty NavigationProperty {
      get;
      set;
    }

    internal bool InProcess { get; set; }

    private void AddCore(IEntity entity) {
      // Notes: if being loaded from query it will already be attached by the time it gets here.
      if (InProcess) return;
      var parentAspect = ParentEntity.EntityAspect;
      var entityManager = parentAspect.EntityManager;
      if (parentAspect.IsDetached || !entityManager.IsLoadingEntity) {
        
        Add((T)entity);
      } else {
        // relationArray.inProgress may make sense here
        if (entity.EntityAspect.IsDetached) {
          using (new BooleanUsingBlock((b) => this.InProcess = b)) {
            entity.EntityAspect.Attach(EntityState.Added, entityManager);
          }
        }
        Add((T)entity);
      }
      ProcessRelated(entity);
    
    }

    private void ProcessRelated(IEntity entity) {

      var np = this.NavigationProperty;
      var invNp = np.Inverse;

    //    var invNp = np.inverse;
    //    var startIx = addsInProcess.length;
    //    try {
    //        adds.forEach(function (childEntity) {
    //            addsInProcess.push(childEntity);
    //            if (invNp) {
    //                childEntity.setProperty(invNp.name, parentEntity);
    //            } else {
    //                // This occurs with a unidirectional 1-n navigation - in this case
    //                // we need to update the fks instead of the navProp
    //                var pks = parentEntity.entityType.keyProperties;
    //                np.invForeignKeyNames.forEach(function (fk, i) {
    //                    childEntity.setProperty(fk, parentEntity.getProperty(pks[i].name));
    //                });
    //            }
    //        });
    //    } finally {
    //        addsInProcess.splice(startIx, adds.length);
    //    }

    }
    
  }
}

