
define(["core", "config", "validate"],
function (core, a_config, m_validate) {
    /**
    @module breeze   
    **/

    var Enum = core.Enum;
    var Event = core.Event;
    var assertParam = core.assertParam;

    var Validator = m_validate.Validator;
    var ValidationError = m_validate.ValidationError;

    var v_modelLibraryDef = a_config.interfaceRegistry.modelLibrary;   

    var EntityState = (function () {
        /**
        EntityState is an 'Enum' containing all of the valid states for an 'Entity'.

        @class EntityState
        @static
        **/
        var entityStateMethods = {
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isUnchanged();
            is the same as
            @example
                return es === EntityState.Unchanged;
            @method isUnchanged
            @return {Boolean} Whether an entityState instance is EntityState.Unchanged.
            **/
            isUnchanged: function () { return this === EntityState.Unchanged; },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isAdded();
            is the same as
            @example
                return es === EntityState.Added;
            @method isAdded
            @return {Boolean} Whether an entityState instance is EntityState.Added.
            **/
            isAdded: function () { return this === EntityState.Added; },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isModified();
            is the same as
            @example
                return es === EntityState.Modified;
            @method isModified
            @return {Boolean} Whether an entityState instance is EntityState.Modified.
            **/
            isModified: function () { return this === EntityState.Modified; },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isDeleted();
            is the same as
            @example
                return es === EntityState.Deleted;
            @method isDeleted
            @return  {Boolean} Whether an entityState instance is EntityState.Deleted.
            **/
            isDeleted: function () { return this === EntityState.Deleted; },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isDetached();
            is the same as
            @example
                return es === EntityState.Detached;
            @method isDetached
            @return  {Boolean} Whether an entityState instance is EntityState.Detached.
            **/
            isDetached: function () { return this === EntityState.Detached; },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isUnchangedOrModified();
            is the same as
            @example
                return es === EntityState.Unchanged || es === EntityState.Modified
            @method isUnchangedOrModified
            @return {Boolean} Whether an entityState instance is EntityState.Unchanged or EntityState.Modified.
            **/
            isUnchangedOrModified: function () {
                return this === EntityState.Unchanged || this === EntityState.Modified;
            },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isAddedModifiedOrDeleted();
            is the same as
            @example
                return es === EntityState.Added || es === EntityState.Modified || es === EntityState.Deleted
            @method isAddedModifiedOrDeleted
            @return {Boolean} Whether an entityState instance is EntityState.Unchanged or EntityState.Modified or EntityState.Deleted.
            **/
            isAddedModifiedOrDeleted: function () {
                return this === EntityState.Added ||
                    this === EntityState.Modified ||
                    this === EntityState.Deleted;
            }
        };

        var EntityState = new Enum("EntityState", entityStateMethods);
        /**
        The 'Unchanged' state.

        @property Unchanged {EntityState}
        @final
        @static
        **/
        EntityState.Unchanged = EntityState.addSymbol();
        /**
        The 'Added' state.

        @property Added {EntityState}
        @final
        @static
        **/
        EntityState.Added = EntityState.addSymbol();
        /**
        The 'Modified' state.

        @property Modified {EntityState}
        @final
        @static
        **/
        EntityState.Modified = EntityState.addSymbol();
        /**
        The 'Deleted' state.

        @property Deleted {EntityState}
        @final
        @static
        **/
        EntityState.Deleted = EntityState.addSymbol();
        /**
        The 'Detached' state.

        @property Detached {EntityState}
        @final
        @static
        **/
        EntityState.Detached = EntityState.addSymbol();
        EntityState.seal();
        return EntityState;
    })();
    
    var EntityAction = (function () {
        /**
        EntityAction is an 'Enum' containing all of the valid actions that can occur to an 'Entity'.

        @class EntityAction
        @static
        **/
        var entityActionMethods = {
            isAttach: function () { return !!this.isAttach; },
            isDetach: function () { return !!this.isDetach; },
            isModification: function () { return !!this.isModification; }
        };

        var EntityAction = new Enum("EntityAction", entityActionMethods);
        
        /**
        Attach - Entity was attached via an AttachEntity call.

        @property Attach {EntityAction}
        @final
        @static
        **/
        EntityAction.Attach = EntityAction.addSymbol({ isAttach: true});
        
        /**
        AttachOnQuery - Entity was attached as a result of a query.

        @property AttachOnQuery {EntityAction}
        @final
        @static
        **/
        EntityAction.AttachOnQuery = EntityAction.addSymbol({ isAttach: true});
        
        /**
        AttachOnImport - Entity was attached as a result of an import.

        @property AttachOnImport {EntityAction}
        @final
        @static
        **/
        EntityAction.AttachOnImport = EntityAction.addSymbol({ isAttach: true});
        
        
        /**
        AttachOnQuery - Entity was detached.

        @property Detach {EntityAction}
        @final
        @static
        **/
        EntityAction.Detach = EntityAction.addSymbol( { isDetach: true });
        
        /**
        MergeOnQuery - Properties on the entity were merged as a result of a query.

        @property MergeOnQuery {EntityAction}
        @final
        @static
        **/
        EntityAction.MergeOnQuery = EntityAction.addSymbol( { isModification: true });
        
        /**
        MergeOnImport - Properties on the entity were merged as a result of an import.

        @property MergeOnImport {EntityAction}
        @final
        @static
        **/
        EntityAction.MergeOnImport = EntityAction.addSymbol( { isModification: true });
        
        /**
        MergeOnImport - Properties on the entity were merged as a result of a save

        @property MergeOnImport {EntityAction}
        @final
        @static
        **/
        EntityAction.MergeOnSave = EntityAction.addSymbol( { isModification: true });
        
        /**
        PropertyChange - A property on the entity was changed.

        @property PropertyChange {EntityAction}
        @final
        @static
        **/
        EntityAction.PropertyChange = EntityAction.addSymbol({ isModification: true});
        
        /**
        EntityStateChange - The EntityState of the entity was changed.

        @property EntityStateChange {EntityAction}
        @final
        @static
        **/
        EntityAction.EntityStateChange = EntityAction.addSymbol();
        
        
        /**
        AcceptChanges - AcceptChanges was called on the entity, or its entityState was set to Unmodified.

        @property AcceptChanges {EntityAction}
        @final
        @static
        **/
        EntityAction.AcceptChanges = EntityAction.addSymbol();

        /**
        RejectChanges - RejectChanges was called on the entity.

        @property RejectChanges {EntityAction}
        @final
        @static
        **/
        EntityAction.RejectChanges = EntityAction.addSymbol({ isModification: true});
        
        /**
        Clear - The EntityManager was cleared.  All entities detached.

        @property Clear {EntityAction}
        @final
        @static
        **/
        EntityAction.Clear = EntityAction.addSymbol({ isDetach: true});
        
        EntityAction.seal();
        return EntityAction;
    })();

    var EntityAspect = function() {
        /**
        An EntityAspect instance is associated with every attached entity and is accessed via the entity's 'entityAspect' property. 
        
        The EntityAspect itself provides properties to determine and modify the EntityState of the entity and has methods 
        that provide a variety of services including validation and change tracking.

        An EntityAspect will almost never need to be constructed directly. You will usually get an EntityAspect by accessing
        an entities 'entityAspect' property.  This property will be automatically attached when an entity is created via either 
        a query, import or EntityManager.createEntity call.
        
            // assume order is an order entity attached to an EntityManager.
            var aspect = order.entityAspect;
            var currentState = aspect.entityState;
        @class EntityAspect
        **/
        var ctor = function(entity) {
            if (entity === null) {
                var nullInstance = EntityAspect._nullInstance;
                if (nullInstance) return nullInstance;
                EntityAspect._nullInstance = this;
            } else if (entity === undefined) {
                throw new Error("The EntityAspect ctor requires an entity as its only argument.");
            } else if (entity.entityAspect) {
                return entity.entityAspect;
            }

            // if called without new
            if (!(this instanceof EntityAspect)) {
                return new EntityAspect(entity);
            }

            this.entity = entity;
            // TODO: keep public or not?
            this.entityGroup = null;
            this.entityManager = null;
            this.entityState = EntityState.Detached;
            this.isBeingSaved = false;
            this.originalValues = {};
            this._validationErrors = {};
            this.validationErrorsChanged = new Event("validationErrorsChanged_entityAspect", this);
            this.propertyChanged = new Event("propertyChanged_entityAspect", this);
            // in case this is the NULL entityAspect. - used with ComplexAspects that have no parent.

            if (entity != null) {
                entity.entityAspect = this;
                // entityType should already be on the entity from 'watch'    
                var entityType = entity.entityType;
                if (!entityType) {
                    var typeName = entity.prototype._$typeName;
                    if (!typeName) {
                        throw new Error("This entity is not registered as a valid EntityType");
                    } else {
                        throw new Error("Metadata for this entityType has not yet been resolved: " + typeName);
                    }
                }
                var entityCtor = entityType.getEntityCtor();
                v_modelLibraryDef.defaultInstance.startTracking(entity, entityCtor.prototype);
            }
        };
        var proto = ctor.prototype;

        proto._postInitialize = function() {
            var entity = this.entity;
            var entityCtor = entity.entityType.getEntityCtor();
            var initFn = entityCtor._$initializationFn;
            if (initFn) {
                if (typeof initFn === "string") {
                    initFn = entity[initFn];
                }
                initFn(entity);
            }
        };

        Event.bubbleEvent(proto, function() {
            return this.entityManager;
        });

        /**
        The Entity that this aspect is associated with.

        __readOnly__
        @property entity {Entity} 
        **/

        /**
        The {{#crossLink "EntityManager"}}{{/crossLink}} that contains this entity.

        __readOnly__
        @property entityManager {EntityManager}
        **/

        /**
        The {{#crossLink "EntityState"}}{{/crossLink}} of this entity.

        __readOnly__
        @property entityState {EntityState}
        **/

        /**
        Whether this entity is in the process of being saved.

        __readOnly__
        @property isBeingSaved {Boolean}
        **/

        /**
        The 'original values' of this entity where they are different from the 'current values'. 
        This is a map where the key is a property name and the value is the 'original value' of the property.

        __readOnly__
        @property originalValues {Object} 
        **/

        /**
        An {{#crossLink "Event"}}{{/crossLink}} that fires whenever a value of one of this entity's properties change.
        @example
            // assume order is an order entity attached to an EntityManager.
            order.entityAspect.propertyChanged.subscribe(
                function (propertyChangedArgs) {
                    // this code will be executed anytime a property value changes on the 'order' entity.
                    var entity = propertyChangedArgs.entity; // Note: entity === order
                    var propertyNameChanged = propertyChangedArgs.propertyName;
                    var oldValue = propertyChangedArgs.oldValue;
                    var newValue = propertyChangedArgs.newValue;
                });
        @event propertyChanged 
        @param entity {Entity} The entity whose property is changing.
        @param propertyName {String} The property that changed. This value will be 'null' for operations that replace the entire entity.  This includes
        queries, imports and saves that require a merge. The remaining parameters will not exist in this case either. This will actually be a "property path"
        for any properties of a complex type.
        @param oldValue {Object} The old value of this property before the change.
        @param newValue {Object} The new value of this property after the change.
        @readOnly
        **/

        /**
        An {{#crossLink "Event"}}{{/crossLink}} that fires whenever any of the validation errors on this entity change. 
        Note that this might be the removal of an error when some data on the entity is fixed. 
        @example
            // assume order is an order entity attached to an EntityManager.
            order.entityAspect.validationErrorsChanged.subscribe(
                function (validationChangeArgs) {
                    // this code will be executed anytime a property value changes on the 'order' entity.
                    var entity == validationChangeArgs.entity; // Note: entity === order
                    var errorsAdded = validationChangeArgs.added;
                    var errorsCleared = validationChangeArgs.removed;
                });
        @event validationErrorsChanged 
        @param entity {Entity} The entity on which the validation errors are being added or removed.
        @param added {Array of ValidationError} An array containing any newly added {{#crossLink "ValidationError"}}{{/crossLink}}s
        @param removed {Array of ValidationError} An array containing any newly removed {{#crossLink "ValidationError"}}{{/crossLink}}s. This is those
        errors that have been 'fixed'
        @readOnly
        **/

        /**
        Returns the {{#crossLink "EntityKey"}}{{/crossLink}} for this Entity. 
        @example
             // assume order is an order entity attached to an EntityManager.
            var entityKey = order.entityAspect.getKey();
        @method getKey
        @param [forceRefresh=false] {Boolean} Forces the recalculation of the key.  This should normally be unnecessary.
        @return {EntityKey} The {{#crossLink "EntityKey"}}{{/crossLink}} associated with this Entity.
        **/
        proto.getKey = function(forceRefresh) {
            forceRefresh = assertParam(forceRefresh, "forceRefresh").isBoolean().isOptional().check(false);
            if (forceRefresh || !this._entityKey) {
                var entityType = this.entity.entityType;
                var keyProps = entityType.keyProperties;
                var values = keyProps.map(function(p) {
                    return this.entity.getProperty(p.name);
                }, this);
                this._entityKey = new EntityKey(entityType, values);
            }
            return this._entityKey;
        };

        /**
        Returns the entity to an {{#crossLink "EntityState"}}{{/crossLink}} of 'Unchanged' by committing all changes made since the entity was last queried 
        had 'acceptChanges' called on it. 
        @example
             // assume order is an order entity attached to an EntityManager.
             order.entityAspect.acceptChanges();
             // The 'order' entity will now be in an 'Unchanged' state with any changes committed.
        @method acceptChanges
        **/
        proto.acceptChanges = function() {
            var em = this.entityManager;
            if (this.entityState.isDeleted()) {
                em.detachEntity(this.entity);
            } else {
                this.setUnchanged();
            }
            em.entityChanged.publish({ entityAction: EntityAction.AcceptChanges, entity: this.entity });
        };

        /**
        Returns the entity to an EntityState of 'Unchanged' by rejecting all changes made to it since the entity was last queried 
        had 'rejectChanges' called on it. 
        @example
             // assume order is an order entity attached to an EntityManager.
             order.entityAspect.rejectChanges();
             // The 'order' entity will now be in an 'Unchanged' state with any changes rejected. 
        @method rejectChanges
        **/
        proto.rejectChanges = function() {
            var entity = this.entity;
            var entityManager = this.entityManager;
            // we do not want PropertyChange or EntityChange events to occur here
            core.using(entityManager, "isRejectingChanges", true, function() {
                rejectChangesCore(entity);
            });
            if (this.entityState.isAdded()) {
                // next line is needed becuase the following line will cause this.entityManager -> null;
                entityManager.detachEntity(entity);
                // need to tell em that an entity that needed to be saved no longer does.
                entityManager._notifyStateChange(entity, false);
            } else {
                if (this.entityState.isDeleted()) {
                    this.entityManager._linkRelatedEntities(entity);
                }
                this.setUnchanged();
                // propertyChanged propertyName is null because more than one property may have changed.
                this.propertyChanged.publish({ entity: entity, propertyName: null });
                this.entityManager.entityChanged.publish({ entityAction: EntityAction.RejectChanges, entity: entity });
            }
        };

        function rejectChangesCore(target) {
            var aspect = target.entityAspect || target.complexAspect;
            var stype = target.entityType || target.complexType;
            var originalValues = aspect.originalValues;
            for (var propName in originalValues) {
                target.setProperty(propName, originalValues[propName]);
            }
            stype.complexProperties.forEach(function(cp) {
                var nextTarget = target.getProperty(cp.name);
                rejectChangesCore(nextTarget);
            });
        }

        /**
        Sets the entity to an EntityState of 'Unchanged'.  This is also the equivalent of calling {{#crossLink "EntityAspect/acceptChanges"}}{{/crossLink}}
         @example
             // assume order is an order entity attached to an EntityManager.
             order.entityAspect.setUnchanged();
             // The 'order' entity will now be in an 'Unchanged' state with any changes committed.
        @method setUnchanged
        **/
        proto.setUnchanged = function() {
            clearOriginalValues(this.entity);
            delete this.hasTempKey;
            this.entityState = EntityState.Unchanged;
            this.entityManager._notifyStateChange(this.entity, false);
        };

        function clearOriginalValues(target) {
            var aspect = target.entityAspect || target.complexAspect;
            aspect.originalValues = {};
            var stype = target.entityType || target.complexType;
            stype.complexProperties.forEach(function(cp) {
                var nextTarget = target.getProperty(cp.name);
                clearOriginalValues(nextTarget);
            });
        }

        // Dangerous method - see notes - talk to Jay - this is not a complete impl
        //        proto.setAdded = function () {
        //            this.originalValues = {};
        //            this.entityState = EntityState.Added;
        //            if (this.entity.entityType.autoGeneratedKeyType !== AutoGeneratedKeyType.None) {
        //                this.entityManager.generateTempKeyValue(this.entity);
        //            }
        //        };

        /**
        Sets the entity to an EntityState of 'Modified'.  This can also be achieved by changing the value of any property on an 'Unchanged' entity.
        @example
            // assume order is an order entity attached to an EntityManager.
            order.entityAspect.setModified();
            // The 'order' entity will now be in a 'Modified' state. 
        @method setModified
        **/
        proto.setModified = function() {
            this.entityState = EntityState.Modified;
            this.entityManager._notifyStateChange(this.entity, true);
        };

        /**
        Sets the entity to an EntityState of 'Deleted'.  This both marks the entity as being scheduled for deletion during the next 'Save' call
        but also removes the entity from all of its related entities. 
        @example
            // assume order is an order entity attached to an EntityManager.
            order.entityAspect.setDeleted();
            // The 'order' entity will now be in a 'Deleted' state and it will no longer have any 'related' entities. 
        @method setDeleted
        **/
        proto.setDeleted = function() {
            var em = this.entityManager;
            if (this.entityState.isAdded()) {
                em.detachEntity(this.entity);
                em._notifyStateChange(this.entity, false);
            } else {
                this.entityState = EntityState.Deleted;
                this._removeFromRelations();
                em._notifyStateChange(this.entity, true);
            }
            // TODO: think about cascade deletes
        };

        /**
        Performs validation on the entity, any errors encountered during the validation are available via the 
        {{#crossLink "EntityAspect.getValidationErrors"}}{{/crossLink}} method. Validating an entity means executing
        all of the validators on both the entity itself as well as those on each of its properties.
        @example
            // assume order is an order entity attached to an EntityManager.
            var isOk = order.entityAspect.validateEntity();
            // isOk will be 'true' if there are no errors on the entity.
            if (!isOk) {
                var errors = order.entityAspect.getValidationErrors();
            }
        @method validateEntity
        @return {Boolean} Whether the entity passed validation.
        **/
        proto.validateEntity = function () {
            var ok =true;
            this._processValidationOpAndPublish(function(that) {
                ok = validateTarget(that.entity);
            });
            return ok;
        };

        function validateTarget(target) {
            var ok = true;
            var stype = target.entityType || target.complexType;
            var aspect = target.entityAspect || target.complexAspect;
            var entityAspect = target.entityAspect || target.complexAspect.entityAspect;
            
            stype.getProperties().forEach(function (p) {
                var value = target.getProperty(p.name);
                var propName = aspect.propertyPath ? aspect.propertyPath + "." + p.name : p.name;
                if (p.validators.length > 0) {
                    var context = { entity: entityAspect.entity, property: p, propertyName: propName };
                    ok = entityAspect._validateProperty(value, context) && ok;
                }
                if (p.isComplexProperty) {
                    ok = validateTarget(value) && ok;
                }
            });
            

            // then entity level
            stype.validators.forEach(function (validator) {
                ok = validate(entityAspect, validator, aspect.entity) && ok;
            });
            return ok;
        }
    

        /**
        Performs validation on a specific property of this entity, any errors encountered during the validation are available via the 
        {{#crossLink "EntityAspect.getValidationErrors"}}{{/crossLink}} method. Validating a property means executing
        all of the validators on the specified property.  This call is also made automatically anytime a property
        of an entity is changed.
        @example
            // assume order is an order entity attached to an EntityManager.
            var isOk = order.entityAspect.validateProperty("Order"); 
        or
        @example
            var orderDateProperty = order.entityType.getProperty("OrderDate");
            var isOk = order.entityAspect.validateProperty(OrderDateProperty); 
        @method validateProperty
        @param property {DataProperty|NavigationProperty|String} The {{#crossLink "DataProperty"}}{{/crossLink}} or 
        {{#crossLink "NavigationProperty"}}{{/crossLink}} to validate or a string with the name of the property or a property path with
        the path to a property of a complex object.
        @param [context] {Object} A context object used to pass additional information to each  {{#crossLink "Validator"}}{{/crossLink}}
        @return {Boolean} Whether the entity passed validation.
        **/
        proto.validateProperty = function (property, context) {
            var value = this.getPropertyValue(property); // performs validations
            if (value.complexAspect) {
                return validateTarget(value);
            }
            context = context || {};
            context.entity = this.entity;
            if (typeof(property) === 'string') {
                context.property = this.entity.entityType.getProperty(property, true);
                context.propertyName = property;
            } else {
                context.property = property;
                context.propertyName = property.name;
            }
            
            return this._validateProperty(value, context);
        };

        /**
        Returns the validation errors associated with either the entire entity or any specified property.
        @example
        This method can return all of the errors for an Entity
        @example
            // assume order is an order entity attached to an EntityManager.
            var valErrors = order.entityAspect.getValidationErrors();
        as well as those for just a specific property.
        @example
            // assume order is an order entity attached to an EntityManager.
            var orderDateErrors = order.entityAspect.getValidationErrors("OrderDate");
        which can also be expressed as
        @example
            // assume order is an order entity attached to an EntityManager.
            var orderDateProperty = order.entityType.getProperty("OrderDate");
            var orderDateErrors = order.entityAspect.getValidationErrors(orderDateProperty);
        @method getValidationErrors
        @param [property] {DataProperty|NavigationProperty} The property for which validation errors should be retrieved.
        If omitted, all of the validation errors for this entity will be returned.
        @return {Array of ValidationError}
        **/
        proto.getValidationErrors = function (property) {
            assertParam(property, "property").isOptional().isEntityProperty().or().isString().check();
            var result = core.getOwnPropertyValues(this._validationErrors);
            if (property) {
                var propertyName = typeof (property) === 'string' ? property : property.name;
                result = result.filter(function (ve) {
                    return (ve.property.name === propertyName);
                });
            }
            return result;
        };

        /**
        Adds a validation error for a specified property.
        @method addValidationError
        @param validationError {ValidationError} 
        **/
        proto.addValidationError = function (validationError) {
            assertParam(validationError, "validationError").isInstanceOf(ValidationError).check();
            this._processValidationOpAndPublish(function (that) {
                that._addValidationError(validationError);
            });
        };

        /**
        Removes a validation error for a specified property.
        @method removeValidationError
        @param validator {Validator}
        @param [property] {DataProperty|NavigationProperty}
        **/
        proto.removeValidationError = function (validator, property) {
            assertParam(validator, "validator").isString().or().isInstanceOf(Validator).check();
            assertParam(property, "property").isOptional().isEntityProperty().check();
            this._processValidationOpAndPublish(function (that) {
                that._removeValidationError(validator, property && property.name);
            });
        };

        /**
        Removes all of the validation errors for a specified entity
        @method clearValidationErrors
        **/
        proto.clearValidationErrors = function () {
            this._processValidationOpAndPublish(function (that) {
                core.objectForEach(that._validationErrors, function(key, valError) {
                    if (valError) {
                        delete that._validationErrors[key];
                        that._pendingValidationResult.removed.push(valError);
                    }
                });
            });
        };

        /**
        Performs a query for the value of a specified {{#crossLink "NavigationProperty"}}{{/crossLink}}.
        @example
               emp.entityAspect.loadNavigationProperty("Orders")
                .then(function (data) {
                    var orders = data.results;
                }).fail(function (exception) {
                    // handle exception here;
                });
        @method loadNavigationProperty
        @async
        @param navigationProperty {NavigationProperty} The NavigationProperty to 'load'.
        @param [callback] {Function} Function to call on success.
        @param [errorCallback] {Function} Function to call on failure.
        @return {Promise} 

            promiseData.results {Array of Entity}
            promiseData.query {EntityQuery} The original query
            promiseData.XHR {XMLHttpRequest} The raw XMLHttpRequest returned from the server.
        **/
        // This method is provided in entityQuery.js.
        // proto.loadNavigationProperty = function(navigationProperty, callback, errorCallback) 

        // returns null for np's that do not have a parentKey
        proto.getParentKey = function (navigationProperty) {
            // NavigationProperty doesn't yet exist
            // assertParam(navigationProperty, "navigationProperty").isInstanceOf(NavigationProperty).check();
            var fkNames = navigationProperty.foreignKeyNames;
            if (fkNames.length === 0) return null;
            var that = this;
            var fkValues = fkNames.map(function (fkn) {
                return that.entity.getProperty(fkn);
            });
            return new EntityKey(navigationProperty.entityType, fkValues);
        };

        proto.getPropertyValue = function (property) {
            assertParam(property, "property").isString().or().isEntityProperty().check();
            var value;
            if (typeof (property) === 'string') {
                var propNames = property.trim().split(".");
                var propName = propNames.shift();
                value = this.entity;
                value = value.getProperty(propName);
                while (propNames.length > 0) {
                    propName = propNames.shift();
                    value = value.getProperty(propName);
                }
            } else {
                if (!(property.parentType instanceof EntityType)) {
                    throw new Error("The validateProperty method does not accept a 'property' parameter whose parentType is a ComplexType; " +
                        "Pass a 'property path' string as the 'property' paramter instead ");
                }
                value = this.entity.getProperty(property.name);
            }
            return value;
        };

        // internal methods

        proto._removeFromRelations = function () {
            var entity = this.entity;

            // remove this entity from any collections.
            // mark the entity deleted
            entity.entityType.navigationProperties.forEach(function (np) {
                var inverseNp = np.inverse;
                if (!inverseNp) return;
                var npValue = entity.getProperty(np.name);
                if (np.isScalar) {
                    if (npValue) {
                        if (inverseNp.isScalar) {
                            npValue.setProperty(inverseNp.name, null);
                        } else {
                            var collection = npValue.getProperty(inverseNp.name);
                            if (collection.length) {
                                core.arrayRemoveItem(collection, entity);
                            }
                        }
                    }
                } else {
                    // npValue is a live list so we need to copy it first.
                    npValue.slice(0).forEach(function (v) {
                        if (inverseNp.isScalar) {
                            v.setProperty(inverseNp.name, null);
                        } else {
                            // TODO: many to many - not yet handled.
                        }
                    });
                    // now clear it.
                    npValue.length = 0;
                }
            });

        };

        // called from defaultInterceptor.
        proto._validateProperty = function (value, context) {
            var ok = true;
            this._processValidationOpAndPublish(function (that) {
                context.property.validators.forEach(function (validator) {
                    ok = ok && validate(that, validator, value, context);
                });
            });
            return ok;
        };

        proto._processValidationOpAndPublish = function (validationFn) {
            if (this._pendingValidationResult) {
                // only top level processValidations call publishes
                validationFn(this);
            } else {
                try {
                    this._pendingValidationResult = { entity: this.entity, added: [], removed: [] };
                    validationFn(this);
                    if (this._pendingValidationResult.added.length > 0 || this._pendingValidationResult.removed.length > 0) {
                        this.validationErrorsChanged.publish(this._pendingValidationResult);
                    }
                } finally {
                    this._pendingValidationResult = undefined;
                }
            }
        };

        proto._addValidationError = function (validationError) {
            this._validationErrors[validationError.key] = validationError;
            this._pendingValidationResult.added.push(validationError);
        };

        proto._removeValidationError = function (validator, propertyPath) {
            var key = ValidationError.getKey(validator, propertyPath);
            var valError = this._validationErrors[key];
            if (valError) {
                delete this._validationErrors[key];
                this._pendingValidationResult.removed.push(valError);
            }
        };

        function validate(aspect, validator, value, context) {
            var ve = validator.validate(value, context);
            if (ve) {
                aspect._addValidationError(ve);
                return false;
            } else {
                aspect._removeValidationError(validator, context ? context.propertyName: null);
                return true;
            }
        }

        return ctor;

    }();

    var ComplexAspect = function() {
        
        /**
        An ComplexAspect instance is associated with every complex object instance and is accessed via the complex object's 'complexAspect' property. 
     
        The ComplexAspect itself provides properties to determine the parent object, parent property and original values for the complex object.

        A ComplexAspect will almost never need to be constructed directly. You will usually get an ComplexAspect by accessing
        an entities 'complexAspect' property.  This property will be automatically attached when an complex object is created as part of an
        entity via either a query, import or EntityManager.createEntity call.
     
            // assume address is a complex property on the 'Customer' type
            var aspect = aCustomer.address.complexAspect;
            // aCustomer === aspect.parent;
        @class ComplexAspect
        **/
        var ctor = function(complexObject, parent, parentProperty) {
            if (!complexObject) {
                throw new Error("The  ComplexAspect ctor requires an entity as its only argument.");
            }
            if (complexObject.complexAspect) {
                return complexObject.complexAspect;
            }
            // if called without new
            if (!(this instanceof ComplexAspect)) {
                return new ComplexAspect(complexObject, parent, parentProperty);
            }

            // entityType should already be on the entity from 'watch'
            this.complexObject = complexObject;
            complexObject.complexAspect = this;

            // TODO: keep public or not?
            this.originalValues = {};

            // if a standalone complexObject
            if (parent == null) {
                this.entityAspect = new EntityAspect(null);
            } else {
                this.parent = parent;
                this.parentProperty = parentProperty;
                this.propertyPath = parentProperty;
                // get the final parent's entityAspect.
                var nextParent = parent;
                while (nextParent.complexType) {
                    this.propertyPath = nextParent.complexAspect.propertyPath + "." + this.propertyPath;
                    nextParent = nextParent.complexType.parent;
                }
                this.entityAspect = nextParent.entityAspect;
            }

            var complexType = complexObject.complexType;
            if (!complexType) {
                var typeName = complexObject.prototype._$typeName;
                if (!typeName) {
                    throw new Error("This entity is not registered as a valid ComplexType");
                } else {
                    throw new Error("Metadata for this complexType has not yet been resolved: " + typeName);
                }
            }
            var complexCtor = complexType.getCtor();
            v_modelLibraryDef.defaultInstance.startTracking(complexObject, complexCtor.prototype);

        };
        var proto = ctor.prototype;
        
        /**
        The complex object that this aspect is associated with.

        __readOnly__
        @property complexObject {Entity} 
        **/
        
        /**
        The parent object that to which this aspect belongs; this will either be an entity or another complex object.

        __readOnly__
        @property parent {Entity|ComplexObject} 
        **/

        /**
        The {{#crossLink "DataProperty"}}{{/crossLink}} on the 'parent' that contains this complex object.

        __readOnly__
        @property parentProperty {DataProperty}
        **/
        
        /**
        The EntityAspect for the top level entity tht contains this complex object.

        __readOnly__
        @property entityAspect {String}
        **/
        
        /**
        The 'property path' from the top level entity that contains this complex object to this object.

        __readOnly__
        @property propertyPath {String}
        **/
        
        /**
        The 'original values' of this complex object where they are different from the 'current values'. 
        This is a map where the key is a property name and the value is the 'original value' of the property.

        __readOnly__
        @property originalValues {Object}
        **/

        proto._postInitialize = function() {
            var co = this.complexObject;
            var aCtor = co.complexType.getCtor();
            var initFn = aCtor._$initializationFn;
            if (initFn) {
                if (typeof initFn === "string") {
                    co[initFn](co);
                } else {
                    aCtor._$initializationFn(co);
                }
            }
        };

        return ctor;

    }();
    
    var EntityKey = (function () {

        var ENTITY_KEY_DELIMITER = ":::";

        /**
        An EntityKey is an object that represents the unique identity of an entity.  EntityKey's are immutable. 

        @class EntityKey
        **/
        
        /** 
        Constructs a new EntityKey.  Each entity within an EntityManager will have a unique EntityKey. 
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var empType = em1.metadataStore.getEntityType("Employee");
            var entityKey = new EntityKey(empType, 1);
        EntityKey's may also be found by calling EntityAspect.getKey()
        @example
            // assume employee1 is an existing Employee entity
            var empKey = employee1.entityAspect.getKey();
        Multipart keys are created by passing an array as the 'keyValues' parameter
        @example
            var empTerrType = em1.metadataStore.getEntityType("EmployeeTerritory");            
            var empTerrKey = new EntityKey(empTerrType, [ 1, 77]);
            // The order of the properties in the 'keyValues' array must be the same as that 
            // returned by empTerrType.keyProperties
        @method <ctor> EntityKey
        @param entityType {EntityType} The {{#crossLink "EntityType"}}{{/crossLink}} of the entity.
        @param keyValues {value|Array of values} A single value or an array of values.
        **/
        var ctor = function (entityType, keyValues) {
            // can't ref EntityType here because of module circularity
            // assertParam(entityType, "entityType").isInstanceOf(EntityType).check();
            if (!Array.isArray(keyValues)) {
                keyValues = Array.prototype.slice.call(arguments, 1);
            }
            // fluff
            //if (!(this instanceof ctor)) {
            //    return new ctor(entityType, keyValues);
            //}
            this.entityType = entityType;
            this.values = keyValues;
            this._keyInGroup = createKeyString(keyValues);
        };
        ctor._$typeName = "EntityKey";
        var proto = ctor.prototype;

        proto.toJSON = function () {
            return {
                entityType: this.entityType.name,
                values: this.values
            };
        };

        ctor.fromJSON = function (json, metadataStore) {
            var et = metadataStore.getEntityType(json.entityType, true);
            return new EntityKey(et, json.values);
        };

        /**
        Used to compare EntityKeys are determine if they refer to the same Entity.
        There is also an static version of 'equals' with the same functionality. 
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var empType = em1.metadataStore.getEntityType("Employee");
            var empKey1 = new EntityKey(empType, 1);
            // assume employee1 is an existing Employee entity
            var empKey2 = employee1.entityAspect.getKey();
            if (empKey1.equals(empKey2)) {
               // do something  ...
            }
        @method equals
        @param entityKey {EntityKey}
        **/
        proto.equals = function (entityKey) {
            if (!(entityKey instanceof EntityKey)) return false;
            return (this.entityType === entityKey.entityType) &&
                core.arrayEquals(this.values, entityKey.values);
        };

        /*
        Returns a human readable representation of this EntityKey.
        @method toString
        */
        proto.toString = function () {
            return this.entityType.name + '-' + this._keyInGroup;
        };

        /**
        Used to compare EntityKeys are determine if they refer to the same Entity. 
        There is also an instance version of 'equals' with the same functionality. 
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var empType = em1.metadataStore.getEntityType("Employee");
            var empKey1 = new EntityKey(empType, 1);
            // assume employee1 is an existing Employee entity
            var empKey2 = employee1.entityAspect.getKey();
            if (EntityKey.equals(empKey1, empKey2)) {
               // do something  ...
            }
        @method equals
        @static
        @param k1 {EntityKey}
        @param k2 {EntityKey}
        **/
        ctor.equals = function (k1, k2) {
            if (!(k1 instanceof EntityKey)) return false;
            return k1.equals(k2);
        };

        // TODO: we may want to compare to default values later.
        proto._isEmpty = function () {
            return this.values.join("").length === 0;
        };

        ctor._fromRawEntity = function (rawEntity, entityType) {
            var keyValues = entityType.keyProperties.map(function (p) {
                return rawEntity[p.nameOnServer];
            });
            return new EntityKey(entityType, keyValues);
        };



        function createKeyString(keyValues) {
            return keyValues.join(ENTITY_KEY_DELIMITER);
        }

        return ctor;
    })();

    // expose

    return {
        EntityAspect: EntityAspect,
        ComplexAspect: ComplexAspect,
        EntityState: EntityState,
        EntityAction: EntityAction,
        EntityKey: EntityKey
    };


});
