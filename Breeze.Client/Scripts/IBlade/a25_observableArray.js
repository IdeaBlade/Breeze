
var observableArray = (function() {

    var mixin = {};
    mixin.push = function() {
        if (this._inProgress) {
            return -1;
        }

        var goodAdds = this._getGoodAdds(__arraySlice(arguments));
        if (!goodAdds.length) {
            return this.length;
        }
        this._beforeChange();
        var result = Array.prototype.push.apply(this, goodAdds);
        processAdds(this, goodAdds);
        return result;
    };

    mixin._push = function () {
        if (this._inProgress) {
            return -1;
        }
        var goodAdds = __arraySlice(arguments);
        this._beforeChange();
        var result = Array.prototype.push.apply(this, goodAdds);
        processAdds(this, goodAdds);
        return result;
    };

    mixin.unshift = function () {
        var goodAdds = this._getGoodAdds( __arraySlice(arguments));
        if (!goodAdds.length) {
            return this.length;
        }
        this._beforeChange();
        var result = Array.prototype.unshift.apply(this, goodAdds);
        processAdds(this, __arraySlice(goodAdds));
        return result;
    };

    mixin.pop = function () {
        this._beforeChange();
        var result = Array.prototype.pop.apply(this);
        processRemoves(this, [result]);
        return result;
    };

    mixin.shift = function () {
        this._beforeChange();
        var result = Array.prototype.shift.apply(this);
        processRemoves(this, [result]);
        return result;
    };

    mixin.splice = function () {
        var goodAdds = this._getGoodAdds( __arraySlice(arguments, 2));
        var newArgs = __arraySlice(arguments, 0, 2).concat(goodAdds);
        this._beforeChange();
        var result = Array.prototype.splice.apply(this, newArgs);
        processRemoves(this, result);

        if (goodAdds.length) {
            processAdds(this, goodAdds);
        }
        return result;
    };

    mixin._getEventParent = function () {
        return this.entityAspect;
    };

    mixin._getPendingPubs = function () {
        var em = this.entityAspect.entityManager;
        return em && em._pendingPubs;
    };

    mixin._beforeChange = function() {
        // default is to do nothing
    };

    function updateEntityState(obsArray) {
        var entityAspect = obsArray.entityAspect;
        if (entityAspect.entityState.isUnchanged()) {
            entityAspect.setModified();
        }
        if (entityAspect.entityState.isModified() && !obsArray._origValues) {
            obsArray._origValues = obsArray.slice(0);
        }
    }

    function processAdds(obsArray, adds) {
        obsArray._processAdds(adds);
        // this is referencing the name of the method on the complexArray not the name of the event
        //var args = { added: adds };
        //args[obsArray._typeName] = obsArray;
        publish(obsArray, "arrayChanged", { array: obsArray, added: adds });
    }

    function processRemoves(obsArray, removes) {
        obsArray._processRemoves(removes);
        // this is referencing the name of the method on the array not the name of the event
        publish(obsArray, "arrayChanged", { array: obsArray, removed: removes });
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
            if (key !== "array" && target.hasOwnProperty(key)) {
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

    function initializeParent(obsArray, parent, parentProperty) {
        obsArray.parent = parent;
        obsArray.parentProperty = parentProperty;
        obsArray.entityAspect = parent.entityAspect;
    }


    return {
        mixin: mixin,
        publish: publish,
        updateEntityState: updateEntityState,
        initializeParent: initializeParent
    };



})();