
breeze.makeRelationArray = function() {
    var relationArrayMixin = {};

    /**
    Relation arrays are not actually classes, they are objects that mimic arrays. A relation array is collection of 
    entities associated with a navigation property on a single entity. i.e. customer.orders or order.orderDetails.
    This collection looks like an array in that the basic methods on arrays such as 'push', 'pop', 'shift', 'unshift', 'splice'
    are all provided as well as several special purpose methods. 
    @class ↈ_relationArray_
    **/

    /**
    An {{#crossLink "Event"}}{{/crossLink}} that fires whenever the contents of this array changed.  This event
    is fired any time a new entity is attached or added to the EntityManager and happens to belong to this collection.
    Adds that occur as a result of query or import operations are batched so that all of the adds or removes to any individual
    collections are collected into a single notification event for each relation array.
    @example
        // assume order is an order entity attached to an EntityManager.
        orders.arrayChanged.subscribe(
            function (arrayChangedArgs) {
                var addedEntities = arrayChangedArgs.added;
                var removedEntities = arrayChanged.removed;
            });
    @event arrayChanged 
    @param added {Array of Entity} An array of all of the entities added to this collection.
    @param removed {Array of Entity} An array of all of the removed from this collection.
    @readOnly
    **/

    relationArrayMixin.push = function() {
        if (this._inProgress) {
            return -1;
        }

        var goodAdds = getGoodAdds(this, __arraySlice(arguments));
        if (!goodAdds.length) {
            return this.length;
        }
        var result = Array.prototype.push.apply(this, goodAdds);
        processAdds(this, goodAdds);
        return result;
    };


    relationArrayMixin.unshift = function() {
        var goodAdds = getGoodAdds(this, __arraySlice(arguments));
        if (!goodAdds.length) {
            return this.length;
        }

        var result = Array.prototype.unshift.apply(this, goodAdds);
        processAdds(this, __arraySlice(goodAdds));
        return result;
    };

    relationArrayMixin.pop = function() {
        var result = Array.prototype.pop.apply(this);
        processRemoves(this, [result]);
        return result;
    };

    relationArrayMixin.shift = function() {
        var result = Array.prototype.shift.apply(this);
        processRemoves(this, [result]);
        return result;
    };

    relationArrayMixin.splice = function() {
        var goodAdds = getGoodAdds(this, __arraySlice(arguments, 2));
        var newArgs = __arraySlice(arguments, 0, 2).concat(goodAdds);

        var result = Array.prototype.splice.apply(this, newArgs);
        processRemoves(this, result);

        if (goodAdds.length) {
            processAdds(this, goodAdds);
        }
        return result;
    };

    /**
    Performs an asynchronous load of all other the entities associated with this relationArray.
    @example
        // assume orders is an empty, as yet unpopulated, relation array of orders
        // associated with a specific customer.
        orders.load().then(...)
    @method load
    @param [callback] {Function} 
    @param [errorCallback] {Function}
    @return {Promise} 
    **/
    relationArrayMixin.load = function(callback, errorCallback) {
        var parent = this.parentEntity;
        var query = EntityQuery.fromEntityNavigation(this.parentEntity, this.navigationProperty);
        var em = parent.entityAspect.entityManager;
        return em.executeQuery(query, callback, errorCallback);
    };

    relationArrayMixin._getEventParent = function() {
        return this.parentEntity.entityAspect;
    };

    relationArrayMixin._getPendingPubs = function() {
        var em = this.parentEntity.entityAspect.entityManager;
        return em && em._pendingPubs;
    };

    function getGoodAdds(relationArray, adds) {
        var goodAdds = checkForDups(relationArray, adds);
        if (!goodAdds.length) {
            return goodAdds;
        }
        var parentEntity = relationArray.parentEntity;
        var entityManager = parentEntity.entityAspect.entityManager;
        // we do not want to attach an entity during loading
        // because these will all be 'attached' at a later step.
        if (entityManager && !entityManager.isLoading) {
            goodAdds.forEach(function(add) {
                if (add.entityAspect.entityState.isDetached()) {
                    relationArray._inProgress = true;
                    try {
                        entityManager.attachEntity(add, EntityState.Added);
                    } finally {
                        relationArray._inProgress = false;
                    }
                }
            });
        }
        return goodAdds;
    }

    function checkForDups(relationArray, adds) {
        // don't allow dups in this array. - also prevents recursion 
        var parentEntity = relationArray.parentEntity;
        var navProp = relationArray.navigationProperty;
        var inverseProp = navProp.inverse;
        if (inverseProp) {
            var goodAdds = adds.filter(function (a) {
                if (relationArray._addsInProcess.indexOf(a) >= 0) {
                    return false;
                }
                var inverseValue = a.getProperty(inverseProp.name);
                return inverseValue !== parentEntity;
            });
        } else {
            // This occurs with a unidirectional 1->N relation ( where there is no n -> 1)
            // in this case we compare fks.
            var fkPropNames = navProp.altForeignKeyNames;
            var keyProps = parentEntity.entityType.keyProperties;
            var goodAdds = adds.filter(function (a) {
                if (relationArray._addsInProcess.indexOf(a) >= 0) {
                    return false;
                }
                return fkPropNames.some(function (fk, i) {
                    var keyProp = keyProps[i].name;
                    var keyVal = parentEntity.getProperty(keyProp);
                    var fkVal = a.getProperty(fk);
                    return keyVal !== fkVal;
                });
            });
            // unidirectional navigation defined where 1->N but NOT N->1 ( fairly rare use case)
            // TODO: This is not complete. We really do need to elim dups.
            // throw new Error("Breeze does not YET support unidirectional navigation where navigation is only defined in the 1 -> n direction.  Unidirectional navigation in the opposite direction is supported.");
        }
        return goodAdds;
    }


    function processAdds(relationArray, adds) {
        var parentEntity = relationArray.parentEntity;
        var np = relationArray.navigationProperty;
        var invNp = np.inverse;
        
        var addsInProcess = relationArray._addsInProcess;
        var startIx = addsInProcess.length;
        try {
            adds.forEach(function(childEntity) {
                addsInProcess.push(childEntity);
                if (invNp) {
                    childEntity.setProperty(invNp.name, parentEntity);
                } else {
                    // This occurs with a unidirectional 1-n navigation - in this case
                    // we need to update the fks instead of the navProp
                    var pks = parentEntity.entityType.keyProperties;
                    np.altForeignKeyNames.forEach(function (fk, i) {
                        childEntity.setProperty(fk, parentEntity.getProperty(pks[i].name));
                    });
                }
            });
        } finally {
            addsInProcess.splice(startIx, adds.length);
        }
        
        // this is referencing the name of the method on the relationArray not the name of the event
        publish(relationArray, "arrayChanged", { relationArray: relationArray, added: adds });

    }

    function publish(publisher, eventName, eventArgs) {
        var pendingPubs = publisher._getPendingPubs();
        if (pendingPubs) {
            if (!publisher._pendingArgs) {
                publisher._pendingArgs = eventArgs;
                pendingPubs.push(function() {
                    publisher[eventName].publish(publisher._pendingArgs);
                    publisher._pendingArgs = null;
                });
            } else {
                combineArgs(publisher._pendingArgs, eventArgs);
            }
        } else {
            publisher[eventName].publish(eventArgs);
        }
    }

    function combineArgs(target, source) {
        for (var key in source) {
            if (key !== "relationArray" && target.hasOwnProperty(key)) {
                var sourceValue = source[key];
                var targetValue = target[key];
                if (targetValue) {
                    if (!Array.isArray(targetValue)) {
                        throw new Error("Cannot combine non array args");
                    }
                    Array.prototype.push.apply(targetValue, sourceValue);
                } else {
                    target[key] = sourceValue;
                }
            }
        }
    }

    function processRemoves(relationArray, removes) {
        var inp = relationArray.navigationProperty.inverse;
        if (inp) {
            removes.forEach(function(childEntity) {
                childEntity.setProperty(inp.name, null);
            });
        }
        // this is referencing the name of the method on the relationArray not the name of the event
        publish(relationArray, "arrayChanged", { relationArray: relationArray, removed: removes });
    }


    function makeRelationArray(arr, parentEntity, navigationProperty) {
        arr.parentEntity = parentEntity;
        arr.navigationProperty = navigationProperty;
        arr.arrayChanged = new Event("arrayChanged_entityCollection", arr);
        // array of pushes currently in process on this relation array - used to prevent recursion.
        arr._addsInProcess = [];
        return __extend(arr, relationArrayMixin);
    }

    return makeRelationArray;
}();