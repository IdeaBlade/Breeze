/**
@module breeze   
**/

var EntityAspect = (function () {
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
    var ctor = function (entity) {
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
        this.hasValidationErrors = false;
        this._validationErrors = {};

        this.validationErrorsChanged = new Event("validationErrorsChanged", this);
        this.propertyChanged = new Event("propertyChanged", this);
        // in case this is the NULL entityAspect. - used with ComplexAspects that have no parent.

        // lists that control many-to-many links between entities
        this.resetLinks();

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
            __modelLibraryDef.getDefaultInstance().startTracking(entity, entityCtor.prototype);
        }
    };
    var proto = ctor.prototype;

    proto.resetLinks = function () {
        this.inseredLinks = [];
        this.removedLinks = [];
    };

    proto.insertLink = function (childEntity, np) {
        var removedLink = __arrayFirst(this.removedLinks, function (link) {
            return link.entity === childEntity && (link.np == np || link.np == np.inverse);
        });

        if (removedLink !== null) {
            var removedIndexOf = this.removedLinks.indexOf(removedLink);
            this.removedLinks.splice(removedIndexOf, 1);
            return;
        }

        var inseredLink = __arrayFirst(this.inseredLinks, function (link) {
            return link.entity === childEntity && (link.np == np || link.np == np.inverse);
        });

        if (inseredLink == null) {
            this.inseredLinks.push({ entity: childEntity, np: np });
            if (this.entityManager !== null
                && !this.entityState.isAdded() && !this.entityState.isDeleted())
                this.setModified();
        }
    };

    proto.removeLink = function (childEntity, np) {
        var inseredLink = __arrayFirst(this.inseredLinks, function (link) {
            return link.entity === childEntity && (link.np == np || link.np == np.inverse);
        });

        if (inseredLink !== null) {
            var inseredIndexOf = this.inseredLinks.indexOf(inseredLink);
            this.inseredLinks.splice(inseredIndexOf, 1);
            return;
        }

        var removedLink = __arrayFirst(this.removedLinks, function (link) {
            return link.entity === childEntity && (link.np == np || link.np == np.inverse);
        });

        if (removedLink == null) {
            this.removedLinks.push({ entity: childEntity, np: np });
            if (!this.entityState.isAdded() && !this.entityState.isDeleted())
                this.setModified();
        }
    };


    Event.bubbleEvent(proto, function () {
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
    Whether this entity has any validation errors.

    __readOnly__
    @property hasValidationErrors {Boolean}
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
    @param entity {Entity} The entity whose property has changed.
    @param property {DataProperty} The DataProperty that changed.
    @param propertyName {String} The name of the property that changed. This value will be 'null' for operations that replace the entire entity.  This includes
    queries, imports and saves that require a merge. The remaining parameters will not exist in this case either. This will actually be a "property path"
    for any properties of a complex type.
    @param oldValue {Object} The old value of this property before the change.
    @param newValue {Object} The new value of this property after the change.
    @param parent {Object} The immediate parent object for the changed property.  This will be different from the 'entity' for any complex type or nested complex type properties.
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
    proto.getKey = function (forceRefresh) {
        forceRefresh = assertParam(forceRefresh, "forceRefresh").isBoolean().isOptional().check(false);
        if (forceRefresh || !this._entityKey) {
            var entityType = this.entity.entityType;
            var keyProps = entityType.keyProperties;
            var values = keyProps.map(function (p) {
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
    proto.acceptChanges = function () {
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
    proto.rejectChanges = function () {
        var entity = this.entity;
        var entityManager = this.entityManager;
        // we do not want PropertyChange or EntityChange events to occur here
        __using(entityManager, "isRejectingChanges", true, function () {
            rejectChangesCore(entity);
        });
        if (this.entityState.isAdded()) {
            // next line is needed because the following line will cause this.entityManager -> null;
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
        stype.complexProperties.forEach(function (cp) {
            var cos = target.getProperty(cp.name);
            if (cp.isScalar) {
                rejectChangesCore(cos);
            } else {
                cos._rejectChanges();
                cos.forEach(function (co) { rejectChangesCore(co); });
            }
        });
    }

    proto.getPropertyPath = function (propName) {
        return propName;
    }

    /**
    Sets the entity to an EntityState of 'Unchanged'.  This is also the equivalent of calling {{#crossLink "EntityAspect/acceptChanges"}}{{/crossLink}}
        @example
            // assume order is an order entity attached to an EntityManager.
            order.entityAspect.setUnchanged();
            // The 'order' entity will now be in an 'Unchanged' state with any changes committed.
    @method setUnchanged
    **/
    proto.setUnchanged = function () {
        this.resetLinks();
        clearOriginalValues(this.entity);
        delete this.hasTempKey;
        this.entityState = EntityState.Unchanged;
        this.entityManager._notifyStateChange(this.entity, false);
    };

    function clearOriginalValues(target) {
        var aspect = target.entityAspect || target.complexAspect;
        aspect.originalValues = {};
        var stype = target.entityType || target.complexType;
        stype.complexProperties.forEach(function (cp) {
            var cos = target.getProperty(cp.name);
            if (cp.isScalar) {
                clearOriginalValues(cos);
            } else {
                cos._acceptChanges();
                cos.forEach(function (co) { clearOriginalValues(co); });
            }
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
    proto.setModified = function () {
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
    proto.setDeleted = function () {
        var em = this.entityManager;
        var entity = this.entity;
        if (this.entityState.isAdded()) {
            em.detachEntity(entity);
            em._notifyStateChange(entity, false);
        } else {
            this.entityState = EntityState.Deleted;
            removeFromRelations(entity, EntityState.Deleted);
            em._notifyStateChange(entity, true);
        }
        // TODO: think about cascade deletes
    };


    /**
    Sets the entity to an EntityState of 'Detached'.  This removes the entity from all of its related entities, but does NOT change the EntityState of any existing entities. 
    @example
        // assume order is an order entity attached to an EntityManager.
        order.entityAspect.setDetached();
        // The 'order' entity will now be in a 'Detached' state and it will no longer have any 'related' entities. 
    @method setDetached
    **/
    proto.setDetached = function () {
        var group = this.entityGroup;
        if (!group) {
            // no group === already detached.
            return false;
        }
        var entity = this.entity;
        group.detachEntity(entity);
        removeFromRelations(entity, EntityState.Detached);
        this.entityManager.entityChanged.publish({ entityAction: EntityAction.Detach, entity: entity });
        this._detach();
        return true;
    }

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
    proto.loadNavigationProperty = function (navigationProperty, callback, errorCallback) {
        var entity = this.entity;
        var navProperty = entity.entityType._checkNavProperty(navigationProperty);
        var query = EntityQuery.fromEntityNavigation(entity, navProperty, callback, errorCallback);
        return entity.entityAspect.entityManager.executeQuery(query, callback, errorCallback);
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
        var ok = true;
        this._processValidationOpAndPublish(function (that) {
            ok = validateTarget(that.entity);
        });
        return ok;
    };

    function validateTarget(target) {
        var ok = true;
        var stype = target.entityType || target.complexType;
        var aspect = target.entityAspect || target.complexAspect;
        var entityAspect = target.entityAspect || target.complexAspect.getEntityAspect();

        stype.getProperties().forEach(function (p) {
            var value = target.getProperty(p.name);
            var propName = aspect.getPropertyPath(p.name);
            if (p.validators.length > 0) {
                var context = { entity: entityAspect.entity, property: p, propertyName: propName };
                ok = entityAspect._validateProperty(value, context) && ok;
            }
            if (p.isComplexProperty) {
                if (p.isScalar) {
                    ok = validateTarget(value) && ok;
                } else {
                    // TODO: do we want to iterate over all of the complexObject in this property?
                }
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
        if (value && value.complexAspect) {
            return validateTarget(value);
        }
        context = context || {};
        context.entity = this.entity;
        if (typeof (property) === 'string') {
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
        var result = __getOwnPropertyValues(this._validationErrors);
        if (property) {
            var propertyName = typeof (property) === 'string' ? property : property.name;
            result = result.filter(function (ve) {
                return (ve.property.name === propertyName);
            });
        }
        return result;
    };

    /**
    Adds a validation error.
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
    Removes a validation error.
    @method removeValidationError
    @param validationErrorOrKey {ValidationError|String} Either a ValidationError or a ValidationError 'key' value
    **/
    proto.removeValidationError = function (validationErrorOrKey) {
        assertParam(validationErrorOrKey, "validationErrorOrKey").isString().or().isInstanceOf(ValidationError).or().isInstanceOf(Validator).check();

        var key = (typeof (validationErrorOrKey) === "string") ? validationErrorOrKey : validationErrorOrKey.key;
        this._processValidationOpAndPublish(function (that) {
            that._removeValidationError(key);
        });
    };

    /**
    Removes all of the validation errors for a specified entity
    @method clearValidationErrors
    **/
    proto.clearValidationErrors = function () {
        this._processValidationOpAndPublish(function (that) {
            __objectForEach(that._validationErrors, function (key, valError) {
                if (valError) {
                    delete that._validationErrors[key];
                    that._pendingValidationResult.removed.push(valError);
                }
            });
            that.hasValidationErrors = !__isEmpty(this._validationErrors);
        });
    };



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
                    "Pass a 'property path' string as the 'property' parameter instead ");
            }
            value = this.entity.getProperty(property.name);
        }
        return value;
    };

    // internal methods

    proto._detach = function () {

        this.entityGroup = null;
        this.entityManager = null;
        this.entityState = EntityState.Detached;
        this.originalValues = {};
        this._validationErrors = {};
        this.hasValidationErrors = false;
        this.validationErrorsChanged.clear();
        this.propertyChanged.clear();
    };


    // called from defaultInterceptor.
    proto._validateProperty = function (value, context) {
        var ok = true;
        this._processValidationOpAndPublish(function (that) {
            context.property.validators.forEach(function (validator) {
                ok = validate(that, validator, value, context) && ok;
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
                    // this might be a detached entity hence the guard below.
                    this.entityManager && this.entityManager.validationErrorsChanged.publish(this._pendingValidationResult);

                }
            } finally {
                this._pendingValidationResult = undefined;
            }
        }
    };

    proto._addValidationError = function (validationError) {
        this._validationErrors[validationError.key] = validationError;
        this.hasValidationErrors = true;
        this._pendingValidationResult.added.push(validationError);
    };

    proto._removeValidationError = function (key) {
        var valError = this._validationErrors[key];
        if (valError) {
            delete this._validationErrors[key];
            this.hasValidationErrors = !__isEmpty(this._validationErrors);
            this._pendingValidationResult.removed.push(valError);
        }
    };

    function removeFromRelations(entity, entityState) {
        // remove this entity from any collections.
        // mark the entity deleted or detached

        var isDeleted = entityState.isDeleted();
        if (isDeleted) {
            removeFromRelationsCore(entity, true);
        } else {
            __using(entity.entityAspect.entityManager, "isLoading", true, function () {
                removeFromRelationsCore(entity, false)
            });
        }
    }

    function removeFromRelationsCore(entity, isDeleted) {
        entity.entityType.navigationProperties.forEach(function (np) {
            var inverseNp = np.inverse;
            if (!inverseNp) return;
            var npValue = entity.getProperty(np.name);
            if (np.isScalar) {
                if (npValue) {
                    if (inverseNp.isScalar) {
                        clearNp(npValue, inverseNp, isDeleted);
                    } else {
                        var collection = npValue.getProperty(inverseNp.name);
                        if (collection.length) {
                            __arrayRemoveItem(collection, entity);
                        }
                    }
                    entity.setProperty(np.name, null);
                }
            } else {
                // npValue is a live list so we need to copy it first.
                npValue.slice(0).forEach(function (v) {
                    if (inverseNp.isScalar) {
                        clearNp(v, inverseNp, isDeleted);
                    } else {
                        // TODO: many to many - not yet handled.
                    }
                });
                // now clear it.
                npValue.length = 0;
            }
        });

    };

    function clearNp(entity, np, relatedIsDeleted) {
        if (relatedIsDeleted) {
            var property = np.relatedDataProperties[0];
            // Verify if child entity of a deleted entity has a required navigation property 
            // then set child as detached to pass responsibility to server..
            if (property && !property.isNullable) {
                entity.entityAspect.setDetached();
            } else {
                entity.setProperty(np.name, null);
            }
        } else {
            // relatedEntity was detached.
            // need to clear child np without clearing child fk or changing the entityState of the child
            var em = entity.entityAspect.entityManager;

            var fkNames = np.foreignKeyNames;
            if (fkNames) {
                var fkVals = fkNames.map(function (fkName) {
                    return entity.getProperty(fkName);
                });
            }
            entity.setProperty(np.name, null);
            if (fkNames) {
                fkNames.forEach(function (fkName, i) {
                    entity.setProperty(fkName, fkVals[i])
                });
            }

        }
    }

    function validate(aspect, validator, value, context) {
        var ve = validator.validate(value, context);
        if (ve) {
            aspect._addValidationError(ve);
            return false;
        } else {
            var key = ValidationError.getKey(validator, context ? context.propertyName : null);
            aspect._removeValidationError(key);
            return true;
        }
    }

    return ctor;

})();

var ComplexAspect = (function () {

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
    var ctor = function (complexObject, parent, parentProperty) {
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
        if (parent != null) {
            this.parent = parent;
            this.parentProperty = parentProperty;
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
        __modelLibraryDef.getDefaultInstance().startTracking(complexObject, complexCtor.prototype);

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

    proto.getEntityAspect = function () {
        var parent = this.parent;
        if (!parent) return new EntityAspect(null);
        var entityAspect = parent.entityAspect;
        while (parent && !entityAspect) {
            parent = parent.complexAspect && parent.complexAspect.parent;
            entityAspect = parent && parent.entityAspect;
        }
        return entityAspect || new EntityAspect(null);
    }

    proto.getPropertyPath = function (propName) {
        var parent = this.parent;
        if (!parent) return null;
        var aspect = parent.complexAspect || parent.entityAspect;
        return aspect.getPropertyPath(this.parentProperty.name + "." + propName);
    }

    return ctor;

})();


breeze.EntityAspect = EntityAspect;
breeze.ComplexAspect = ComplexAspect;
