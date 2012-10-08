
define(["core", "relationArray"],
function (core, makeRelationArray) {
    "use strict";

    var ko;
    var trackingImpl = { };
    
    trackingImpl.name = "knockout entity tracking implementation";
    
    trackingImpl.initialize = function() {
        ko = window.ko;
        if ((!ko) && require) {
            ko = require("ko");
        }
        if (!ko) {
            throw new Error("Unable to initialize Knockout.");
        }
        
        ko.extenders.intercept = function(target, interceptorOptions) {
            var instance = interceptorOptions.instance;
            var property = interceptorOptions.property;
            
            // create a computed observable to intercept writes to our observable
            var result;
            if (target.splice) {
                result = ko.computed({
                    read: target  //always return the original observables value
                });
            } else {
                result = ko.computed({
                    read: target,  //always return the original observables value
                    write: function(newValue) {
                        instance._$interceptor(property, newValue, target);
                        return instance;
                    }
                });
            }
            //return the new computed observable
            return result;
        };

    };
    
    trackingImpl.getTrackablePropertyNames = function (entity) {
        var names = [];
        for (var p in entity) {
            var val = entity[p];
            if (ko.isObservable(val)) {
                names.push(p);
            } else if (!core.isFunction(val)) {
                names.push(p);
            }
        }
        return names;
    };

    trackingImpl.initializeEntityPrototype = function(proto) {

        proto.getProperty = function (propertyName) {
            return this[propertyName]();          
        };

        proto.setProperty = function(propertyName, value) {
            this[propertyName](value);
            // allow set property chaining.
            return this;
        };
    };

    trackingImpl.startTracking = function(entity, proto) {
        // create ko's for each property and assign defaultValues
        entity.entityType.getProperties().forEach(function(prop) {
            var propName = prop.name;
            var val = entity[propName];
            var koObj;
            // check if property is already exposed as a ko object
            if (ko.isObservable(val)) {
                // if so
                if (prop.isNavigationProperty) {
                    throw new Error("Cannot assign a navigation property in an entity ctor.: " + prop.Name);
                }
                koObj = val;
            } else {
                // if not
                if (prop.isDataProperty) {
                    if (val === undefined) {
                        val = prop.defaultValue;
                    }
                    koObj = ko.observable(val);
                } else if (prop.isNavigationProperty) {
                    if (val !== undefined) {
                        throw new Error("Cannot assign a navigation property in an entity ctor.: " + prop.Name);
                    }
                    if (prop.isScalar) {
                        // TODO: change this to nullEntity later.
                        koObj = ko.observable(null);
                    } else {
                        val = makeRelationArray([], entity, prop);
                        koObj = ko.observableArray(val);
                        // new code to suppress extra breeze notification when 
                        // ko's array methods are called.
                        koObj.subscribe(function (b) {
                            koObj._suppressBreeze = true;
                        }, null, "beforeChange");
                        // code to insure that any been changes notify ko
                        val.arrayChanged.subscribe(function (args) {
                            if (koObj._suppressBreeze) {
                                koObj._suppressBreeze = false;
                            } else {
                                koObj.valueHasMutated();
                            }
                        });
                        koObj.equalityComparer = function() {
                            throw new Error("Collection navigation properties may NOT be set.");
                        };
                        // Alternative formulation - perf is not as good.
                        //koObj.subscribe(function(item) {
                        //    if (this.target() !== val) {
                        //        this.target(val); // reset it
                        //        throw new Error("Collection navigation properties may NOT be set");
                        //    }
                        //});
                        
                    }
                } else {
                    throw new Error("unknown property: " + propName);
                }
            }
            if (prop.isNavigationProperty && !prop.isScalar) {
                entity[propName] = koObj;
            } else {
                var koExt = koObj.extend({ intercept: { instance: entity, property: prop } });
                entity[propName] = koExt;
            }

        });

    };

    return trackingImpl;

})
