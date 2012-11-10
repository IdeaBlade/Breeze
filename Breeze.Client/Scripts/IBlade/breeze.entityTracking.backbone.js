"use strict";
(function(factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"), exports);
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze", "exports"], factory);
    } else {
        // <script> tag: use the global `breeze` object
        factory(breeze);
    }
}(function(breeze, exports) {
    var entityModel = breeze.entityModel;
    var core = breeze.core;

    var Backbone;
    var _;
    var trackingImpl = { };
    var bbSet, bbGet;

    trackingImpl.name = "backbone";

    trackingImpl.initialize = function() {
        Backbone = window.Backbone;
        if ((!Backbone) && require) {
            Backbone = require("Backbone");
        }
        if (!Backbone) {
            throw new Error("Unable to initialize Backbone.");
        }
        _ = window._;
        if ((!_) && require) {
            _ = require("underscore");
        }
        bbSet = Backbone.Model.prototype.set;
        bbGet = Backbone.Model.prototype.get;
    };

    trackingImpl.createCtor = function(entityType) {
        var defaults = { };
        entityType.dataProperties.forEach(function(dp) {
            defaults[dp.name] = dp.defaultValue;
        });
        var ctor = Backbone.Model.extend({
            defaults: defaults,
            initialize: function() {
                var that = this;
                entityType.navigationProperties.forEach(function(np) {
                    if (!np.isScalar) {
                        var val = entityModel.makeRelationArray([], that, np);
                        Backbone.Model.prototype.set.call(that, np.name, val);
                    }
                });
            }
        });
        return ctor;

    };

    trackingImpl.getTrackablePropertyNames = function(entity) {
        var names = [];
        for (var p in entity.attributes) {
            names.push(p);
        }
        return names;
    };

    trackingImpl.initializeEntityPrototype = function(proto) {

        proto.getProperty = function(propertyName) {
            return this.get(propertyName);
        };

        proto.setProperty = function(propertyName, value) {
            this.set(propertyName, value);
            // allow setProperty chaining.
            return this;
        };

        // override Backbone's set method.
        proto.set = function(key, value, options) {
            // call Backbone validate first - we need this because if it fails we don't want to call the Breeze interceptor.
            // if valid then call Breeze interceptor which will call Backbone's internal set
            if (!this.entityAspect) {
                return bbSet.call(this, key, value, options);
            }
            var attrs, prop, propName;
            var that = this;
            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (_.isObject(key) || key == null) {
                attrs = key;
                options = value;
                if (!this._validate(attrs, options)) return false;
                // TODO: suppress validate here
                for (propName in attrs) {
                    if (hasOwnProperty.call(attrs, propName)) {
                        prop = this.entityType.getProperty(propName);
                        this._$interceptor(prop, attrs[propName], function(pvalue) {
                            if (arguments.length === 0) {
                                return bbGet.call(that, propName);
                            } else {
                                return bbSet.call(that, propName, pvalue, options);
                            }
                        });
                    }
                }
            } else {
                attrs = { };
                attrs[key] = value;
                options || (options = { });
                if (!this._validate(attrs, options)) return false;
                // TODO: suppress validate here
                prop = this.entityType.getProperty(key);
                propName = key;
                this._$interceptor(prop, value, function(pvalue) {
                    if (arguments.length === 0) {
                        return bbGet.call(that, propName);
                    } else {
                        return bbSet.call(that, propName, pvalue, options);
                    }
                });
            }
            return this;

        };

        //// called after any create during a query;
        //proto.initializeFrom = function (rawEntity) {
        //};

    };

    // called when the entityAspect is first created for an entity
    trackingImpl.startTracking = function(entity, proto) {
        if (!(entity instanceof Backbone.Model)) {
            throw Error("This entity is not an Backbone.Model instance");
        }
        var entityType = entity.entityType;
        var attributes = entity.attributes;
        // Update so that every data and navigation property has a value. 
        entityType.dataProperties.forEach(function(dp) {
            if (dp.name in attributes) {
                if (bbGet.call(entity, dp.name) === undefined && dp.defaultValue !== undefined) {
                    bbSet.call(entity, dp.name, dp.defaultValue);
                }
            } else {
                bbSet.call(entity, dp.name, dp.defaultValue);
            }
        });
        entityType.navigationProperties.forEach(function(np) {
            var msg;
            if (np.name in attributes) {
                var val = bbGet.call(entity, np.name);
                if (np.isScalar) {
                    if (val && !val.entityType) {
                        msg = core.formatString("The value of the '%1' property for entityType: '%2' must be either null or another entity",
                            np.name, entity.entityType.name);
                        throw new Error(msg);
                    }
                } else {
                    if (val) {
                        if (!val.parentEntity) {
                            msg = core.formatString("The value of the '%1' property for entityType: '%2' must be either null or a Breeze relation array",
                                np.name, entity.entityType.name);
                            throw new Error(msg);
                        }
                    } else {
                        val = entityModel.makeRelationArray([], entity, np);
                        bbSet.call(entity, np.name, val);
                    }
                }
            } else {
                if (np.isScalar) {
                    bbSet.call(entity, np.name, null);
                } else {
                    val = entityModel.makeRelationArray([], entity, np);
                    bbSet.call(entity, np.name, val);
                }
            }
        });
    };

    core.config.registerInterface("entityTracking", trackingImpl);

    // private methods

}));
