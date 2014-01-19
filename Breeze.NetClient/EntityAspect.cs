using Breeze.Core;

using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
 

  /// <summary>
  /// Provides entity services for all persistable business objects used within DevForce.  
  /// <seealso cref="T:IdeaBlade.EntityModel.EntityManager"/>
  /// <seealso cref="EntityQuery"/>
  /// <seealso cref="IEntity"/>
  /// </summary>
  /// <remarks>
  /// The <b>EntityAspect</b> implements interfaces to support editing, change tracking and change notification.
  /// One instance of the EntityAspect class is associated with each persistable entity within a domain model.
  /// The <see cref="PocoEntityAspect"/> also extends the EntityAspect
  /// <para>
  /// An EntityAspect can be used to <see cref="Wrap"/> an object and provide it with entity-related
  /// services. 
  /// </para>
  /// </remarks>

  [DebuggerDisplay("{EntityKey} - {EntityState}")]
  public class EntityAspect : IEditableObject, IChangeTracking, IRevertibleChangeTracking, INotifyPropertyChanged,
    INotifyDataErrorInfo, IComparable {
    // what about IDataErrorInfo
    /// <summary>
    /// See <see cref="TraceFns.Assert(bool)"/>
    /// </summary>
    [Conditional("DEBUG")]
    public static void ViolationCheck(object obj) {
      if (obj is EntityAspect) {
        throw new InvalidOperationException("An EntityAspect instance should not get here.");
      }
    }

    /// <summary>
    /// 'Magic' string that can be used to return all errors from <see cref="INotifyDataErrorInfo.GetErrors"/>.
    /// </summary>
    public static String AllErrors = "*";

    // For deep cloning
    private EntityAspect() { }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="entity"></param>
    public EntityAspect(IEntity entity) {
      if (entity is EntityAspect) {
        throw new ArgumentException("already an EntityAspect");
      }
      _entity = entity;
    }

    /// <summary>
    /// Returns the wrapped entity.
    /// </summary>
    public IEntity Entity {
      get {
        EntityAspect.ViolationCheck(_entity);
        return _entity;
      }
      set {
        EntityAspect.ViolationCheck(value);
        _entity = value;
      }
    }

    public EntityType EntityType { get; private set; }
      

    #region Add/Remove from manager
    /// <summary>
    /// Adds a newly created entity to its associated <see cref="T:IdeaBlade.EntityModel.EntityManager"/>. 
    /// </summary>
    /// <remarks>The associated EntityManager will either be the EntityManager that was called to create this Entity
    /// (<see cref="IdeaBlade.EntityModel.EntityManager.CreateEntity{T}()"/>) or that was used to generate its ids ( <see cref="IdeaBlade.EntityModel.EntityManager.GenerateId"/>)
    /// If neither of these cases apply, then the <see cref="InternalEntityManager"/>'s DefaultManager"/> will be used.
    /// There is no difference between <b>AddToManager</b> and 
    /// <see cref="M:IdeaBlade.EntityModel.EntityManager.AddEntity(IdeaBlade.EntityModel.Entity)"/>.
    /// Use either method to add a business object created by the <see cref="M:IdeaBlade.EntityModel.EntityManager.CreateEntity(System.Type)"/> method
    /// to the EntityManager cache.  The object must have a "detached" <see cref="M:IdeaBlade.EntityModel.Entity.EntityState"/>, must not
    /// have ever been associated with another EntityManager and must have a unique EntityKey within the EntityManager to which it will
    /// be added. 
    /// </remarks>
    // <include file='Entity.Examples.xml' path='//Class[@name="Entity"]/method[@name="AddToManager"]/*' />
    public void AddToManager() {
      var em = InternalEntityManager;
      if (em == null) {
        throw new InvalidOperationException("There is no EntityManager associated with this entity.");
      }
      em.AttachEntity(this.Entity, EntityState.Added);
    }


    /// <summary>
    /// Adds a newly created entity to the specified <see cref="T:IdeaBlade.EntityModel.EntityManager"/>. 
    /// </summary>
    /// <remarks>If the entity is associated with an EntityManager (i.e.  the Entity Manager that was called to create this Entity
    /// (<see cref="IdeaBlade.EntityModel.EntityManager.CreateEntity{T}()"/>) or that was used to generate its ids ( <see cref="IdeaBlade.EntityModel.EntityManager.GenerateId"/>)), 
    /// the EntityManager passed in the parameter must be the same.
    /// There is no difference between <b>AddToManager</b> and 
    /// <see cref="M:IdeaBlade.EntityModel.EntityManager.AddEntity(IdeaBlade.EntityModel.Entity)"/>.
    /// Use either method to add a business object created by the <see cref="M:IdeaBlade.EntityModel.EntityManager.CreateEntity(System.Type)"/> method
    /// to the EntityManager cache.  The object must have a "detached" <see cref="M:IdeaBlade.EntityModel.Entity.EntityState"/>, must not
    /// have ever been associated with another EntityManager and must have a unique EntityKey within the EntityManager to which it will
    /// be added. 
    /// </remarks>
    /// <param name="entityManager"></param>
    // <include file='Entity.Examples.xml' path='//Class[@name="Entity"]/method[@name="AddToManager"]/*' />
    public void AddToManager(EntityManager entityManager) {
      if (InternalEntityManager != null) {
        if (!entityManager.Equals(InternalEntityManager)) {
          throw new InvalidOperationException("This Entity is associated with another EntityManager.");
        }
      }
      entityManager.AttachEntity(this.Entity, EntityState.Added);
    }

    /// <summary>
    /// Removes the entity from the EntityManager cache.
    /// </summary>
    /// <remarks>The Entity will be in a "detached" state after the remove. 
    /// <b>RemoveFromManager</b> and <see cref="M:IdeaBlade.EntityModel.EntityManager.RemoveEntity(IdeaBlade.EntityModel.Entity)"/>
    ///  can be used interchangeably. Calling <b>RemoveFromManager</b> also clears the EntityManager's <see cref="IdeaBlade.EntityModel.EntityManager.QueryCache"/>.
    ///<para>This does not delete the object from the backend server.  To delete an entity,
    ///use the <see cref="M:IdeaBlade.EntityModel.Entity.Delete"/> method.</para>
    /// </remarks>
    public void RemoveFromManager() {
      if (InternalEntityManager != null) {
        InternalEntityManager.DetachEntity(this.Entity);
      }
    }




    #endregion

    #region Accept/Reject/HasChanges and IChangeTracking/IReveribleChangeTracking

    /// <summary>
    ///  Accepts all changes to this Entity, returning the EntityState to Unchanged.
    /// </summary>
    /// <remarks>
    /// <b>AcceptChanges</b> is automatically called by the EntityManager after a successful 
    /// <see cref="M:IdeaBlade.EntityModel.EntityManager.SaveChanges()"/> call; there is rarely a need to call this method directly.
    /// <para>
    /// The <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanging"/> and <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanged"/>
    /// events are fired with an EntityAction of <see cref="EntityAction.Commit"/> when this
    /// method is executed.
    /// </para>
    /// </remarks>
    public void AcceptChanges() {
      if (this.EntityState.IsUnchanged()) {
        return; // do we need to check for isProposed as well ???
      }
      if (!FireEntityChanging(EntityAction.Commit)) return;
      AcceptChangesCore();
      this.EntityGroup.OnEntityChanged(new EntityChangedEventArgs(this, EntityAction.Commit));
    }

    private void AcceptChangesCore() {
      ((IEditableObject)this).EndEdit();
      if (this.EntityState.IsAdded()) {
        SetEntityStateCore(EntityState.Unchanged);
        this.EntityManager.MarkTempIdAsMapped(this, true);
      } else if (this.EntityState.IsAddedOrModified()) {
        SetEntityStateCore(EntityState.Unchanged);
        ClearBackupVersion(EntityVersion.Original);
      } else if (this.EntityState.IsDeleted()) {
        // sets entityState to Detached
        this.EntityGroup.RemoveEntity(this);
      }

      EntityVersion = EntityVersion.Current;
    }

    void IChangeTracking.AcceptChanges() {
      AcceptChanges();
    }

    /// <summary>
    /// Rejects (rolls back) all changes to this Entity since it was queried or had <see cref="AcceptChanges"/> called on it.
    /// </summary>
    /// <remarks>
    /// Rejects any changes made to the Entity since the last save operation.
    /// This will also remove the Entity from the <b>EntityManager</b> if it was an 'added' object.
    /// <para>
    /// The <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanging"/> and <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanged"/> events
    /// will fire during a <b>RejectChanges</b> call with an EntityAction of <see cref="EntityAction.Rollback"/>.
    /// </para>
    /// <seealso cref="M:IdeaBlade.EntityModel.Entity.RejectChanges"/>
    /// <seealso cref="M:IdeaBlade.EntityModel.Entity.RemoveFromManager()"/>
    /// </remarks>
    public void RejectChanges() {
      if (!FireEntityChanging(EntityAction.Rollback)) return;
      UndoMappedTempId(this.EntityState);
      RejectChangesCore();
      this.EntityGroup.OnEntityChanged(new EntityChangedEventArgs(this, EntityAction.Rollback));
    }

    private void RejectChangesCore() {

      ((IEditableObject)this).CancelEdit();
      if (this.EntityState.IsModified()) {
        RestoreBackupVersion(EntityVersion.Original);
        SetEntityStateCore(EntityState.Unchanged);
      } else if (this.EntityState.IsDeleted()) {
        RestoreBackupVersion(EntityVersion.Original);
        SetEntityStateCore(EntityState.Unchanged);
        this.UndeleteReferences();
      } else if (this.EntityState.IsAdded()) {
        // sets entityState to Detached
        this.EntityGroup.RemoveEntity(this);
      }

      // this.ValidationErrors.Clear();
      
      EntityVersion = EntityVersion.Current;
    }


    void IRevertibleChangeTracking.RejectChanges() {
      RejectChanges();
    }

    /// <summary>
    /// Determines whether this entity has any pending changes.
    /// </summary>
    /// <returns></returns>
    public bool HasChanges() {
      return !this.EntityState.IsUnchanged();
    }

    /// <summary>
    /// Whether any changes have been made to this entity.
    /// </summary>
    public bool IsChanged {
      // part of IChangeTracking
      get { return HasChanges(); }
    }


    bool IChangeTracking.IsChanged {
      get { return HasChanges(); }
    }

    #endregion

    #region EntityState change methods

    /// <summary>
    /// Forces this entity into the <see cref="EntityState"/> of Added.
    /// </summary>
    /// <remarks>
    /// You will usually have no reason to call this method from application code.  The EntityState
    /// is automatically set to Added by the framework when a new entity is added to an EntityManager.
    /// </remarks>
    public void SetAdded() {
      if (this.EntityState == EntityState.Detached) {
        throw new InvalidOperationException("Detached objects must be attached before calling SetAdded");
      }
      SetEntityStateCore(EntityState.Added);
      _entityKey = null;
      EntityManager.UpdatePkIfNeeded(this);
    }

    /// <summary>
    /// Forces this entity into the <see cref="EntityState"/> of Modified.
    /// </summary>
    /// <remarks>
    /// You will usually have no reason to call this method from application code.  The EntityState
    /// is automatically set to Modified by the framework when any EntityProperty of the entity is changed.
    /// </remarks>
    public void SetModified() {
      if (this.EntityState == EntityState.Modified) return;
      if (this.EntityState == EntityState.Detached) {
        throw new InvalidOperationException("Detached objects must be attached before calling SetModified");
      }
      if (!FireEntityChanging(EntityAction.Change)) return;
      //if (this.EntityState == EntityState.Unchanged || this.EntityState == EntityState.Deleted) {
      //  CreateBackupVersion(EntityVersion.Original);
      //}
      SetEntityStateCore(EntityState.Modified);
      EntityGroup.OnEntityChanged(new EntityChangedEventArgs(this, EntityAction.Change));
    }

    #endregion
    
    #region GetValue(s)/SetValue methods

    #region Get/SetRawValue methods

    /// <summary>
    /// Low-level access to get a property value without going through
    /// the standard property 'get' accessor. 
    /// </summary>
    /// <param name="property"></param>
    /// <param name="version"></param>
    /// <returns></returns>
    /// <remarks>
    /// Note that this operation bypasses all custom interception methods.
    /// </remarks>
    public virtual Object GetValueRaw(DataProperty property, EntityVersion version) {
      InitializeDefaultValues();

      if (version == EntityVersion.Default) {
        version = EntityVersion;
      }

      Object result;
      if (version == EntityVersion.Current) {
        if (this.EntityVersion == EntityVersion.Proposed) {
          result = GetPreproposedValue(property);
        } else {
          result = this.Entity.GetValueRaw(property.Name);
        }
      } else if (version == EntityVersion.Original) {
        result = GetOriginalValue(property);
      } else if (version == EntityVersion.Proposed) {
        result = this.Entity.GetValueRaw(property.Name);
      } else {
        throw new ArgumentException("Invalid entity version");
      }

      if (property.IsComplexProperty) {
        var co = (IComplexObject)result;
        if (co == null) {
          co = ComplexAspect.Create(this.Entity, property, true);
          this.Entity.SetValueRaw(property.Name, co);
          return co;
        } else if (co.ComplexAspect.Parent == null || co.ComplexAspect.Parent != this.Entity) {
          co.ComplexAspect.Parent = this.Entity;
          co.ComplexAspect.ParentProperty = property;
        }
        return co;
      } else {
        return result;
      }
    }

    [DebuggerNonUserCode]
    internal void InitializeDefaultValues() {

      if (_defaultValuesInitialized) return;

      IEnumerable<DataProperty> properties = this.EntityType.DataProperties;
      

      _defaultValuesInitialized = true;

      properties.ForEach(dp => {
        try {
      
          if (dp.IsComplexProperty) {
            this.Entity.SetValueRaw(dp.Name, ComplexAspect.Create(this.Entity, dp, true));
          } else if (dp.DefaultValue != null) {
            this.Entity.SetValueRaw(dp.Name, dp.DefaultValue);
          }
        } catch (Exception e) {
          Debug.WriteLine("Exception caught during initialization of {0}.{1}: {2}", this.EntityType.Name, dp.Name, e.Message);
        }
      });
    }


    private Object GetOriginalValue(DataProperty property) {
      object result;
      if (property.IsComplexProperty) {
        var co = (IComplexObject)GetValueRaw(property, EntityVersion.Current);
        return co.ComplexAspect.GetOriginalVersion();
      } else {
        if (_originalValuesMap != null && _originalValuesMap.TryGetValue(property.Name, out result)) {
          return result;
        } else {
          return this.Entity.GetValueRaw(property.Name);
        }
      }
    }

    private Object GetPreproposedValue(DataProperty property) {
      object result;
      if (_preproposedValuesMap != null && _preproposedValuesMap.TryGetValue(property.Name, out result)) {
        return result;
      } else {
        return this.Entity.GetValueRaw(property.Name);
      }
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="property"></param>
    /// <param name="newValue"></param>
    protected internal virtual void SetValueWithChangeTracking(DataProperty property, Object newValue) {
      if (EntityGroup.ChangeTrackingEnabled | EntityState.IsDetached()) {
        TrackChange(property);
      }
      SetValueRaw(property, newValue);
      if (property.IsPartOfKey) {
        UpdateRelatedFks(property, newValue);
      }
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="property"></param>
    /// <param name="newValue"></param>
    public virtual void SetValueRaw(DataProperty property, object newValue) {
      InitializeDefaultValues();
      // TODO: might be a bug if we CancelEdit after a key change ( need to reverse key change as well)
      // maybe disallow key change while in IEditableObject
      if (property.IsPartOfKey) {
        // don't try to update the map if deserializing or detached.
        if (!this.EntityState.IsDetached() && this.InternalEntityManager != null) {
          // a non detached entity that does not have an EntityManager can still occur
          // here during a EntityCacheState transfer. The entities in an entityCacheState need to have
          // non-detached entityStates in order to Merge correctly but they will not yet be associated
          // with an EntityManager. Hence the EntityManager check in the line above.
          if (!this.EntityState.IsAdded()) {
            throw new InvalidOperationException(
              "You cannot change the primary key of an entity that already exists in the data store. " +
              "You can copy the original entity values to a new entity, give it the new key, add it to the EntityManager, " +
              "delete the original entity, and then save.");
          }
          IfTempIdThenCleanup(property);
          var oldKey = this.EntityKey;
          this.Entity.SetValueRaw(property.Name, newValue);
          this.EntityGroup.UpdatePrimaryKey(this, oldKey);
        } else {
          this.Entity.SetValueRaw(property.Name, newValue);
        }
      } else {
        // TODO: we are assuming that a complex type cannot be part of the key - is this safe???

        // SerializationContext check is so that we don't try to clone during a materialization operation.
        // The EF materializer expects to get back the values it assigns.
        if (property.IsComplexProperty) {
          var co = (IComplexObject)this.Entity.GetValueRaw(property.Name);
          var newCo = (IComplexObject)newValue;
          co.ComplexAspect.AbsorbCurrentValues(newCo.ComplexAspect);
        } else {
          this.Entity.SetValueRaw(property.Name, newValue);
        }
      }
    }

    private void UpdateRelatedFks(DataProperty property, Object newValue) {
      var refs = this.ReferenceManager.InternalReferences
        .Where(r => (!r.IsEmpty)
          && (!r.Link.EntityRelation.IsManyToMany)
          && r.Link.FromRole.EntityRelationRefConstraint == EntityRelationRefConstraint.Principal);

      refs.ForEach(r => {
        var ix = r.Link.FromRole.Properties.IndexOf(p => p == property);
        var prop = r.Link.ToRole.Properties.ElementAt(ix);
        foreach (IEntity entity in r.Values) {
          entity.EntityAspect.SetValueWithChangeTracking(prop, newValue);
        }
      });
    }

    private void IfTempIdThenCleanup(DataProperty property) {
      var oldValue = this.Entity.GetValueRaw(property.Name);
      var oldUniqueId = new UniqueId(property, oldValue);
      if (this.InternalEntityManager.TempIds.Contains(oldUniqueId)) {
        this.InternalEntityManager.TempIds.Remove(oldUniqueId);
      }
    }

    #endregion

    /// <summary>
    /// Retrieve the values of specified properties within this Entity.
    /// </summary>
    /// <param name="properties">An array of <see cref="EntityProperty"/>s for which values
    /// are desired</param>
    /// <returns>An array of data values corresponding to the specified properties</returns>
    protected internal Object[] GetValuesRaw(IEnumerable<DataProperty> properties) {
      var result = properties.Select(p => this.Entity.GetValueRaw(p.Name)).ToArray();
      return result;
    }

    

    internal void SetValueWithChangeNotification(DataProperty property, object newValue) {

      var oldValue = this.Entity.GetValueRaw(property.Name);
      if (Object.Equals(oldValue, newValue)) return;

      if (IsNullEntity) {
        throw new Exception("Null entities cannot be modified");
      }

      // var changeNotificationEnabled = EntityState != EntityState.Detached && this.EntityGroup.ChangeNotificationEnabled;
      var changeNotificationEnabled = this.EntityGroup.ChangeNotificationEnabled;

      if (changeNotificationEnabled) {
        if (!FireEntityChanging(EntityAction.Change)) return;

        var propArgs = new EntityPropertyChangingEventArgs(this, property, newValue);
        this.EntityGroup.OnEntityPropertyChanging(propArgs);
        if (propArgs.Cancel) return;

        // For now no changing event on the related nav property.
        //if (property.IsForeignKeyProperty) {
        //  propArgs = new EntityPropertyChangingEventArgs(this, property.RelatedNavigationProperty, newFkPropValue);
        //  this.EntityGroup.OnEntityPropertyChanging(propArgs);
        //}
        //if (propArgs.Cancel) return;
      }

      SetValueWithChangeTracking(property, newValue);
      // EntityGroup is null if setting value on an entity in the process of but before being merged into an entity manager. 
      if (property.IsForeignKey && !this.EntityGroup.IsNullGroup && !this.EntityState.IsDeletedOrDetached()) {
        var eref = property.RelatedNavigationProperty.GetEntityReference(this);
        ((IScalarEntityReference)eref).RefreshForFkChange();
      }

      if (this.EntityState.IsUnchanged() && !InternalEntityManager.IsLoadingEntity  ) {
        this.SetEntityStateCore(EntityState.Modified);
      }

      if (changeNotificationEnabled) {
        this.EntityGroup.OnEntityPropertyChanged(new EntityPropertyChangedEventArgs(this, property, newValue));
        if (property.IsForeignKey) {
          var sref = property.RelatedNavigationProperty.GetEntityReference(this);
          var newNavValue = sref.Value;
          this.EntityGroup.OnEntityPropertyChanged(new EntityPropertyChangedEventArgs(this, property.RelatedNavigationProperty, newNavValue));
        }
        this.EntityGroup.OnEntityChanged(new EntityChangedEventArgs(this, EntityAction.Change));
      }
    }



  

    #endregion

    #region IEditableObject Members


    /// <summary>
    /// Provided to allow IEditableObject interface to be overriden in derived classes.
    /// </summary>
    void IEditableObject.BeginEdit() {
      if (EntityVersion == EntityVersion.Proposed) return;
      if (IsNullOrPendingEntity) return;
      _altEntityState = this.EntityState;
      //ValidationErrors.Backup();
      ClearBackupVersion(EntityVersion.Proposed);
      EntityVersion = EntityVersion.Proposed;
    }


    /// <summary>
    /// Provided to allow IEditableObject interface to be overriden in derived classes.
    /// </summary>
    void IEditableObject.CancelEdit() {
      if (EntityVersion != EntityVersion.Proposed) return;
      RestoreBackupVersion(EntityVersion.Proposed);
      EntityVersion = EntityVersion.Current;
      this.SetEntityStateCore(_altEntityState);
      //ValidationErrors.Restore();
      ForcePropertyChanged(null);
    }

    /// <summary>
    /// Provided to allow IEditableObject interface to be overriden in derived classes.
    /// </summary>
    void IEditableObject.EndEdit() {
      if (EntityVersion != EntityVersion.Proposed) return;
      EntityVersion = EntityVersion.Current;
      //ValidationErrors.ClearBackup();
    }

    private EntityState _altEntityState;

    #endregion

    #region EntityKey methods
    /// <summary>
    /// The <see cref="T:IdeaBlade.EntityModel.EntityKey"/> for this entity. 
    /// </summary>
    public EntityKey EntityKey {
      get {
        // need to insure 
        if (_entityKey == null) {
          Object[] values = GetValuesRaw(this.EntityType.KeyProperties);
          var key = new EntityKey(this.EntityType, values, false);
          // do not cache _entityKey values that have not yet
          // gone thru a save
          if (this.EntityState.IsAdded() | this.EntityState.IsDetached()) {
            return key;
          }
          _entityKey = key;
        }
        return _entityKey;
      }
      protected set {
        _entityKey = value;
        OnEntityAspectPropertyChanged("EntityKey");
      }
    }

    internal bool HasDefaultEntityKey {
      get {
        return this.EntityType.KeyProperties
          .Select(p => p.DefaultValue)
          .SequenceEqual(EntityKey.Values);
      }
    }

    /// <summary>
    /// Returns whether the primary key for this Entity has changed.
    /// </summary>
    /// <remarks>
    /// Returns <c>false</c> for Detached, Added and Deleted objects because the change 
    /// state is either meaningless or cannot be determined.
    /// </remarks>
    internal bool EntityKeyHasChanged {
      get {
        if (this.EntityState != EntityState.Modified) {
          return false;
        }
        var keyProperties = this.EntityType.KeyProperties;

        for (int i = 0; i < keyProperties.Count; i++) {
          object original = this.GetValueRaw(keyProperties[i], EntityVersion.Original);
          object current = this.Entity.GetValueRaw(keyProperties[i].Name);
          if (original == null) return false; // should not happen
          // need ! Equals here - do not use ==; it will give wrong results
          if (!original.Equals(current)) return true;
        }
        return false;
      }
    }

    #endregion

    ////#region EntityRelation methods


    /////// <summary>
    /////// Finds any cached entities related to this entity by the specified link.
    /////// </summary>
    /////// <param name="relationLink"></param>
    /////// <returns></returns>
    /////// <remarks>
    /////// Entities will not be retrieved from a backend data source if not found in cache.
    /////// </remarks>
    ////internal IEnumerable<EntityAspect> FindRelatedAspects(EntityRelationLink relationLink) {
    ////  var aRef = ReferenceManager.Get(relationLink);
    ////  return EntityAspect.WrapAll(aRef.Values);
    ////}

    ////internal IEnumerable<EntityAspect> FindRelatedAspects(EntityRelationLink relationLink, bool includeDeleted) {
    ////  if (!relationLink.FromRole.EntityType.IsAssignableFrom(this.EntityType)) {
    ////    String msg = String.Format("EntityRelationLink: '{0}' with a 'FromType' of '{1}' is not" +
    ////      " a valid relationlink for an entity of type '{1}'",
    ////      relationLink.ToString(), relationLink.FromRole.EntityType.ToString(), this.EntityType.ToString());
    ////    throw new ArgumentException(msg);
    ////  }

    ////  IEnumerable<EntityAspect> results;
    ////  if (!includeDeleted) {
    ////    var entities = relationLink.ToNavigationEntityProperty.GetEntityReference(this).Values;
    ////    results = EntityAspect.WrapAll(entities);
    ////  } else if (relationLink.EntityRelation.IsManyToMany) {
    ////    var entities = relationLink.ToNavigationEntityProperty.GetEntityReference(this).Values;
    ////    results = EntityAspect.WrapAll(entities);
    ////    List<ManyToManyChangeMemo> memos; ;
    ////    if (this.ManyToManyChangeMap != null && this.ManyToManyChangeMap.TryGetValue(relationLink.ToNavigationEntityProperty.Name, out memos)) {
    ////      // IsDeleted test is needed to distinguish between entities removed from a relationship because of deletion vs removal just to delink entities.
    ////      var deletedEntities = memos.Where(memo => !memo.WasAdded && EntityAspect.Wrap(memo.Entity).EntityState.IsDeleted()).Select(memo => memo.Entity);
    ////      results = results.Concat(EntityAspect.WrapAll(deletedEntities));
    ////    }
    ////  } else {
    ////    results = Enumerable.Empty<EntityAspect>();
    ////    var fromProperties = relationLink.FromRole.Properties;
    ////    Object[] values = this.GetValuesRaw(fromProperties);
    ////    var entityCache = this.EntityGroup.EntityCache;
    ////    foreach (Type entityType in relationLink.ToRole.EntitySubtypes) {
    ////      var group = entityCache.EntityGroups[entityType];
    ////      if (group == null) continue;
    ////      var toProperties = relationLink.ToRole.Properties;
    ////      results = results.Concat(group.FindEntityAspects(toProperties, values, includeDeleted));
    ////    }
    ////  }
    ////  return results;


    ////  // OLD CODE - works but slower when includeDeleted is false.
    ////  // var results = Enumerable.Empty<EntityAspect>();
    ////  //if (!relationLink.EntityRelation.IsManyToMany) {
    ////  //  var fromProperties = relationLink.FromRole.Properties;
    ////  //  Object[] values = this.GetValuesRaw(fromProperties);
    ////  //  var entityCache = this.EntityGroup.EntityCache;
    ////  //  foreach (Type entityType in relationLink.ToRole.EntitySubtypes) {
    ////  //    var group = entityCache.EntityGroups[entityType];
    ////  //    if (group == null) continue;
    ////  //    var toProperties = relationLink.ToRole.Properties;
    ////  //    results = results.Concat(group.FindEntityAspects(toProperties, values, includeDeleted));
    ////  //  }
    ////  //} else {
    ////  //  var entities = relationLink.ToNavigationEntityProperty.GetEntityReference(this).Values;
    ////  //  results = EntityAspect.WrapAll(entities);
    ////  //}
    ////  //return results;
    ////}

    ////internal EntityAspect FindRelatedAspect(EntityRelationLink relationLink, bool includeDeleted) {
    ////  var aspects = FindRelatedAspects(relationLink, true);
    ////  var aspect = aspects.FirstOrDefault();
    ////  if (aspect == null) {
    ////    return null;
    ////  } else if (aspect.EntityState.IsDeleted()) {
    ////    return includeDeleted ? aspect : null;
    ////  } else {
    ////    return aspect;
    ////  }
    ////}

    ////#region EntityReference methods

    /////// <summary>
    /////// For internal use only.
    /////// </summary>
    ////protected internal EntityReferenceManager ReferenceManager {
    ////  get {
    ////    if (_referenceManager == null) {
    ////      _referenceManager = new EntityReferenceManager(this);
    ////    }
    ////    return _referenceManager;
    ////  }
    ////}

    ////internal void ClearReferenceManager() {
    ////  _referenceManager = null;
    ////}

    /////// <summary>
    /////// 
    /////// </summary>
    /////// <param name="link"></param>
    /////// <returns></returns>
    ////internal EntityReferenceBase GetEntityReference(EntityRelationLink link) {
    ////  //var eref = this.ReferenceManager.AllReferences.Where(r => r.Link == link).FirstOrDefault();
    ////  //return (EntityReferenceBase)eref;
    ////  return this.ReferenceManager.Get(link);
    ////}

    ////internal void FixupReferences() {
    ////  if (this.EntityState.IsDeletedOrDetached()) {
    ////    this.ReferenceManager.InternalReferences
    ////     .Where(eref => eref.IsLoaded || !eref.IsEmpty)
    ////     .ForEach(eref => eref.FixupReferences());
    ////  } else if (this.EntityState.IsAdded()) {
    ////    // this is needed because of our rule that added parent records
    ////    // have all dependents marked as loaded. So we want to make sure that
    ////    // we still fixup the local cache even if they are marked as loaded.
    ////    this.ReferenceManager.InternalReferences
    ////      .ForEach(eref => eref.FixupReferences());
    ////  } else {
    ////    this.ReferenceManager.InternalReferences
    ////      .Where(eref => !eref.IsLoaded)
    ////      .ForEach(eref => eref.FixupReferences());
    ////  }
    ////}

    ////internal void UndeleteReferences() {
    ////  this.ReferenceManager.InternalReferences
    ////    .Where(eref => eref.IsLoaded)
    ////    .ForEach(eref => eref.UndeleteReferences());
    ////}

    ////internal void DetachRelatedEntities() {
    ////  var erefs = this.ReferenceManager.InternalReferences
    ////    .Where(r => !r.IsEmpty);
    ////  erefs.ForEach(r => {
    ////    var inverseLink = r.Link.GetInverse();
    ////    var relatedAspects = EntityAspect.WrapAll(r.Values).ToList(); // ToList is important here to avoid collection modified issue.
    ////    relatedAspects.ForEach(w => {
    ////      var invRef = w.GetEntityReference(inverseLink);
    ////      invRef.RemoveEntity(this.Entity, false);
    ////    });
    ////  });
    ////}

    ////#endregion

    ////#endregion

    #region Entity Load/Import and Replace methods

    internal bool LoadEntity(EntityAspect sourceAspect, MergeStrategy mergeStrategy) {
      var rowUpdated = true;

      if (this.EntityState.IsUnchanged()) {
        if (IsCurrent(sourceAspect, false)) {
          rowUpdated = false;
          // unchanged but not current
        } else {
          ReplaceCurrentOnLoad(sourceAspect);
          // (not current) and modified
        }
      } else {
        // modified 
        if (mergeStrategy == MergeStrategy.OverwriteChanges) {
          ReplaceCurrentOnLoad(sourceAspect);
          // (not current) and modified
        } else if (mergeStrategy == MergeStrategy.PreserveChanges) {
          // one of the preserveChanges mergeStrategies and entity has changed 
          // do nothing - do not copy source to target
          rowUpdated = false;
        } else if (IsCurrent(sourceAspect, false)) {
          rowUpdated = false;
          // modified and not current
        } else if (mergeStrategy == MergeStrategy.PreserveChangesUnlessOriginalObsolete) {
          // matched and not current - assume source is current
          // update the target because it is out of date
          // we want the target to be marked Unchanged ( unless targetEntity was deleted)
          // targetEntity.ReplaceCurrent(newEntity);
          sourceAspect.SetEntityStateCore(EntityState.Unchanged);
          ReplaceAll(sourceAspect, false);
        } else if (mergeStrategy == MergeStrategy.PreserveChangesUpdateOriginal) {
          // do not update target's current values - but do update the target's before image
          ReplaceOriginal(sourceAspect, false);
        }
      }

      return rowUpdated;
    }

    internal bool ImportEntity(EntityAspect sourceAspect, MergeStrategy mergeStrategy) {

      var rowUpdated = true;


      if (this.EntityState.IsUnchanged()) {
        if (IsCurrent(sourceAspect, false) && this.EntityState == sourceAspect.EntityState) {
          rowUpdated = false;
          // unchanged but not current
        } else {
          ReplaceAll(sourceAspect, true);
          // (not current) and modified
        }
      } else {
        // modified 
        if (mergeStrategy == MergeStrategy.OverwriteChanges) {
          ReplaceAll(sourceAspect, true);
          // (not current) and modified
        } else if (mergeStrategy == MergeStrategy.PreserveChanges) {
          // one of the preserveChanges mergeStrategies and entity has changed 
          // do nothing - do not copy source to target
          rowUpdated = false;
        } else if (IsCurrent(sourceAspect, false)) {
          rowUpdated = false;
          // modified and not current
        } else if (mergeStrategy == MergeStrategy.PreserveChangesUnlessOriginalObsolete) {
          // matched and not current - assume source is current
          // update the target because it is out of date
          ReplaceAll(sourceAspect, true);
        } else if (mergeStrategy == MergeStrategy.PreserveChangesUpdateOriginal) {
          // do not update target's current values - but do update the target's before image
          ReplaceOriginal(sourceAspect, true);
        }
      }

      return rowUpdated;

    }



    internal void AbsorbCurrentValues(EntityAspect sourceAspect, bool isCloning = false) {
      this.EntityType.DataProperties.ForEach(p => {
        var sourceValue = sourceAspect.Entity.GetValueRaw(p.Name);
        if (p.IsComplexProperty) {
          var thisChildCo = (IComplexObject) this.Entity.GetValueRaw(p.Name);
          if (thisChildCo == null) {
            // this should only occur during a cloning operation i.e. a call from CloneCore
            // where the 'dest' is empty because we are creating a 'new' copy.
            thisChildCo = ComplexAspect.Create(this.Entity, p, true);
            this.Entity.SetValueRaw(p.Name, thisChildCo);

          }
          var thisChildAspect = thisChildCo.ComplexAspect;
          var sourceCo = (IComplexObject)sourceValue;
          if (sourceCo == null) {
            // this should only occur during a cloning operation i.e. a call from CloneCore
            // where the 'source' is empty because the clone was called before the source was initialized.
            sourceCo = ComplexAspect.Create(sourceAspect.Entity, p, true);
            sourceAspect.Entity.SetValueRaw(p.Name, sourceCo);
          }
          var sourceChildAspect = sourceCo.ComplexAspect;
          thisChildAspect.AbsorbCurrentValues(sourceChildAspect, isCloning);
        } else {
          this.Entity.SetValueRaw(p.Name, sourceValue);
        }
      });
    }

    internal void ReplaceAll(EntityAspect sourceAspect, bool copy) {
      if (!FireEntityChanging(EntityAction.ChangeCurrentAndOriginal)) return;

      ReplaceAllCore(sourceAspect, copy);
      _altEntityState = sourceAspect._altEntityState;
      EntityVersion = sourceAspect.EntityVersion;
      SetEntityStateCore(sourceAspect.EntityState);
      this.EntityGroup.OnEntityChanged(new EntityChangedEventArgs(this, EntityAction.ChangeCurrentAndOriginal));
    }

    /// <summary>
    /// Assumes sourceEntity is not around after this operation. i.e. is a transient object
    /// If not sourceEntity.DataValues must be copied instead of ref'd.
    /// </summary>
    /// <param name="sourceAspect"></param>
    internal void ReplaceCurrentOnLoad(EntityAspect sourceAspect) {
      if (this.EntityState.IsDetached()) {
        ReplaceCurrentOnLoadCore(sourceAspect);
      } else {
        if (!FireEntityChanging(EntityAction.ChangeCurrentAndOriginal)) return;
        ReplaceCurrentOnLoadCore(sourceAspect);
        SetEntityStateCore(EntityState.Unchanged);
        this.EntityGroup.OnEntityChanged(new EntityChangedEventArgs(this, EntityAction.ChangeCurrentAndOriginal));
      }
    }

    /// <summary>
    /// Assumes sourceEntity is not around after this operation. i.e. is a transient object
    /// If not sourceEntity.DataValues must be copied instead of ref'd.
    /// </summary>  
    internal void ReplaceOriginal(EntityAspect sourceAspect, bool copy) {
      if (!FireEntityChanging(EntityAction.ChangeOriginal)) return;
      ReplaceOriginalCore(sourceAspect, copy);
      if (!this.EntityState.IsDeletedOrDetached()) {
        SetEntityStateCore(EntityState.Modified);
      }
      this.EntityGroup.OnEntityChanged(new EntityChangedEventArgs(this, EntityAction.ChangeOriginal));
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="sourceAspect"></param>
    /// <param name="copy"></param>
    protected virtual void ReplaceAllCore(EntityAspect sourceAspect, bool copy) {
      if (sourceAspect._originalValuesMap != null) {
        _originalValuesMap = new OriginalValuesMap(sourceAspect._originalValuesMap);
      } else {
        _originalValuesMap = null;
      }
      if (sourceAspect._preproposedValuesMap != null) {
        _preproposedValuesMap = new BackupValuesMap(sourceAspect._preproposedValuesMap);
      } else {
        _preproposedValuesMap = null;
      }

      // ToList is necessary on the next statement.
      var fkPropsChanged = sourceAspect.EntityType.ForeignKeyProperties
        .Where(p => !Object.Equals(sourceAspect.Entity.GetValueRaw(p.Name), this.Entity.GetValueRaw(p.Name)))
        .ToList();
      AbsorbCurrentValues(sourceAspect);
      fkPropsChanged.ForEach(p => {
        var eref = p.RelatedNavigationProperty.GetEntityReference(this);
        ((IScalarEntityReference)eref).RefreshForFkChange();
      });
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="sourceAspect"></param>
    protected virtual void ReplaceCurrentOnLoadCore(EntityAspect sourceAspect) {

      // ToList is necessary on the next statement.
      var fkPropsChanged = sourceAspect.EntityType.ForeignKeyProperties
        .Where(p => !Object.Equals(p.GetValueRaw(sourceAspect), p.GetValueRaw(this)))
        .ToList();
      AbsorbCurrentValues(sourceAspect);

      ClearBackupVersion(EntityVersion.Original);
      fkPropsChanged.ForEach(p => {
        var eref = p.RelatedNavigationProperty.GetEntityReference(this);
        ((IScalarEntityReference)eref).RefreshForFkChange();
      });
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="sourceAspect"></param>
    /// <param name="copy"></param>
    protected virtual void ReplaceOriginalCore(EntityAspect sourceAspect, bool copy) {
      _originalValuesMap = new OriginalValuesMap();
      sourceAspect.EntityType.DataProperties
        .Where(dp => sourceAspect.Entity.GetValueRaw(dp.Name) != this.Entity.GetValueRaw(dp.Name))
        .ForEach(dp => _originalValuesMap.Add(dp.Name, sourceAspect.Entity.GetValueRaw(dp.Name)));
    }




    private bool IsCurrent(EntityAspect sourceAspect, bool noConcurrencyPropertyMeansCurrent) {
      if (this.EntityType.ConcurrencyProperties.Count() == 0) {
        return noConcurrencyPropertyMeansCurrent;
      } else if (sourceAspect.EntityState.IsDeleted()) {
        return false;
      } else {
        return AreEqual(sourceAspect, this.EntityType.ConcurrencyProperties);
      }
    }

    #endregion

    #region INotifyPropertyChanged Members

    // TODO: think about PropertyChanging event
    // Also think about PropertyChanged events that pass propertyDescriptors
    // Subclass PropertyChangedEventArgs and add PropertyDescriptor

    /// <summary>
    /// Fired whenever a property value on this Entity changes.
    /// </summary>
    public event PropertyChangedEventHandler EntityPropertyChanged;

    /// <summary>
    /// Properties on the EntityAspect that are subject to changed
    /// and therefore available via the PropertyChanged notification are
    /// EntityState, EntityKey, IsChanged, HasErrors, and SavingErrorMessage
    /// </summary>
    public event PropertyChangedEventHandler PropertyChanged;

    /// <summary>
    /// Forces a PropertyChanged event to be fired. 
    /// </summary>
    /// <param name="e">A <see cref="System.ComponentModel.PropertyChangedEventArgs"/> or null</param>
    /// <remarks>
    /// An Empty value or a null reference (<c>Nothing</c> in Visual Basic) for the propertyName parameter of 
    /// PropertyChangedEventArgs indicates that all of the properties have changed, causing 
    /// the .NET framework to also fire a ListChangedEventArgs.ListChangedType of "Reset" if the event
    /// propagates to a list that supports the ListChanged event.
    /// <para>
    /// Passing a null value to this method will
    /// insure that a valid (dynamically created) property name is passed on to any listeners.
    /// </para>
    /// <para>
    /// This method should only be needed in situations where changes to calculated fields or other properties 
    /// not backed by an <see cref="EntityProperty"/> must be made known.
    /// </para>
    /// </remarks>
    public void ForcePropertyChanged(PropertyChangedEventArgs e) {
      if (e == null) {
        e = EntityGroup.AllPropertiesChangedEventArgs;
      }
      FirePropertyChanged(e);
    }

    /// <summary>
    /// Raises the <see cref="PropertyChanged"/> event.
    /// </summary>
    internal void FirePropertyChanged(PropertyChangedEventArgs e) {
      try {
        OnEntityPropertyChanged(e);
      } catch {
        // eat exceptions during load
        if (this.InternalEntityManager == null || !this.InternalEntityManager.IsLoadingEntity) throw;
      }
    }

    /// <summary>
    /// Fires PropertyChanged on the Entity associated with this EntityAspect without invoking any IPropertyChangedInterceptor. 
    /// Normally the FirePropertyChanged method should be used in place of this.
    /// </summary>
    /// <param name="e"></param>
    public void OnEntityPropertyChanged(PropertyChangedEventArgs e) {
      var handler = EntityPropertyChanged;
      if (handler != null) {
        handler(this.Entity, e);
      }
    }

    /// <summary>
    /// Fires PropertyChanged on EntityAspect.
    /// </summary>
    /// <param name="propertyName"></param>
    public void OnEntityAspectPropertyChanged(String propertyName) {
      var handler = PropertyChanged;
      if (handler == null) return;
      var args = new PropertyChangedEventArgs(propertyName);
      try {
        handler(this, args);
      } catch {
        if (InternalEntityManager == null) throw;
        if (!this.InternalEntityManager.IsLoadingEntity) throw;
      }
    }

    #endregion

    #region IComparable

    /// <summary>
    /// Base implementation of <see cref="IComparable.CompareTo"/>.
    /// </summary>
    /// <param name="obj">Object to compare with this instance</param>
    /// <returns></returns>
    /// <remarks>This will compare Entities by <see cref="EntityKey"/>.  Derived classes
    /// can override this implementation as needed to modify the default sort order of objects of this type.
    /// </remarks>
    // Dummy implementation just to insure that Entities can compare to one another
    // DO NOT implement Equals by calling this method
    public virtual int CompareTo(Object obj) {
      if (this == obj) return 0;
      EntityAspect aEntity = obj as EntityAspect;
      if (aEntity == null) return -1;
      return this.EntityKey.CompareTo(aEntity.EntityKey);
    }

    #endregion

    #region Misc public properties and methods

    /// <summary>
    /// The <see cref="T:IdeaBlade.EntityModel.EntityManager"/> that manages this entity.
    /// </summary>
    /// <remarks>
    /// This value will be null until an object is attached to an <b>EntityManager</b> or if it was created using an EntityManager.
    /// </remarks>
    public EntityManager EntityManager {
      get {
        if (this.EntityState.IsDetached()) {
          return null;
        } else {
          return this.EntityGroup.EntityManager;
        }
      }
    }

    internal EntityManager InternalEntityManager {
      get {
        return this.EntityGroup.EntityManager;
      }
    }

    internal bool HasTemporaryEntityKey {
      get {
        var prop = this.EntityType.KeyProperties.First();
        var uid = new UniqueId(prop, this.Entity.GetValueRaw(prop.Name));
        if (EntityState == EntityState.Detached) {
          return InternalEntityManager.DataSourceResolver.GetIdGenerator(this.EntityType).IsTempId(uid);
        } else {
          return InternalEntityManager.TempIds.Contains(uid);
        }
      }
    }

    /// <summary>
    /// The <see cref="T:IdeaBlade.EntityModel.EntityState"/> of this entity.
    /// </summary>
    // [DataMember(Order = 2)]
    public EntityState EntityState {
      get {
        if (_entityState == 0 || EntityGroup.IsDetached) {
          // this can occur after an entityManager or entityGroup clear or 
          // during materialization because entity state hasn't yet been set.
          _entityState = EntityState.Detached;
        }
        return _entityState;
      }
      set {
        if (!this.EntityGroup.ChangeNotificationEnabled) {
          _entityState = value;
        } else if (value == EntityState.Added) {
          SetAdded();
        } else if (value == EntityState.Modified) {
          SetModified();
        } else if (value == EntityState.Unchanged) {
          AcceptChanges();
        } else if (value == EntityState.Deleted) {
          this.Delete();
        } else if (value == EntityState.Detached) {
          this.RemoveFromManager();
        }
      }
    }



    internal void SetEntityStateCore(EntityState value) {

      if (!this.EntityGroup.ChangeNotificationEnabled) {
        _entityState = value;
      } else {
        if (value.IsAdded()) {
          _originalValuesMap = null;
        }
        var hadChanges = _entityState != EntityState.Unchanged;
        _entityState = value;
        var hasChanges = _entityState != EntityState.Unchanged;
        OnEntityAspectPropertyChanged("EntityState");
        if (hadChanges != hasChanges) {
          OnEntityAspectPropertyChanged("IsChanged");
        }
      }
    }

    internal EntityVersion EntityVersion {
      get {
        if (_entityVersion == EntityVersion.Default) {
          // this can happen during deserialization.
          _entityVersion = EntityVersion.Current;
        }
        return _entityVersion;
      }
      set {
        _entityVersion = value;
        // not a public property on EntityAspect ( yet?)
        // OnEntityAspectPropertyChanged("EntityVersion");
      }
    }


    /// <summary>
    /// The <see cref="T:IdeaBlade.EntityModel.EntityGroup"/> that this Entity belongs to.
    /// </summary>
    /// <remarks>
    /// Note that the EntityGroup will never be null (it will be a prototype group 
    /// in the event that this entity is not yet attached to a specific entity manager. 
    /// </remarks>
    public EntityGroup EntityGroup {
      get {
        if (_entityGroup == null) {
          _entityGroup = EntityGroup.GetNull(this.EntityType);
        }
        return _entityGroup;
      }
      set {
        _entityGroup = value;
      }
    }


    /// <summary>
    /// An internally generated id that identifies the most recent datasource query to select this entity.
    /// </summary>
    internal Guid CurrentQueryId {
      get;
      set;
    }

    internal bool FireEntityChanging(EntityAction action) {
      var entityArgs = new EntityChangingEventArgs(this, action);
      this.EntityGroup.OnEntityChanging(entityArgs);
      return !entityArgs.Cancel;
    }


    /// <summary>
    /// For internal use only.  
    /// Makes a copy of the entity including its EntityState; it does not copy related entities.
    /// </summary>
    /// <returns></returns>
    /// <remarks>
    /// <b>CloneCore</b> copies the Entity "in depth" including the entity’s <see cref="EntityState"/>.
    /// Related entities are not copied.
    /// Derived classes that override <b>CloneCore</b> typically call base.CloneCore first to let 
    /// DevForce do the initial cloning before proceeding to their custom functionality.
    ///<para>
    /// <b>Beware:</b> the result of <b>CloneCore</b> is not attached to any EntityManager even though the value of its 
    /// EntityState indicates that it is! CloneCore should be called only within a Clone() method 
    /// that understands this and that will ultimately expose the cloned entity as a properly 
    /// formed entity with a correct EntityState.
    /// </para><para>
    /// The source EntityState is preserved so that the calling Clone() method can know and make use of the source 
    /// entity’s EntityState. It is critical that the calling Clone() method return a properly formed Entity 
    /// which means that, unless the method attaches the clone to a different EntityManager, the returned clone’s 
    /// EntityState should be reset to "Detached".
    /// </para><para>
    /// <b>CloneCore</b> is called within other DevForce Clone() methods (<see cref="IdeaBlade.EntityModel.EntityGroup.Clone()">EntityGroup.Clone</see> for example).
    /// You can invoke it yourself by casting the entity as <see cref="ICloneable"/> and calling Clone() as in 
    /// <code>(Foo) ((ICloneable) foo).Clone())</code>.
    /// The resulting clone does not belong to an EntityManager and its EntityState is "Detached".
    /// </para>
    /// </remarks>
    /// <summary>
    /// For internal use only.  
    /// Makes a copy of the entity including its EntityState; it does not copy related entities.
    /// </summary>
    /// <returns></returns>
    /// <remarks>
    /// <b>CloneCore</b> copies the Entity "in depth" including the entity’s <see cref="EntityState"/>.
    /// Related entities are not copied.
    /// Derived classes that override <b>CloneCore</b> typically call base.CloneCore first to let 
    /// DevForce do the initial cloning before proceeding to their custom functionality.
    ///<para>
    /// <b>Beware:</b> the result of <b>CloneCore</b> is not attached to any EntityManager even though the value of its 
    /// EntityState indicates that it is! CloneCore should be called only within a Clone() method 
    /// that understands this and that will ultimately expose the cloned entity as a properly 
    /// formed entity with a correct EntityState.
    /// </para><para>
    /// The source EntityState is preserved so that the calling Clone() method can know and make use of the source 
    /// entity’s EntityState. It is critical that the calling Clone() method return a properly formed Entity 
    /// which means that, unless the method attaches the clone to a different EntityManager, the returned clone’s 
    /// EntityState should be reset to "Detached".
    /// </para><para>
    /// <b>CloneCore</b> is called within other DevForce Clone() methods (<see cref="IdeaBlade.EntityModel.EntityGroup.Clone()">EntityGroup.Clone</see> for example).
    /// You can invoke it yourself by casting the entity as <see cref="ICloneable"/> and calling Clone() as in 
    /// <code>(Foo) ((ICloneable) foo).Clone())</code>.
    /// The resulting clone does not belong to an EntityManager and its EntityState is "Detached".
    /// </para>
    /// </remarks>
    public virtual EntityAspect CloneCore() {
      // NOTE: this method is dangerous in that it copies all fields from
      // source into clone.  This is fine for DF managed fields but 
      // any custom data will get copied 'by ref' to the clone.
      // This may not be expected.  So this method should only get called 
      // internally. 

      var nonCFEntity = this.Entity as IEntity;
      IEntity cloneEntity;
      // an Entities 'state' is primarily contained by the EntityAspect
      // for non CF Entities CloneCore will also clone non ORM persistable fields
      // for CF Entites CloneCore will only handle ORM persistable fields - any
      // other fields will need to be cloned after calling cloneCore.
      if (nonCFEntity != null) {
        cloneEntity = (IEntity)nonCFEntity.ShallowClone();
      } else {
        cloneEntity = (IEntity) EntityType.CreateEntity();
      }

      var cloneAspect = (EntityAspect)MemberwiseClone();
      ((IEntitySvcs)cloneEntity).SetEntityAspect(cloneAspect);
      cloneAspect._entityState = this._entityState;
      cloneAspect._entityVersion = this._entityVersion;
      cloneAspect._isNullEntity = this._isNullEntity;


      cloneAspect._indexInEntityGroup = -1;
      cloneAspect._entityGroup = null;
      cloneAspect._referenceManager = null;
      cloneAspect.EntityKey = null;

      cloneAspect.LoadedNavigationPropertyNames = null;

      // clear event handlers
      cloneAspect._errorsChangedHandler -= this._errorsChangedHandler;
      cloneAspect.EntityPropertyChanged -= this.EntityPropertyChanged;

      // backups are immutable after construction
      if (_originalValuesMap != null) {
        cloneAspect._originalValuesMap = new OriginalValuesMap(_originalValuesMap);
      }
      if (_preproposedValuesMap != null) {
        cloneAspect._preproposedValuesMap = new BackupValuesMap(_preproposedValuesMap);
      }

      cloneAspect.AbsorbCurrentValues(this, true);
      return cloneAspect;
    }/// 
  
    /// <summary>
    /// Marks this Entity for deletion; the <see cref="EntityState"/> becomes "Deleted".
    /// </summary>
    /// <remarks>
    /// You must call <see cref="M:IdeaBlade.EntityModel.EntityManager.SaveChanges()"/> to persist this change to the 
    /// backend data source.  
    /// <para>
    /// The <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanging"/> and <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanged"/> events
    /// will fire during a <b>Delete</b> call with an EntityAction of <see cref="EntityAction.Delete"/>.
    /// </para>  
    /// </remarks>
    public virtual void Delete() {
      if (this.EntityState.IsDeletedOrDetached()) return;

      if (!FireEntityChanging(EntityAction.Delete)) return;

      // Cascade delete 
      // remove all dependent entities.
      var refs = this.ReferenceManager.InternalReferences
        .Where(er => er.Link.ShouldCascadeDeletes
          && !er.Link.EntityRelation.IsManyToMany
          && !er.IsEmpty);
      var relatedEntities = refs.SelectMany(r => r.Values.Cast<Object>());
      EntityAspect.WrapAll(relatedEntities).ToList().ForEach(e => e.Delete());

      // Don't think that this is needed ... left this comment here because I keep thinking about adding it back. 
      // this.EntityManager.QueryCache.Clear();

      // Remove entity from any many-many collections (this is not a delete);

      //var refs2 = this.ReferenceManager.InternalListReferences
      //  .Where(er => er.Link.ShouldCascadeDeletes
      //    && er.Link.EntityRelation.IsManyToMany
      //    && !er.IsEmpty);
      var refs2 = this.ReferenceManager.InternalListReferences
        .Where(er => er.Link.EntityRelation.IsManyToMany
          && !er.IsEmpty);
      refs2.ForEach(r => {
        r.Values.Cast<Object>().ToList().ForEach(e => r.RemoveEntity(e, true));
      });

      UpdateUnresolvedParentMapAfterDeleteOrRemove();


      // Finish up

      if (this.EntityState.IsAdded()) {
        this.EntityGroup.RemoveEntity(this);
        EntityVersion = EntityVersion.Current;
      } else {
        SetEntityStateCore(EntityState.Deleted);
        EntityVersion = EntityVersion.Original;
      }

      this.EntityGroup.OnEntityChanged(new EntityChangedEventArgs(this, EntityAction.Delete));
    }

    internal void UpdateUnresolvedParentMapAfterDeleteOrRemove() {
      // update UnresolvedParentMap for all stranded children of this entity that remain after a delete or removal.
      // add the parent key to the UnresolvedParentMap for every stranded child. 
      var childRefs = this.ReferenceManager.InternalReferences
        .Where(er => (!er.IsEmpty) && er.Link.FromRole.EntityRelationRefConstraint == EntityRelationRefConstraint.Principal);
      if (childRefs.Any() && !this.HasDefaultEntityKey) {
        childRefs.ForEach(eref => {
          if (eref.IsScalar) {
            this.InternalEntityManager.UnresolvedParentMap.AddToMap(this.EntityKey, eref.Link, Wrap(eref.Value));
          } else {
            eref.Values.Cast<Object>().ForEach(v => this.InternalEntityManager.UnresolvedParentMap.AddToMap(this.EntityKey, eref.Link, Wrap(v)));
          }
        });
      }
      var parentRefs = this.ReferenceManager.InternalReferences
        .Where(er => er.Link.FromRole.EntityRelationRefConstraint == EntityRelationRefConstraint.Dependent);
      if (parentRefs.Any()) {
        parentRefs.ForEach(eref => {
          var parentKey = GetToEntityKey(this, eref.Link);
          if (parentKey != null) {
            this.InternalEntityManager.UnresolvedParentMap.RemoveChild(parentKey, eref.Link.GetInverse(), this);
          }
        });
      }
    }

    //private EntityKey GetToEntityKey(EntityAspect fromAspect, EntityRelationLink link) {
    //  // do not cache this value = contents of the FromEntity can change between invocations
    //  var values = fromAspect.GetValuesRaw(link.FromRole.Properties);
    //  // if any of the link properties are null ; return null because query will return null;
    //  if (values.Any(v => v == null)) {
    //    return null;
    //  } else {
    //    return new EntityKey(link.ToRole.EntityType, values, false);
    //  }
    //}

    #region Misc overrides

    /// <summary>
    /// <see cref="Object.Equals(object)"/>.
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public override bool Equals(object obj) {
      var other = obj as EntityAspect;
      if ((object)other == null) {
        return (obj == null && this.IsNullEntity);
      }
      if (this.IsNullEntity && other.IsNullEntity) return true;
      return base.Equals(obj);
    }

    /// <summary>
    /// <see cref="Object.GetHashCode"/>.
    /// </summary>
    /// <returns></returns>
    public override int GetHashCode() {
      if (IsNullEntity) {
        return this.GetType().GetHashCode();
      } else {
        return base.GetHashCode();
      }
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="sourceAspect"></param>
    /// <param name="properties"></param>
    /// <returns></returns>
    protected virtual bool AreEqual(EntityAspect sourceAspect, IEnumerable<DataProperty> properties) {
      bool isCurrent = properties.All(p => Object.Equals(this.Entity.GetValueRaw(p.Name), sourceAspect.Entity.GetValueRaw(p.Name)));
      return isCurrent;
    }

    #endregion

    #endregion

    #region Backup version members

    /// <summary>
    /// 
    /// </summary>
    /// <param name="version"></param>
    protected internal virtual void ClearBackupVersion(EntityVersion version) {

      if (version == EntityVersion.Original) {
        if (_originalValuesMap != null) {
          ClearComplexBackupVersions(version);
          _originalValuesMap = null;
        }
      } else if (version == EntityVersion.Proposed) {
        if (_preproposedValuesMap != null) {
          ClearComplexBackupVersions(version);
          _preproposedValuesMap = null;
        }
      }
    }

    private void ClearComplexBackupVersions(EntityVersion version) {
      this.EntityType.DataProperties.Where(dp => dp.IsComplexProperty).ForEach(dp => {
        var co = (IComplexObject) this.Entity.GetValueRaw(dp.Name);
        if (co != null) {
          co.ComplexAspect.ClearBackupVersion(version);
        }
      });
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="version"></param>
    protected virtual void RestoreBackupVersion(EntityVersion version) {
      if (version == EntityVersion.Original) {
        if (_originalValuesMap != null) {
          RestoreOriginalValues(_originalValuesMap, version);
          _originalValuesMap = null;
        }
      } else if (version == EntityVersion.Proposed) {
        if (_preproposedValuesMap != null) {
          RestoreOriginalValues(_preproposedValuesMap, version);
          _preproposedValuesMap = null;
        }
      }
    }

    private void RestoreOriginalValues(BackupValuesMap backupMap, EntityVersion version) {
      backupMap.ForEach(kvp => {
        var value = kvp.Value;
        if (value is IComplexObject) {
          ((IComplexObject)value).ComplexAspect.RestoreBackupVersion(version);
        }
        var dp = this.EntityType.GetDataProperty(kvp.Key);

        if (dp.IsForeignKey) {
          if (this.Entity.GetValueRaw(dp.Name) != value) {
            this.Entity.SetValueRaw(dp.Name, value);
            ((IScalarEntityReference)dp.RelatedNavigationProperty.GetEntityReference(this)).RefreshForFkChange();
          }
        } else {
          this.Entity.SetValueRaw(dp.Name, value);
        }
      });
    }

    internal void TrackChange(DataProperty property) {
      // We actually do want to track Proposed changes when Detached ( or Added) but we do not track an Original for either
      if (this.EntityState.IsAdded() || this.EntityState.IsDetached()) {
        if (this.EntityVersion == EntityVersion.Proposed) {
          BackupProposedValueIfNeeded(property);
        }
      } else {
        if (this.EntityVersion == EntityVersion.Current) {
          BackupOriginalValueIfNeeded(property);
        } else if (this.EntityVersion == EntityVersion.Proposed) {
          // need to do both
          BackupOriginalValueIfNeeded(property);
          BackupProposedValueIfNeeded(property);
        }
      }
    }

    internal void BackupOriginalValueIfNeeded(DataProperty property) {
      if (_originalValuesMap == null) {
        _originalValuesMap = new OriginalValuesMap();
      }

      if (_originalValuesMap.ContainsKey(property.Name)) return;
      // reference copy of complex object is deliberate - actual original values will be stored in the co itself.
      _originalValuesMap.Add(property.Name, this.Entity.GetValueRaw(property.Name));
    }

    internal void BackupProposedValueIfNeeded(DataProperty property) {
      if (_preproposedValuesMap == null) {
        _preproposedValuesMap = new BackupValuesMap();
      }

      if (_preproposedValuesMap.ContainsKey(property.Name)) return;
      _preproposedValuesMap.Add(property.Name, this.Entity.GetValueRaw(property.Name));
    }

    #endregion

    #region NullEntity methods

    /// <summary>
    /// Returns whether the current instance is a null entity.
    /// </summary>
    /// <remarks>
    /// The EntityManager will return a NullEntity instead of a null value when
    /// a requested entity is not found.
    /// </remarks>
    /// <include file='Entity.Examples.xml' path='//Class[@name="Entity"]/method[@name="IsNullEntity"]/*' />
    public bool IsNullEntity {
      get { return _isNullEntity; }
    }

    
    internal void SetNullEntity() {
      _isNullEntity = true;
    }

    #endregion

 
   

    #region Misc private and internal methods/properties

    //internal Object[] GetCurrentValues() {
    //  var entity = this.Entity;
    //  var props = EntityMetadata.DataProperties;
    //  var currentValues = props.Select(p => p.GetValueRaw(entity)).ToArray();
    //  return currentValues;
    //}

    // This is the "current" value of the EntityVersion.Default ( not EntityVersion.Current) although
    // these will be the same except when the current version or the object is proposed.
    //internal Object[] CurrentValues {
    //  get {
    //    if (_currentValues == null) {
    //      var metadata = this.EntityGroup.EntityMetadata;
    //      _currentValues = metadata.DefaultValues.Select((v, i) => v is IComplexObject
    //        ? ComplexAspect.Create(this.Entity, metadata.DataProperties[i])
    //        : v)
    //        .ToArray();
    //    }
    //    return _currentValues;
    //  }
    //  set {
    //    _currentValues = value;
    //  }
    //}


    internal OriginalValuesMap OriginalValuesMap {
      get { return _originalValuesMap; }
      set { _originalValuesMap = value; }
    }

    private void UndoMappedTempId(EntityState rowState) {
      if (this.EntityState.IsAdded()) {
        this.InternalEntityManager.MarkTempIdAsMapped(this, true);
      } else if (this.EntityState.IsDetached()) {
        this.InternalEntityManager.MarkTempIdAsMapped(this, false);
      }
    }



    internal int IndexInEntityGroup {
      get { return _indexInEntityGroup; }
      set { _indexInEntityGroup = value; }
    }

    #endregion

    #region Change Tracking

    // DataForm blows unless we use String.Empty - see B1112 - we're keeping 
    // old non-SL behavior because this change was made at last minute and couldn't
    // be adequately tested.
#if NET
    private static readonly PropertyChangedEventArgs AllPropertiesChangedEventArgs
      = new PropertyChangedEventArgs(null);
#else
    private static readonly PropertyChangedEventArgs AllPropertiesChangedEventArgs
      = new PropertyChangedEventArgs(String.Empty);

#endif

    // all but EntityAction.Change
    private const EntityAction MajorEntityChange
      = EntityAction.Add
      | EntityAction.Remove
      | EntityAction.ChangeCurrentAndOriginal
      | EntityAction.ChangeOriginal
      | EntityAction.Commit
      | EntityAction.Delete
      | EntityAction.Rollback;


    internal void TrackChanging(EntityChangingEventArgs e, EntityManager em) {
      //// em is needed as a parameter because this EntityAspect's EntityManager may not yet 
      //// be set for a newly added entity.
      //if (em == null) return;
      //if (e.Action == EntityAction.Remove) {
      //  em.MarkTempIdAsMapped(this, true);
      //} 
    }

    internal void TrackChanged(EntityChangedEventArgs e) {
      if (InternalEntityManager == null) return;
      if ((e.Action & MajorEntityChange) > 0) {
        // TODO: determine how often this is called when it is not needed.
        FixupReferences();
      }
    }

    #endregion

    #region Loading info


    internal List<String> LoadedNavigationPropertyNames {
      get;
      set;
    }

    internal void AddLoadedNavigationPropertyName(String propertyName, bool wasLoaded) {
      if (LoadedNavigationPropertyNames == null) {
        LoadedNavigationPropertyNames = new List<string>();
      }
      if (wasLoaded == LoadedNavigationPropertyNames.Contains(propertyName)) return;
      if (wasLoaded) {
        LoadedNavigationPropertyNames.Add(propertyName);
      } else {
        LoadedNavigationPropertyNames.Remove(propertyName);
      }
    }

   


    #endregion



    #region INotifyDataErrorInfo

    /// <summary>
    /// True if there are any validation errors.
    /// </summary>
    bool INotifyDataErrorInfo.HasErrors {
      get {
        return false;
      }
    }

    /// <summary>
    /// Raised when validation errors have changed for a property or the object.
    /// </summary>
    event EventHandler<DataErrorsChangedEventArgs> INotifyDataErrorInfo.ErrorsChanged {
      add {
        _errorsChangedHandler += value;
      }
      remove {
        _errorsChangedHandler -= value;
      }
    }

    IEnumerable INotifyDataErrorInfo.GetErrors(string propertyName) {
      
      
      return null;
    }




    /// <summary>
    /// Raises the ErrorsChanged event.
    /// </summary>
    /// <param name="propertyName"></param>
    private void OnErrorsChanged(String propertyName) {
      // _inErrorsChanged is needed because SL tries to reinvoke validation every time in the ErrorsChanged event fires.
      if (_inErrorsChanged) return;
      _inErrorsChanged = true;
      try {
        var handler = _errorsChangedHandler;
        if (handler != null) {
          handler(this, new DataErrorsChangedEventArgs(propertyName));
        }
      } finally {
        _inErrorsChanged = false;
      }
    }


    private bool _inErrorsChanged = false;

    private event EventHandler<DataErrorsChangedEventArgs> _errorsChangedHandler;

    #endregion




    

    //#region Related entity methods

    ///// <summary>
    ///// Finds any cached entities related to this entity by the specified link.
    ///// </summary>
    ///// <param name="relationLink"></param>
    ///// <param name="includeDeleted"></param>
    ///// <returns></returns>
    ///// <remarks>
    ///// Entities will not be retrieved from a backend data source if not found in cache.
    ///// </remarks>
    //public IEnumerable<Object> FindRelatedEntities(EntityRelationLink relationLink, bool includeDeleted) {
    //  return FindRelatedAspects(relationLink, includeDeleted).Select(w => w.Entity);
    //}

    ///// <summary>
    ///// Returns the related entity via a <see cref="EntityRelationLink"/>.
    ///// </summary>
    ///// <param name="relationLink"></param>
    ///// <returns></returns>
    ///// <remarks>
    ///// The current <see cref="P:IdeaBlade.EntityModel.EntityManager.DefaultQueryStrategy"/> is used
    ///// to determine how this query is fulfilled.
    ///// </remarks>
    //public Object GetRelatedEntity(EntityRelationLink relationLink) {
    //  return GetRelatedEntity(relationLink, null);
    //}

    ///// <summary>
    ///// Returns the related entity via a <see cref="EntityRelationLink"/>.
    ///// </summary>
    ///// <typeparam name="T"></typeparam>
    ///// <param name="relationLink"></param>
    ///// <returns></returns>
    ///// <remarks>
    ///// The current <see cref="P:IdeaBlade.EntityModel.EntityManager.DefaultQueryStrategy"/> is used
    ///// to determine how this query is fulfilled.
    ///// </remarks>
    //public T GetRelatedEntity<T>(EntityRelationLink relationLink) where T : class {
    //  return GetRelatedEntity<T>(relationLink, null);
    //}

    ///// <summary>
    ///// Returns the related entity via a <see cref="EntityRelationLink"/> using the specified QueryStrategy.
    ///// </summary>
    ///// <typeparam name="T"></typeparam>
    ///// <param name="relationLink"></param>
    ///// <param name="strategy"></param>
    ///// <returns></returns>
    //public T GetRelatedEntity<T>(EntityRelationLink relationLink, QueryStrategy strategy) where T : class {
    //  if (!typeof(T).IsAssignableFrom(relationLink.ToRole.EntityType)) {
    //    throw new ArgumentException("relationLink.ToType does not match return type");
    //  }
    //  return (T)GetRelatedEntity(relationLink, strategy);
    //}

    ///// <summary>
    ///// Returns all related entities via the specified <see cref="EntityRelationLink"/>.
    ///// </summary>
    ///// <param name="relationLink"></param>
    ///// <returns></returns>
    ///// <remarks>
    ///// The current <see cref="P:IdeaBlade.EntityModel.EntityManager.DefaultQueryStrategy"/> is used
    ///// to determine how this query is fulfilled.
    ///// </remarks>
    //public IEnumerable GetRelatedEntities(EntityRelationLink relationLink) {
    //  return GetRelatedEntities(relationLink, null);
    //}

    ///// <summary>
    ///// Returns all related entities via the specified <see cref="EntityRelationLink"/>.
    ///// </summary>
    ///// <typeparam name="T"></typeparam>
    ///// <param name="relationLink"></param>
    ///// <returns></returns>
    ///// <remarks>
    ///// The current <see cref="P:IdeaBlade.EntityModel.EntityManager.DefaultQueryStrategy"/> is used
    ///// to determine how this query is fulfilled.
    ///// </remarks>
    //public IEnumerable<T> GetRelatedEntities<T>(EntityRelationLink relationLink)
    //  where T : class {
    //  return GetRelatedEntities<T>(relationLink, null);
    //}

    ///// <summary>
    ///// Returns all related entities via the specified <see cref="EntityRelationLink"/> using the specified QueryStrategy.
    ///// </summary>
    ///// <typeparam name="T"></typeparam>
    ///// <param name="relationLink"></param>
    ///// <param name="strategy"></param>
    ///// <returns></returns>
    //public IEnumerable<T> GetRelatedEntities<T>(EntityRelationLink relationLink, QueryStrategy strategy)
    //  where T : class {
    //  return GetRelatedEntities(relationLink, strategy).Cast<T>();
    //}

    ///// <summary>
    ///// Returns the related entity via a <see cref="EntityRelationLink"/> using the specified QueryStrategy.
    ///// </summary>
    ///// <param name="relationLink"></param>
    ///// <param name="strategy"></param>
    ///// <returns></returns>
    //public Object GetRelatedEntity(EntityRelationLink relationLink, QueryStrategy strategy) {
    //  var query = new EntityRelationQuery(this.Entity, relationLink);
    //  return query.With(this.InternalEntityManager, strategy).FirstOrNullEntity();
    //}


    ///// <summary>
    ///// Returns all related entities via the specified <see cref="EntityRelationLink"/> using the specified QueryStrategy.
    ///// </summary>
    ///// <param name="relationLink"></param>
    ///// <param name="strategy"></param>
    ///// <returns></returns>
    //public IEnumerable GetRelatedEntities(EntityRelationLink relationLink, QueryStrategy strategy) {
    //  var query = new EntityRelationQuery(this.Entity, relationLink);
    //  return query.With(this.InternalEntityManager, strategy).Execute();
    //}


    //#endregion

    #region BAD ideas

    // NOTE: DO NOT DO THIS - it causes failures on the server side expression tree logic

    //public static bool operator ==(Entity a, Entity b) {
    //  // If both are null, or both are same instance, return true.
    //  if (System.Object.ReferenceEquals(a, b)) {
    //    return true;
    //  }

    //  if ((object) a == null) {
    //    return b.IsNullEntity;
    //  }

    //  if ((object) b == null) {
    //    return a.IsNullEntity;
    //  }

    //  return a.Equals(b);
    //}

    //public static bool operator !=(Entity a, Entity b) {
    //  return !(a == b);
    //}

    // not a good idea - talk to Jay before doing this.
    ///// <summary>
    ///// Overridden. See <see cref="Object.GetHashCode"/>.
    ///// </summary>
    ///// <returns></returns>
    //public override int GetHashCode() {
    //  if ((this.EntityState & (EntityState.Deleted | EntityState.Detached)) > 0) {
    //    return 0;
    //  } else {
    //    return this.EntityKey.GetHashCode();
    //  }
    //}

    #endregion

    #region Fields

    private IEntity _entity;
    private EntityKey _entityKey;
    private EntityState _entityState = EntityState.Detached;

    // should only ever be set to either current or proposed ( never original)
    private EntityVersion _entityVersion = EntityVersion.Current;
    
    private bool _isNullEntity;
    private EntityGroup _entityGroup;
    private int _indexInEntityGroup = -1;
   
    internal bool _defaultValuesInitialized = false;
    private OriginalValuesMap _originalValuesMap;
    private BackupValuesMap _preproposedValuesMap;

    #endregion

  }

}
