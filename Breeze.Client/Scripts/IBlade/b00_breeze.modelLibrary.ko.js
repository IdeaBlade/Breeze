"use strict";
(function (factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"] && !breeze) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze"], factory);
    } else {
        // <script> tag: use the global `breeze` object
        factory(breeze);
    }
}(function(breeze) {
    
    var core = breeze.core;
    var ko;

    var ctor = function () {
        this.name = "ko";
    };

    ctor.prototype.initialize = function () {
        ko = core.requireLib("ko", "The Knockout library");
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

    ctor.prototype.getTrackablePropertyNames = function (entity) {
        var names = [];
        for (var p in entity) {
            if (p === "entityType") continue;
            if (p === "_$typeName") continue;
            var val = entity[p];
            if (ko.isObservable(val)) {
                names.push(p);
            } else if (!core.isFunction(val)) {
                names.push(p);
            }
        }
        return names;
    };

    ctor.prototype.initializeEntityPrototype = function (proto) {

        proto.getProperty = function(propertyName) {
            return this[propertyName]();
        };

        proto.setProperty = function(propertyName, value) {
            this[propertyName](value);
            // allow set property chaining.
            return this;
        };
    };

    ctor.prototype.startTracking = function (entity, proto) {
        // create ko's for each property and assign defaultValues
        // force unmapped properties to the end
        var stype = entity.entityType || entity.complexType;
        stype.getProperties().sort(function (p1, p2) {
            var v1 = p1.isUnmapped ? 1 :  0;
            var v2 = p2.isUnmapped ? 1 :  0;
            return v1 - v2;
        }).forEach(function(prop) {
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
                    if (prop.isComplexProperty) {
                        // TODO: right now we create Empty complexObjects here - these should actually come from the entity
                        if (prop.isScalar) {
                            val = prop.dataType._createInstanceCore(entity, prop.name);
                        } else {
                            val = breeze.makeComplexArray([], entity, prop);
                        }
                    } else if (val === undefined) {
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
                        val = breeze.makeRelationArray([], entity, prop);
                        koObj = ko.observableArray(val);

                        val._koObj = koObj;
                        // new code to suppress extra breeze notification when 
                        // ko's array methods are called.
                        koObj.subscribe(onBeforeChange, null, "beforeChange");
                        // code to insure that any direct breeze changes notify ko
                        val.arrayChanged.subscribe(onArrayChanged);
   
                        //// old code to suppress extra breeze notification when 
                        //// ko's array methods are called.
                        //koObj.subscribe(function(b) {
                        //    koObj._suppressBreeze = true;
                        //}, null, "beforeChange");
                        //// code to insure that any direct breeze changes notify ko
                        //val.arrayChanged.subscribe(function(args) {
                        //    if (koObj._suppressBreeze) {
                        //        koObj._suppressBreeze = false;
                        //    } else {
                        //        koObj.valueHasMutated();
                        //    }
                        //});
                        
                        koObj.equalityComparer = function() {
                            throw new Error("Collection navigation properties may NOT be set.");
                        };
                        

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
    
    function onBeforeChange(args) {
        args._koObj._suppressBreeze = true;
    }
    
    function onArrayChanged(args) {
        var koObj = args.relationArray._koObj;
        if (koObj._suppressBreeze) {
            koObj._suppressBreeze = false;
        } else {
            koObj.valueHasMutated();
        }
    }

    breeze.config.registerAdapter("modelLibrary", ctor);
    
}));
