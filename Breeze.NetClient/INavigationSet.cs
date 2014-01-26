using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {


  public interface INavigationSet : IEnumerable {
    IEntity ParentEntity { get; set; }
    void Add(IEntity entity);
    void Remove(IEntity entity);
  }

  public class NavigationSet<T> : HashSet<T>, INavigationSet where T:IEntity {

    public NavigationSet() {

    }

    public NavigationSet(IEntity parentEntity) {
      ((INavigationSet) this).ParentEntity = parentEntity;
    }

    void INavigationSet.Add(IEntity entity) {
      Add((T)entity);
    }

    void INavigationSet.Remove(IEntity entity) {
      Remove((T)entity);
    }

    IEntity INavigationSet.ParentEntity {
      get; 
      set;
    }

    private void AddCore(IEntity entity) {

    }

    //    var parentEntity = relationArray.parentEntity;
    //    var entityManager = parentEntity.entityAspect.entityManager;
    //    // we do not want to attach an entity during loading
    //    // because these will all be 'attached' at a later step.
    //    if (entityManager && !entityManager.isLoading) {
    //        goodAdds.forEach(function (add) {
    //            if (add.entityAspect.entityState.isDetached()) {
    //                relationArray._inProgress = true;
    //                try {
    //                    entityManager.attachEntity(add, EntityState.Added);
    //                } finally {
    //                    relationArray._inProgress = false;
    //                }
    //            }
    //        });
    //    }
    //    return goodAdds;
    //}

    //function processAdds(relationArray, adds) {
    //    var parentEntity = relationArray.parentEntity;
    //    var np = relationArray.navigationProperty;
    //    var addsInProcess = relationArray._addsInProcess;

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

    //}
    
  }
}

