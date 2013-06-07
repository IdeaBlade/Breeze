
breeze.makeComplexArray = function() {
    var complexArrayMixin = {};

    // complexArray will have the following props
    //    parent
    //    propertyPath
    //    parentProperty
    //    addedItems  - only if modified
    //    removedItems  - only if modified
    //  each complexAspect of any entity within a complexArray
    //  will have its own _complexState = "A/M";

    /**
    Complex arrays are not actually classes, they are objects that mimic arrays. A complex array is collection of 
    complexTypes associated with a data property on a single entity or other complex object. i.e. customer.orders or order.orderDetails.
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
        return this.entityAspect;
    };

    complexArrayMixin._getPendingPubs = function () {
        var em = this.entityAspect.entityManager;
        return em && em._pendingPubs;
    };

    complexArrayMixin._clearAddedRemoved = function() {
        this._added.concat(this._removed).forEach(function(co) {
              co.complexAspect._state = null;
        } );
        this._added = [];
        this._removed = [];
    }

    function getGoodAdds(complexArray, adds) {
        var goodAdds = checkForDups(complexArray, adds);
        if (!goodAdds.length) {
            return goodAdds;
        }
     
        return goodAdds;
    }

    function checkForDups(complexArray, adds) {
        // don't check for real dups yet.
        // remove any that are already added here
        return adds.filter(function (a) {
            return a.parent != complexArray.parent;
        });

    }

    function processAdds(complexArray, adds) {
        adds.forEach(function (a) {
            if (a.parent != null) {
                throw new Error("The complexObject is already attached. Either clone it or remove it from its current owner");
            }
            attach(a, complexArray);
        });
        // this is referencing the name of the method on the complexArray not the name of the event
        publish(complexArray, "arrayChanged", { complexArray: complexArray, added: adds });

    }

    function processRemoves(complexArray, removes) {
        removes.forEach(function (a) {
            detach(a, complexArray);
        });
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

    function attach(co, arr) {
        var aspect = co.complexAspect;
        // if already attached - exit
        if (aspect.parent === arr.parent) return;
        aspect.parent = arr.parent;
        aspect.parentProperty = arr.parentProperty;
        aspect.propertyPath = arr.propertyPath;
        aspect.entityAspect = arr.entityAspect;

        if (aspect._state === "R") {
            // unremove
            __core.arrayRemoveItem(arr._removed, co);
            aspect._state = null;
        } else {
            aspect._state = "A"
            arr._added.push(co);
            if (arr.entityAspect.entityState.isUnchanged()) {
                arr.entityAspect.setModified();
            }
        }
    }

    function detach(co, arr) {
        // if not already attached - exit
        var aspect = co.complexAspect;
        if (aspect.parent !== arr.parent) return;

        aspect.parent = null;
        aspect.parentProperty = null;
        aspect.propertyPath = null;
        aspect.entityAspect = null;


        if (aspect._state === "A") {
            // unAdd
            __core.arrayRemoveItem(arr._added, co);
            aspect._state = null;
        } else {
            aspect._state = "R"
            arr._removed.push(co);
            if (arr.entityAspect.entityState.isUnchanged()) {
                arr.entityAspect.setModified();
            }
        }
    }

    function makeComplexArray(arr, parent, parentProperty) {

        arr.parent = parent;
        arr.parentProperty = parentProperty;
        arr.propertyPath = parentProperty.name;
        // get the final parent's entityAspect.
        var nextParent = parent;
        while (nextParent.complexType) {
            arr.propertyPath = nextParent.complexAspect.propertyPath + "." + arr.propertyPath;
            nextParent = nextParent.complexAspect.parent;
        }
        arr.entityAspect = nextParent.entityAspect;

        arr.arrayChanged = new Event("arrayChanged_complexArray", arr);
        // array of pushes currently in process on this relation array - used to prevent recursion.
        arr._addsInProcess = [];
        arr._added = [];
        arr._removed = [];
        return __extend(arr, complexArrayMixin);
    }

    return makeComplexArray;
}();