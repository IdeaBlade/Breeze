
define(["core", "entityAspect", "entityQuery"],
function (core, m_entityAspect, m_entityQuery) {
    "use strict";

    var relationArrayMixin = {};
    var EntityState = m_entityAspect.EntityState;
    var EntityQuery = m_entityQuery.EntityQuery;

    var Event = core.Event;

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

    relationArrayMixin.load = function (callback, errorCallback) {
        var parent = this.parentEntity;
        var query = EntityQuery.fromEntityNavigation(this.parentEntity, this.navigationProperty);
        var em = parent.entityAspect.entityManager;
        return em.executeQuery(query, callback, errorCallback);
    };

    function getGoodAdds(relationArray, adds) {
        var goodAdds = checkForDups(relationArray, adds);
        if (!goodAdds.length) {
            return goodAdds;
        }
        var parentEntity = relationArray.parentEntity;
        var entityManager = parentEntity.entityAspect.entityManager;
        if (entityManager) {
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
        relationArray.arrayChanged.publish({ added: adds });
    }

    function processRemoves(relationArray, removes) {
        var inp = relationArray.navigationProperty.inverse;
        if (inp) {
            removes.forEach(function (childEntity) {
                childEntity.setProperty(inp.name, null);
            });
        }
        relationArray.arrayChanged.publish({ removed: removes });
    }


    function makeRelationArray(arr, parentEntity, navigationProperty) {
        arr.parentEntity = parentEntity;
        arr.navigationProperty = navigationProperty;
        arr.arrayChanged = new Event("arrayChanged");
        // array of pushes currently in process on this relation array - used to prevent recursion.
        arr._addsInProcess = [];
        return core.extend(arr, relationArrayMixin);
    }



    return makeRelationArray;

});
