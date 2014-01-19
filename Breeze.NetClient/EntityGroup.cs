
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
  public abstract class EntityGroup : IGrouping<Type, EntityAspect> {

    // internal static EntityGroup Null = new EntityGroup<EntityCache>();

    #region ctors

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="entityType"></param>
    protected EntityGroup(Type entityType) {
      ClrType = entityType;
      Initialize();
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="entityGroup"></param>
    protected EntityGroup(EntityGroup entityGroup)
      : this(entityGroup.ClrType) {
    }

    /// <summary>
    /// Creates an instance of an EntityGroup for a specific entity type.
    /// </summary>
    /// <param name="entityType"></param>
    /// <returns></returns>
    public static EntityGroup Create(Type entityType) {
      EntityGroup aEntityGroup;
      Type aType = GetEntityGroupType(entityType);
      aEntityGroup = (EntityGroup)Activator.CreateInstance(aType);
      aEntityGroup.IsNullGroup = false;
      return aEntityGroup;
    }

    /// <summary>
    /// Returns the EntityGroup subtype corresponding to any Entity subtype.
    /// </summary>
    /// <param name="entityType"></param>
    /// <returns></returns>
    private static Type GetEntityGroupType(Type entityType) {
      return typeof(EntityGroup<>).MakeGenericType(entityType);
    }

    /// <summary>
    /// Whether or not this is the 'null group.  The 'null' group contains no entities and is automatically provided to detached entities.
    /// </summary>
    public bool IsNullGroup {
      get;
      internal set;
    }

    #endregion

    #region events
    /// <summary>
    /// Fired whenever a property value on an entity is changing.
    /// </summary>
    public event EventHandler<EntityPropertyChangingEventArgs> EntityPropertyChanging;
    /// <summary>
    /// Fired whenever a property value on an entity has changed.
    /// </summary>
    public event EventHandler<EntityPropertyChangedEventArgs> EntityPropertyChanged;
    /// <summary>
    /// Fired whenever an entity's state is changing in any significant manner.
    /// </summary>
    public event EventHandler<EntityChangingEventArgs> EntityChanging;
    /// <summary>
    /// Fired whenever an entity's state has changed in any significant manner.
    /// </summary>
    public event EventHandler<EntityChangedEventArgs> EntityChanged;
    #endregion

    #region Public properties

    /// <summary>
    /// The type of Entity contained within this group.
    /// </summary>
    public EntityType EntityType {
      get;
      private set;
    }

    public Type ClrType {
      get;
      private set;
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
      get;
      private set;
    }

    /// <summary>
    /// The <see cref="T:IdeaBlade.EntityModel.EntityManager"/> which manages this EntityGroup.
    /// </summary>
    public EntityManager EntityManager {
      get {
        if (this.EntityCache == null) return null;
        return this.EntityCache.EntityManager;
      }
    }


    internal EntityCache EntityCache {
      get {
        return _entityCache;
      }
      set {
        _entityCache = value;
        if (value == null) {
          // remove all refs to any entities.
          Clear();
        }
        _selfAndSubtypeGroups = null;
      }
    }

    internal void Clear() {
      _entityAspects.Clear();
      _entityKeyMap.Clear();
      _entityCache = null;
      _selfAndSubtypeGroups = null;
      IsDetached = true;
    }

    internal bool IsDetached {
      get;
      private set;
    }


    /// <summary>
    /// The default name of the entity set to use when creating new entities when a name is not provided.
    /// </summary>
    /// <remarks>
    /// See Microsoft Entity Framework documentation for information on the EntitySet class.  The default
    /// name is auto-generated by the DevForce Object Mapping tool during code generation.
    ///</remarks>
    public virtual String DefaultResourceName {
      get {
        return this.EntityType.DefaultResourceName;
      }
    }


    /// <summary>
    /// Used to suppress change events during the modification of entities within this group.
    /// </summary>
    public bool ChangeNotificationEnabled {
      get;
      set;
    }

    /// <summary>
    /// Used to enable or disable change tracking.  Change tracking is required for both Saving entities as well as to support the IEditableObject interface.
    /// </summary>
    public bool ChangeTrackingEnabled {
      get;
      set;
    }

    /// <summary>
    /// Used to enable or disable property interception for entities within this group;
    /// </summary>
    public bool PropertyInterceptionEnabled {
      get;
      set;
    }

  

    /// <summary>
    /// Returns a list of groups for this entity type and all sub-types.
    /// </summary>
    public ReadOnlyCollection<EntityGroup> SelfAndSubtypeGroups {
      get {
        if (_selfAndSubtypeGroups == null) {
          //var selfAndSubtypes = EntityType.Instance.GetSelfAndSubtypes(this.EntityType);
          //_selfAndSubtypeGroups = new ReadOnlyCollection<EntityGroup>(selfAndSubtypes
          //  .Select(t => this.EntityManager.GetEntityGroup(t))
          //  .ToList());
        }
        return _selfAndSubtypeGroups;
      }
    }

    #endregion

    #region Get/Accept/Reject changes methods

    /// <summary>
    /// Returns all of the entities within this group with the specified state or states.
    /// </summary>
    /// <param name="state"></param>
    /// <returns></returns>
    public IEnumerable<Object> GetChanges(EntityState state) {
      return LocalEntityAspects.Where(ew => (ew.EntityState & state) > 0).Select(ew => ew.Entity);
    }

    /// <summary>
    /// Calls <see cref="EntityAspect.AcceptChanges"/> on all entities in this group.
    /// </summary>
    public void AcceptChanges() {
      ChangedAspects.ForEach(ew => ew.AcceptChanges());
    }

    /// <summary>
    /// Calls <see cref="EntityAspect.RejectChanges"/> on all entities in this group.
    /// </summary>
    public void RejectChanges() {
      ChangedAspects.ForEach(ew => ew.RejectChanges());
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

    #region Misc public methods

    #region Clone methods

    /// <summary>
    /// See <see cref="ICloneable.Clone"/> - performs a copy of entities in the EntityGroup.
    /// </summary>
    /// <returns></returns>
    /// <remarks>
    /// Makes a copy of this EntityGroup that contains copies of each entity in the group. 
    /// Each entity is "cloned" (see <see cref="EntityAspect.CloneCore"/>).
    /// Only the entities in the group are copied; entities related to the copied entities are not copied.
    /// </remarks>
    public virtual EntityGroup Clone() {
      var clone = (EntityGroup)this.MemberwiseClone();
      clone.Initialize();
      var newAspects = LocalEntityAspects.Select(r => r.CloneCore());
      newAspects.ForEach(r => clone.AddEntityCore(r));

      // share metadata
      clone.EntityType = this.EntityType;

      return clone;
    }



    /// <summary>
    /// Clones the structure of this EntityGroup.
    /// </summary>
    /// <returns></returns>
    /// <remarks>
    /// Entities within the group are not copied.
    /// </remarks>
    public virtual EntityGroup CloneStructure() {
      var clone = (EntityGroup)this.MemberwiseClone();
      clone.Initialize();
      return clone;
    }

    #endregion

    /// <summary>
    /// Returns the EntityGroup name corresponding to any <see cref="IEntity"/> subtype.
    /// </summary>
    /// <param name="entityType"></param>
    /// <returns></returns>
    public static String GetEntityGroupName(Type entityType) {
      return entityType.FullName.Replace('.', ':');
    }

    #endregion

    #region OnXXXChanged(Changing) methods ( currently all protected internal)

    internal virtual void OnEntityPropertyChanging(EntityPropertyChangingEventArgs e) {
      if (!ChangeNotificationEnabled) return;
      TryToHandle(EntityPropertyChanging, e);
    }

    // Fires both entity.PropertyChanged and EntityGroup.EntityPropertyChanged
    internal virtual void OnEntityPropertyChanged(EntityPropertyChangedEventArgs e) {
      if (!ChangeNotificationEnabled) return;
      QueueEvent(() => OnEntityPropertyChangedCore(e));
    }

    private void OnEntityPropertyChangedCore(EntityPropertyChangedEventArgs e) {
      e.EntityAspect.FirePropertyChanged(new PropertyChangedEventArgs(e.Property.Name));
      TryToHandle(EntityPropertyChanged, e);
    }

    // Needs to be call regardless of the ChangeNotification flag
    internal virtual void OnEntityChanging(EntityChangingEventArgs e) {
      if (ChangeNotificationEnabled) {
        TryToHandle(EntityChanging, e);
        if (!e.Cancel) {
          if (EntityManager != null) EntityManager.OnEntityChanging(e);
          if (!e.Cancel) {
            e.EntityAspect.TrackChanging(e, EntityManager);
          }
        }
      } else {
        e.EntityAspect.TrackChanging(e, EntityManager); // needs to be done regardless of changeNotification
      }
    }

    /// <summary>
    /// Raises the <see cref="EntityGroup.EntityChanged"/> event if <see cref="ChangeNotificationEnabled"/> is set.
    /// </summary>
    /// <param name="e"></param>
    // need this because EntityState changes after the PropertyChanged event fires
    // which causes EntityState to be stale in the PropertyChanged event
    // Needs to be called regardless of the ChangeNotification flag
    protected internal void OnEntityChanged(EntityChangedEventArgs e) {
      e.EntityAspect.TrackChanged(e); // needs to be done regardless of changeNotification
      if (ChangeNotificationEnabled) {
        QueueEvent(() => OnEntityChangedCore(e));
      }
    }

    private void QueueEvent(Action action) {
      if (EntityManager != null && EntityManager.IsLoadingEntity) {
        EntityManager.QueuedEvents.Add(() => action());
      } else {
        action();
      }
    }

    private List<Action> _pendingEvents = new List<Action>();

    private void OnEntityChangedCore(EntityChangedEventArgs e) {
      // change actions will fire property change inside of OnPropertyChanged 
      if (e.Action != EntityAction.Change) {
        e.EntityAspect.FirePropertyChanged(AllPropertiesChangedEventArgs);
      }
      TryToHandle(EntityChanged, e);
      if (EntityManager != null) EntityManager.OnEntityChanged(e);
    }

    private void TryToHandle<T>(EventHandler<T> handler, T args) where T : EventArgs {
      if (handler == null) return;
      try {
        handler(this, args);
      } catch {
        // Throw handler exceptions if not loading.
        if (EntityManager != null && !EntityManager.IsLoadingEntity) throw;
        // Also throw if loading but action is add or attach.
        var changing = args as EntityChangingEventArgs;
        if (changing != null && (changing.Action == EntityAction.Add || changing.Action == EntityAction.AddOnAttach)) throw;
        var changed = args as EntityChangedEventArgs;
        if (changed != null && (changed.Action == EntityAction.Add || changed.Action == EntityAction.AddOnAttach)) throw;
        // Other load exceptions are eaten.  Yummy!
      }
    }

    #endregion

    #region Error methods




    #endregion

    #region Entity methods ( all internal or private)

    // will throw explanatory exception if an entity with the same key already exists in the em;
    internal void AddAttachedEntity(EntityAspect aspect, EntityState entityState) {
      // insure that no other related entities get their entity state changed
      // as a result of adding this entity, except detached ones.
      // ?? TODO - Jay - why is this (the booleanUsingBlock) important here. 

      using (new BooleanUsingBlock((b) => aspect.InternalEntityManager.IsLoadingEntity = b)) {
        // no need for an original version on an added entity
        // but it might be there because of edits on a detached entity.
        var entityAction = entityState == EntityState.Added ? EntityAction.Add : EntityAction.AddOnAttach;

        var args = new EntityChangingEventArgs(aspect, entityAction);
        OnEntityChanging(args);
        if (args.Cancel) return;
        AddEntityCore(aspect);

        if (entityState == EntityState.Unchanged) {
          aspect.ClearBackupVersion(EntityVersion.Original);
        } else if (entityState == EntityState.Added) {
          // if this is a principal and is added then we should never go back to the db for this entity. 
          aspect.ReferenceManager.ListReferences
            .ForEach(r => r.IsLoaded = true);
          aspect.ReferenceManager.ScalarReferences.Where(r => r.Link.ToRole.EntityRelationRefConstraint == EntityRelationRefConstraint.Dependent)
            .ForEach(r => r.IsLoaded = true);
        }
        aspect.SetEntityStateCore(entityState);
        OnEntityChanged(new EntityChangedEventArgs(aspect, entityAction));
      }
      aspect.InternalEntityManager.FireQueuedEvents();
    }

    internal EntityAspect AddQueriedEntity(EntityAspect aspect) {
      var args = new EntityChangingEventArgs(aspect, EntityAction.AddOnQuery);
      OnEntityChanging(args);
      if (args.Cancel) return null;
      aspect.SetEntityStateCore(EntityState.Unchanged);
      AddEntityCore(aspect);
      OnEntityChanged(new EntityChangedEventArgs(aspect, EntityAction.AddOnQuery));
      return aspect;
    }



    private EntityAspect AddImportedEntity(EntityAspect aspect) {
      var newAspect = aspect.CloneCore();
      var args = new EntityChangingEventArgs(newAspect, EntityAction.AddOnImport);
      OnEntityChanging(args);
      if (args.Cancel) return null;
      AddEntityCore(newAspect);
      OnEntityChanged(new EntityChangedEventArgs(newAspect, EntityAction.AddOnImport));
      return newAspect;
    }

    internal void RemoveEntity(EntityAspect aspect) {
      if (aspect.EntityState.IsDetached()) return;
      if (aspect.EntityGroup != this) return;
      var args = new EntityChangingEventArgs(aspect, EntityAction.Remove);
      OnEntityChanging(args);
      if (args.Cancel) return;
      RemoveEntityCore(aspect);
      OnEntityChanged(new EntityChangedEventArgs(aspect, EntityAction.Remove));
    }

    private void RemoveEntityCore(EntityAspect aspect) {
      this.EntityManager.MarkTempIdAsMapped(aspect, true);
      aspect.SetEntityStateCore(EntityState.Detached);
      _entityAspects.Remove(aspect);
      RemoveFromKeyMap(aspect);
    }

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

    internal EntityAspect FindEntityAspect(Object[] keyValues, bool includeDeleted) {
      var key = new EntityKey(this.EntityType, keyValues, false);
      return FindEntityAspect(key, includeDeleted);
    }

    internal IEnumerable<EntityAspect> FindEntityAspects(IEnumerable<DataProperty> properties, Object[] values, bool includeDeleted) {
      var entities = this.LocalEntityAspects.Where(r => r.GetValuesRaw(properties).SequenceEqual(values));
      if (!includeDeleted) {
        entities = entities.Where(r => !r.EntityState.IsDeleted());
      }
      return entities;
    }

    

    // called for entities imported from another entityManager or an entityCacheState
    internal EntityAspect ImportEntity(EntityAspect sourceAspect, MergeStrategy mergeStrategy, out bool rowUpdated) {
      var targetAspect = FindEntityAspect(sourceAspect.EntityKey, true);
      if (targetAspect == null) {
        targetAspect = AddImportedEntity(sourceAspect);
        rowUpdated = targetAspect != null;
      } else {
        rowUpdated = targetAspect.ImportEntity(sourceAspect, mergeStrategy);
      }
      return targetAspect;
    }

    // called for newly Queried entites
    internal EntityAspect LoadEntity(EntityAspect sourceAspect, MergeStrategy mergeStrategy, out bool rowUpdated) {
      var targetAspect = FindEntityAspect(sourceAspect.EntityKey, true);
      if (targetAspect == null) {
        targetAspect = AddQueriedEntity(sourceAspect);
        rowUpdated = (targetAspect != null);
      } else {
        rowUpdated = targetAspect.LoadEntity(sourceAspect, mergeStrategy);
      }
      return targetAspect;
    }

    internal void AddEntityCore(EntityAspect aspect) {
      aspect.EntityGroup = this;
      AddToKeyMap(aspect);
      _entityAspects.Add(aspect);
    }


    // can overload for perf if necessary
    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="targetAspect"></param>
    /// <param name="sourceAspect"></param>
    /// <returns></returns>
    protected virtual bool IsCurrent(EntityAspect targetAspect, EntityAspect sourceAspect) {
      var targetVersion = (targetAspect.EntityState == EntityState.Deleted) ? EntityVersion.Original : EntityVersion.Current;
      bool isCurrent = EntityType.ConcurrencyProperties.All(c => (Object.Equals(targetAspect.GetValueRaw(c, targetVersion), sourceAspect.GetValueRaw(c, EntityVersion.Current))));
      return isCurrent;
    }

    internal void UpdatePrimaryKey(EntityAspect aspect, EntityKey oldKey) {
      if (IsNullGroup) return;
      _entityKeyMap.Remove(oldKey);  // it may not exist if this object was just Imported or Queried.
      AddToKeyMap(aspect);
    }

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

    #region Internal and Private

    /// <summary>
    /// Returns a collection of entities of given entity type and sub-types.
    /// </summary>
    internal IEnumerable<EntityAspect> LocalEntityAspects {
      get {
        return _entityAspects;
      }
    }

    internal IEnumerable<EntityAspect> EntityAspects {
      get {
        return SelfAndSubtypeGroups
            .SelectMany(f => f.LocalEntityAspects);
      }
    }

    private void Initialize() {
      _entityAspects = new EntityCollection();
      _entityKeyMap = new Dictionary<EntityKey, EntityAspect>();

      PropertyInterceptionEnabled = true;
      ChangeNotificationEnabled = false;
      ChangeTrackingEnabled = true;
      // VerificationEnabled = true;
      Name = GetEntityGroupName(ClrType);
    }

  


    #endregion

    #region Fields

    // this member will only exist on EntityCache's sent from the server to the client
    // it should always be null on persistent client side entity sets
    private EntityCollection _entityAspects;
    private EntityCache _entityCache;


    private Dictionary<EntityKey, EntityAspect> _entityKeyMap = new Dictionary<EntityKey, EntityAspect>();
    private ReadOnlyCollection<EntityGroup> _selfAndSubtypeGroups;

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

    //// all but EntityAction.Change
    //private const EntityAction MajorEntityChange
    //  = EntityAction.Add
    //  | EntityAction.Remove
    //  | EntityAction.ChangeCurrentAndOriginal
    //  | EntityAction.ChangeOriginal
    //  | EntityAction.Commit
    //  | EntityAction.Delete
    //  | EntityAction.Rollback;



    #endregion


    Type IGrouping<Type, EntityAspect>.Key {
      get { return this.EntityType.ClrType; }
    }

    IEnumerator<EntityAspect> IEnumerable<EntityAspect>.GetEnumerator() {
      return EntityAspects.GetEnumerator();
    }

    IEnumerator IEnumerable.GetEnumerator() {
      return EntityAspects.GetEnumerator();
    }


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
  public class EntityGroup<TEntity> : EntityGroup where TEntity : class {

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
      : base(entityGroup.ClrType) {
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

  /// <summary>
  /// Collection of EntityGroups within a single <see cref="EntityCache"/>.
  /// </summary>
  internal class EntityGroupCollection : ICollection<EntityGroup> {

    internal EntityGroupCollection(EntityCache entityCache) {
      _entityCache = entityCache;
      _entityGroups = new List<EntityGroup>();
      _entityGroupMap = new Dictionary<Type, EntityGroup>();
    }

    public EntityGroup this[Type entityType] {
      get {
        EntityGroup result;
        if (_entityGroupMap.TryGetValue(entityType, out result)) {
          return result;
        } else {
          return null;
        }
      }
    }

    #region ICollection<EntityGroup> Members

    public void Clear() {
      _entityGroups.ToList().ForEach(t => t.EntityCache = null);
      _entityGroups.Clear();
      _entityGroupMap.Clear();
    }

    public void Add(EntityGroup entityGroup) {
      if (_entityGroups.Any(c => c.EntityType.Equals(entityGroup.EntityType))) {
        throw new ArgumentException("An EntityGroup with the same EntityType is already is this EntityCache");
      }
      AddEntityGroupCore(entityGroup);
    }

    /// <summary>
    /// Returns whether this collection contains the specified table.
    /// </summary>
    /// <param name="tableName"></param>
    /// <returns></returns>
    public bool Contains(String tableName) {
      return _entityGroups.Any(t => t.Name.Equals(tableName));
    }

    /// <summary>
    /// Returns whether this collection contains a group for the specified entity type.
    /// </summary>
    /// <param name="entityType"></param>
    /// <returns></returns>
    public bool Contains(Type entityType) {
      return _entityGroupMap.ContainsKey(entityType);
    }

    /// <summary>
    /// Returns whether this collection contains the specified group.
    /// </summary>
    /// <param name="item"></param>
    /// <returns></returns>
    public bool Contains(EntityGroup item) {
      return _entityGroups.Any(t => t.Equals(item));
    }

    public void CopyTo(EntityGroup[] array, int arrayIndex) {
      _entityGroups.CopyTo(array, arrayIndex);
    }

    public int Count {
      get { return _entityGroups.Count; }
    }

    public bool IsReadOnly {
      get { return false; }
    }

    public bool Remove(EntityGroup entityGroup) {
      if (_entityGroups.Remove(entityGroup)) {
        entityGroup.EntityCache = null;
        _entityGroupMap.Remove(entityGroup.ClrType);
        return true;
      } else {
        return false;
      }
    }

    #endregion

    private void AddEntityGroupCore(EntityGroup entityGroup) {
      _entityGroups.Add(entityGroup);
      _entityGroupMap[entityGroup.ClrType] = entityGroup;
      entityGroup.EntityCache = _entityCache;
    }

    #region IEnumerable<EntityGroup> Members

    IEnumerator<EntityGroup> IEnumerable<EntityGroup>.GetEnumerator() {
      return _entityGroups.GetEnumerator();
    }

    #endregion

    #region IEnumerable Members

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() {
      return _entityGroups.GetEnumerator();
    }

    #endregion

    private EntityCache _entityCache;
    private List<EntityGroup> _entityGroups;
    private Dictionary<Type, EntityGroup> _entityGroupMap;

  }
}
