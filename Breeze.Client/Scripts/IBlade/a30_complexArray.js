
breeze.makeComplexArray = function() {
    var complexArrayMixin = {};

    /**
    Complex arrays are not actually classes, they are objects that mimic arrays. A relation array is collection of 
    complexTypes associated with a data property on a single entity. i.e. customer.orders or order.orderDetails.
    This collection looks like an array in that the basic methods on arrays such as 'push', 'pop', 'shift', 'unshift', 'splice'
    are all provided as well as several special purpose methods. 
    @class ↈ_complexArray_
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

    complexArrayMixin.push = function() {
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


    complexArrayMixin.unshift = function () {
        var goodAdds = getGoodAdds(this, __arraySlice(arguments));
        if (!goodAdds.length) {
            return this.length;
        }

        var result = Array.prototype.unshift.apply(this, goodAdds);
        processAdds(this, __arraySlice(goodAdds));
        return result;
    };

    complexArrayMixin.pop = function () {
        var result = Array.prototype.pop.apply(this);
        processRemoves(this, [result]);
        return result;
    };

    complexArrayMixin.shift = function () {
        var result = Array.prototype.shift.apply(this);
        processRemoves(this, [result]);
        return result;
    };

    complexArrayMixin.splice = function () {
        var goodAdds = getGoodAdds(this, __arraySlice(arguments, 2));
        var newArgs = __arraySlice(arguments, 0, 2).concat(goodAdds);

        var result = Array.prototype.splice.apply(this, newArgs);
        processRemoves(this, result);

        if (goodAdds.length) {
            processAdds(this, goodAdds);
        }
        return result;
    };

  
    complexArrayMixin._getEventParent = function () {
        return this.parentEntity.entityAspect;
    };

    complexArrayMixin._getPendingPubs = function () {
        var em = this.parentEntity.entityAspect.entityManager;
        return em && em._pendingPubs;
    };

    function getGoodAdds(complexArray, adds) {
        var goodAdds = checkForDups(complexArray, adds);
        if (!goodAdds.length) {
            return goodAdds;
        }
     
        return goodAdds;
    }

    function checkForDups(complexArray, adds) {
        // don't allow dups in this array.
        return adds;
        
    }

    function processAdds(complexArray, adds) {
        // this is referencing the name of the method on the complexArray not the name of the event
        publish(complexArray, "arrayChanged", { complexArray: complexArray, added: adds });

    }

    function processRemoves(complexArray, removes) {
        // this is referencing the name of the method on the relationArray not the name of the event
        publish(complexArray, "arrayChanged", { complexArray: complexArray, removed: removes });
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
            if (key !== "complexArray" && target.hasOwnProperty(key)) {
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

 

    function makeComplexArray(arr, parentEntity, complexProperty) {
        arr.parentEntity = parentEntity;
        arr.complexProperty = complexProperty;
        arr.arrayChanged = new Event("arrayChanged_entityCollection", arr);
        // array of pushes currently in process on this relation array - used to prevent recursion.
        arr._addsInProcess = [];
        return __extend(arr, complexArrayMixin);
    }

    return makeComplexArray;
}();