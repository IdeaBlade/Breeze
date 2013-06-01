
function defaultPropertyInterceptor(property, newValue, rawAccessorFn) {
    // 'this' is the entity itself in this context.

    if (newValue === undefined) newValue = null;
    var oldValue = rawAccessorFn();

    var dataType = property.dataType;
    if (dataType && dataType.parse) {
        // attempts to coerce a value to the correct type - if this fails return the value unchanged
        newValue = dataType.parse(newValue, typeof newValue);
    }

    // exit if no change - extra cruft is because dateTimes don't compare cleanly.
    if (newValue === oldValue || (dataType && dataType.isDate && newValue && oldValue && newValue.valueOf() === oldValue.valueOf())) {
        return;
    }
        
    var that = this;
    // need 2 propNames here because of complexTypes;
    var propName = property.name;
    var propPath;

    // CANNOT DO NEXT LINE because it has the possibility of creating a new property
    // 'entityAspect' on 'this'.  - Not permitted by IE inside of a defined property on a prototype.
    // var entityAspect = new EntityAspect(this);

    var entityAspect = this.entityAspect;
    var localAspect;
        
    if (entityAspect) {
        localAspect = entityAspect;
        propPath = propName;
    } else {
        localAspect = this.complexAspect;
        entityAspect = localAspect.entityAspect;
        // if complexType is standalone - i.e. doesn't have a pareent - don't try to calc a fullPropName;
        propPath = (localAspect.parent) ?
            localAspect.propertyPath + "." + propName :
            propName;
    }
        
        
    // Note that we need to handle multiple properties in process, not just one in order to avoid recursion. 
    // ( except in the case of null propagation with fks where null -> 0 in some cases.)
    // (this may not be needed because of the newValue === oldValue test above)
    var inProcess = entityAspect._inProcess;
    if (inProcess) {
        // check for recursion
        if (inProcess.indexOf(property) >= 0) return;
        inProcess.push(property);
    } else {
        inProcess =  [property];
        entityAspect._inProcess = inProcess;
    }
        
    // entityAspect.entity used because of complexTypes
    // 'this' != entity when 'this' is a complexObject; in that case 'this' is a complexObject and 'entity' is an entity
    var entity = entityAspect.entity;

    // We could use __using here but decided not to for perf reasons - this method runs a lot.
    // i.e __using(entityAspect, "_inProcess", property, function() {...        
    try {

        var entityManager = entityAspect.entityManager;
        // store an original value for this property if not already set
        if (entityAspect.entityState.isUnchangedOrModified()) {
            if (localAspect.originalValues[propName]===undefined && property.isDataProperty && !property.isComplexProperty) {
                // otherwise this entry will be skipped during serialization
                localAspect.originalValues[propName] = oldValue !== undefined ? oldValue : property.defaultValue;
            }
        }

        // set the value
        if (property.isNavigationProperty) {
            if (!property.isScalar) {
                throw new Error("Nonscalar navigation properties are readonly - entities can be added or removed but the collection may not be changed.");
            }

            var inverseProp = property.inverse;
            var oldSiblings;
            if (newValue) {
                if (entityManager) {
                    if (newValue.entityAspect.entityState.isDetached()) {
                        if (!entityManager.isLoading) {
                            entityManager.attachEntity(newValue, EntityState.Added);
                        }
                    } else {
                        if (newValue.entityAspect.entityManager !== entityManager) {
                            throw new Error("An Entity cannot be attached to an entity in another EntityManager. One of the two entities must be detached first.");
                        }
                    }
                } else {
                    if (newValue.entityAspect && newValue.entityAspect.entityManager) {
                        entityManager = newValue.entityAspect.entityManager;
                        if (!entityManager.isLoading) {
                            entityManager.attachEntity(entityAspect.entity, EntityState.Added);
                        }
                    }
                }
                    
                // process related updates ( the inverse relationship) first so that collection dups check works properly.
                // update inverse relationship

                if (inverseProp) {
                    if (inverseProp.isScalar) {
                        // navigation property change - undo old relation
                        if (oldValue) {
                            // TODO: null -> NullEntity later
                            oldValue.setProperty(inverseProp.name, null);
                        }
                        newValue.setProperty(inverseProp.name, this);
                    } else {
                        // navigation property change - undo old relation
                        if (oldValue) {
                            oldSiblings = oldValue.getProperty(inverseProp.name);
                            var ix = oldSiblings.indexOf(this);
                            if (ix !== -1) {
                                oldSiblings.splice(ix, 1);
                            }
                        }
                        var siblings = newValue.getProperty(inverseProp.name);
                        // recursion check if already in the collection is performed by the relationArray
                        siblings.push(this);
                    }
                }
            } else {
                    // To get here - the newValue is either null or undefined;
                    if (inverseProp) {
                    if (inverseProp.isScalar) {
                        // navigation property change - undo old relation
                        if (oldValue) {
                            // TODO: null -> NullEntity later
                            oldValue.setProperty(inverseProp.name, null);
                        }
                    } else {
                        // navigation property change - undo old relation
                        if (oldValue) {
                            oldSiblings = oldValue.getProperty(inverseProp.name);
                            var ix = oldSiblings.indexOf(this);
                            if (ix !== -1) {
                                oldSiblings.splice(ix, 1);
                            }
                        }
                    }
                }
            }
             
            rawAccessorFn(newValue);
            if (entityManager && !entityManager.isLoading) {
                if (entityAspect.entityState.isUnchanged() && !property.isUnmapped) {
                    entityAspect.setModified();
                }
                if (entityManager.validationOptions.validateOnPropertyChange) {
                    entityAspect._validateProperty(newValue,
                        { entity: this, property: property, propertyName: propPath, oldValue: oldValue });
                }
            }
            // update fk data property
            if (property.relatedDataProperties) {
                if (!entityAspect.entityState.isDeleted()) {
                    var inverseKeyProps = property.entityType.keyProperties;
                    inverseKeyProps.forEach(function(keyProp, i ) {
                        var relatedDataProp = property.relatedDataProperties[i];
                        // Do not trash related property if it is part of that entity's key
                        if (newValue || !relatedDataProp.isPartOfKey) {
                            var relatedValue = newValue ? newValue.getProperty(keyProp.name) : relatedDataProp.defaultValue;
                            that.setProperty(relatedDataProp.name, relatedValue);
                        }
                    });
                }
            } 

        } else if (property.isComplexProperty) {
            if (property.isScalar) {
                if (!newValue) {
                    throw new Error(__formatString("You cannot set the '%1' property to null because it's datatype is the ComplexType: '%2'", property.name, property.dataType.name));
                }
                // To get here it must be a ComplexProperty  
                // 'dataType' will be a complexType
                if (!oldValue) {
                    var ctor = dataType.getCtor();
                    oldValue = new ctor();
                    rawAccessorFn(oldValue);
                }
                dataType.dataProperties.forEach(function (dp) {
                    var pn = dp.name;
                    var nv = newValue.getProperty(pn);
                    oldValue.setProperty(pn, nv);
                });
            } else {
                throw new Error(__formatString("You cannot set a non-scalar complex property: '%1'", property.name));
            }
        } else {
            // To get here it must be a (nonComplex) DataProperty  
            if (property.isPartOfKey && (!this.complexAspect) && entityManager && !entityManager.isLoading) {
                var keyProps = this.entityType.keyProperties;
                var values = keyProps.map(function(p) {
                    if (p == property) {
                        return newValue;
                    } else {
                        return this.getProperty(p.name);
                    }
                }, this);
                var newKey = new EntityKey(this.entityType, values);
                if (entityManager.findEntityByKey(newKey)) {
                    throw new Error("An entity with this key is already in the cache: " + newKey.toString());
                }
                var oldKey = this.entityAspect.getKey();
                var eg = entityManager._findEntityGroup(this.entityType);
                eg._replaceKey(oldKey, newKey);
            }

            // process related updates ( the inverse relationship) first so that collection dups check works properly.
            // update inverse relationship

            // update corresponding nav property if attached.
            if (property.relatedNavigationProperty && entityManager) {
                var relatedNavProp = property.relatedNavigationProperty;
                if (newValue != null) {
                    var key = new EntityKey(relatedNavProp.entityType, [newValue]);
                    var relatedEntity = entityManager.findEntityByKey(key);

                    if (relatedEntity) {
                        this.setProperty(relatedNavProp.name, relatedEntity);
                    } else {
                        // it may not have been fetched yet in which case we want to add it as an unattachedChild.    
                        entityManager._unattachedChildrenMap.addChild(key, relatedNavProp, this);
                    }
                } else {
                    this.setProperty(relatedNavProp.name, null);
                }
            } else if (property.invEntityType && entityManager && !entityManager._inKeyFixup) {
                var invEntityType = property.invEntityType;
                // unidirectional 1->n 
                var invNavProp = __arrayFirst(invEntityType.navigationProperties, function (np) {
                    return np.invForeignKeyNames && np.invForeignKeyNames.indexOf(property.name) >= 0;
                });
                if (oldValue != null && !invNavProp.isScalar) {
                    // remove 'this' from old related nav prop
                    var key = new EntityKey(invEntityType, [oldValue]);
                    var relatedEntity = entityManager.findEntityByKey(key);
                    if (relatedEntity) {
                        var relatedArray = relatedEntity.getProperty(invNavProp.name);
                        // arr.splice(arr.indexOf(value_to_remove), 1);
                        relatedArray.splice(relatedArray.indexOf(this), 1);
                    }
                }
                if (newValue != null) {
                    var key = new EntityKey(invEntityType, [newValue]);
                    var relatedEntity = entityManager.findEntityByKey(key);

                    if (relatedEntity) {
                        if (invNavProp.isScalar) {
                            relatedEntity.setProperty(invNavProp.name, this);
                        } else {
                            relatedEntity.getProperty(invNavProp.name).push(this);
                        }
                    } else {
                        // it may not have been fetched yet in which case we want to add it as an unattachedChild.    
                        entityManager._unattachedChildrenMap.addChild(key, invNavProp, this);
                    }
                }
            }

            rawAccessorFn(newValue);
                // NOTE: next few lines are the same as above but not refactored for perf reasons.
            if (entityManager && !entityManager.isLoading) {
                if (entityAspect.entityState.isUnchanged() && !property.isUnmapped) {
                    entityAspect.setModified();
                }
                if (entityManager.validationOptions.validateOnPropertyChange) {
                    entityAspect._validateProperty(newValue,
                        { entity: entity, property: property, propertyName: propPath, oldValue: oldValue });

                }
            }
                
            if (property.isPartOfKey && (!this.complexAspect)) {
                // propogate pk change to all related entities;

                //if (oldValue && !entityAspect.entityState.isDetached()) {
                //    entityAspect.primaryKeyWasChanged = true;
                //}
                var propertyIx = this.entityType.keyProperties.indexOf(property);
                this.entityType.navigationProperties.forEach(function(np) {
                    var inverseNp = np.inverse;
                    var fkNames = inverseNp ? inverseNp.foreignKeyNames : np.invForeignKeyNames;
                    
                    if (fkNames.length === 0) return;
                    var npValue = that.getProperty(np.name);
                    var fkName = fkNames[propertyIx];
                    if (np.isScalar) {
                        if (!npValue) return;
                        npValue.setProperty(fkName, newValue);
                    } else {
                        npValue.forEach(function (iv) {
                            iv.setProperty(fkName, newValue);
                        });
                    }
                });
                // insure that cached key is updated.
                entityAspect.getKey(true);
            }
        }
            
        var propChangedArgs = { entity: entity, property: property, propertyName: propPath, oldValue: oldValue, newValue: newValue };
        if (entityManager) {
            // propertyChanged will be fired during loading but we only want to fire it once per entity, not once per property.
            // so propertyChanged is fired in the entityManager mergeEntity method if not fired here.
            if ( (!entityManager.isLoading) && (!entityManager.isRejectingChanges)) {
                entityAspect.propertyChanged.publish(propChangedArgs);
                // don't fire entityChanged event if propertyChanged is suppressed.
                entityManager.entityChanged.publish({ entityAction: EntityAction.PropertyChange, entity: entity, args: propChangedArgs });
            }
        } else {
            entityAspect.propertyChanged.publish(propChangedArgs);
        }
    } finally {
        inProcess.pop();
    }
}
    