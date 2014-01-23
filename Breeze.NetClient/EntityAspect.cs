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
  public class EntityAspect : StructuralAspect, IEditableObject, IChangeTracking, IRevertibleChangeTracking, INotifyPropertyChanged,
    INotifyDataErrorInfo, IComparable {
    // what about IDataErrorInfo
 

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
    public EntityAspect(IEntity entity, EntityType entityType) {
      Entity = entity;
      EntityType = entityType;
      IndexInEntityGroup = -1;
    }

    /// <summary>
    /// Returns the wrapped entity.
    /// </summary>
    public IEntity Entity { get; private set; }

    public EntityType EntityType { get; private set; }

    protected override StructuralType StructuralType {
      get { return this.EntityType; }
    }

    protected override IStructuralObject StructuralObject {
      get { return this.Entity; ; }
    }


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
    public bool RemoveFromManager() {

      var group = this.EntityGroup;
      if (group == null) return false; // no group === already detached.
      EntityManager.MarkTempIdAsMapped(this, true);

      group.DetachEntityAspect(this);
      RemoveFromRelations(EntityState.Detached);

      this.EntityGroup = null;
      this.OriginalValuesMap = null;
      this.PreproposedValuesMap = null;
      // this._validationErrors = {};

      SetEntityStateCore(EntityState.Detached);
      EntityManager.NotifyStateChange(this, false);
      this.InternalEntityManager.OnEntityChanged(this.Entity, EntityAction.Detach);
      return true;
    }


    #endregion

    #region Accept/Reject/HasChanges and IChangeTracking/IReveribleChangeTracking

    public void AcceptChanges() {
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
          EntityManager.LinkRelatedEntities(Entity);
        }
        SetUnchanged();
      }

      this.EntityGroup.OnEntityChanged(this.Entity, EntityAction.RejectChanges);
    }

    public void RejectChangesCore() {
      var entity = this.Entity;
      this.OriginalValuesMap.ForEach(kvp => {
        entity.SetValue(kvp.Key, kvp.Value);
      });
      this.ProcessComplexProperties(co => co.ComplexAspect.RejectChangesCore());
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
          OriginalValuesMap = null;
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
      ClearOriginalValues();
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
    private void SetModified() {
      if (this.EntityState == EntityState.Modified) return;
      if (this.EntityState == EntityState.Detached) {
        throw new InvalidOperationException("Detached objects must be attached before calling SetModified");
      }
      if (!FireEntityChanging(EntityAction.EntityStateChange)) return;
      SetEntityStateCore(EntityState.Modified);
      EntityManager.NotifyStateChange(this, true);
    }

    private void ClearOriginalValues() {
      OriginalValuesMap.Clear();
      this.ProcessComplexProperties(co => co.AcceptChanges());
    }


    #endregion

    #region GetValue(s)/SetValue methods

    public Object GetValue(String propertyName) {
      return Entity.GetValue(propertyName);
    }

    public Object GetValue(EntityProperty property) {
      return Entity.GetValue(property.Name);
    }

    public void SetValue(String propertyName, object newValue) {
      var prop = EntityType.GetProperty(propertyName);
      if (prop != null) {
        SetValue(prop, newValue);
      } else {
        throw new Exception("Unable to locate property: " + EntityType.Name + ":" + propertyName);
      }
    }

   

    internal void SetValue(EntityProperty property, object newValue) {
      if (property.IsDataProperty) {
        SetValue((DataProperty)property, newValue);
      } else {
        SetValue((NavigationProperty)property, newValue);
      }
    }

    internal void SetValue(DataProperty property, object newValue) {

      if (!property.IsScalar) {
        throw new Exception("Nonscalar data properties are readonly - items may be added or removed but the collection may not be changed.");
      }

      var oldValue = Entity.GetValue(property.Name);
      if (Object.Equals(oldValue, newValue)) return;

      if (IsNullEntity) {
        throw new Exception("Null entities cannot be modified");
      }

      // TODO: may need to do this:::
      // Note that we need to handle multiple properties in process, not just one in order to avoid recursion. 
      // ( except in the case of null propagation with fks where null -> 0 in some cases.)
      // (this may not be needed because of the newValue === oldValue test above)


      // var changeNotificationEnabled = EntityState != EntityState.Detached && this.EntityGroup.ChangeNotificationEnabled;
      var changeNotificationEnabled = this.EntityGroup.ChangeNotificationEnabled;

      if (changeNotificationEnabled) {
        if (!FireEntityChanging(EntityAction.PropertyChange)) return;

        var propArgs = new EntityPropertyChangingEventArgs(this.Entity, property, newValue);
        this.EntityGroup.OnEntityPropertyChanging(propArgs);
        if (propArgs.Cancel) return;

      }

      if (property.IsComplexProperty) {
        SetCpValue(property, newValue, oldValue);
      } else {
        SetDpValue(property, newValue, oldValue);
      }


      if (this.EntityState.IsUnchanged() && !InternalEntityManager.IsLoadingEntity) {
        this.SetEntityStateCore(EntityState.Modified);
      }

      if (changeNotificationEnabled) {
        this.EntityGroup.OnEntityPropertyChanged(new EntityPropertyChangedEventArgs(this.Entity, property, newValue));
        this.EntityGroup.OnEntityChanged(this.Entity, EntityAction.PropertyChange);
      }
    }

    internal void SetValue(NavigationProperty property, object newValue) {
      // property is a NavigationProperty

      if (!property.IsScalar) {
        throw new Exception("Nonscalar navigation properties are readonly - entities can be added or removed but the collection may not be changed.");
      }

      var oldValue = Entity.GetValue(property.Name);
      if (Object.Equals(oldValue, newValue)) return;

      var newEntity = (IEntity)newValue;
      var oldEntity = (IEntity)oldValue;
      var newAspect = newEntity.EntityAspect;
      var oldAspect = oldEntity.EntityAspect;

      var inverseProp = property.Inverse;

      // manage attachment -
      if (newValue != null) {

        if (EntityManager != null) {
          if (newAspect.EntityState.IsDetached()) {
            if (!EntityManager.IsLoadingEntity) {
              EntityManager.AttachEntity(newEntity, EntityState.Added);
            }
          } else {
            if (newAspect.EntityManager != EntityManager) {
              throw new Exception("An Entity cannot be attached to an entity in another EntityManager. One of the two entities must be detached first.");
            }
          }
        } else {
          if (newAspect != null && newAspect.EntityManager != null) {
            var em = newAspect.EntityManager;
            if (!em.IsLoadingEntity) {
              em.AttachEntity(this.Entity, EntityState.Added);
            }
          }
        }
      }

      // process related updates ( the inverse relationship) first so that collection dups check works properly.
      // update inverse relationship
      if (inverseProp != null) {

        ///
        if (inverseProp.IsScalar) {
          // Example: bidirectional navProperty: 1->1: order -> internationalOrder
          // order.internationalOrder <- internationalOrder || null
          //    ==> (oldInternationalOrder.order = null)
          //    ==> internationalOrder.order = order
          if (oldValue != null) {
            // TODO: null -> NullEntity later
            oldAspect.SetValue(inverseProp, null);
          }
          if (newValue != null) {
            newAspect.SetValue(inverseProp, this);
          }
        } else {
          // Example: bidirectional navProperty: 1->n: order -> orderDetails
          // orderDetail.order <- newOrder || null
          //    ==> (oldOrder).orderDetails.remove(orderDetail)
          //    ==> order.orderDetails.push(newOrder)
          if (oldValue != null) {
            var oldSiblings = (INavigationSet)oldAspect.GetValue(inverseProp);
            oldSiblings.Remove(this.Entity);
          }
          if (newValue != null) {
            var siblings = (INavigationSet)newAspect.GetValue(inverseProp);
            // recursion check if already in the collection is performed by the relationArray
            siblings.Add(this.Entity);
          }
        }
      } else if (property.InvForeignKeyNames != null && EntityManager != null) { // && !EntityManager._inKeyFixup) {
        var invForeignKeyNames = property.InvForeignKeyNames;
        if (newValue != null) {
          // Example: unidirectional navProperty: 1->1: order -> internationalOrder
          // order.InternationalOrder <- internationalOrder
          //    ==> internationalOrder.orderId = orderId
          //      and
          // Example: unidirectional navProperty: 1->n: order -> orderDetails
          // orderDetail.order <-xxx newOrder
          //    ==> CAN'T HAPPEN because if unidirectional because orderDetail will not have an order prop
          var pkValues = this.EntityKey.Values;
          invForeignKeyNames.ForEach((fkName, i) => newAspect.SetValue(fkName, pkValues[i]));

        } else {
          // Example: unidirectional navProperty: 1->1: order -> internationalOrder
          // order.internationalOrder <- null
          //    ==> (old internationalOrder).orderId = null
          //        and
          // Example: unidirectional navProperty: 1->n: order -> orderDetails
          // orderDetail.order <-xxx newOrder
          //    ==> CAN'T HAPPEN because if unidirectional because orderDetail will not have an order prop
          if (oldValue != null) {
            invForeignKeyNames.ForEach(fkName => {
              var fkProp = oldAspect.EntityType.GetDataProperty(fkName);
              if (!fkProp.IsPartOfKey) {
                // don't update with null if fk is part of the key
                oldAspect.SetValue(fkProp, null);
              }
            });
          }
        }
      }

      Entity.SetValue(property.Name, newValue);

      if (EntityManager != null && !EntityManager.IsLoadingEntity) {
        if (EntityState.IsUnchanged() && !property.IsUnmapped) {
          EntityState = EntityState.Modified;
        }
        //if (EntityManager.ValidationOptions.validateOnPropertyChange) {
        //    ValidateProperty(newValue,
        //        { entity: this, property: property, propertyName: propPath, oldValue: oldValue });
        //}
      }

      // update fk data property - this can only occur if this navProperty has
      // a corresponding fk on this entity.
      if (property.RelatedDataProperties.Count > 0) {
        if (!EntityState.IsDeleted()) {
          var inverseKeyProps = property.EntityType.KeyProperties;
          inverseKeyProps.ForEach((keyProp, i) => {
            var relatedDataProp = property.RelatedDataProperties[i];
            // Do not trash related property if it is part of that entity's key
            if (newValue != null || !relatedDataProp.IsPartOfKey) {
              var relatedValue = newValue != null ? newAspect.GetValue(keyProp) : relatedDataProp.DefaultValue;
              SetValue(relatedDataProp, relatedValue);
            }
          });
        }
      }

    }

    private void SetCpValue(DataProperty property, object newValue, object oldValue) {
      if (property.IsScalar) {
        if (newValue == null) {
          throw new Exception(String.Format("You cannot set the '{0}' property to null because it's datatype is the ComplexType: '{1}'", property.Name, property.ComplexType.Name));
        }
        var oldCo = (IComplexObject)oldValue;
        var newCo = (IComplexObject)newValue;
        oldCo.ComplexAspect.AbsorbCurrentValues(newCo.ComplexAspect);
      } else {
        throw new Exception(String.Format("You cannot set the non-scalar complex property: '{0}' on the type: '{1}'." +
            "Instead get the property and use collection functions like 'Add' and 'Remove' to change its contents.",
            property.Name, property.ParentType.Name));
      }

    }

    private void SetDpValue(DataProperty property, object newValue, object oldValue) {
      // if we are changing the key update our internal entityGroup indexes.
      if (property.IsPartOfKey && EntityManager != null && !EntityManager.IsLoadingEntity) {

        var values = EntityType.KeyProperties.Select(p => (p == property) ? newValue : GetValue(p));
        var newKey = new EntityKey(EntityType, values);
        if (EntityManager.FindEntityByKey(newKey) != null) {
          throw new Exception("An entity with this key is already in the cache: " + newKey);
        }
        var oldKey = EntityKey;
        var eg = EntityManager.GetEntityGroup(EntityType.ClrType);
        eg.ReplaceKey(this, oldKey, newKey);
      }

      TrackChange(property);

      UpdateRelated(property, newValue, oldValue);

      // Actually set the value;
      Entity.SetValue(property.Name, newValue);

      // NOTE: next few lines are the same as above but not refactored for perf reasons.
      if (EntityManager != null && !EntityManager.IsLoadingEntity) {
        if (EntityState.IsUnchanged() && !property.IsUnmapped) {
          EntityState = EntityState.Modified;
        }
        //if (entityManager.validationOptions.validateOnPropertyChange) {
        //    entityAspect._validateProperty(newValue,
        //        { entity: entity, property: property, propertyName: propPath, oldValue: oldValue });
        //}
      }

      if (property.IsPartOfKey) {
        // propogate pk change to all related entities;

        var propertyIx = EntityType.KeyProperties.IndexOf(property);
        EntityType.NavigationProperties.ForEach(np => {
          var inverseNp = np.Inverse;
          var fkNames = inverseNp != null ? inverseNp.ForeignKeyNames : np.InvForeignKeyNames;

          if (fkNames.Count == 0) return;
          var npValue = GetValue(np);
          var fkName = fkNames[propertyIx];
          if (np.IsScalar) {
            if (npValue == null) return;
            ((IEntity)npValue).EntityAspect.SetValue(fkName, newValue);
          } else {
            ((INavigationSet)npValue).Cast<IEntity>().ForEach(e => e.EntityAspect.SetValue(fkName, newValue));
          }
        });
        // insure that cached key is updated.
        EntityKey = null;
      }

    }


    private void UpdateRelated(DataProperty property, object newValue, object oldValue) {
      if (EntityManager == null) return;
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
            this.SetValue(relatedNavProp, relatedEntity);
          } else {
            // it may not have been fetched yet in which case we want to add it as an unattachedChild.    
            EntityManager.UnattachedChildrenMap.AddChild(key, relatedNavProp, this.Entity);
          }
        } else {
          this.SetValue(relatedNavProp, null);
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
              relatedEntity.EntityAspect.SetValue(invNavProp, null);
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
              relatedEntity.EntityAspect.SetValue(invNavProp, this.Entity);
            } else {
              var relatedArray = (INavigationSet)relatedEntity.EntityAspect.GetValue(invNavProp);
              relatedArray.Add(this.Entity);
            }
          } else {
            // it may not have been fetched yet in which case we want to add it as an unattachedChild.    
            EntityManager.UnattachedChildrenMap.AddChild(key, invNavProp, this.Entity);
          }
        }

      }
    }



    private void SetComplexValue(DataProperty property, object newValue) {

    }


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
    public Object GetValue(DataProperty property, EntityVersion version) {
      InitializeDefaultValues();

      if (version == EntityVersion.Default) {
        version = EntityVersion;
      }

      Object result;
      if (version == EntityVersion.Current) {
        if (this.EntityVersion == EntityVersion.Proposed) {
          result = GetPreproposedValue(property);
        } else {
          result = GetValue(property);
        }
      } else if (version == EntityVersion.Original) {
        result = GetOriginalValue(property);
      } else if (version == EntityVersion.Proposed) {
        result = GetValue(property);
      } else {
        throw new ArgumentException("Invalid entity version");
      }

      if (property.IsComplexProperty) {
        var co = (IComplexObject)result;
        if (co == null) {
          co = ComplexAspect.Create(this.Entity, property, true);
          this.Entity.SetValue(property.Name, co);
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


    private Object GetOriginalValue(DataProperty property) {
      object result;
      if (property.IsComplexProperty) {
        var co = (IComplexObject)GetValue(property, EntityVersion.Current);
        return co.ComplexAspect.GetOriginalVersion();
      } else {
        if (OriginalValuesMap != null && OriginalValuesMap.TryGetValue(property.Name, out result)) {
          return result;
        } else {
          return this.Entity.GetValue(property.Name);
        }
      }
    }

    private Object GetPreproposedValue(DataProperty property) {
      object result;
      if (PreproposedValuesMap != null && PreproposedValuesMap.TryGetValue(property.Name, out result)) {
        return result;
      } else {
        return this.Entity.GetValue(property.Name);
      }
    }

    internal void InitializeDefaultValues() {

      if (_defaultValuesInitialized) return;
      _defaultValuesInitialized = true;

      this.EntityType.DataProperties.ForEach(dp => {
        try {
          if (dp.IsComplexProperty) {
            this.Entity.SetValue(dp.Name, ComplexAspect.Create(this.Entity, dp, true));
          } else if (dp.DefaultValue != null) {
            this.Entity.SetValue(dp.Name, dp.DefaultValue);
          }
        } catch (Exception e) {
          Debug.WriteLine("Exception caught during initialization of {0}.{1}: {2}", this.EntityType.Name, dp.Name, e.Message);
        }
      });
    }

    private void IfTempIdThenCleanup(DataProperty property) {
      var oldValue = this.Entity.GetValue(property.Name);
      var oldUniqueId = new UniqueId(property, oldValue);
      if (this.InternalEntityManager.TempIds.Contains(oldUniqueId)) {
        this.InternalEntityManager.TempIds.Remove(oldUniqueId);
      }
    }



    /// <summary>
    /// Retrieve the values of specified properties within this Entity.
    /// </summary>
    /// <param name="properties">An array of <see cref="EntityProperty"/>s for which values
    /// are desired</param>
    /// <returns>An array of data values corresponding to the specified properties</returns>
    protected internal Object[] GetValues(IEnumerable<DataProperty> properties) {
      var result = properties.Select(p => this.GetValue(p)).ToArray();
      return result;
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
          Object[] values = GetValues(this.EntityType.KeyProperties);
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
        // set it to null to force recalc
        _entityKey = value;
        OnEntityAspectPropertyChanged("EntityKey");
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
      get;
      internal set;
    }

    internal bool FireEntityChanging(EntityAction action) {
      var entityArgs = new EntityChangingEventArgs(this.Entity, action);
      this.EntityGroup.OnEntityChanging(entityArgs);
      return !entityArgs.Cancel;
    }

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
        this.EntityManager.NotifyStateChange(this, false);
      } else {
        this.SetEntityStateCore(EntityState.Deleted);
        RemoveFromRelations(EntityState.Deleted);
        this.EntityManager.NotifyStateChange(this, true);
      }
      this.EntityGroup.OnEntityChanged(entity, EntityAction.Delete);
    }



    private void RemoveFromRelations(EntityState entityState) {
      // remove this entity from any collections.
      // mark the entity deleted or detached

      var isDeleted = entityState.IsDeleted();
      if (isDeleted) {
        RemoveFromRelationsCore(true);
      } else {
        using (this.EntityManager.NewIsLoadingBlock()) {
          RemoveFromRelationsCore(false);
        }
      }
    }

    private void RemoveFromRelationsCore(bool isDeleted) {
      var entity = this.Entity;
      this.EntityType.NavigationProperties.ForEach(np => {
        var inverseNp = np.Inverse;
        var npValue = entity.GetValue(np.Name);
        if (np.IsScalar) {
          if (npValue != null) {
            if (inverseNp != null) {
              var npEntity = (IEntity)npValue;
              if (inverseNp.IsScalar) {
                npEntity.EntityAspect.ClearNp(inverseNp, isDeleted);
              } else {
                var collection = (IList)npEntity.GetValue(inverseNp.Name);
                if (collection.Count > 0) {
                  collection.Remove(entity);
                }
              }
            }
            entity.SetValue(np.Name, null);
          }
        } else {
          var entityList = ((IList)npValue);
          if (inverseNp != null) {

            // npValue is a live list so we need to copy it first.
            entityList.Cast<IEntity>().ToList().ForEach(v => {
              if (inverseNp.IsScalar) {
                v.EntityAspect.ClearNp(inverseNp, isDeleted);
              } else {
                // TODO: many to many - not yet handled.
              }
            });
          }
          // now clear it.
          entityList.Clear();
        }
      });

    }

    private void ClearNp(NavigationProperty np, bool relatedIsDeleted) {
      var entity = this.Entity;
      if (relatedIsDeleted) {
        entity.SetValue(np.Name, null);
      } else {
        // relatedEntity was detached.
        // need to clear child np without clearing child fk or changing the entityState of the child
        var em = entity.EntityAspect.EntityManager;

        var fkNames = np.ForeignKeyNames;
        List<Object> fkVals = null;
        if (fkNames.Count > 0) {
          fkVals = fkNames.Select(fkName => entity.GetValue(np.Name)).ToList();
        }
        entity.SetValue(np.Name, null);
        if (fkVals != null) {
          fkNames.ForEach((fkName, i) => entity.SetValue(fkName, fkVals[i]));
        }

      }
    }


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
      bool isCurrent = properties.All(p => Object.Equals(this.Entity.GetValue(p.Name), sourceAspect.Entity.GetValue(p.Name)));
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
        if (OriginalValuesMap != null) {
          ClearComplexBackupVersions(version);
          OriginalValuesMap = null;
        }
      } else if (version == EntityVersion.Proposed) {
        if (PreproposedValuesMap != null) {
          ClearComplexBackupVersions(version);
          PreproposedValuesMap = null;
        }
      }
    }

    private void ClearComplexBackupVersions(EntityVersion version) {
      this.EntityType.DataProperties.Where(dp => dp.IsComplexProperty).ForEach(dp => {
        var co = (IComplexObject)this.Entity.GetValue(dp.Name);
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
        if (OriginalValuesMap != null) {
          RestoreOriginalValues(OriginalValuesMap, version);
          OriginalValuesMap = null;
        }
      } else if (version == EntityVersion.Proposed) {
        if (PreproposedValuesMap != null) {
          RestoreOriginalValues(PreproposedValuesMap, version);
          PreproposedValuesMap = null;
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
          if (this.Entity.GetValue(dp.Name) != value) {
            this.Entity.SetValue(dp.Name, value);
            // TODO: review later
            // ((IScalarEntityReference)dp.RelatedNavigationProperty.GetEntityReference(this)).RefreshForFkChange();
          }
        } else {
          this.Entity.SetValue(dp.Name, value);
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
      if (OriginalValuesMap == null) {
        OriginalValuesMap = new OriginalValuesMap();
      }

      if (OriginalValuesMap.ContainsKey(property.Name)) return;
      // reference copy of complex object is deliberate - actual original values will be stored in the co itself.
      OriginalValuesMap.Add(property.Name, this.Entity.GetValue(property.Name));
    }

    internal void BackupProposedValueIfNeeded(DataProperty property) {
      if (PreproposedValuesMap == null) {
        PreproposedValuesMap = new BackupValuesMap();
      }

      if (PreproposedValuesMap.ContainsKey(property.Name)) return;
      PreproposedValuesMap.Add(property.Name, this.Entity.GetValue(property.Name));
    }

    #endregion

    #region Misc private and internal methods/properties

    
    // TODO: check if ever used
    internal bool IsCurrent(EntityAspect targetAspect, EntityAspect sourceAspect) {
      var targetVersion = (targetAspect.EntityState == EntityState.Deleted) ? EntityVersion.Original : EntityVersion.Current;
      bool isCurrent = EntityType.ConcurrencyProperties.All(c => (Object.Equals(targetAspect.GetValue(c, targetVersion), sourceAspect.GetValue(c, EntityVersion.Current))));
      return isCurrent;
    }

    internal bool InProcess {
      get;
      set;
    }

    internal bool HasTemporaryEntityKey {
      get {
        var prop = this.EntityType.KeyProperties.First();
        var uid = new UniqueId(prop, this.Entity.GetValue(prop.Name));
        if (EntityState == EntityState.Detached) {
          return InternalEntityManager.GetKeyGenerator(this.EntityType.ClrType).IsTempId(uid);
        } else {
          return InternalEntityManager.TempIds.Contains(uid);
        }
      }
    }

    internal EntityKey GetParentKey(NavigationProperty np) {
      // returns null for np's that do not have a parentKey
      var fkNames = np.ForeignKeyNames;
      if (fkNames.Count == 0) return null;
      var fkValues = fkNames.Select(fkn => this.Entity.GetValue(fkn));

      return new EntityKey(np.EntityType, fkValues);
    }

    internal void ProcessNavigationProperties(Action<IEntity> action) {
      var entity = this.Entity;
      this.EntityType.NavigationProperties.ForEach(prop => {
        var val = this.GetValue(prop);
        if (prop.IsScalar) {
          action((IEntity)val);

        } else {
          ((IEnumerable)val).Cast<IEntity>().ForEach(e => action(e));
        }
      });

    }



    //internal Object[] GetCurrentValues() {
    //  var entity = this.Entity;
    //  var props = EntityMetadata.DataProperties;
    //  var currentValues = props.Select(p => p.GetValue(entity)).ToArray();
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




    private void UndoMappedTempId(EntityState rowState) {
      if (this.EntityState.IsAdded()) {
        this.InternalEntityManager.MarkTempIdAsMapped(this, true);
      } else if (this.EntityState.IsDetached()) {
        this.InternalEntityManager.MarkTempIdAsMapped(this, false);
      }
    }



    internal int IndexInEntityGroup {
      get;
      set;
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
    private EntityState _entityState = EntityState.Detached;

    // should only ever be set to either current or proposed ( never original)
    private EntityVersion _entityVersion = EntityVersion.Current;

    #endregion

  }

}
