
using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;

namespace Breeze.NetClient {

  #region EntityGroup
  /// <summary>
  /// Abstract base class for the <see cref="EntityGroup{T}"/> class.
  /// </summary>
  /// <remarks>
  /// An <b>EntityGroup</b> is used within the framework to hold entities of 
  /// a specific type.  With the exception of some events provided by the
  /// <b>EntityGroup</b>, you will rarely need to work with this class directly.
  /// <para>
  /// The <b>EntityGroup</b> provides several pre- and post- change events at both
  /// the property and entity levels.  You can subscribe to <see cref="EntityPropertyChanging"/>
  /// and <see cref="EntityPropertyChanged"/> to handle property-level changes to your
  /// entities.  You can subscribe to <see cref="EntityChanging"/> and <see cref="EntityChanged"/>
  /// to listen for any change to your entities.
  /// </para>
  /// <para>
  /// You can obtain an EntityGroup instance from an <see cref="EntityManager"/>
  /// using <see cref="M:IdeaBlade.EntityModel.EntityManager.GetEntityGroup(Type)"/>.
  /// </para>
  /// </remarks>
  internal abstract class EntityGroup : IGrouping<Type, EntityAspect> {

    #region ctors

    protected EntityGroup(Type clrEntityType) {
      ClrType = clrEntityType;
      Initialize();
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="clrEntityType"></param>
    protected EntityGroup(Type clrEntityType, EntityType entityType) {
      ClrType = clrEntityType;
      EntityType = entityType;
      Initialize();
    }


    /// <summary>
    /// Creates an instance of an EntityGroup for a specific entity type.
    /// </summary>
    /// <param name="clrEntityType"></param>
    /// <returns></returns>
    internal static EntityGroup Create(Type clrEntityType) {
      EntityGroup entityGroup;
      Type egType = typeof(EntityGroup<>).MakeGenericType(clrEntityType);
      entityGroup = (EntityGroup)Activator.CreateInstance(egType);
      
      return entityGroup;
    }

    private void Initialize() {
      _entityAspects = new EntityCollection();
      _entityKeyMap = new Dictionary<EntityKey, EntityAspect>();
      // _pendingEvents = new List<Action>();
      ChangeNotificationEnabled = false;
    }


    #endregion

    #region Null EntityGroup


    ///// <summary>
    ///// Whether or not this is the 'null group.  The 'null' group contains no entities and is automatically provided to detached entities.
    ///// </summary>
    //public virtual bool IsNullGroup {
    //  get { return false; }
    //}

    #endregion

    

    

    #region Public properties

    public Type ClrType {
      get;
      private set;
    }

    /// <summary>
    /// The type of Entity contained within this group.
    /// </summary>
    public EntityType EntityType {
      get;
      internal set; 
    }

    /// <summary>
    /// The <see cref="T:IdeaBlade.EntityModel.EntityManager"/> which manages this EntityGroup.
    /// </summary>
    public EntityManager EntityManager {
      get;
      internal set;
    }

    /// <summary>
    /// The type being queried. (same as EntityType for an EntityGroup)
    /// </summary>
    public Type QueryableType {
      get { return EntityType.ClrType; }
    }

    /// <summary>
    /// The name of this group.
    /// </summary>
    public String Name {
      get { return ClrType.FullName; }
    }

    /// <summary>
    /// Used to suppress change events during the modification of entities within this group.
    /// </summary>
    public bool ChangeNotificationEnabled {
      get;
      set;
    }

    /// <summary>
    /// Returns a list of groups for this entity type and all sub-types.
    /// </summary>
    public ReadOnlyCollection<EntityGroup> SelfAndSubtypeGroups {
      get {
        if (_selfAndSubtypeGroups == null) {
          _selfAndSubtypeGroups = EntityType.Subtypes
            .Select(et => EntityManager.GetEntityGroup(et.ClrType))
            .ToSafeList();
        }
        return _selfAndSubtypeGroups.ReadOnlyValues;
      }
    }

    internal IEnumerable<EntityAspect> EntityAspects {
      get {
        return SelfAndSubtypeGroups
            .SelectMany(f => f.LocalEntityAspects);
      }
    }


    internal IEnumerable<EntityAspect> LocalEntityAspects {
      get { return _entityAspects; }
    }

    #endregion

    #region Misc public methods

    internal void Clear() {
      // do not call detach on each entityAspect - very slow and not needed 
      // all we really need to do is set each _entityaspect.EntityState to detached
      _entityAspects.ForEach(ea => ea.DetachOnClear());
      if (_selfAndSubtypeGroups != null) _selfAndSubtypeGroups.Clear();
      _entityAspects.Clear();
      _entityKeyMap.Clear();
    }

    /// <summary>
    /// Returns the EntityGroup name corresponding to any <see cref="IEntity"/> subtype.
    /// </summary>
    /// <param name="entityType"></param>
    /// <returns></returns>
    public static String GetNameFor(Type entityType) {
      return entityType.FullName;
    }

    #endregion

    #region Get/Accept/Reject changes methods

    /// <summary>
    /// Returns all of the entities within this group with the specified state or states.
    /// </summary>
    /// <param name="state"></param>
    /// <returns></returns>
    public IEnumerable<IEntity> GetChanges(EntityState state) {
      return LocalEntityAspects.Where(ea => (ea.EntityState & state) > 0).Select(ew => ew.Entity);
    }

    /// <summary>
    /// Calls <see cref="EntityAspect.AcceptChanges"/> on all entities in this group.
    /// </summary>
    public void AcceptChanges() {
      ChangedAspects.ForEach(ea => ea.AcceptChanges());
    }

    /// <summary>
    /// Calls <see cref="EntityAspect.RejectChanges"/> on all entities in this group.
    /// </summary>
    public void RejectChanges() {
      ChangedAspects.ForEach(ea => ea.RejectChanges());
    }

    /// <summary>
    /// Determines whether any entity in this group has pending changes.
    /// </summary>
    /// <returns></returns>
    public bool HasChanges() {
      return ChangedAspects.Any();
    }

    private IEnumerable<EntityAspect> ChangedAspects {
      get { return LocalEntityAspects.Where(ea => ea.HasChanges()); }
    }

    #endregion

    #region Internal props/methods 



    internal EntityAspect FindEntityAspect(EntityKey entityKey, bool includeDeleted) {
      EntityAspect result;
      // this can occur when we are trying to find say EntityKey(Order, 3)
      // in a collection of InternationalOrder keys
      if (entityKey.EntityType != this.EntityType) {
        entityKey = new EntityKey(this.EntityType, entityKey.Values);
      }
      if (_entityKeyMap.TryGetValue(entityKey, out result)) {
        if (result.EntityState.IsDeleted()) {
          return includeDeleted ? result : null;
        } else {
          return result;
        }
      } else {
        return null;
      }
    }

    internal EntityAspect AttachEntityAspect(EntityAspect entityAspect, EntityState entityState) {
      entityAspect.EntityGroup = this;
      AddToKeyMap(entityAspect);
      _entityAspects.Add(entityAspect);
      entityAspect.SetEntityStateCore(entityState);
      return entityAspect;
    }

    internal void DetachEntityAspect(EntityAspect aspect) {
      _entityAspects.Remove(aspect);
      RemoveFromKeyMap(aspect);
    }

    internal void ReplaceKey(EntityAspect entityAspect, EntityKey oldKey, EntityKey newKey) {
      // if (IsNullGroup) return;
      _entityKeyMap.Remove(oldKey);  // it may not exist if this object was just Imported or Queried.
      _entityKeyMap.Add(newKey, entityAspect);
    }

    #endregion

    #region private and protected

    //private EntityAspect MergeEntityAspect(EntityAspect entityAspect, EntityAspect targetEntityAspect, EntityState entityState, MergeStrategy mergeStrategy) {
    //  if (entityAspect == targetEntityAspect) {
    //    entityAspect.EntityState = entityState;
    //    return entityAspect;
    //  }

    //  var targetWasUnchanged = targetEntityAspect.EntityState.IsUnchanged();
    //  if (mergeStrategy == MergeStrategy.Disallowed) {
    //     throw new Exception("A MergeStrategy of 'Disallowed' does not allow you to attach an entity when an entity with the same key is already attached: " + entityAspect.EntityKey);
    //  } else if (mergeStrategy == MergeStrategy.OverwriteChanges || (mergeStrategy == MergeStrategy.PreserveChanges && targetWasUnchanged)) {
    //    // TODO: this needs to be implementated.
    //     // MergeEntityAspectCore(entityAspect, targetEntityAspect);
    //     this.EntityManager.CheckStateChange(targetEntityAspect, targetWasUnchanged, entityState.IsUnchanged());
    //  } else {
    //    // do nothing PreserveChanges and target is modified
    //  }
    //  return targetEntityAspect;
      
    //}

    private void AddToKeyMap(EntityAspect aspect) {
      try {
        _entityKeyMap.Add(aspect.EntityKey, aspect);
      } catch (ArgumentException) {
        throw new InvalidOperationException("An entity with this key: " + aspect.EntityKey.ToString() + " already exists in this EntityManager");
      }
    }

    private void RemoveFromKeyMap(EntityAspect aspect) {
      _entityKeyMap.Remove(aspect.EntityKey);
    }

   

    #endregion

    #region explict interfaces

    Type IGrouping<Type, EntityAspect>.Key {
      get { return this.EntityType.ClrType; }
    }

    IEnumerator<EntityAspect> IEnumerable<EntityAspect>.GetEnumerator() {
      return EntityAspects.GetEnumerator();
    }

    IEnumerator IEnumerable.GetEnumerator() {
      return EntityAspects.GetEnumerator();
    }

    #endregion

    #region Fields

    
    // this member will only exist on EntityCache's sent from the server to the client
    // it should always be null on persistent client side entity sets
    private EntityCollection _entityAspects;
    private Dictionary<EntityKey, EntityAspect> _entityKeyMap;
    private SafeList<EntityGroup> _selfAndSubtypeGroups;
    // private List<Action> _pendingEvents;

    // DataForm blows unless we use String.Empty - see B1112 - we're keeping 
    // old non-SL behavior because this change was made at last minute and couldn't
    // be adequately tested.
#if NET
    internal static readonly PropertyChangedEventArgs AllPropertiesChangedEventArgs
      = new PropertyChangedEventArgs(null);
#else
    internal static readonly PropertyChangedEventArgs AllPropertiesChangedEventArgs
      = new PropertyChangedEventArgs(String.Empty);

#endif

    #endregion

  }

  #endregion

  #region EntityGroup<T>
  /// <summary>
  /// Base class for all entity containers holding cached entities.
  /// </summary>
  /// <typeparam name="TEntity"></typeparam>
  /// <remarks>
  /// Classes derived from <b>EntityGroup{T}</b> are automatically created by the framework 
  /// to hold entities of each type.  The <see cref="T:IdeaBlade.EntityModel.EntityManager"/> 
  /// manages all EntityGroups in its cache. 
  /// </remarks>
  internal class EntityGroup<TEntity> : EntityGroup where TEntity : IEntity {

    #region ctors

    /// <summary>
    /// For internal use only.
    /// </summary>
    public EntityGroup()
      : base(typeof(TEntity)) {
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="entityGroup"></param>
    public EntityGroup(EntityGroup<TEntity> entityGroup)
      : base(entityGroup.ClrType ) {
        EntityType = entityGroup.EntityType;

    }

    #endregion

    /// <summary>
    /// Returns a collection of entities of given entity type and sub-types.
    /// </summary>
    public IEnumerable<TEntity> Entities {
      get {
        // return EntityAspects.Select(w => w.Entity).Cast<TEntity>();
        // same as above - not sure which is faster;
        return EntityAspects.Select(w => (TEntity)w.Entity);
      }
    }

    /// <summary>
    /// Returns the currently live (i.e not deleted or detached) entities for the given entity type and its subtypes.
    /// </summary>
    public IEnumerable<TEntity> CurrentEntities {
      get {
        return EntityAspects
          .Where(e => !e.EntityState.IsDeletedOrDetached())
          .Select(w => (TEntity)w.Entity);
      }
    }

  }
  #endregion

  #region EntityGroupCollection and EntityCollection

  internal class EntityGroupCollection : MapCollection<Type, EntityGroup> {
    protected override Type GetKeyForItem(EntityGroup item) {
      return item.ClrType;
    }
  }

  internal class EntityCollection : IEnumerable<EntityAspect> {

    internal EntityCollection() {
      _innerList = new List<EntityAspect>();
      _emptyIndexes = new List<int>();
    }

    internal void Add(EntityAspect aspect) {
      var indexCount = _emptyIndexes.Count;
      if (indexCount == 0) {
        var index = _innerList.Count;
        _innerList.Add(aspect);
        aspect.IndexInEntityGroup = index;
      } else {
        var newIndex = _emptyIndexes[indexCount - 1];
        _innerList[newIndex] = aspect;
        aspect.IndexInEntityGroup = newIndex;
        _emptyIndexes.RemoveAt(indexCount - 1);
      }
    }

    internal void Remove(EntityAspect aspect) {
      var index = aspect.IndexInEntityGroup;
      if (aspect != _innerList[index]) {
        throw new Exception("Error in EntityCollection removall logic");
      }
      aspect.IndexInEntityGroup = -1;
      _innerList[index] = null;
      _emptyIndexes.Add(index);
    }

    internal void Clear() {
      this.ForEach(r => r.IndexInEntityGroup = -1);
      _innerList.Clear();
      _emptyIndexes.Clear();
    }

    public int Count {
      get {
        return _innerList.Count - _emptyIndexes.Count;
      }
    }

    #region IEnumerable<EntityAspect> Members

    public IEnumerator<EntityAspect> GetEnumerator() {
      foreach (var item in _innerList) {
        if (item != null) {
          yield return item;
        }
      }
    }

    #endregion

    #region IEnumerable Members

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() {
      return GetEnumerator();
    }

    #endregion

    private List<EntityAspect> _innerList;
    private List<int> _emptyIndexes;
  }


#endregion

  //public class NullEntityGroup : EntityGroup {

  //  public NullEntityGroup(Type clrType, EntityType entityType) 
  //    : base(clrType, entityType) {
  //  }

  //  public override bool ChangeNotificationEnabled {
  //    get {
  //      return false; 
  //    }
  //    set {
  //      if (value == true) {
  //        throw new Exception("ChangeNotificationEnabled cannot be set on a null EntityGroup");
  //      }
  //    }
  //  }

  //  public override bool IsNullGroup { get { return true;  }   }
  //  public override bool IsDetached  {
  //    get { return true; } 
  //    protected set { throw new Exception("IsDetached cannot be set on a null EntityGroup");}
  //  }
  //  protected override IEnumerable<EntityAspect> LocalEntityAspects {
  //    get {
  //      return Enumerable.Empty<EntityAspect>();
  //    }
  //  }
  //  public override ReadOnlyCollection<EntityGroup> SelfAndSubtypeGroups {
  //    get { return _selfAndSubtypeGroups.ReadOnlyValues;  }
  //  }

  
  //}
}
