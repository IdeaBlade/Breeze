
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public class EntityManager {

    /// <summary>
    /// 
    /// </summary>
    /// <param name="serviceName">"http://localhost:9000/"</param>
    public EntityManager(String serviceName, MetadataStore metadataStore=null) {
      DefaultDataService = new DataService(serviceName);
      MetadataStore = metadataStore != null ? metadataStore : new MetadataStore();
      JsonConverter = new JsonEntityConverter(MetadataStore);
    }

    public EntityManager(EntityManager em) {
      MetadataStore = em.MetadataStore;
      DefaultDataService = em.DefaultDataService;
      JsonConverter = em.JsonConverter;
    }

    public bool IsLoadingEntity {
      get;
      internal set;
    }


    public void AttachEntity(IEntity entity, EntityState entityState = EntityState.Added) {

    }

    public void DetachEntity(IEntity entity) {

    }

    #region EntityGroup methods

    public EntityCache EntityCache {
      get;
      private set;
    }

    /// <summary>
    /// Collection of all <see cref="EntityGroup"/>s within the cache.
    /// </summary>
    public EntityGroup[] GetEntityGroups() {
      return EntityCache.EntityGroups.ToArray();
    }

    /// <summary>
    /// Returns the EntityGroup associated with a specific Entity subtype.
    /// </summary>
    /// <param name="entityType">An <see cref="IEntity"/> subtype</param>
    /// <returns>The <see cref="EntityGroup"/> associated with the specified Entity subtype</returns>
    /// <exception cref="ArgumentException">Bad entity type</exception>
    /// <exception cref="EntityServerException"/>
    public EntityGroup GetEntityGroup(Type entityType) {
      lock (this.EntityCache.EntityGroups) {
        var aEntityGroup = this.EntityCache.EntityGroups[entityType];
        if (aEntityGroup != null) {
          return aEntityGroup;
        }

        var newGroup = CreateEntityGroupAndInitialize(entityType);
        return newGroup;
      }
    }

    /// <summary>
    /// Returns the EntityGroup associated with a specific Entity subtype.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <returns></returns>
    public EntityGroup<T> GetEntityGroup<T>() where T : class {
      return (EntityGroup<T>)GetEntityGroup(typeof(T));
    }


    private void AddEntityGroup(EntityGroup entityGroup) {
      var groups = this.EntityCache.EntityGroups;
      var oldEntityGroup = groups[entityGroup.ClrType];
      if (oldEntityGroup != null) {
        groups.Remove(oldEntityGroup);
      }
      groups.Add(entityGroup);

      // insure that any added table can watch for change events
      entityGroup.ChangeNotificationEnabled = true;

    }

    private EntityGroup CreateEntityGroupAndInitialize(Type entityType) {
      EntityMetadata etInfo = MetadataStore.GetEntityMetadata(entityType);
      var newGroup = EntityGroup.Create(entityType);
      AddEntityGroup(newGroup);

      //newGroup.UpdateDefaultValues();
      // ensure that any entities placed into the table on initialization are 
      // marked so as not to be saved again
      newGroup.AcceptChanges();

      // Ensure dskey is loaded (for IdGenerator and any other client-side probing needs)
      IDataSourceKey key = DataSourceResolver.GetDataSourceKey(entityType);

      // no overhead is incurred if the entity relations for this assembly have already been
      // handled
      MetadataStore.InitializeEntityRelations(entityType.GetAssembly());
      return newGroup;
    }

    #endregion

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

      IIdGenerator idGenerator = this.DataSourceResolver.GetIdGenerator(entityType);
      if (idGenerator is NullIdGenerator) {
        var keyName = EntityMetadataStore.Instance.GetEntityMetadata(entityType).DataSourceKeyName;
        throw new IdeaBladeException("Unable to locate a valid IdGenerator for: " + keyName);
      }

      object nextTempId = idGenerator.GetNextTempId(entityProperty);
      aspect.SetValueWithChangeNotification(entityProperty, nextTempId);
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

        var rawValue = aspect.Entity.GetValueRaw(aProperty.Name);
        var aUniqueId = new UniqueId(aProperty, rawValue);
        IIdGenerator idGenerator = this.DataSourceResolver.GetIdGenerator(aspect.Entity.GetType());
        // determine if a temp pk is needed.
        if (aProperty.IsAutoIncrementing) {
          if (!idGenerator.IsTempId(aUniqueId)) {
            // generate an id if it wasn't already generated
            aUniqueId = GenerateId(aspect.Entity, aProperty);
          }
          AddToTempIds(aUniqueId);
        } else if (aProperty.DefaultValue == rawValue) {
          // do not call GenerateId unless the developer is explicit or the key is autoincrementing.
        } else {
          if (idGenerator is NullIdGenerator) {
            return;
          }
          // this occurs if GenerateId was called before Attach - it won't have been added to tempIds in this case.
          if (idGenerator.IsTempId(aUniqueId)) {
            AddToTempIds(aUniqueId);
          }
        }
      }
    }

    internal void MarkTempIdAsMapped(EntityAspect aspect, bool isMapped) {
      var keyProperties = aspect.EntityType.KeyProperties;
      foreach (var aProperty in keyProperties) {
        UniqueId aUniqueId = new UniqueId(aProperty, aspect.Entity.GetValueRaw(aProperty.Name));
        if (isMapped) {
          _tempIds.Remove(aUniqueId);
        } else {
          IIdGenerator idGenerator = this.DataSourceResolver.GetIdGenerator(aspect.Entity.GetType());
          if (idGenerator.IsTempId(aUniqueId)) {
            _tempIds.Add(aUniqueId);
          }
        }
      }
    }

    internal void AddToTempIds(UniqueId uniqueId) {
      if (uniqueId != null) {
        _tempIds.Add(uniqueId);
      }
    }

    private void RemoveMappedTempIds(UniqueIdMap idMap) {
      foreach (UniqueId uniqueId in idMap.Keys) {
        _tempIds.Remove(uniqueId);
      }
    }

    internal bool AnyStoreGeneratedTempIds {
      get {
        return _tempIds != null && _tempIds.Any(id => id.Property.IsAutoIncrementing);
      }
    }

    private bool AnyTempIds {
      get {
        return _tempIds != null && _tempIds.Any();
      }
    }  


    /// <summary>
    /// Fired whenever an entity's state is changing in any significant manner.
    /// </summary>
    public event EventHandler<EntityChangingEventArgs> EntityChanging;

    /// <summary>
    /// Fired whenever an entity's state has changed in any significant manner.
    /// </summary>
    public event EventHandler<EntityChangedEventArgs> EntityChanged;

    internal virtual void OnEntityChanging(EntityChangingEventArgs args) {
      EventHandler<EntityChangingEventArgs> handler = EntityChanging;
      if (handler != null) {
        try {
          handler(this, args);
        } catch {
          // Eat any handler exceptions during load (query or import) - throw for all others. 
          if (!(args.Action == EntityAction.AddOnQuery || args.Action == EntityAction.AddOnImport)) throw;
        }
      }
    }

    internal virtual void OnEntityChanged(EntityChangedEventArgs args) {
      EventHandler<EntityChangedEventArgs> handler = EntityChanged;
      if (handler != null) {
        try {
          handler(this, args);
        } catch {
          // Eat any handler exceptions during load (query or import) - throw for all others. 
          if (!(args.Action == EntityAction.AddOnQuery || args.Action == EntityAction.AddOnImport)) throw;
        }
      }
    }


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

    ///// <summary>
    ///// 
    ///// </summary>
    ///// <param name="webApiQuery">"api/products"</param>
    //public async Task<Object> ExecuteQuery(string resourcePath) {
    // }


  }

  // JsonObject attribute is needed so this is NOT deserialized as an Enumerable
  [JsonObject]
  public class QueryResult<T> : IEnumerable<T>, IHasInlineCount  {
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



