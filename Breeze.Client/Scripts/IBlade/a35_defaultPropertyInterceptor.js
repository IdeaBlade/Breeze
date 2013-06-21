
function defaultPropertyInterceptor(property, newValue, rawAccessorFn) {
    // 'this' is the entity itself in this context.

    if (newValue === undefined) newValue = null;
    var oldValue = rawAccessorFn();

    var dataType = property.dataType;
    if (dataType && dataType.parse) {
        // attempts to coerce a value to the correct type - if this fails return the value unchanged
        if (Array.isArray(newValue) && !property.isScalar) {
            newValue = newValue.map(function(nv) { return dataType.parse(nv, typeof nv); });
        } else {
            newValue = dataType.parse(newValue, typeof newValue);
        }
    }

    // exit if no change - extra cruft is because dateTimes don't compare cleanly.
    if (newValue === oldValue || (dataType && dataType.isDate && newValue && oldValue && newValue.valueOf() === oldValue.valueOf())) {
        return;
    }
        
    var that = this;
    // need 2 propNames here because of complexTypes;
    var propName = property.name;

    var localAspect, key, relatedEntity;
    // CANNOT DO NEXT LINE because it has the possibility of creating a new property
    // 'entityAspect' on 'this'.  - Not permitted by IE inside of a defined property on a prototype.
    // var entityAspect = new EntityAspect(this);

    var entityAspect = this.entityAspect;
    if (entityAspect) {
        localAspect = entityAspect;
    } else {
        localAspect = this.complexAspect;
        entityAspect = localAspect.getEntityAspect();
    }
    var propPath = localAspect.getPropertyPath(propName);
        
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

        if (property.isComplexProperty) {
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
                throw new Error(__formatString("You cannot set the non-scalar complex property: '%1' on the type: '%2'." +
                    "Instead get the property and use array functions like 'push' or 'splice' to change its contents.",
                    property.name, property.parentType.name));
            }

        } else if (property.isDataProperty) {
            if (!property.isScalar) {
                throw new Error("Nonscalar data properties are readonly - items may be added or removed but the collection may not be changed.");
            }

            // if we are changing the key update our internal entityGroup indexes.
            if (property.isPartOfKey && (!this.complexAspect) && entityManager && !entityManager.isLoading) {
                var keyProps = this.entityType.keyProperties;
                var values = keyProps.map(function (p) {
                    if (p === property) {
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

            var relatedNavProp = property.relatedNavigationProperty;
            if (relatedNavProp && entityManager) {
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
                    key = new EntityKey(relatedNavProp.entityType, [newValue]);
                    relatedEntity = entityManager.findEntityByKey(key);

                    if (relatedEntity) {
                        this.setProperty(relatedNavProp.name, relatedEntity);
                    } else {
                        // it may not have been fetched yet in which case we want to add it as an unattachedChild.    
                        entityManager._unattachedChildrenMap.addChild(key, relatedNavProp, this);
                    }
                } else {
                    this.setProperty(relatedNavProp.name, null);
                }
            } else if (property.inverseNavigationProperty && entityManager && !entityManager._inKeyFixup) {
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

                var invNavProp = property.inverseNavigationProperty;

                if (oldValue != null) {
                    key = new EntityKey(invNavProp.parentType, [oldValue]);
                    relatedEntity = entityManager.findEntityByKey(key);
                    if (relatedEntity) {
                        if (invNavProp.isScalar) {
                            relatedEntity.setProperty(invNavProp.name, null);
                        } else {
                            // remove 'this' from old related nav prop
                            var relatedArray = relatedEntity.getProperty(invNavProp.name);
                            // arr.splice(arr.indexOf(value_to_remove), 1);
                            relatedArray.splice(relatedArray.indexOf(this), 1);
                        }
                    }
                }

                if (newValue != null) {
                    key = new EntityKey(invNavProp.parentType, [newValue]);
                    relatedEntity = entityManager.findEntityByKey(key);

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

                var propertyIx = this.entityType.keyProperties.indexOf(property);
                this.entityType.navigationProperties.forEach(function (np) {
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

        } else {   
            // property is a NavigationProperty

            if (!property.isScalar) {
                throw new Error("Nonscalar navigation properties are readonly - entities can be added or removed but the collection may not be changed.");
            }

            var inverseProp = property.inverse;
            
            // manage attachment -
            if (newValue != null) {
                var newAspect = newValue.entityAspect;
                if (entityManager) {
                    if (newAspect.entityState.isDetached()) {
                        if (!entityManager.isLoading) {
                            entityManager.attachEntity(newValue, EntityState.Added);
                        }
                    } else {
                        if (newAspect.entityManager !== entityManager) {
                            throw new Error("An Entity cannot be attached to an entity in another EntityManager. One of the two entities must be detached first.");
                        }
                    }
                } else {
                    if (newAspect && newAspect.entityManager) {
                        entityManager = newAspect.entityManager;
                        if (!entityManager.isLoading) {
                            entityManager.attachEntity(entityAspect.entity, EntityState.Added);
                        }
                    }
                }
            }

            // process related updates ( the inverse relationship) first so that collection dups check works properly.
            // update inverse relationship
            if (inverseProp) {
                ///
                if (inverseProp.isScalar) {
                    // Example: bidirectional navProperty: 1->1: order -> internationalOrder
                    // order.internationalOrder <- internationalOrder || null
                    //    ==> (oldInternationalOrder.order = null)
                    //    ==> internationalOrder.order = order
                    if (oldValue != null) {
                        // TODO: null -> NullEntity later
                        oldValue.setProperty(inverseProp.name, null);
                    }
                    if (newValue != null) {
                        newValue.setProperty(inverseProp.name, this);
                    }
                } else {
                    // Example: bidirectional navProperty: 1->n: order -> orderDetails
                    // orderDetail.order <- newOrder || null
                    //    ==> (oldOrder).orderDetails.remove(orderDetail)
                    //    ==> order.orderDetails.push(newOrder)
                    if (oldValue != null) {
                        var oldSiblings = oldValue.getProperty(inverseProp.name);
                        var ix = oldSiblings.indexOf(this);
                        if (ix !== -1) {
                            oldSiblings.splice(ix, 1);
                        }
                    }
                    if (newValue != null) {
                        var siblings = newValue.getProperty(inverseProp.name);
                        // recursion check if already in the collection is performed by the relationArray
                        siblings.push(this);
                    }
                }
            } else if (property.invForeignKeyNames && entityManager && !entityManager._inKeyFixup) {
                var invForeignKeyNames = property.invForeignKeyNames;
                if (newValue != null) {
                    // Example: unidirectional navProperty: 1->1: order -> internationalOrder
                    // order.InternationalOrder <- internationalOrder
                    //    ==> internationalOrder.orderId = orderId
                    //      and
                    // Example: unidirectional navProperty: 1->n: order -> orderDetails
                    // orderDetail.order <-xxx newOrder
                    //    ==> CAN'T HAPPEN because if unidirectional because orderDetail will not have an order prop
                    var pkValues = this.entityAspect.getKey().values;
                    invForeignKeyNames.forEach(function (fkName, i) {
                        newValue.setProperty(fkName, pkValues[i]);
                    });
                } else {
                    // Example: unidirectional navProperty: 1->1: order -> internationalOrder
                    // order.internationalOrder <- null
                    //    ==> (old internationalOrder).orderId = null
                    //        and
                    // Example: unidirectional navProperty: 1->n: order -> orderDetails
                    // orderDetail.order <-xxx newOrder
                    //    ==> CAN'T HAPPEN because if unidirectional because orderDetail will not have an order prop
                    if (oldValue != null) {
                        invForeignKeyNames.forEach(function (fkName) {
                            var fkProp = oldValue.entityType.getProperty(fkName);
                            if (!fkProp.isPartOfKey) {
                                // don't update with null if fk is part of the key
                                oldValue.setProperty(fkName, null);
                            }
                        });
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

            // update fk data property - this can only occur if this navProperty has
            // a corresponding fk on this entity.
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

		if (entityManager && !entityManager.isLoading) {
			var cp = {
				name: propName
			};
			if (oldValue.entityAspect)
			    cp['oldKey'] = oldValue.entityAspect.unwrapKey();
			if (localAspect.changedProperties) {
				if (!__arrayFirst(localAspect.changedProperties, function (c) { return c.name === propName }))
					localAspect.changedProperties.push(cp);
			} else {
				localAspect.changedProperties = [cp];
			}
		}
	} finally {
        inProcess.pop();
    }
}
    