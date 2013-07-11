
breeze.makeRelationArray = (function() {

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

    // virtual impls 
    relationArrayMixin._getGoodAdds = function(adds) {
        return getGoodAdds(this, adds);
    };

    relationArrayMixin._processAdds = function(adds) {
        processAdds(this, adds);
    };

    relationArrayMixin._processRemoves = function(removes)  {
        processRemoves(this, removes);
    };
    //

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

    function processAdds(relationArray, adds) {
        var parentEntity = relationArray.parentEntity;
        var np = relationArray.navigationProperty;
        var addsInProcess = relationArray._addsInProcess;

        var invNp = np.inverse;
        var startIx = addsInProcess.length;
        try {
            adds.forEach(function (childEntity) {
                addsInProcess.push(childEntity);
                if (invNp) {
                    childEntity.setProperty(invNp.name, parentEntity);
                } else {
                    // This occurs with a unidirectional 1-n navigation - in this case
                    // we need to update the fks instead of the navProp
                    var pks = parentEntity.entityType.keyProperties;
                    np.invForeignKeyNames.forEach(function (fk, i) {
                        childEntity.setProperty(fk, parentEntity.getProperty(pks[i].name));
                    });
                }
            });
        } finally {
            addsInProcess.splice(startIx, adds.length);
        }

    }

    function processRemoves(relationArray, removes) {
        var inp = relationArray.navigationProperty.inverse;
        if (inp) {
            removes.forEach(function (childEntity) {
                childEntity.setProperty(inp.name, null);
            });
        }
    }

    function checkForDups(relationArray, adds) {
        // don't allow dups in this array. - also prevents recursion 
        var parentEntity = relationArray.parentEntity;
        var navProp = relationArray.navigationProperty;
        var inverseProp = navProp.inverse;
        var goodAdds;
        if (inverseProp) {
            goodAdds = adds.filter(function (a) {
                if (relationArray._addsInProcess.indexOf(a) >= 0) {
                    return false;
                }
                var inverseValue = a.getProperty(inverseProp.name);
                return inverseValue !== parentEntity;
            });
        } else {
            // This occurs with a unidirectional 1->N relation ( where there is no n -> 1)
            // in this case we compare fks.
            var fkPropNames = navProp.invForeignKeyNames;
            var keyProps = parentEntity.entityType.keyProperties;
            goodAdds = adds.filter(function (a) {
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
        }
        return goodAdds;
    }

    function makeRelationArray(arr, parentEntity, navigationProperty) {
        arr.parentEntity = parentEntity;
        arr.navigationProperty = navigationProperty;
        arr.arrayChanged = new Event("arrayChanged", arr);
        // array of pushes currently in process on this relation array - used to prevent recursion.
        arr._addsInProcess = [];
        // need to use mixins here instead of inheritance because we are starting from an existing array object.
        __extend(arr, observableArray.mixin);
        return __extend(arr, relationArrayMixin);
    }

    return makeRelationArray;
})();