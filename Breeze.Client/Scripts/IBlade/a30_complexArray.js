
breeze.makeComplexArray = (function() {
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

    // virtual impls 
    complexArrayMixin._getGoodAdds = function (adds) {
        return getGoodAdds(this, adds);
    };

    complexArrayMixin._beforeChange = function() {
        observableArray.updateEntityState(this);
    };

    complexArrayMixin._processAdds = function (adds) {
        processAdds(this, adds);
    };

    complexArrayMixin._processRemoves = function (removes) {
        processRemoves(this, removes);
    };
    //

    complexArrayMixin._rejectChanges = function() {
        if (!this._origValues) return;
        var that = this;
        this.forEach(function(co) {
            clearAspect(co, that);
        });
        this.length = 0;
        this._origValues.forEach(function(co) {
            that.push(co);
        });
        Array.prototype.push.apply(this, this._origValues);
    };

    complexArrayMixin._acceptChanges = function() {
        this._origValues = null;
    } ;

    // local functions


    function getGoodAdds(complexArray, adds) {
        // remove any that are already added here
        return adds.filter(function (a) {
            return a.parent !== complexArray.parent;
        });
    }

    function processAdds(complexArray, adds) {
        adds.forEach(function (a) {
            if (a.parent != null) {
                throw new Error("The complexObject is already attached. Either clone it or remove it from its current owner");
            }
            setAspect(a, complexArray);
        });
    }

    function processRemoves(complexArray, removes) {
        removes.forEach(function (a) {
            clearAspect(a, complexArray);
        });
    }

    function clearAspect(co, arr) {
        var coAspect = co.complexAspect;
        // if not already attached - exit
        if (coAspect.parent !== arr.parent) return null;

        coAspect.parent = null;
        coAspect.parentProperty = null;
        return coAspect;
    }

    function setAspect(co, arr) {
        var coAspect = co.complexAspect;
        // if already attached - exit
        if (coAspect.parent === arr.parent) return null;
        coAspect.parent = arr.parent;
        coAspect.parentProperty = arr.parentProperty;

        return coAspect;
    }

    function makeComplexArray(arr, parent, parentProperty) {

        observableArray.initializeParent(arr, parent, parentProperty);
        arr.arrayChanged = new Event("arrayChanged", arr);
        __extend(arr, observableArray.mixin);
        return __extend(arr, complexArrayMixin);
    }

    return makeComplexArray;
})();