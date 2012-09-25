
define(["core", "relationArray"],
function (core, makeRelationArray) {
    "use strict";

    var trackingImpl = {};
    
    trackingImpl.initialize = function() {
        // nothing to do yet;
    };

    trackingImpl.name = "Backing store entity tracking impl";

    trackingImpl.initializeEntityPrototype = function (proto) {

        proto.getProperty = function (propertyName) {
            return this[propertyName];
        };

        proto.setProperty = function (propertyName, value) {
            this[propertyName] = value;
            // allow setProperty chaining.
            return this;
        };

        // this method cannot be called while a 'defineProperty' accessor is executing
        // because of IE bug 
        proto.initializeFrom = function (rawEntity) {
            // copy unmapped properties from newly created client entity to the rawEntity.
            var that = this;
            this.entityType.unmappedProperties.forEach(function (prop) {
                var propName = prop.name;
                rawEntity[propName] = that[propName];
            });
            // this._backingStore = rawEntity;
            if (!this._backingStore) {
                this._backingStore = {};
            }
        };

        // internal implementation details - ugly because of IE9 issues with defineProperty.

        proto._pendingSets = [];
        proto._pendingSets.schedule = function (entity, propName, value) {
            this.push({ entity: entity, propName: propName, value: value });
            if (!this.isPending) {
                this.isPending = true;
                var that = this;
                setTimeout(function () { that.process(); });
            }
        };
        proto._pendingSets.process = function () {
            if (this.length === 0) return;
            this.forEach(function (ps) {
                if (!ps.entity._backingStore) {
                    ps.entity._backingStore = {};
                }
                ps.entity._backingStore[ps.propName] = ps.value;
            });
            this.length = 0;
            this.isPending = false;
        };

        movePropDefsToProto(proto);

    };

    trackingImpl.startTracking = function (entity, proto) {
        // can't touch the normal property sets within this method - access the backingStore directly instead. 
        proto._pendingSets.process();
        var bs = movePropsToBackingStore(entity);

        // assign default values to the entity
        entity.entityType.getProperties().forEach(function (prop) {
            var propName = prop.name;
            var val = entity[propName];

            if (prop.isDataProperty) {
                if (val === undefined) {
                    bs[propName] = prop.defaultValue;
                }
            } else if (prop.isNavigationProperty) {
                if (val !== undefined) {
                    throw new Error("Cannot assign a navigation property in an entity ctor.: " + prop.Name);
                }
                if (prop.isScalar) {
                    // TODO: change this to nullEntity later.
                    bs[propName] = null;
                } else {
                    bs[propName] = makeRelationArray([], entity, prop);
                }
            } else {
                throw new Error("unknown property: " + propName);
            }
        });
    };

    trackingImpl.isTrackableProperty = function (entity, propertyName) {
        if (propertyName === '_backingStore') return false;
        if (propertyName === "_pendingSets") return false;
        return true;
    };

    // private methods

    function movePropDefsToProto(proto) {
        proto.entityType.getProperties().forEach(function (prop) {
            var propName = prop.name;
            if (!proto[propName]) {
                Object.defineProperty(proto, propName, makePropDescription(prop));
            }
        });

    }

    // this method cannot be called while a 'defineProperty' accessor is executing
    // because of IE bug mentioned above.

    function movePropsToBackingStore(instance) {
        var proto = Object.getPrototypeOf(instance);
        if (!instance._backingStore) {
            instance._backingStore = {};
        }
        proto.entityType.getProperties().forEach(function (prop) {
            var propName = prop.name;
            if (!instance.hasOwnProperty(propName)) return;
            var value = instance[propName];
            delete instance[propName];
            instance[propName] = value;
        });
        return instance._backingStore;
    }

    function makePropDescription(property) {
        var propName = property.name;
        var getAccessorFn = function (backingStore) {
            return function () {
                if (arguments.length == 0) {
                    return backingStore[propName];
                } else {
                    backingStore[propName] = arguments[0];
                }
            };
        };
        return {
            get: function () {
                var bs = this._backingStore;
                if (!bs) {
                    this._pendingSets.process();
                    bs = this._backingStore;
                    if (!bs) return;
                }
                return bs[propName];
            },
            set: function (value) {
                var bs = this._backingStore;
                if (!bs) {
                    this._pendingSets.schedule(this, propName, value);
                    return;
                }
                var accessorFn = getAccessorFn(bs);
                if (this.interceptor) {
                    this.interceptor(property, value, accessorFn);

                } else {
                    accessorFn(value);
                }
            },
            enumerable: true,
            configurable: true
        };
    }

    return trackingImpl;

})
