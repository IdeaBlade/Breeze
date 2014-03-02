using Breeze.Core;
using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
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
  /// </remarks>
  [DebuggerDisplay("{EntityKey} - {EntityState}")]
  public class EntityAspect : StructuralAspect, IEditableObject, IChangeTracking, IRevertibleChangeTracking, INotifyPropertyChanged,
    INotifyDataErrorInfo, IComparable {
    // what about IDataErrorInfo

    /// <summary>
    /// 
    /// </summary>
    /// <param name="entity"></param>
    public EntityAspect(IEntity entity, EntityType entityType = null)
      : base(entity) {
      Entity = entity;
      entity.EntityAspect = this;
      EntityType = entityType ?? MetadataStore.Instance.GetEntityType(entity.GetType());
      InitializeDefaultValues();
      IndexInEntityGroup = -1;
      _entityState = EntityState.Detached;
    }

    #region Public properties

    public IEntity Entity { get; private set; }

    public EntityType EntityType {
      get {
        return _entityType;
      }
      internal set {
        _entityType = value;
      }
    }

    public bool IsDetached {
      get { return this.EntityState == EntityState.Detached; }
    }

    public bool IsAttached {
      get { return this.EntityState != EntityState.Detached; }
    }

    /// <summary>
    /// The <see cref="T:IdeaBlade.EntityModel.EntityManager"/> that manages this entity.
    /// </summary>
    /// <remarks>
    /// This value will be null until an object is attached to an <b>EntityManager</b> or if it was created using an EntityManager.
    /// </remarks>
    public EntityManager EntityManager {
      get {
        return (this.EntityGroup != null) ? this.EntityGroup.EntityManager : null;
      }
    }

    public EntityKey EntityKey {
      get {
        // need to insure 
        if (_entityKey == null) {
          Object[] values = GetValues(this.EntityType.KeyProperties);
          var key = EntityKey.Create(this.EntityType, values);
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
        // set it to null to force recalc
        _entityKey = value;
        OnEntityAspectPropertyChanged("EntityKey");
      }
    }

    public override EntityState EntityState {
      get {
        return _entityState;
      }
      set {
        //if (!this.EntityGroup.ChangeNotificationEnabled) {
        //  _entityState = value;
        if (value == EntityState.Added) {
          SetAdded();
        } else if (value == EntityState.Modified) {
          SetModified();
        } else if (value == EntityState.Unchanged) {
          AcceptChanges();
        } else if (value == EntityState.Deleted) {
          this.Delete();
        } else if (value == EntityState.Detached) {
          this.Detach();
        }
      }
    }

    public override EntityVersion EntityVersion {
      get {
        if (_entityVersion == EntityVersion.Default) {
          // this can happen during deserialization.
          _entityVersion = EntityVersion.Current;
        }
        return _entityVersion;
      }
      internal set {
        _entityVersion = value;
        // not a public property on EntityAspect ( yet?)
        // OnEntityAspectPropertyChanged("EntityVersion");
      }
    }

    /// <summary>
    /// Returns whether the current instance is a null entity.
    /// </summary>
    /// <remarks>
    /// The EntityManager will return a NullEntity instead of a null value when
    /// a requested entity is not found.
    /// </remarks>
    /// <include file='Entity.Examples.xml' path='//Class[@name="Entity"]/method[@name="IsNullEntity"]/*' />
    public bool IsNullEntity {
      get;
      internal set;
    }

    public bool HasTemporaryKey {
      get {
        var dp = this.EntityType.KeyProperties.First();
        var uid = new UniqueId(dp, GetValue(dp));
        return EntityManager.KeyGenerator.IsTempId(uid);
      }
    }

    #endregion

    #region Protected/Internal properties

    // EntityGroup is null if never attached but once its non-null it keeps its previous value.
    internal EntityGroup EntityGroup {
      get { return _entityGroup; }
      set { _entityGroup = value; }
    }

    public override StructuralType StructuralType {
      get { return this.EntityType; }
    }

    protected override IStructuralObject StructuralObject {
      get { return this.Entity; }
    }

    #endregion

    #region Public methods


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
    public void Delete() {
      if (this.EntityState.IsDeletedOrDetached()) return;
      if (!FireEntityChanging(EntityAction.Delete)) return;
      var entity = this.Entity;
      if (this.EntityState.IsAdded()) {
        this.EntityManager.DetachEntity(entity);
      } else {
        this.SetEntityStateCore(EntityState.Deleted);
        RemoveFromRelations(EntityState.Deleted);
        this.EntityManager.NotifyStateChange(this, true);
      }
      OnEntityChanged(EntityAction.Delete);
    }

    #endregion

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


    #endregion

    #region Add/Remove from manager
    /// <summary>
    /// Adds a newly created entity to its associated <see cref="T:IdeaBlade.EntityModel.EntityManager"/>. 
    /// </summary>
    /// <remarks>The associated EntityManager will either be the EntityManager that was called to create this Entity
    /// (<see cref="IdeaBlade.EntityModel.EntityManager.CreateEntity{T}()"/>) or that was used to generate its ids ( <see cref="IdeaBlade.EntityModel.EntityManager.GenerateId"/>)
    /// If neither of these cases apply, then the <see cref="EntityManager"/>'s DefaultManager"/> will be used.
    /// There is no difference between <b>AddToManager</b> and 
    /// <see cref="M:IdeaBlade.EntityModel.EntityManager.AddEntity(IdeaBlade.EntityModel.Entity)"/>.
    /// Use either method to add a business object created by the <see cref="M:IdeaBlade.EntityModel.EntityManager.CreateEntity(System.Type)"/> method
    /// to the EntityManager cache.  The object must have a "detached" <see cref="M:IdeaBlade.EntityModel.Entity.EntityState"/>, must not
    /// have ever been associated with another EntityManager and must have a unique EntityKey within the EntityManager to which it will
    /// be added. 
    /// </remarks>
    // <include file='Entity.Examples.xml' path='//Class[@name="Entity"]/method[@name="AddToManager"]/*' />
    public void Attach(EntityState entityState = EntityState.Unchanged, EntityManager entityManager = null) {
      var em = entityManager ?? EntityManager;
      if (em == null) {
        throw new InvalidOperationException("There is no EntityManager associated with this entity and none was passed in.");
      }
      em.AttachEntity(this.Entity, entityState);
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
    public bool Detach() {

      if (IsDetached) return false;

      EntityManager.MarkTempIdAsMapped(this, true);

      EntityGroup.DetachEntityAspect(this);
      SetEntityStateCore(EntityState.Detached); // need to do this before RemoveFromRelations call
      RemoveFromRelations(EntityState.Detached);
      // TODO: determine if this is needed.
      // this.OriginalValuesMap = null;
      // this.PreproposedValuesMap = null;

      // TODO: add later
      // this._validationErrors = {};


      EntityManager.NotifyStateChange(this, false);
      EntityManager.OnEntityChanged(this.Entity, EntityAction.Detach);
      return true;
    }

    internal void DetachOnClear() {
      // this.OriginalValuesMap = null;
      // this.PreproposedValuesMap = null;
      _entityState = EntityState.Detached;
    }

    #endregion

    #region Accept/Reject/HasChanges and IChangeTracking/IReveribleChangeTracking

    public void AcceptChanges() {
      if (this.IsDetached) return;
      if (!FireEntityChanging(EntityAction.AcceptChanges)) return;
      if (this.EntityState.IsDeleted()) {
        this.EntityManager.DetachEntity(this.Entity);
      } else {
        this.SetUnchanged();
      }
      this.EntityManager.OnEntityChanged(this.Entity, EntityAction.AcceptChanges);

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
      if (this.IsDetached) return;
      if (!FireEntityChanging(EntityAction.RejectChanges)) return;

      // we do not want PropertyChange or EntityChange events to occur here
      // because the single RejectChanges will cover both
      using (new BooleanUsingBlock((b) => this.EntityManager.IsRejectingChanges = b)) {
        RejectChangesCore();
      };

      if (EntityState.IsAdded()) {
        // next line is needed because the following line will cause this.entityManager -> null;
        EntityManager.DetachEntity(Entity);
        // need to tell em that an entity that needed to be saved no longer does.
        EntityManager.NotifyStateChange(this, false);
      } else {
        if (EntityState.IsDeleted()) {
          LinkRelatedEntities();
        }
        SetUnchanged();
      }

      OnEntityChanged(EntityAction.RejectChanges);
    }

    void IChangeTracking.AcceptChanges() {
      AcceptChanges();
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

    // Sets the entity to an EntityState of 'Unchanged'.  This is also the equivalent of calling {{#crossLink "EntityAspect/acceptChanges"}}{{/crossLink}}

    private void SetUnchanged() {
      if (this.EntityState == EntityState.Unchanged) return;
      ClearBackupVersion(EntityVersion.Original);
      //    delete this.hasTempKey;
      SetEntityStateCore(EntityState.Unchanged);
      this.EntityManager.NotifyStateChange(this, false);
    }

    /// <summary>
    /// Forces this entity into the <see cref="EntityState"/> of Added.
    /// </summary>
    /// <remarks>
    /// You will usually have no reason to call this method from application code.  The EntityState
    /// is automatically set to Added by the framework when a new entity is added to an EntityManager.
    /// </remarks>
    private void SetAdded() {
      if (this.EntityState == EntityState.Added) return;
      if (this.EntityState == EntityState.Detached) {
        throw new InvalidOperationException("Detached objects must be attached before calling SetAdded");
      }
      SetEntityStateCore(EntityState.Added);
      _entityKey = null;
      EntityManager.UpdatePkIfNeeded(this);
      EntityManager.NotifyStateChange(this, true);
    }

    /// <summary>
    /// Forces this entity into the <see cref="EntityState"/> of Modified.
    /// </summary>
    /// <remarks>
    /// You will usually have no reason to call this method from application code.  The EntityState
    /// is automatically set to Modified by the framework when any EntityProperty of the entity is changed.
    /// </remarks>
    internal void SetModified() {
      if (this.EntityState == EntityState.Modified) return;
      if (this.EntityState == EntityState.Detached) {
        throw new InvalidOperationException("Detached objects must be attached before calling SetModified");
      }
      SetEntityStateCore(EntityState.Modified);
      EntityManager.NotifyStateChange(this, true);
    }

    #endregion


    #region GetValue(s)/SetValue methods

    public override void SetValue(String propertyName, object newValue) {
      var prop = EntityType.GetProperty(propertyName);
      if (prop == null) {
        throw new Exception("Unable to locate property: " + EntityType.Name + ":" + propertyName);
      }
      
      SetValue(prop, newValue);
    }

    public void SetValue(StructuralProperty property, object newValue) {
      if (!property.IsScalar) {
        throw new Exception(String.Format("You cannot set the non-scalar complex property: '{0}' on the type: '{1}'." +
          "Instead get the property and use collection functions like 'Add' and 'Remove' to change its contents.",
          property.Name, property.ParentType.Name));
      }

      if (IsNullEntity) {
        throw new Exception("Null entities cannot be modified");
      }

      if (property.IsDataProperty) {
        SetDpValue((DataProperty)property, newValue);
      } else {
        SetNpValue((NavigationProperty)property, newValue);
      }
    }

    protected internal override void SetDpValue(DataProperty property, object newValue) {
      SetValueWithEvents(property, newValue, SetDpValueCore);
    }

    private void SetDpValueCore(DataProperty property, object newValue, Object oldValue) {
      if (property.IsComplexProperty) {
        SetDpValueComplex(property, newValue, oldValue);
      } else if (property.IsPartOfKey) {
        SetDpValueKey(property, newValue, oldValue);
      } else {
        SetDpValueSimple(property, newValue, oldValue);
      }
    }

    internal void SetNpValue(NavigationProperty property, object newValue) {
      if (_inProcess) return;
      try {
        _inProcess = true;
        SetValueWithEvents(property, newValue, SetNpValueCore);
      } finally {
        _inProcess = false;
      }
    }

    private bool _inProcess;

    private void SetNpValueCore(NavigationProperty property, object newValue, object oldValue) {
      
      var newEntity = (IEntity)newValue;
      var oldEntity = (IEntity)oldValue;
      
      EntityAspect newAspect = (newEntity == null) ? null : newEntity.EntityAspect;
      EntityAspect oldAspect = (oldEntity == null) ? null : oldEntity.EntityAspect;

      // manage attachment -
      if (newEntity != null) {
        ManageAttachment(newEntity);
      }

      // process related updates ( the inverse relationship) first so that collection dups check works properly.
      // update inverse relationship
      var inverseProp = property.Inverse;
      if (inverseProp != null) {
        if (inverseProp.IsScalar) {
          // Example: bidirectional navProperty: 1->1: order -> internationalOrder
          // order.internationalOrder <- internationalOrder || null
          //    ==> (oldInternationalOrder.order = null)
          //    ==> internationalOrder.order = order
          if (oldValue != null) {
            // TODO: null -> NullEntity later
            oldAspect.SetNpValue(inverseProp, null);
          }
          if (newValue != null) {
            newAspect.SetNpValue(inverseProp, this.Entity);
          }
        } else {
          // Example: bidirectional navProperty: 1->n: order -> orderDetails
          // orderDetail.order <- newOrder || null
          //    ==> (oldOrder).orderDetails.remove(orderDetail)
          //    ==> order.orderDetails.push(newOrder)
          if (oldValue != null) {
            var oldSiblings = oldAspect.GetValue<INavigationSet>(inverseProp.Name);
            oldSiblings.Remove(this.Entity);
          }
          if (newValue != null) {
            var siblings = newAspect.GetValue<INavigationSet>(inverseProp.Name);
            // recursion check if already in the collection is performed by the relationArray
            siblings.Add(this.Entity);
          }
        }
      } else if (property.InvForeignKeyProperties.Count > 0 && this.IsAttached) { // && !EntityManager._inKeyFixup) {
        // var invForeignKeyNames = property.InvForeignKeyNames;
        var invForeignKeyProps = property._invForeignKeyProperties;
        if (newValue != null) {
          // Example: unidirectional navProperty: 1->1: order -> internationalOrder
          // order.InternationalOrder <- internationalOrder
          //    ==> internationalOrder.orderId = orderId
          //      and
          // Example: unidirectional navProperty: 1->n: order -> orderDetails
          // orderDetail.order <-xxx newOrder
          //    ==> CAN'T HAPPEN because if unidirectional because orderDetail will not have an order prop
          var pkValues = this.EntityKey.Values;

          invForeignKeyProps.ForEach((fkProp, i) => newAspect.SetDpValue(fkProp, pkValues[i]));
        } else {
          // Example: unidirectional navProperty: 1->1: order -> internationalOrder
          // order.internationalOrder <- null
          //    ==> (old internationalOrder).orderId = null
          //        and
          // Example: unidirectional navProperty: 1->n: order -> orderDetails
          // orderDetail.order <-xxx newOrder
          //    ==> CAN'T HAPPEN because if unidirectional because orderDetail will not have an order prop
          if (oldValue != null) {
            invForeignKeyProps.ForEach(fkProp => {
              if (!fkProp.IsPartOfKey) {
                // don't update with null if fk is part of the key
                oldAspect.SetDpValue(fkProp, null);
              }
            });
          }
        }
      }

      SetRawValue(property.Name, newValue);

      // update fk data property - this can only occur if this navProperty has
      // a corresponding fk on this entity.
      if (property.RelatedDataProperties.Count > 0) {
        if (!EntityState.IsDeletedOrDetached()) {
          var inverseKeyProps = property.EntityType.KeyProperties;
          inverseKeyProps.ForEach((keyProp, i) => {
            var relatedDataProp = property.RelatedDataProperties[i];
            // Do not trash related property if it is part of that entity's key
            if (newValue != null || !relatedDataProp.IsPartOfKey) {
              var relatedValue = newValue != null ? newAspect.GetValue(keyProp) : relatedDataProp.DefaultValue;
              SetDpValue(relatedDataProp, relatedValue);
            }
          });
        }
      }
    }

    private void SetDpValueSimple(DataProperty property, object newValue, object oldValue) {
      SetRawValue(property.Name, newValue);

      UpdateBackupVersion(property, oldValue);
      UpdateRelated(property, newValue, oldValue);
    }

    private void SetDpValueKey(DataProperty property, object newValue, object oldValue) {
      if (this.IsAttached) {
        var values = EntityType.KeyProperties
          .Select(p => (p == property) ? newValue : GetValue(p))
          .ToArray();
        var newKey = new EntityKey(EntityType, values);
        if (EntityManager.FindEntityByKey(newKey) != null) {
          throw new Exception("An entity with this key is already in the cache: " + newKey);
        }
        var oldKey = EntityKey;
        var eg = EntityManager.GetEntityGroup(EntityType.ClrType);
        eg.ReplaceKey(this, oldKey, newKey);

        // Actually set the value;
        SetRawValue(property.Name, newValue);
        // insure that cached key is updated.
        EntityKey = null;
        LinkRelatedEntities();
      } else {
        SetRawValue(property.Name, newValue);
      }

      UpdateBackupVersion(property, oldValue);
      UpdateRelated(property, newValue, oldValue);

      // propogate pk change to all related entities;
      var propertyIx = EntityType.KeyProperties.IndexOf(property);
      EntityType.NavigationProperties.ForEach(np => {
        var inverseNp = np.Inverse;
        var fkProps = inverseNp != null ? inverseNp.ForeignKeyProperties : np.InvForeignKeyProperties;
        if (fkProps.Count == 0) return;
        var fkProp = fkProps[propertyIx];
        ProcessNpValue(np, e => e.EntityAspect.SetDpValue(fkProp, newValue));
      });
    }

    private void SetDpValueComplex(DataProperty property, object newValue, object oldValue) {
      if (newValue == null) {
        throw new Exception(String.Format("You cannot set the '{0}' property to null because it's datatype is the ComplexType: '{1}'", property.Name, property.ComplexType.Name));
      }
      var oldCo = (IComplexObject)oldValue;
      var newCo = (IComplexObject)newValue;
      oldCo.ComplexAspect.AbsorbCurrentValues(newCo.ComplexAspect);
    }

    private void ManageAttachment(IEntity newEntity) {
      var newAspect = newEntity.EntityAspect;
      if (this.IsAttached) {
        if (newAspect.IsDetached) {
          if (!EntityManager.IsLoadingEntity) {
            EntityManager.AttachEntity(newEntity, EntityState.Added);
          }
        } else {
          if (newAspect.EntityManager != EntityManager) {
            throw new Exception("An Entity cannot be attached to an entity in another EntityManager. One of the two entities must be detached first.");
          }
        }
      } else {
        if (newAspect.IsAttached) {
          var em = newAspect.EntityManager;
          if (!em.IsLoadingEntity) {
            em.AttachEntity(this.Entity, EntityState.Added);
          }
        }
      }
    }

    private void SetValueWithEvents<T>(T property, object newValue, Action<T, Object, Object> action) where T : StructuralProperty {

      var oldValue = GetValue(property);
      if (Object.Equals(oldValue, newValue)) return;

      if (!FireEntityChanging(EntityAction.PropertyChange)) return;

      action(property, newValue, oldValue);

      OnPropertyChanged(property);

      if (this.IsAttached) {
        if (!EntityManager.IsLoadingEntity) {
          if (this.EntityState == EntityState.Unchanged) {
            SetModified();
          }
        }

        // TODO: implement this.
        //if (entityManager.validationOptions.validateOnPropertyChange) {
        //    entityAspect._validateProperty(newValue,
        //        { entity: entity, property: property, propertyName: propPath, oldValue: oldValue });
        //}
      }

    }

    // only ever called once for each EntityAspect when the EntityType is first set
    internal void InitializeDefaultValues() {
      // TODO: if a string is nonnullable
      // what is the correct nonnullable default value.
      this.EntityType.DataProperties.ForEach(dp => {
        try {
          if (dp.IsNullable) return;
          if (GetValue(dp) != null) return;
          if (dp.IsComplexProperty) {
            SetRawValue(dp.Name, ComplexAspect.Create(this.Entity, dp));
          } else {
            if (dp.DefaultValue == null) return; // wierd case mentioned above
            SetRawValue(dp.Name, dp.DefaultValue);
          }
        } catch (Exception e) {
          Debug.WriteLine("Exception caught during initialization of {0}.{1}: {2}", this.EntityType.Name, dp.Name, e.Message);
        }
      });
      this.EntityType.NavigationProperties.ForEach(np => {
        if (np.IsScalar) return;
        // one wierd case here: if entity has a value set to something that is not a navSet before 
        // this runs that value will be overwritten.  Probably not a big issue because all nonscalar nav properties must
        // ( as part of the 'breeze' contract) return some instance that implements an INavSet.
        var navSet = GetValue<INavigationSet>(np);
        if (navSet == null) {
          navSet = (INavigationSet)TypeFns.CreateGenericInstance(typeof(NavigationSet<>), np.ClrType);
          SetRawValue(np.Name, navSet);
        }
        navSet.ParentEntity = this.Entity;
        navSet.NavigationProperty = np;
      });
    }

    // TODO: check why not called
    //private void IfTempIdThenCleanup(DataProperty property) {
    //  var oldValue = GetValue(property);
    //  var oldUniqueId = new UniqueId(property, oldValue);
    //  if (this.EntityManager.TempIds.Contains(oldUniqueId)) {
    //    this.EntityManager.TempIds.Remove(oldUniqueId);
    //  }
    //}

    #endregion

    #region Misc private and internal methods/properties

    internal override void OnDataPropertyRestore(DataProperty dp) {
      if (dp.IsForeignKey) {
        // TODO: review later
        // ((IScalarEntityReference)dp.RelatedNavigationProperty.GetEntityReference(this)).RefreshForFkChange();
      }
    }

    internal void LinkRelatedEntities() {
      //// we do not want entityState to change as a result of linkage.
      using (EntityManager.NewIsLoadingBlock()) {
        LinkUnattachedChildren();
        LinkNavProps();
        LinkFkProps();
      }
    }

    private void LinkUnattachedChildren() {

      var navChildrenList = EntityManager.UnattachedChildrenMap.GetNavChildrenList(EntityKey, false);
      if (navChildrenList == null) return;
      // need to copy before iterating because we may be removing from the list.
      navChildrenList.ToList().ForEach(nc => {

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
            var onlyChild = unattachedChildren.First();
            SetNpValue(parentToChildNp, onlyChild);
            onlyChild.EntityAspect.SetNpValue(childToParentNp, Entity);
          } else {
            var currentChildren = GetValue<INavigationSet>(parentToChildNp);
            unattachedChildren.ForEach(child => {
              currentChildren.Add(child);
              child.EntityAspect.SetNpValue(childToParentNp, Entity);
            });
          }
        } else {
          // unidirectional
          if (np.ParentType == EntityType) {

            parentToChildNp = np;
            if (parentToChildNp.IsScalar) {
              // 1 -> 1 eg parent: Order child: InternationalOrder
              SetNpValue(parentToChildNp, unattachedChildren.First());
            } else {
              // 1 -> n  eg: parent: Region child: Terr
              var currentChildren = GetValue<INavigationSet>(parentToChildNp);
              unattachedChildren.ForEach(child => {
                // we know it can't already be there.
                currentChildren.Add(child);
              });
            }
          } else {
            // n -> 1  eg: parent: child: OrderDetail parent: Product
            childToParentNp = np;
            unattachedChildren.ForEach(child => {
              child.EntityAspect.SetNpValue(childToParentNp, Entity);
            });

          }
          if (childToParentNp != null) {
            EntityManager.UnattachedChildrenMap.RemoveChildren(EntityKey, childToParentNp);
          }
        }
      });
    }

    private void LinkNavProps() {

      EntityType.NavigationProperties.ForEach(np => {
        if (!FixupFksOnUnattached(np)) return;

        // first determine if np contains a parent or child
        // having a parentKey means that this is a child
        // if a parent then no need for more work because children will attach to it.
        var parentKey = GetParentKey(np);
        if (parentKey != null) {
          // check for empty keys - meaning that parent id's are not yet set.

          if (parentKey.IsEmpty()) return;
          // if a child - look for parent in the em cache
          var parent = EntityManager.FindEntityByKey(parentKey);
          if (parent != null) {
            // if found hook it up
            SetNpValue(np, parent);
          } else {
            // else add parent to unresolvedParentMap;
            EntityManager.UnattachedChildrenMap.AddChild(parentKey, np, Entity);
          }
        }
      });
    }

    // returns whether the navProperty needs additional processing
    private bool FixupFksOnUnattached(NavigationProperty np) {
      if (np.IsScalar) {
        var npEntity = GetValue<IEntity>(np);
        // property is already linked up
        if (npEntity != null) {
          if (npEntity.EntityAspect.IsDetached) {
            // need to insure that fk props match
            var fkProps = np.ForeignKeyProperties;
            npEntity.EntityAspect.EntityType = np.EntityType;
            // Set this Entity's fk to match np EntityKey
            // Order.CustomerID = aCustomer.CustomerID
            npEntity.EntityAspect.EntityKey.Values.ForEach((v, i) => SetDpValue(fkProps[i], v));
          }
          return false;
        }
      } else {
        var invNp = np.Inverse;
        if (invNp != null) {
          var npEntities = GetValue<INavigationSet>(np);
          npEntities.Cast<IEntity>().Where(e => e.EntityAspect.IsDetached)
            .ForEach(npEntity => {
              var fkProps = invNp.ForeignKeyProperties;
              var npAspect = npEntity.EntityAspect;
              // No longer needed
              // npAspect.EntityType = np.EntityType;

              // Set each entity in collections fk to match this Entity's EntityKey
              // Order.CustomerID = aCustomer.CustomerID
              Entity.EntityAspect.EntityKey.Values.ForEach((v, i) => npAspect.SetDpValue(fkProps[i], v));
            });
        }
      }
      return true;
    }

    private void LinkFkProps() {
      // handle unidirectional 1-x where we set x.fk

      EntityType.ForeignKeyProperties.ForEach(fkProp => {
        var invNp = fkProp.InverseNavigationProperty;
        if (invNp == null) return;
        // unidirectional fk props only
        var fkValue = GetValue(fkProp);
        var parentKey = new EntityKey((EntityType)invNp.ParentType, fkValue);
        var parent = EntityManager.FindEntityByKey(parentKey);
        if (parent != null) {
          if (invNp.IsScalar) {
            parent.EntityAspect.SetNpValue(invNp, Entity);
          } else {
            var navSet = parent.EntityAspect.GetValue<INavigationSet>(invNp);
            navSet.Add(Entity);
          }
        } else {
          // else add parent to unresolvedParentMap;
          EntityManager.UnattachedChildrenMap.AddChild(parentKey, invNp, Entity);
        }

      });
    }

    private void UpdateRelated(DataProperty property, object newValue, object oldValue) {
      if (IsDetached) return;
      var relatedNavProp = property.RelatedNavigationProperty;
      if (relatedNavProp != null) {
        // Example: bidirectional fkDataProperty: 1->n: order -> orderDetails
        // orderDetail.orderId <- newOrderId || null
        //    ==> orderDetail.order = lookupOrder(newOrderId)
        //    ==> (see set navProp above)
        //       and
        // Example: bidirectional fkDataProperty: 1->1: order -> internationalOrder
        // internationalOrder.orderId <- newOrderId || null
        //    ==> internationalOrder.order = lookupOrder(newOrderId)
        //    ==> (see set navProp above)

        if (newValue != null) {
          var key = new EntityKey(relatedNavProp.EntityType, newValue);
          var relatedEntity = EntityManager.FindEntityByKey(key);

          if (relatedEntity != null) {
            this.SetNpValue(relatedNavProp, relatedEntity);
          } else {
            // it may not have been fetched yet in which case we want to add it as an unattachedChild.    
            EntityManager.UnattachedChildrenMap.AddChild(key, relatedNavProp, this.Entity);
          }
        } else {
          this.SetNpValue(relatedNavProp, null);
        }
      } else if (property.InverseNavigationProperty != null) { //  && !EntityManager._inKeyFixup) 
        // Example: unidirectional fkDataProperty: 1->n: region -> territories
        // territory.regionId <- newRegionId
        //    ==> lookupRegion(newRegionId).territories.push(territory)
        //                and
        // Example: unidirectional fkDataProperty: 1->1: order -> internationalOrder
        // internationalOrder.orderId <- newOrderId
        //    ==> lookupOrder(newOrderId).internationalOrder = internationalOrder
        //                and
        // Example: unidirectional fkDataProperty: 1->n: region -> territories
        // territory.regionId <- null
        //    ==> lookupRegion(territory.oldRegionId).territories.remove(oldTerritory);
        //                and
        // Example: unidirectional fkDataProperty: 1->1: order -> internationalOrder
        // internationalOrder.orderId <- null
        //    ==> lookupOrder(internationalOrder.oldOrderId).internationalOrder = null;

        var invNavProp = property.InverseNavigationProperty;

        if (oldValue != null) {
          var key = new EntityKey((EntityType)invNavProp.ParentType, oldValue);
          var relatedEntity = EntityManager.FindEntityByKey(key);
          if (relatedEntity != null) {
            if (invNavProp.IsScalar) {
              relatedEntity.EntityAspect.SetNpValue(invNavProp, null);
            } else {
              // remove 'this' from old related nav prop
              var relatedArray = (INavigationSet)relatedEntity.EntityAspect.GetValue(invNavProp);
              relatedArray.Remove(this.Entity);
            }
          }
        }

        if (newValue != null) {
          var key = new EntityKey((EntityType)invNavProp.ParentType, newValue);
          var relatedEntity = EntityManager.FindEntityByKey(key);

          if (relatedEntity != null) {
            if (invNavProp.IsScalar) {
              relatedEntity.EntityAspect.SetNpValue(invNavProp, this.Entity);
            } else {
              var relatedArray = (INavigationSet)relatedEntity.EntityAspect.GetValue(invNavProp.Name);
              relatedArray.Add(this.Entity);
            }
          } else {
            // it may not have been fetched yet in which case we want to add it as an unattachedChild.    
            EntityManager.UnattachedChildrenMap.AddChild(key, invNavProp, this.Entity);
          }
        }

      }
    }

    // entityState is either deleted or detached
    private void RemoveFromRelations(EntityState entityState) {
      // remove this entity from any collections.
      // mark the entity deleted or detached

      var isDeleted = entityState.IsDeleted();
      if (isDeleted) {
        RemoveFromRelationsCore(isDeleted);
      } else {
        using (this.EntityManager.NewIsLoadingBlock()) {
          RemoveFromRelationsCore(isDeleted);
        }
      }
    }

    private void RemoveFromRelationsCore(bool isDeleted) {
      var entity = this.Entity;
      var aspect = entity.EntityAspect;
      this.EntityType.NavigationProperties.ForEach(np => {
        var inverseNp = np.Inverse;

        if (np.IsScalar) {
          var npEntity = aspect.GetValue<IEntity>(np);
          if (npEntity != null) {
            if (inverseNp != null) {
              if (inverseNp.IsScalar) {
                npEntity.EntityAspect.ClearNp(inverseNp, isDeleted);
              } else {
                var collection = npEntity.EntityAspect.GetValue<INavigationSet>(inverseNp.Name);
                if (collection.Count > 0) {
                  collection.Remove(entity);
                }
              }
            }
            aspect.SetNpValue(np, null);
          }
        } else {
          var npEntities = aspect.GetValue<INavigationSet>(np);
          if (inverseNp != null) {
            // npValue is a live list so we need to copy it first.
            npEntities.Cast<IEntity>().ToList().ForEach(v => {
              if (inverseNp.IsScalar) {
                v.EntityAspect.ClearNp(inverseNp, isDeleted);
              } else {
                // TODO: many to many - not yet handled.
              }
            });
          }
          // now clear it.
          npEntities.Clear();
        }
      });

    }

    private void ClearNp(NavigationProperty np, bool relatedIsDeleted) {
      var entity = this.Entity;

      if (relatedIsDeleted) {
        SetNpValue(np, null);
      } else {
        // relatedEntity was detached.
        // need to clear child np without clearing child fk or changing the entityState of the child
        var em = entity.EntityAspect.EntityManager;

        var fkProps = np.ForeignKeyProperties;
        List<Object> fkVals = null;
        if (fkProps.Count > 0) {
          fkVals = fkProps.Select(fkp => GetValue(fkp)).ToList();
        }
        SetNpValue(np, null);
        if (fkVals != null) {
          fkProps.ForEach((fkp, i) => SetDpValue(fkp, fkVals[i]));
        }

      }
    }

    // TODO: check if ever used
    internal bool IsCurrent(EntityAspect targetAspect, EntityAspect sourceAspect) {
      var targetVersion = (targetAspect.EntityState == EntityState.Deleted) ? EntityVersion.Original : EntityVersion.Current;
      bool isCurrent = EntityType.ConcurrencyProperties.All(c => (Object.Equals(targetAspect.GetValue(c, targetVersion), sourceAspect.GetValue(c, EntityVersion.Current))));
      return isCurrent;
    }

    internal EntityKey GetParentKey(NavigationProperty np) {
      // returns null for np's that do not have a parentKey
      var fkProps = np.ForeignKeyProperties;
      if (fkProps.Count == 0) return null;
      var fkValues = fkProps.Select(fkp => GetValue(fkp)).ToArray();
      return new EntityKey(np.EntityType, fkValues);
    }

    internal void ProcessNpValue(NavigationProperty np, Action<IEntity> action) {
      if (np.IsScalar) {
        var toEntity = this.GetValue<IEntity>(np);
        if (toEntity != null) {
          action(toEntity);
        }
      } else {
        var toEntities = this.GetValue<INavigationSet>(np);
        if (toEntities.Count > 0) {
          toEntities.Cast<IEntity>().ForEach(action);
        }
      }
    }

    private void UndoMappedTempId(EntityState rowState) {
      if (this.EntityState.IsAdded()) {
        this.EntityManager.MarkTempIdAsMapped(this, true);
      } else if (this.EntityState.IsDetached()) {
        this.EntityManager.MarkTempIdAsMapped(this, false);
      }
    }

    internal int IndexInEntityGroup { get; set; }

    #endregion

    #region NavProperty loading info

    public async Task<Object> LoadNavigationProperty(String propertyName) {
      var np = this.EntityType.GetNavigationProperty(propertyName);
      return await LoadNavigationProperty(np);
    }

    public async Task<Object> LoadNavigationProperty(NavigationProperty navProperty) {
      var query = EntityQueryBuilder.BuildQuery(this.Entity, navProperty);
      await this.EntityManager.ExecuteQuery(query);
      return GetValue(navProperty.Name);
    }

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

    #region IEditableObject Members


    /// <summary>
    /// Provided to allow IEditableObject interface to be overriden in derived classes.
    /// </summary>
    void IEditableObject.BeginEdit() {
      if (EntityVersion == EntityVersion.Proposed) return;
      if (this.IsNullEntity) return;
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
      if (_altEntityState == EntityState.Detached) return; // no need to do the rest
      var wasUnchanged = this.EntityState.IsUnchanged();
      this.SetEntityStateCore(_altEntityState);
      EntityManager.CheckStateChange(this, wasUnchanged, _altEntityState.IsUnchanged());
      //ValidationErrors.Restore();
      ForceEntityPropertyChanged(null);
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

    #region INotifyPropertyChanged and EntityPropertyChanged Members

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

    // also raises Entitychanged with an Action of PropertyChanged.
    internal virtual void OnPropertyChanged(StructuralProperty property) {
      var args = new PropertyChangedEventArgs(property.Name);
      OnPropertyChanged(args);
    }

    private void OnPropertyChanged(PropertyChangedEventArgs args) {
      if (IsDetached || !EntityGroup.ChangeNotificationEnabled) return;
      QueueEvent(() => {
        OnPropertyChangedCore(args);
        OnEntityChangedCore(new EntityChangedEventArgs(Entity, EntityAction.PropertyChange));
      });
    }

    private void OnPropertyChangedCore(PropertyChangedEventArgs e) {
      var handler = EntityPropertyChanged;
      if (handler == null) return;
      try {
        handler(this.Entity, e);
      } catch {
        // eat exceptions during load
        if (IsDetached || !this.EntityManager.IsLoadingEntity) throw;
      }
    }

    internal bool FireEntityChanging(EntityAction action) {
      if (IsDetached || !EntityGroup.ChangeNotificationEnabled) return true;
      var args = new EntityChangingEventArgs(this.Entity, action);
      EntityManager.OnEntityChanging(args);
      return !args.Cancel;
    }

    protected internal void OnEntityChanged(EntityAction entityAction) {
      if (IsDetached || !EntityGroup.ChangeNotificationEnabled) return;
      var args = new EntityChangedEventArgs(Entity, entityAction);
      QueueEvent(() => OnEntityChangedCore(args));
    }

    private void OnEntityChangedCore(EntityChangedEventArgs e) {
      // change actions will fire property change inside of OnPropertyChanged 
      if (e.Action != EntityAction.PropertyChange) {
        OnPropertyChanged(AllPropertiesChangedEventArgs);
      }
      EntityManager.OnEntityChanged(e);
    }

    private void OnEntityAspectPropertyChanged(String propertyName) {
      var handler = PropertyChanged;
      if (handler == null) return;
      var args = new PropertyChangedEventArgs(propertyName);
      try {
        handler(this, args);
      } catch {
        if (IsDetached || !this.EntityManager.IsLoadingEntity) throw;
      }
    }

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
    /// not backed by an <see cref="StructuralProperty"/> must be made known.
    /// </para>
    /// </remarks>
    public void ForceEntityPropertyChanged(PropertyChangedEventArgs e) {
      if (e == null) {
        e = EntityGroup.AllPropertiesChangedEventArgs;
      }
      OnPropertyChanged(e);
    }

    // TODO: make sure we clear this
    private void QueueEvent(Action action) {
      if (EntityManager.IsLoadingEntity) {
        EntityManager.QueuedEvents.Add(() => action());
      } else {
        action();
      }
    }

    //private void TryToHandle<T>(EventHandler<T> handler, T args) where T : EventArgs {
    //  if (handler == null) return;
    //  try {
    //    handler(this, args);
    //  } catch {
    //    // Throw handler exceptions if not loading.
    //    if (!EntityManager.IsLoadingEntity) throw;
    //    // Also throw if loading but action is add or attach.
    //    var changing = args as EntityChangingEventArgs;
    //    if (changing != null && (changing.Action == EntityAction.Attach)) throw;
    //    var changed = args as EntityChangedEventArgs;
    //    if (changed != null && (changed.Action == EntityAction.Attach)) throw;
    //    // Other load exceptions are eaten.  Yummy!
    //  }
    //}

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
    int IComparable.CompareTo(Object obj) {
      if (this == obj) return 0;
      EntityAspect aEntity = obj as EntityAspect;
      if (aEntity == null) return -1;
      return this.EntityKey.CompareTo(aEntity.EntityKey);
    }

    #endregion

    #region INotifyDataErrorInfo

    /// <summary>
    /// 'Magic' string that can be used to return all errors from <see cref="INotifyDataErrorInfo.GetErrors"/>.
    /// </summary>
    public static String AllErrors = "*";

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

    private EntityKey _entityKey;
    private EntityType _entityType;
    private EntityGroup _entityGroup;
    private EntityState _entityState = EntityState.Detached;

    // should only ever be set to either current or proposed ( never original)
    private EntityVersion _entityVersion = EntityVersion.Current;

    #endregion

  }

}
