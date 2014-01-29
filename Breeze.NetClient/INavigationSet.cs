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
    bool Contains(IEntity entity);
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

    bool INavigationSet.Contains(IEntity entity) {
      return Contains((T)entity);
    }

    #endregion

    #region Overrides

    protected override void InsertItem(int index, T entity) {
      // contains in next line is needed
      if (_inProcess || this.Contains(entity)) return;
      
      var parentAspect = ParentEntity == null ? null : ParentEntity.EntityAspect;
      if (parentAspect == null
        || parentAspect.IsDetached
        || parentAspect.EntityManager.IsLoadingEntity) {
        base.InsertItem(index, entity);
        return;
      }
      using (new BooleanUsingBlock(b => _inProcess = b)) {
        if (entity.EntityAspect.IsDetached) {
          entity.EntityAspect.Attach(EntityState.Added, parentAspect.EntityManager);
        }
        base.InsertItem(index, entity);
        ConnectRelated(entity);
      }

    }

    protected override void RemoveItem(int index) {
      if (_inProcess) return;
      var parentAspect = ParentEntity == null ? null : ParentEntity.EntityAspect;
      if (parentAspect == null
        || parentAspect.IsDetached
        || parentAspect.EntityManager.IsLoadingEntity) {
          base.RemoveItem(index);
        return;
      }
      using (new BooleanUsingBlock(b => _inProcess = b)) {
        var entity = Items[index];
        base.RemoveItem(index);
        DisconnectRelated(entity);
      }
    }

    protected override void ClearItems() {
      // TODO: need to resolve this. - when is it called
      base.ClearItems();
    }

    protected override void SetItem(int index, T item) {
      // TODO: need to resolve this.
      base.SetItem(index, item);
    }

    #endregion

    #region Other private

    private bool _inProcess = false;

    private void ConnectRelated(IEntity entity) {

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
        np.InvForeignKeyProperties.ForEach((fkp, i) => {
          entity.EntityAspect.SetValue(fkp, parentAspect.GetValue(pks[i]));
        });
      }
    }

    private void DisconnectRelated(T entity) {
      var aspect = entity.EntityAspect;
      var parentAspect = ParentEntity.EntityAspect;
      var invNp = NavigationProperty.Inverse;
      if (invNp != null) {
        if (invNp.IsScalar) {
          entity.EntityAspect.SetValue(invNp, null);
        } else {
          throw new Exception("Many-many relations not yet supported");
        }
      } else {
        // This occurs with a unidirectional 1-n navigation - in this case
        // we need to update the fks instead of the navProp
        var pks = parentAspect.EntityType.KeyProperties;
        this.NavigationProperty.InvForeignKeyProperties.ForEach((fkp, i) => {
          // TODO: write a test to see what happens if this fails
          aspect.SetValue(fkp, fkp.DefaultValue);
        });
      }
    }


    #endregion


    
  }
}

