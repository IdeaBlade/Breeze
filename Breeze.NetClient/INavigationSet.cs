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

  public class NavigationSet<T> : ICollection<T>, INavigationSet where T:IEntity {

    public NavigationSet() {
      _hashSet = new HashSet<T>();
    }
    private HashSet<T> _hashSet;

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
      AddCore(entity);
    }


    void INavigationSet.Remove(IEntity entity) {
      Remove((T)entity);
    }

    #endregion

    #region ICollection<T> implementation

    public void Add(T item) {
      AddCore(item);
    }


    public void Clear() {
      _hashSet.Clear();
    }

    public bool Contains(T item) {
      return _hashSet.Contains(item);
    }

    public void CopyTo(T[] array, int arrayIndex) {
      _hashSet.CopyTo(array, arrayIndex);
    }

    public int Count {
      get { return _hashSet.Count; }
    }

    public bool IsReadOnly {
      get { throw new NotImplementedException(); }
    }

    public bool Remove(T item) {
      return _hashSet.Remove(item);
    }

    public IEnumerator<T> GetEnumerator() {
      return _hashSet.GetEnumerator();
    }

    IEnumerator IEnumerable.GetEnumerator() {
      return _hashSet.GetEnumerator();
    }

    #endregion

    #region Internal and Private

    
    private void AddCore(IEntity entity) {
      if (_inProcess || _hashSet.Contains( (T) entity)) return;
      using (new BooleanUsingBlock(b => _inProcess = b)) {
        var parentAspect = ParentEntity.EntityAspect;
        var entityManager = parentAspect.EntityManager;
        if (entityManager.IsLoadingEntity || parentAspect.IsDetached) {
          _hashSet.Add((T)entity);
        } else {
          if (entity.EntityAspect.IsDetached) {
            entity.EntityAspect.Attach(EntityState.Added, entityManager);
          }
          _hashSet.Add((T)entity);
          ProcessRelated(entity);
        }
      }
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

