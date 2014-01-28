using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;
using System.ComponentModel;
using System.Collections.Specialized;
using System.Collections.ObjectModel;

namespace Breeze.NetClient {


  public interface INavigationSet : IEnumerable, INotifyPropertyChanged, INotifyCollectionChanged {
    IEntity ParentEntity { get; set; }
    NavigationProperty NavigationProperty { get; set; }
    void Add(IEntity entity);
    void Remove(IEntity entity);
    void Clear();
    int Count { get; }
  }

  public class NavigationSet<T> : NotifiableCollection<T>, INavigationSet where T:IEntity {

    public NavigationSet() {
      
    }
    

    public NavigationSet(IEntity parentEntity, NavigationProperty navigationProperty) {
      ((INavigationSet) this).ParentEntity = parentEntity;
    }

    #region Public props

    public IEntity ParentEntity {
      get;
      set;
    }

    public NavigationProperty NavigationProperty {
      get;
      set;
    }

    #endregion

    #region INavigationSet imp

    void INavigationSet.Add(IEntity entity) {
      Add((T) entity);
    }


    void INavigationSet.Remove(IEntity entity) {
      Remove((T)entity);
    }

    #endregion

    #region Overrides

    protected override void InsertItem(int index, T entity) {
    
      if (_inProcess || this.Contains(entity)) return;
      if (ParentEntity == null
        || ParentEntity.EntityAspect.IsDetached
        || ParentEntity.EntityAspect.EntityManager.IsLoadingEntity) {
        base.InsertItem(index, entity);
        return;
      }
      using (new BooleanUsingBlock(b => _inProcess = b)) {
        if (entity.EntityAspect.IsDetached) {
          entity.EntityAspect.Attach(EntityState.Added, ParentEntity.EntityAspect.EntityManager);
        }
        base.InsertItem(index, entity);
        ProcessRelated(entity);
      }

    }

    protected override void RemoveItem(int index) {
      // TODO: need to resolve this.
      base.RemoveItem(index);
    }

    protected override void ClearItems() {
      // TODO: need to resolve this.
      base.ClearItems();
    }

    protected override void SetItem(int index, T item) {
      // TODO: need to resolve this.
      base.SetItem(index, item);
    }

    private bool _inProcess = false;

    private void ProcessRelated(IEntity entity) {

      var aspect = entity.EntityAspect;
      var parentAspect = ParentEntity.EntityAspect;
      var np = this.NavigationProperty;
      var invNp = np.Inverse;
      if (invNp != null) {
        aspect.SetValue(invNp, ParentEntity);
      } else {
        // This occurs with a unidirectional 1-n navigation - in this case
        // we need to update the fks instead of the navProp
        var pks = parentAspect.EntityType.KeyProperties;
        np.InvForeignKeyNames.ForEach((fk, i) => {
          entity.EntityAspect.SetValue(fk, parentAspect.GetValue(pks[i]));
        });
      }
    }


    #endregion


    
  }
}

