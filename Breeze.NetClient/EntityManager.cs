using Breeze.Core;
using Newtonsoft.Json;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public class EntityManager {

    #region Ctor 

    /// <summary>
    /// 
    /// </summary>
    /// <param name="serviceName">"http://localhost:9000/"</param>
    public EntityManager(String serviceName) {
      DefaultDataService = new DataService(serviceName);
      DefaultMergeStrategy = MergeStrategy.PreserveChanges;
      MetadataStore = MetadataStore.Instance;
      KeyGenerator = new DefaultKeyGenerator();
      Initialize();
    }

    public EntityManager(EntityManager em) {
      DefaultDataService = em.DefaultDataService;
      DefaultMergeStrategy = em.DefaultMergeStrategy;
      
      KeyGenerator = em.KeyGenerator; // TODO: review whether we should clone instead.
      Initialize();
    }

    private void Initialize() {
      EntityGroups = new EntityGroupCollection();
      UnattachedChildrenMap = new UnattachedChildrenMap();
      TempIds = new HashSet<UniqueId>();
      _hasChanges = false;
    }

    #endregion

    #region Public props

    public DataService DefaultDataService { get; private set; }

    public MetadataStore MetadataStore {
      get;
      private set;
    }

    public MergeStrategy DefaultMergeStrategy { get; private set; }

    public IKeyGenerator KeyGenerator { get; set; }

    #endregion

    #region async methods

    public async Task<DataService> FetchMetadata(DataService dataService = null) {
      dataService = dataService != null ? dataService : this.DefaultDataService;
      return await MetadataStore.FetchMetadata(dataService);
    }

    public async Task<IEnumerable<T>> ExecuteQuery<T>(EntityQuery<T> query) {
      var result = await ExecuteQuery((EntityQuery) query);
      return (IEnumerable<T>)result;
    }

    public async Task<IEnumerable> ExecuteQuery(EntityQuery query) {
      if (query.TargetType == null) {
        throw new Exception("Cannot execute a query with a null TargetType");
      }
      var dataService = query.DataService != null ? query.DataService : this.DefaultDataService;
      await FetchMetadata(dataService);
      var resourcePath = query.GetResourcePath();
      // HACK
      resourcePath = resourcePath.Replace("/*", "");
      var result = await dataService.GetAsync(resourcePath);
      var mergeStrategy = query.MergeStrategy ?? this.DefaultMergeStrategy;
      // cannot reuse a jsonConverter - internal refMap is one instance/query
      var jsonConverter = new JsonEntityConverter(this, mergeStrategy);
      Type rType;
      if (resourcePath.Contains("inlinecount")) {
        rType = typeof(QueryResult<>).MakeGenericType(query.TargetType);
      } else {
        rType = typeof(IEnumerable<>).MakeGenericType(query.TargetType);
      }
      using (NewIsLoadingBlock()) {
        return (IEnumerable)JsonConvert.DeserializeObject(result, rType, jsonConverter);
      }
    }

    #endregion

    #region Event methods

    /// <summary>
    /// Fired whenever an entity's state is changing in any significant manner.
    /// </summary>
    public event EventHandler<EntityChangingEventArgs> EntityChanging;

    /// <summary>
    /// Fired whenever an entity's state has changed in any significant manner.
    /// </summary>
    public event EventHandler<EntityChangedEventArgs> EntityChanged;

    public event EventHandler<EntityManagerHasChangesChangedEventArgs> HasChangesChanged;


    internal void OnEntityChanging(IEntity entity, EntityAction entityAction) {
      OnEntityChanging(new EntityChangingEventArgs(entity, entityAction));
    }

    internal virtual void OnEntityChanging(EntityChangingEventArgs args) {
      EventHandler<EntityChangingEventArgs> handler = EntityChanging;
      if (handler != null) {
        try {
          handler(this, args);
        } catch {
          // Eat any handler exceptions during load (query or import) - throw for all others. 
          if (!(args.Action == EntityAction.AttachOnQuery || args.Action == EntityAction.AttachOnImport)) throw;
        }
      }
    }

    internal void OnEntityChanged(IEntity entity, EntityAction entityAction) {
      OnEntityChanged(new EntityChangedEventArgs(entity, entityAction));
    }

    internal virtual void OnEntityChanged(EntityChangedEventArgs args) {
      EventHandler<EntityChangedEventArgs> handler = EntityChanged;
      if (handler != null) {
        try {
          handler(this, args);
        } catch {
          // Eat any handler exceptions during load (query or import) - throw for all others. 
          if (!(args.Action == EntityAction.AttachOnQuery || args.Action == EntityAction.AttachOnImport)) throw;
        }
      }
    }

    internal void OnHasChangesChanged() {
      OnHasChangesChanged(new EntityManagerHasChangesChangedEventArgs(this));
    }

    internal virtual void OnHasChangesChanged(EntityManagerHasChangesChangedEventArgs args) {
      var handler = HasChangesChanged;
      if (handler != null) {
        handler(this, args);
      }
    }

    // TODO: not currently called.
    internal void FireQueuedEvents() {
      // IsLoadingEntity will still be true when this occurs.
      if (!QueuedEvents.Any()) return;
      var events = QueuedEvents;
      _queuedEvents = new List<Action>();
      events.ForEach(a => a());

      // in case any of the previously queued events spawned other events.
      // FireQueuedEvents();

    }

    internal List<Action> QueuedEvents {
      get { return _queuedEvents; }
    }

    #endregion

    #region Misc public methods

    public void Clear() {
      EntityGroups.ForEach(eg => eg.Clear());
      Initialize();
    }

    public IEntity CreateEntity(EntityType entityType) {
      return (IEntity) Activator.CreateInstance(entityType.ClrType);
    }

    /// <summary>
    /// Find all entities in cache having the specified entity state(s).
    /// </summary>
    /// <param name="entityState">EntityState(s) of entities to return</param>
    /// <returns></returns>
    /// <remarks>
    /// As the <see cref="EntityState"/> is a flags enumeration, you can supply multiple 
    /// OR'ed values to search for multiple entity states.
    /// </remarks>
    public IEnumerable<IEntity> GetEntities(EntityState entityState = EntityState.AllButDetached) {
      return GetEntities(typeof(IEntity), entityState);
    }

    /// <summary>
    /// Retrieves all entities of a specified type with the specified entity state(s) from cache.
    /// </summary>
    /// <typeparam name="T">The type of Entity to retrieve</typeparam>
    /// <param name="entityState">EntityState(s) of entities to return</param>
    /// <returns>A collection of Entities</returns>
    /// <remarks>
    /// As the <see cref="EntityState"/> is a flags enumeration, you can supply multiple 
    /// OR'ed values to search for multiple entity states.
    /// </remarks>
    public IEnumerable<T> GetEntities<T>(EntityState entityState = EntityState.AllButDetached) where T : class {
      return GetEntities(typeof(T), entityState).Cast<T>();
    }

    /// <summary>
    /// Retrieves all entities of a specified type with the specified entity state(s) from cache.
    /// </summary>
    /// <param name="type">The type of Entity to retrieve</param>
    /// <param name="entityState">EntityState(s) of entities to return</param>
    /// <returns>A collection of Entities</returns>
    /// <remarks>
    /// As the <see cref="EntityState"/> is a flags enumeration, you can supply multiple 
    /// OR'ed values to search for multiple entity states.
    /// </remarks>
    public IEnumerable<IEntity> GetEntities(Type type, EntityState entityState = EntityState.AllButDetached) {
      if (type.GetTypeInfo().IsAbstract) {
        var groups = type == typeof(IEntity) 
          ? this.EntityGroups
          : this.EntityGroups.Where(eg => type.IsAssignableFrom(eg.ClrType));
        return groups.SelectMany(f => f.LocalEntityAspects)
          .Where(ea => ((ea.EntityState & entityState) > 0))
          .Select(ea => ea.Entity);
      } else {
        var group = GetEntityGroup(type);
        return group.EntityAspects
          .Where(ea => ((ea.EntityState & entityState) > 0))
          .Select(ea => ea.Entity);
      }
    }

    public IEntity FindEntityByKey(EntityKey entityKey) {
      if (entityKey.EntityType == null) {
        var eg = GetEntityGroup(entityKey.ClrType);
        if (eg == null) return null;
        entityKey.Coerce(eg.EntityType);
      }
      var subtypes = entityKey.EntityType.Subtypes;
      EntityAspect ea;
      if (subtypes.Count > 0) {
        ea = subtypes.Select(st => {
          var eg = this.GetEntityGroup(st.ClrType);
          return (eg == null) ? null : eg.FindEntityAspect(entityKey, true);
        }).FirstOrDefault(a => a != null);
      } else {
        var eg = this.GetEntityGroup(entityKey.ClrType);
        ea = (eg == null) ? null : eg.FindEntityAspect(entityKey, true);
      }
      return ea == null ? null : ea.Entity;
    }

    

    public T FindEntityByKey<T>(params Object[] values) where T:IEntity {
      var ek = new EntityKey(typeof(T), values);
      return (T)FindEntityByKey(ek);
    }

    #endregion

    #region Attach/Detach entity methods

    public IEntity CreateEntity(Type entityType, EntityState entityState = EntityState.Added) {
      var entity = (IEntity) Activator.CreateInstance(entityType);
      if (entityState == EntityState.Detached) {
        PrepareForAttach(entity);
      } else {
        AttachEntity(entity, entityState);
      }
      return entity;
    }

    public T CreateEntity<T>(EntityState entityState = EntityState.Added) {
      return (T)CreateEntity(typeof(T), entityState);
    }

    public IEntity AddEntity(IEntity entity) {
      return AttachEntity(entity, EntityState.Added);
    }

    public IEntity AttachEntity(IEntity entity, EntityState entityState = EntityState.Unchanged, MergeStrategy mergeStrategy = MergeStrategy.Disallowed) {
      var aspect = PrepareForAttach(entity);
      if (aspect.IsAttached && aspect.EntityState == entityState) return entity;
      using (NewIsLoadingBlock()) {
        // don't fire EntityChanging because there is no entity to recieve the event until it is attached.

        if (entityState.IsAdded()) {
          InitializeEntityKey(aspect);
        }

        // TODO: handle mergeStrategy here
        
        AttachEntityAspect(aspect, entityState);
        
        aspect.EntityType.NavigationProperties.ForEach(np => {
          aspect.ProcessNpValue(np, e => AttachEntity(e, entityState, mergeStrategy));
        });
        

        // TODO: impl validate on attach
        //    if (this.validationOptions.validateOnAttach) {
        //        attachedEntity.entityAspect.validateEntity();
        //    }

        if (!entityState.IsUnchanged()) {
          NotifyStateChange(aspect, true);
        }
        OnEntityChanged(aspect.Entity, EntityAction.Attach);
        return aspect.Entity;

      }
    }

    public bool DetachEntity(IEntity entity) {
      return entity.EntityAspect.Detach();
    }

    internal EntityAspect AttachQueriedEntity(IEntity entity, EntityType entityType) {
      var aspect = entity.EntityAspect;
      aspect.EntityType = entityType;

      using (NewIsLoadingBlock()) {
        // don't fire EntityChanging because there is no entity to recieve the event until it is attached.

        AttachEntityAspect(aspect, EntityState.Unchanged); 

        // TODO: impl validate on attach
        //    if (this.validationOptions.validateOnAttach) {
        //        attachedEntity.entityAspect.validateEntity();
        //    }

        OnEntityChanged(aspect.Entity, EntityAction.Attach);
        return aspect;
      }
    }

  

    private EntityAspect PrepareForAttach(IEntity entity) {
      var aspect = entity.EntityAspect;
      if (aspect.EntityType == null) {
        aspect.EntityType = this.MetadataStore.GetEntityType(entity.GetType());
      } else if (aspect.EntityType.MetadataStore != this.MetadataStore) {
        throw new Exception("Cannot attach this entity because the EntityType (" + aspect.EntityType.Name + ") and MetadataStore associated with this entity does not match this EntityManager's MetadataStore.");
      }

      // check if already attached
      if (!aspect.IsDetached) {
        if (aspect.EntityManager != this) {
          throw new Exception("This entity already belongs to another EntityManager");
        }
      }
      return aspect;
    }

    private EntityAspect AttachEntityAspect(EntityAspect entityAspect, EntityState entityState) {
      var group = GetEntityGroup(entityAspect.EntityType.ClrType);
      group.AttachEntityAspect(entityAspect, entityState);
      entityAspect.LinkRelatedEntities();
      return entityAspect;
    }

    private void InitializeEntityKey(EntityAspect aspect) {
      var ek = aspect.EntityKey;
      // return properties that are = to defaultValues
      var keyProps = aspect.EntityType.KeyProperties;
      var keyPropsWithDefaultValues = keyProps
        .Zip(ek.Values, (kp, kv) => kp.DefaultValue == kv ? kp : null)
        .Where(kp => kp != null);

      if (keyPropsWithDefaultValues.Any()) {
        if (aspect.EntityType.AutoGeneratedKeyType != AutoGeneratedKeyType.None) {
          GenerateId(aspect.Entity, keyPropsWithDefaultValues.First(p => p.IsAutoIncrementing));
        } else {
          // we will allow attaches of entities where only part of the key is set.
          if (keyPropsWithDefaultValues.Count() == ek.Values.Length) {
            throw new Exception("Cannot attach an object of type  (" + aspect.EntityType.Name +
              ") to an EntityManager without first setting its key or setting its entityType 'AutoGeneratedKeyType' property to something other than 'None'");
          }
        }
      }
    }

    #endregion

    #region EntityGroup methods

    /// <summary>
    /// Returns the EntityGroup associated with a specific Entity subtype.
    /// </summary>
    /// <param name="clrEntityType">An <see cref="IEntity"/> subtype</param>
    /// <returns>The <see cref="EntityGroup"/> associated with the specified Entity subtype</returns>
    /// <exception cref="ArgumentException">Bad entity type</exception>
    /// <exception cref="EntityServerException"/>
    internal EntityGroup GetEntityGroup(Type clrEntityType) {
      var eg = this.EntityGroups[clrEntityType];
      if (eg != null) {
        return eg;
      }
      
      lock (this.EntityGroups) {
        // check again just in case another thread got in.
        eg = this.EntityGroups[clrEntityType];
        if (eg != null) {
          return eg;
        }

        eg = EntityGroup.Create(clrEntityType);
        AddEntityGroup(eg);

        // ensure that any entities placed into the table on initialization are 
        // marked so as not to be saved again
        eg.AcceptChanges();

        return eg;

      }
    }

    internal EntityGroup<T> GetEntityGroup<T>() where T : IEntity {
      return (EntityGroup<T>)GetEntityGroup(typeof(T));
    }

    private void AddEntityGroup(EntityGroup entityGroup) {
      // don't both checking if an entityGroup with the same key already exists
      // should have been checked in calling code ( and will fail in the Add if not)
      entityGroup.EntityManager = this;
      entityGroup.EntityType = this.MetadataStore.GetEntityType(entityGroup.ClrType);
      // insure that any added table can watch for change events
      entityGroup.ChangeNotificationEnabled = true;      
      this.EntityGroups.Add(entityGroup);
    }

    #endregion

    #region KeyGenerator methods



    /// <summary>
    /// Generates a temporary ID for an <see cref="IEntity"/>.  The temporary ID will be mapped to a real ID when
    /// <see cref="SaveChanges"/> is called.
    /// <seealso cref="IIdGenerator"/>
    /// </summary>
    /// <param name="entity">The Entity object for which the new ID will be generated</param>
    /// <param name="entityProperty">The EntityProperty in which the new ID will be set </param>
    /// <remarks>
    /// You must implement the <see cref="IIdGenerator"/> interface to use ID generation.  See the
    /// <b>DevForce Developer's Guide</b> for more information on custom ID generation.
    /// <para>
    /// If you are using a SQL Server <b>Identity</b> property you do not need to call <b>GenerateId</b>
    /// for the property.
    /// </para>
    /// </remarks>
    /// <exception cref="ArgumentException">Incorrect entity type/property</exception>
    /// <exception cref="IdeaBladeException">IdGenerator not found</exception>
    public UniqueId GenerateId(IEntity entity, DataProperty entityProperty) {
      var x = new NavigationSet<IEntity>();

      var aspect = entity.EntityAspect;
      var entityType = entity.GetType();

      if (entityProperty.IsForeignKey) {
        String msg = String.Format(
          "Cannot call GenerateId on '{0}.{1}'. GenerateId cannot be called on ForeignKey properties ( even if they are also part of a PrimaryKey).  Call GenerateId instead on the 'source' primary key.",
          entityProperty.ParentType.Name, entityProperty.Name);
        throw new ArgumentException("entityProperty", msg);
      }
      if (!entityProperty.ParentType.ClrType.IsAssignableFrom(entityType)) {
        String msg = String.Format("The EntityType '{0}' for Property '{1}' must be of EntityType '{2}' or one of its subtypes", entityProperty.ParentType, entityProperty.Name, entityType);
        throw new ArgumentException("entityProperty", msg);
      }
      // Associate this entity with this EntityManager if it previously wasn't
      // - so that it cannot later be used in another EntityManager
      if (aspect.EntityGroup == null) {
        aspect.EntityGroup = GetEntityGroup(entityType);
      }
      
      if (KeyGenerator == null) {
        throw new Exception("Unable to locate a KeyGenerator");
      }

      object nextTempId = KeyGenerator.GetNextTempId(entityProperty);
      aspect.SetDpValue(entityProperty, nextTempId);
      var aUniqueId = new UniqueId(entityProperty, nextTempId);
      // don't add to tempId's collection until the entity itself is added.
      if (aspect.EntityState != EntityState.Detached) {
        AddToTempIds(aUniqueId);
      }
      return aUniqueId;

    }

    /// <summary>
    /// Insures that a temporary pk is set if necessary
    /// </summary>
    /// <param name="aspect"></param>
    internal void UpdatePkIfNeeded(EntityAspect aspect) {
      if (KeyGenerator == null) return;
      var keyProperties = aspect.EntityType.KeyProperties;
      
      foreach (var aProperty in keyProperties) {

        var val = aspect.GetValue(aProperty.Name);
        var aUniqueId = new UniqueId(aProperty, val);
        
        // determine if a temp pk is needed.
        if (aProperty.IsAutoIncrementing) {
          if (!KeyGenerator.IsTempId(aUniqueId)) {
            // generate an id if it wasn't already generated
            aUniqueId = GenerateId(aspect.Entity, aProperty);
          }
          AddToTempIds(aUniqueId);
        } else if (aProperty.DefaultValue == val) {
          // do not call GenerateId unless the developer is explicit or the key is autoincrementing.
        } else {
          // this occurs if GenerateId was called before Attach - it won't have been added to tempIds in this case.
          if (KeyGenerator.IsTempId(aUniqueId)) {
            AddToTempIds(aUniqueId);
          }
        }
      }
    }

    internal void MarkTempIdAsMapped(EntityAspect aspect, bool isMapped) {
      var keyProperties = aspect.EntityType.KeyProperties;
      foreach (var aProperty in keyProperties) {
        UniqueId aUniqueId = new UniqueId(aProperty, aspect.GetValue(aProperty.Name));
        if (isMapped) {
          TempIds.Remove(aUniqueId);
        } else {
          if (KeyGenerator == null) return;
          if (KeyGenerator.IsTempId(aUniqueId)) {
            TempIds.Add(aUniqueId);
          }
        }
      }
    }

    internal void AddToTempIds(UniqueId uniqueId) {
      if (uniqueId != null) {
        TempIds.Add(uniqueId);
      }
    }

    private void RemoveMappedTempIds(UniqueIdMap idMap) {
      foreach (UniqueId uniqueId in idMap.Keys) {
        TempIds.Remove(uniqueId);
      }
    }

    internal bool AnyStoreGeneratedTempIds {
      get {
        return TempIds != null && TempIds.Any(id => id.Property.IsAutoIncrementing);
      }
    }

    private bool AnyTempIds {
      get {
        return TempIds != null && TempIds.Any();
      }
    }

    internal HashSet<UniqueId> TempIds {
      get;
      private set;
    }

    #endregion

    #region HasChanges/StateChange methods

    public bool HasChanges(IEnumerable<Type> entityTypes = null) {
      if (!this._hasChanges) return false;
      if (entityTypes == null) return this._hasChanges;
      return this.HasChangesCore(entityTypes);
    }

    // backdoor the "really" check for changes.
    private bool HasChangesCore(IEnumerable<Type> entityTypes) {
      var entityGroups = (entityTypes == null) 
        ? this.EntityGroups 
        : entityTypes.Select(et => GetEntityGroup(et));
      return entityGroups.Any(eg => eg != null && eg.HasChanges());
    }

    internal void CheckStateChange(EntityAspect entityAspect, bool wasUnchanged, bool isUnchanged) {
      if (wasUnchanged) {
        if (!isUnchanged) {
          this.NotifyStateChange(entityAspect, true);
        }
      } else {
        if (isUnchanged) {
          this.NotifyStateChange(entityAspect, false);
        }
      }
    }

    internal void NotifyStateChange(EntityAspect entityAspect, bool needsSave) {
      OnEntityChanged(entityAspect.Entity, EntityAction.EntityStateChange);

      if (needsSave) {
        if (!this._hasChanges) {
          this._hasChanges = true;
          OnHasChangesChanged();
        }
      } else {
        // called when rejecting a change or merging an unchanged record.
        if (this._hasChanges) {
          // NOTE: this can be slow with lots of entities in the cache.
          this._hasChanges = this.HasChangesCore(null);
          if (!this._hasChanges) {
            OnHasChangesChanged();
          }
        }
      }
    }

    #endregion

    #region Other internal 

    internal BooleanUsingBlock NewIsLoadingBlock() {
      return new BooleanUsingBlock((b) => this.IsLoadingEntity = b);
    }

    internal bool IsLoadingEntity { get; set;  }
    internal bool IsRejectingChanges { get; set;  }
    internal UnattachedChildrenMap UnattachedChildrenMap { get; private set; }

    #endregion

    #region other private 

    private EntityGroupCollection EntityGroups { get; set; }
    private List<Action> _queuedEvents = new List<Action>();
    private bool _hasChanges;
    #endregion
  }

  // JsonObject attribute is needed so this is NOT deserialized as an Enumerable
  [JsonObject]
  public class QueryResult<T> : IEnumerable<T>, IHasInlineCount {
    public IEnumerable<T> Results { get; set; }
    public Int64? InlineCount { get; set; }
    public IEnumerator<T> GetEnumerator() {
      return Results.GetEnumerator();
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() {
      return Results.GetEnumerator();
    }

  }

  [JsonObject]
  public class QueryResult : IEnumerable, IHasInlineCount {
    public IEnumerable Results { get; set; }
    public Int64? InlineCount { get; set; }
    public IEnumerator GetEnumerator() {
      return Results.GetEnumerator();
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() {
      return Results.GetEnumerator();
    }

  }

  public interface IHasInlineCount {
    Int64? InlineCount { get; }
  }


}



