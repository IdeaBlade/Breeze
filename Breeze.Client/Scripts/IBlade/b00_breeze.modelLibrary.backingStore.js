"use strict";
(function (factory) {
    if (breeze) {
        factory(breeze);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"] && !breeze) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze"], factory);
    }
}(function(breeze) {
    
    var core = breeze.core;

    var ctor = function() {
        this.name = "backingStore";
    };
    
    ctor.prototype.initialize = function() {

    };

    ctor.prototype.getTrackablePropertyNames = function (entity) {
        var names = [];
        for (var p in entity) {
            if (p === "entityType") continue;
            if (p === "_$typeName") continue;
            if (p === "_pendingSets") continue;
            if (p === "_backingStore") continue;
            if (p === "_alreadyWrappedProps") continue;
            var val = entity[p];
            if (!core.isFunction(val)) {
                names.push(p);
            }
        }
        return names;
    };

    // This method is called during Metadata initialization 
    ctor.prototype.initializeEntityPrototype = function (proto) {

        proto.getProperty = function(propertyName) {
            return this[propertyName];
        };

        proto.setProperty = function (propertyName, value) {
            if (!this._backingStore.hasOwnProperty(propertyName)) {
                throw new Error("Unknown property name:" + propertyName);
            }
            this[propertyName] = value;
            // allow setProperty chaining.
            return this;
        };

        //// called after any create during a query;
        // this method cannot be called while a 'defineProperty' accessor is executing
        // because of IE bug 
        proto.initializeFrom = function (rawEntity) {
            // HACK:
            // copy unmapped properties from newly created client entity to the rawEntity.
            // This is so that we don't lose them when we update from the rawEntity to the target.
            // Something that will occur immediately after this method completes. 
            var that = this;
            this.entityType.unmappedProperties.forEach(function(prop) {
                var propName = prop.name;
                rawEntity[propName] = that[propName];
            });
            
            if (!this._backingStore) {
                this._backingStore = { };
            }
        };

        // internal implementation details - ugly because of IE9 issues with defineProperty.

        proto._pendingSets = [];
        proto._pendingSets.schedule = function(entity, propName, value) {
            this.push({ entity: entity, propName: propName, value: value });
            if (!this.isPending) {
                this.isPending = true;
                var that = this;
                setTimeout(function() { that.process(); });
            }
        };
        proto._pendingSets.process = function() {
            if (this.length === 0) return;
            this.forEach(function(ps) {
                if (!ps.entity._backingStore) {
                    ps.entity._backingStore = { };
                }
                ps.entity._backingStore[ps.propName] = ps.value;
            });
            this.length = 0;
            this.isPending = false;
        };

        movePropDefsToProto(proto);

    };

    // This method is called when an instance is first created via materialization or createEntity.

    // entity is either an entity or a complexObject
    ctor.prototype.startTracking = function (entity, proto) {
        // can't touch the normal property sets within this method - access the backingStore directly instead. 
        proto._pendingSets.process();
        var bs = movePropsToBackingStore(entity);

        // assign default values to the entity
        var stype = entity.entityType || entity.complexType;
        stype.getProperties().forEach(function(prop) {
            var propName = prop.name;
            var val = entity[propName];
            if (prop.isDataProperty) {
                if (prop.isComplexProperty) {
                    if (prop.isScalar) {
                        val = prop.dataType._createInstanceCore(entity, prop);
                    } else {
                        val = breeze.makeComplexArray([], entity, prop);
                    }
                } else if (!prop.isScalar) {
                    val = breeze.makePrimitiveArray([], entity, prop);
                } else if (val === undefined) {
                    val = prop.defaultValue;
                }
                
            } else if (prop.isNavigationProperty) {
                if (val !== undefined) {
                    throw new Error("Cannot assign a navigation property in an entity ctor.: " + prop.Name);
                }
                if (prop.isScalar) {
                    // TODO: change this to nullstob later.
                    val = null;
                } else {
                    val = breeze.makeRelationArray([], entity, prop);
                }
            } else {
                throw new Error("unknown property: " + propName);
            }
            // can't touch the normal property sets within this method (IE9 Bug) - so we access the backingStore directly instead. 
            // otherwise we could just do 
            // entity[propName] = val 
            // after all of the interception logic had been injected.
            bs[propName] = val;
        });
    };


    // private methods

    // This method is called during Metadata initialization to correct "wrap" properties.
    function movePropDefsToProto(proto) {
        var alreadyWrapped = proto._alreadyWrappedProps || {};
        var stype = proto.entityType || proto.complexType;
        stype.getProperties().forEach(function(prop) {
            var propName = prop.name;
            // we only want to wrap props that haven't already been wrapped
            if (alreadyWrapped[propName]) return;
                
            // If property is already defined on the prototype then wrap it in another propertyDescriptor.
            // otherwise create a propDescriptor for it. 
            if (propName in proto) {
               wrapPropDescription(proto, prop);
            } else {
               makePropDescription(proto, prop);
            }
            alreadyWrapped[propName] = true;
        });
        proto._alreadyWrappedProps = alreadyWrapped;
    }

    // This method is called when an instance is first created via materialization or createEntity.
    // this method cannot be called while a 'defineProperty' accessor is executing
    // because of IE bug mentioned above.

    function movePropsToBackingStore(instance) {
        var proto = Object.getPrototypeOf(instance);
        if (!instance._backingStore) {
            instance._backingStore = { };
        }
        var stype = proto.entityType || proto.complexType;
        stype.getProperties().forEach(function(prop) {
            var propName = prop.name;
            if (!instance.hasOwnProperty(propName)) return;
            // pulls off the value, removes the instance property and then rewrites it via ES5 accessor
            var value = instance[propName];
            delete instance[propName];
            instance[propName] = value;
        });
        return instance._backingStore;
    }

    function makePropDescription(proto, property) {
        var propName = property.name;
        var getAccessorFn = function(backingStore) {
            return function() {
                if (arguments.length == 0) {
                    return backingStore[propName];
                } else {
                    backingStore[propName] = arguments[0];
                }
            };
        };
        var descr = {
            get: function() {
                var bs = this._backingStore;
                if (!bs) {
                    this._pendingSets.process();
                    bs = this._backingStore;
                    if (!bs) return;
                }
                return bs[propName];
            },
            set: function(value) {
                var bs = this._backingStore;
                if (!bs) {
                    this._pendingSets.schedule(this, propName, value);
                    return;
                }
                var accessorFn = getAccessorFn(bs);
                if (this._$interceptor) {
                    this._$interceptor(property, value, accessorFn);

                } else {
                    accessorFn(value);
                }
            },
            enumerable: true,
            configurable: true
        };
        Object.defineProperty(proto, propName, descr);
    }

    function wrapPropDescription(proto, property) {
        if (!proto.hasOwnProperty(property.name)) {
            var nextProto = Object.getPrototypeOf(proto);
            wrapPropDescription(nextProto, property);
            return;
        } 

        var propDescr = Object.getOwnPropertyDescriptor(proto, property.name);
        // if not configurable; we can't touch it - so leave.
        if (!propDescr.configurable) return;
        // if a data descriptor - don't change it - this is basically a static property - i.e. defined on every instance of the type with the same value. 
        if (propDescr.value) return;
        // if a read only property descriptor - no need to change it.
        if (!propDescr.set) return;
            
        var accessorFn = function () {
                if (arguments.length == 0) {
                    return propDescr.get();
                } else {
                    propDescr.set(arguments[0]);
                }
            };
            
        var newDescr = {
            get: function () {
                return propDescr.get();
            },
            set: function (value) {
                if (this._$interceptor) {
                    this._$interceptor(property, value, accessorFn);

                } else {
                    accessorFn(value);
                }
            },
            enumerable: propDescr.enumerable,
            configurable: true
        };
        Object.defineProperty(proto, property.name, newDescr);
    };
        

    breeze.config.registerAdapter("modelLibrary", ctor);

}));
