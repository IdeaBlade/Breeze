
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;
using System.Collections;

namespace Breeze.NetClient {
  public class EntityManager {

    /// <summary>
    /// 
    /// </summary>
    /// <param name="serviceName">"http://localhost:9000/"</param>
    public EntityManager(String serviceName, MetadataStore metadataStore = null) {
      DefaultDataService = new DataService(serviceName);
      MetadataStore = metadataStore != null ? metadataStore : new MetadataStore();
      JsonConverter = new JsonEntityConverter(MetadataStore);
    }

    public EntityManager(EntityManager em) {
      MetadataStore = em.MetadataStore;
      DefaultDataService = em.DefaultDataService;
      JsonConverter = em.JsonConverter;
    }

    public IEntity FindEntityByKey(EntityKey entityKey) {
      var subtypes = entityKey.EntityType.Subtypes;
      EntityAspect ea;
      if (subtypes.Count > 0) {
        ea = subtypes.Select(st => {
          var eg = this.GetEntityGroup(st.ClrType);
          return (eg == null) ? null : eg.FindEntityAspect(entityKey, true);
        }).FirstOrDefault(a => a != null);
      } else {
        var eg = this.GetEntityGroup(entityKey.EntityType.ClrType);
        ea = (eg == null) ? null : eg.FindEntityAspect(entityKey, true);
      }
      return ea == null ? null : ea.Entity;
    }

    internal void LinkRelatedEntities(IEntity entity) {
      //// we do not want entityState to change as a result of linkage.
      using (NewIsLoadingBlock()) {
        LinkUnattachedChildren(entity);
        LinkNavProps(entity);
        LinkFkProps(entity);
      }
    }

    internal BooleanUsingBlock NewIsLoadingBlock() {
      return new BooleanUsingBlock((b) => this.IsLoadingEntity = b);
    }

    private void LinkUnattachedChildren(IEntity entity) {
      var entityKey = entity.EntityAspect.EntityKey;
      var navChildrenList = UnattachedChildrenMap.GetNavChildrenList(entityKey, false);
      navChildrenList.ForEach(nc => {

        NavigationProperty childToParentNp = null, parentToChildNp;

        //// np is usually childToParentNp 
        //// except with unidirectional 1-n where it is parentToChildNp;
        var np = nc.NavigationProperty;
        var unattachedChildren = nc.Children;
        if (np.Inverse != null) {
          // bidirectional
          childToParentNp = np;
          parentToChildNp = np.Inverse;

          if (parentToChildNp.IsScalar) {
            var onlyChild = unattachedChildren[0];
            entity.SetValue(parentToChildNp.Name, onlyChild);
            onlyChild.SetValue(childToParentNp.Name, entity);
          } else {
            var currentChildren = (INavigationSet)entity.GetValue(parentToChildNp.Name);
            unattachedChildren.ForEach(child => {
              currentChildren.Add(child);
              child.SetValue(childToParentNp.Name, entity);
            });
          }
        } else {
          // unidirectional
          if (np.ParentType == entity.EntityAspect.EntityType) {

            parentToChildNp = np;
            if (parentToChildNp.IsScalar) {
              // 1 -> 1 eg parent: Order child: InternationalOrder
              entity.SetValue(parentToChildNp.Name, unattachedChildren[0]);
            } else {
              // 1 -> n  eg: parent: Region child: Terr
              var currentChildren = (INavigationSet)entity.GetValue(parentToChildNp.Name);
              unattachedChildren.ForEach(child => {
                // we know it can't already be there.
                currentChildren.Add(child);
              });
            }
          } else {
            // n -> 1  eg: parent: child: OrderDetail parent: Product
            childToParentNp = np;
            unattachedChildren.ForEach(child => {
              child.SetValue(childToParentNp.Name, entity);
            });

          }
          if (childToParentNp != null) {
            UnattachedChildrenMap.RemoveChildren(entityKey, childToParentNp);
          }

        }

      });
    }

    private void LinkFkProps(IEntity entity) {
      // handle unidirectional 1-x where we set x.fk
      entity.EntityAspect.EntityType.ForeignKeyProperties.ForEach(fkProp => {
        var invNp = fkProp.InverseNavigationProperty;
        if (invNp == null) return;
        // unidirectional fk props only
        var fkValue = entity.GetValue(fkProp.Name);
        var parentKey = new EntityKey((EntityType)invNp.ParentType, fkValue);
        var parent = FindEntityByKey(parentKey);
        if (parent != null) {
          if (invNp.IsScalar) {
            parent.SetValue(invNp.Name, entity);
          } else {
            var navSet = (INavigationSet)parent.GetValue(invNp.Name);
            navSet.Add(entity);
          }
        } else {
          // else add parent to unresolvedParentMap;
          UnattachedChildrenMap.AddChild(parentKey, invNp, entity);
        }

      });
    }

    private void LinkNavProps(IEntity entity) {
      // now add to unattachedMap if needed.
      entity.EntityAspect.EntityType.NavigationProperties.ForEach(np => {
        if (np.IsScalar) {
          var value = entity.GetValue(np.Name);
          // property is already linked up
          if (value != null) return;
        }

        // first determine if np contains a parent or child
        // having a parentKey means that this is a child
        // if a parent then no need for more work because children will attach to it.
        var parentKey = entity.EntityAspect.GetParentKey(np);
        if (parentKey != null) {
          // check for empty keys - meaning that parent id's are not yet set.

          if (parentKey.IsEmpty()) return;
          // if a child - look for parent in the em cache
          var parent = FindEntityByKey(parentKey);
          if (parent != null) {
            // if found hook it up
            entity.SetValue(np.Name, parent);
          } else {
            // else add parent to unresolvedParentMap;
            UnattachedChildrenMap.AddChild(parentKey, np, entity);
          }
        }
      });
    }


    /// <summary>
    /// Fired whenever an entity's state is changing in any significant manner.
    /// </summary>
    public event EventHandler<EntityChangingEventArgs> EntityChanging;

    /// <summary>
    /// Fired whenever an entity's state has changed in any significant manner.
    /// </summary>
    public event EventHandler<EntityChangedEventArgs> EntityChanged;

    public event EventHandler<EntityManagerHasChangesChangedEventArgs> HasChangesChanged;

    internal bool IsLoadingEntity {
      get;
      set;
    }

    internal bool IsRejectingChanges {
      get;
      set;
    }

    public IEntity AttachEntity(IEntity entity, EntityState entityState = EntityState.Added, MergeStrategy mergeStrategy = MergeStrategy.Disallowed) {
      var aspect = entity.EntityAspect;
      if (aspect.EntityType.MetadataStore != this.MetadataStore) {
        throw new Exception("Cannot attach this entity because the EntityType (" + aspect.EntityType.Name + ") and MetadataStore associated with this entity does not match this EntityManager's MetadataStore.");
      }
      var em = aspect.EntityManager;
      // check if already attached
      if (em == this) return entity;
      if (em != null) {
        throw new Exception("This entity already belongs to another EntityManager");
      }
      using (NewIsLoadingBlock()) {

        if (entityState.IsAdded()) {
          CheckEntityKey(aspect);
        }
        // attachedEntity === entity EXCEPT in the case of a merge.
        var attachedEntityAspect = AttachEntityAspect(aspect, entityState, mergeStrategy);
        // TODO: review this???
        aspect.InProcess = true;
        try {
          // entity ( not attachedEntity) is deliberate here.
          aspect.ProcessNavigationProperties(ent => AttachEntity(ent, entityState, mergeStrategy));

        } finally {
          aspect.InProcess = false;
        }
        // TODO: impl validate on attach
        //    if (this.validationOptions.validateOnAttach) {
        //        attachedEntity.entityAspect.validateEntity();
        //    }
        if (!entityState.IsUnchanged()) {
          NotifyStateChange(attachedEntityAspect, true);
        }
        OnEntityChanged(attachedEntityAspect.Entity, EntityAction.Attach);
        return attachedEntityAspect.Entity;

      }
    }

    public bool DetachEntity(IEntity entity) {
      return entity.EntityAspect.RemoveFromManager();
    }

    internal EntityAspect AttachEntityAspect(EntityAspect entityAspect, EntityState entityState, MergeStrategy mergeStrategy) {
      var group = GetOrCreateEntityGroup(entityAspect.EntityType.ClrType);
      var attachedEntityAspect = group.AttachEntityAspect(entityAspect, entityState, mergeStrategy);
      LinkRelatedEntities(attachedEntityAspect.Entity);
      return attachedEntityAspect;
    }

    private void CheckEntityKey(EntityAspect entityAspect) {
      var ek = entityAspect.EntityKey;
      // return properties that are = to defaultValues
      var keyProps = entityAspect.EntityType.KeyProperties;
      var keyPropsWithDefaultValues = keyProps
        .Zip(ek.Values, (kp, kv) => kp.DefaultValue == kv ? kp : null)
        .Where(kp => kp != null);

      if (keyPropsWithDefaultValues.Any()) {
        if (entityAspect.EntityType.AutoGeneratedKeyType != AutoGeneratedKeyType.None) {
          GenerateId(entityAspect.Entity, keyPropsWithDefaultValues.First(p => p.IsAutoIncrementing));
        } else {
          // we will allow attaches of entities where only part of the key is set.
          if (keyPropsWithDefaultValues.Count() == ek.Values.Length) {
            throw new Exception("Cannot attach an object of type  (" + entityAspect.EntityType.Name +
              ") to an EntityManager without first setting its key or setting its entityType 'AutoGeneratedKeyType' property to something other than 'None'");
          }
        }
      }
    }

 

    #region EntityGroup methods


    /// <summary>
    /// Collection of all <see cref="EntityGroup"/>s within the cache.
    /// </summary>
    public EntityGroupCollection EntityGroups {
      get;
      private set;
    }

    public EntityGroup GetEntityGroup(Type entityType) {
      return EntityGroups[entityType];
    }

    /// <summary>
    /// Returns the EntityGroup associated with a specific Entity subtype.
    /// </summary>
    /// <param name="entityType">An <see cref="IEntity"/> subtype</param>
    /// <returns>The <see cref="EntityGroup"/> associated with the specified Entity subtype</returns>
    /// <exception cref="ArgumentException">Bad entity type</exception>
    /// <exception cref="EntityServerException"/>
    internal EntityGroup GetOrCreateEntityGroup(Type entityType) {
      lock (this.EntityGroups) {
        var aEntityGroup = this.EntityGroups[entityType];
        if (aEntityGroup != null) {
          return aEntityGroup;
        }

        var newGroup = EntityGroup.Create(entityType);
        AddEntityGroup(newGroup);

        // ensure that any entities placed into the table on initialization are 
        // marked so as not to be saved again
        newGroup.AcceptChanges();

        return newGroup;

      }
    }

    /// <summary>
    /// Returns the EntityGroup associated with a specific Entity subtype.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <returns></returns>
    internal EntityGroup<T> GetOrCreateEntityGroup<T>() where T : class {
      return (EntityGroup<T>)GetOrCreateEntityGroup(typeof(T));
    }


    private void AddEntityGroup(EntityGroup entityGroup) {
      var groups = this.EntityGroups;
      var oldEntityGroup = groups[entityGroup.ClrType];
      if (oldEntityGroup != null) {
        groups.Remove(oldEntityGroup);
      }
      groups.Add(entityGroup);

      // insure that any added table can watch for change events
      entityGroup.ChangeNotificationEnabled = true;

    }



    #endregion

    #region KeyGenerator methods

    public IKeyGenerator GetKeyGenerator(Type entityType) {
      return null;
    }

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
      if (aspect.EntityGroup.EntityManager == null) {
        aspect.EntityGroup = GetEntityGroup(entityType);
      }

      var keyGenerator = this.GetKeyGenerator(entityType);
      if (keyGenerator is NullKeyGenerator) {
        throw new Exception("Unable to locate a valid KeyGenerator for: " + entityType);
      }

      object nextTempId = keyGenerator.GetNextTempId(entityProperty);
      entity.SetValue(entityProperty.Name, nextTempId);
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
      var keyProperties = aspect.EntityType.KeyProperties;
      foreach (var aProperty in keyProperties) {

        var val = aspect.Entity.GetValue(aProperty.Name);
        var aUniqueId = new UniqueId(aProperty, val);
        var keyGenerator = this.GetKeyGenerator(aspect.Entity.GetType());
        // determine if a temp pk is needed.
        if (aProperty.IsAutoIncrementing) {
          if (!keyGenerator.IsTempId(aUniqueId)) {
            // generate an id if it wasn't already generated
            aUniqueId = GenerateId(aspect.Entity, aProperty);
          }
          AddToTempIds(aUniqueId);
        } else if (aProperty.DefaultValue == val) {
          // do not call GenerateId unless the developer is explicit or the key is autoincrementing.
        } else {
          if (keyGenerator is NullKeyGenerator) {
            return;
          }
          // this occurs if GenerateId was called before Attach - it won't have been added to tempIds in this case.
          if (keyGenerator.IsTempId(aUniqueId)) {
            AddToTempIds(aUniqueId);
          }
        }
      }
    }

    internal void MarkTempIdAsMapped(EntityAspect aspect, bool isMapped) {
      var keyProperties = aspect.EntityType.KeyProperties;
      foreach (var aProperty in keyProperties) {
        UniqueId aUniqueId = new UniqueId(aProperty, aspect.Entity.GetValue(aProperty.Name));
        if (isMapped) {
          TempIds.Remove(aUniqueId);
        } else {
          var keyGenerator = this.GetKeyGenerator(aspect.Entity.GetType());
          if (keyGenerator.IsTempId(aUniqueId)) {
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

    public bool HasChanges(IEnumerable<Type> entityTypes = null) {
      if (!this._hasChanges) return false;
      if (entityTypes == null) return this._hasChanges;
      return this.HasChangesCore(entityTypes);
    }

    // backdoor the "really" check for changes.
    private bool HasChangesCore(IEnumerable<Type> entityTypes) {
      // entityTypes = checkEntityTypes(this, entityTypes);
      var entityGroups = entityTypes.Select(et => GetEntityGroup(et));
      return entityGroups.Any(eg => eg.HasChanges());
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


    #region Event impls

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

    public DataService DefaultDataService { get; private set; }

    public MetadataStore MetadataStore { get; private set; }

    public JsonConverter JsonConverter { get; private set; }

    public async Task<String> FetchMetadata(DataService dataService = null) {
      dataService = dataService != null ? dataService : this.DefaultDataService;
      var metadata = await MetadataStore.FetchMetadata(dataService);
      return metadata;
    }

    public async Task<IEnumerable<T>> ExecuteQuery<T>(EntityQuery<T> query) {
      var dataService = query.DataService != null ? query.DataService : this.DefaultDataService;
      await FetchMetadata(dataService);
      var resourcePath = query.GetResourcePath();
      // HACK
      resourcePath = resourcePath.Replace("/*", "");
      var result = await dataService.GetAsync(resourcePath);

      if (resourcePath.Contains("inlinecount")) {
        return JsonConvert.DeserializeObject<QueryResult<T>>(result, JsonConverter);
      } else {
        return JsonConvert.DeserializeObject<IEnumerable<T>>(result, JsonConverter);
      }

    }

    internal UnattachedChildrenMap UnattachedChildrenMap = new UnattachedChildrenMap();
    private List<Action> _queuedEvents = new List<Action>();
    private bool _hasChanges;

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

  public interface IHasInlineCount {
    Int64? InlineCount { get; }
  }


}



