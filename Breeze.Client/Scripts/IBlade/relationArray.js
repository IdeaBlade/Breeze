
define(["core", "entityAspect", "entityQuery"],
function (core, m_entityAspect, m_entityQuery) {
    "use strict";

    var relationArrayMixin = {};
    var EntityState = m_entityAspect.EntityState;
    var EntityQuery = m_entityQuery.EntityQuery;

    var Event = core.Event;
    
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
    
    relationArrayMixin.push = function () {
        if (this._inProgress) {
            return -1;
        }
       
        var goodAdds = getGoodAdds(this, Array.prototype.slice.call(arguments));
        if (!goodAdds.length) {
            return this.length;
        }
        var result = Array.prototype.push.apply(this, goodAdds);
        processAdds(this, goodAdds);
        return result;
    };

    
    relationArrayMixin.unshift = function () {
        var goodAdds = getGoodAdds(this, Array.prototype.slice.call(arguments));
        if (!goodAdds.length) {
            return this.length;
        }
        
        var result = Array.prototype.unshift.apply(this, goodAdds);
        processAdds(this, Array.prototype.slice.call(goodAdds));
        return result;
    };

    relationArrayMixin.pop = function () {
        var result = Array.prototype.pop.apply(this);
        processRemoves(this, [result]);
        return result;
    };

    relationArrayMixin.shift = function () {
        var result = Array.prototype.shift.apply(this);
        processRemoves(this, [result]);
        return result;
    };

    relationArrayMixin.splice = function () {
        var goodAdds = getGoodAdds(this, Array.prototype.slice.call(arguments, 2));
        var newArgs = Array.prototype.slice.call(arguments, 0, 2).concat(goodAdds);
        
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
    relationArrayMixin.load = function (callback, errorCallback) {
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
            goodAdds.forEach(function (add) {
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
        var inverseProp = relationArray.navigationProperty.inverse;
        var goodAdds = adds.filter(function (a) {
            if (relationArray._addsInProcess.indexOf(a) >= 0) {
                return false;
            }
            var inverseValue = a.getProperty(inverseProp.name);
            return inverseValue != relationArray.parentEntity;
        });
        return goodAdds;
    }

    function processAdds(relationArray, adds) {
        var inp = relationArray.navigationProperty.inverse;
        if (inp) {
            var addsInProcess = relationArray._addsInProcess;
            var startIx = addsInProcess.length;
            try {
                adds.forEach(function (childEntity) {
                    addsInProcess.push(childEntity);
                    childEntity.setProperty(inp.name, relationArray.parentEntity);
                });
            } finally {
                addsInProcess.splice(startIx, adds.length);
            };
        }
        
        // this is referencing the name of the method on the relationArray not the name of the event
        publish(relationArray, "arrayChanged", { added: adds });
    }
    
    function publish(publisher, eventName, eventArgs) {
        var pendingPubs = publisher._getPendingPubs();
        if (pendingPubs) {
            if (!publisher._pendingArgs) {
                publisher._pendingArgs = eventArgs;
                pendingPubs.push(function () {
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
            if (hasOwnProperty.call(target, key)) {
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
            removes.forEach(function (childEntity) {
                childEntity.setProperty(inp.name, null);
            });
        }
        // this is referencing the name of the method on the relationArray not the name of the event
        publish(relationArray, "arrayChanged", { removed: removes });
    }


    function makeRelationArray(arr, parentEntity, navigationProperty) {
        arr.parentEntity = parentEntity;
        arr.navigationProperty = navigationProperty;
        arr.arrayChanged = new Event("arrayChanged_entityCollection", arr);
        // array of pushes currently in process on this relation array - used to prevent recursion.
        arr._addsInProcess = [];
        return core.extend(arr, relationArrayMixin);
    }

    return makeRelationArray;

});
