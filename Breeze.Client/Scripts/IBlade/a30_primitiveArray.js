
breeze.makePrimitiveArray = (function() {
    var primitiveArrayMixin = {};

    // complexArray will have the following props
    //    parent
    //    propertyPath
    //    parentProperty
    //    addedItems  - only if modified
    //    removedItems  - only if modified
    //  each complexAspect of any entity within a complexArray
    //  will have its own _complexState = "A/M";

    /**
    Primitive arrays are not actually classes, they are objects that mimic arrays. A primitive array is collection of
    primitive types associated with a data property on a single entity or complex object. i.e. customer.invoiceNumbers.
    This collection looks like an array in that the basic methods on arrays such as 'push', 'pop', 'shift', 'unshift', 'splice'
    are all provided as well as several special purpose methods. 
    @class ↈ_primitiveArray_
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
    @param added {Array of Primitives} An array of all of the items added to this collection.
    @param removed {Array of Primitives} An array of all of the items removed from this collection.
    @readOnly
    **/

    // virtual impls 
    primitiveArrayMixin._getGoodAdds = function (adds) {
        return adds;
    };

    primitiveArrayMixin._beforeChange = function() {
        var entityAspect = this.getEntityAspect();
        if (entityAspect.entityState.isUnchanged()) {
            entityAspect.setModified();
        }
        if (entityAspect.entityState.isModified() && !this._origValues) {
            this._origValues = this.slice(0);
        }
    };

    primitiveArrayMixin._processAdds = function (adds) {
        // nothing needed
    };

    primitiveArrayMixin._processRemoves = function (removes) {
        // nothing needed;
    };
    //

    primitiveArrayMixin._rejectChanges = function() {
        if (!this._origValues) return;
        this.length = 0;
        Array.prototype.push.apply(this, this._origValues);
    };

    primitiveArrayMixin._acceptChanges = function() {
        this._origValues = null;
    };

    // local functions

    function makePrimitiveArray(arr, parent, parentProperty) {

        observableArray.initializeParent(arr, parent, parentProperty);
        arr.arrayChanged = new Event("arrayChanged", arr);
        __extend(arr, observableArray.mixin);
        return __extend(arr, primitiveArrayMixin);
    }

    return makePrimitiveArray;
})();