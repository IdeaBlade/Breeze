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
    var ComplexAspect = breeze.ComplexAspect;

    var Backbone;
    var _;
    
    var bbSet, bbGet;
    
    var hasOwnProperty = Object.prototype.hasOwnProperty;

    var ctor = function () {
        this.name = "backbone";
    };
   
    ctor.prototype.initialize = function() {
        Backbone = core.requireLib("Backbone");
        _ = core.requireLib("_;underscore");
        bbSet = Backbone.Model.prototype.set;
        bbGet = Backbone.Model.prototype.get;
    };

    // may be an entityType or a complexType
    ctor.prototype.createCtor = function(structuralType) {
        var defaults = { };
        structuralType.dataProperties.forEach(function (dp) {
            defaults[dp.name] = dp.defaultValue;
        });
        var modelCtor = Backbone.Model.extend({
            defaults: defaults,
            initialize: function () {
                if (structuralType.navigationProperties) {
                    var that = this;
                    structuralType.navigationProperties.forEach(function (np) {
                        if (!np.isScalar) {
                            var val = breeze.makeRelationArray([], that, np);
                            Backbone.Model.prototype.set.call(that, np.name, val);
                        }
                    });
                }
            }
        });
        return modelCtor;

    };

    ctor.prototype.getTrackablePropertyNames = function(entity) {
        var names = [];
        for (var p in entity.attributes) {
            names.push(p);
        }
        return names;
    };

    ctor.prototype.initializeEntityPrototype = function(proto) {

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
            var aspect = this.entityAspect || this.complexAspect;
            if (!aspect) {
                return bbSet.call(this, key, value, options);
            }
            var attrs, prop, propName;
            var that = this;
            var stype = this.entityType || this.complexType;
            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (_.isObject(key) || key == null) {
                attrs = key;
                options = value;
                if (!this._validate(attrs, options)) return false;
                // TODO: suppress validate here
                for (propName in attrs) {
                    if (hasOwnProperty.call(attrs, propName)) {
                        prop = stype.getProperty(propName);
                        if (prop == null) {
                            throw new Error("Unknown property: " + key);
                        }
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
                prop = stype.getProperty(key);
                if (prop == null) {
                    throw new Error("Unknown property: " + key);
                }
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

    };

    // called when the entityAspect is first created for an entity
    ctor.prototype.startTracking = function(entity, proto) {
        if (!(entity instanceof Backbone.Model)) {
            throw new Error("This entity is not an Backbone.Model instance");
        }
        var stype = entity.entityType || entity.complexType;
        var attributes = entity.attributes;
        // Update so that every data and navigation property has a value. 
        stype.dataProperties.forEach(function (dp) {
            if (dp.isComplexProperty) {
                // TODO: right now we create Empty complexObjects here - these should actually come from the entity
                if (dp.isScalar) {
                    var co = dp.dataType._createInstanceCore(entity, dp.name);
                } else {
                    var co = breeze.makeComplexArray([], entity, dp);
                }
                bbSet.call(entity, dp.name, co);
            } else if (dp.name in attributes) {
                if (bbGet.call(entity, dp.name) === undefined && dp.defaultValue !== undefined) {
                    bbSet.call(entity, dp.name, dp.defaultValue);
                }
            } else {
                bbSet.call(entity, dp.name, dp.defaultValue);
            }
        });
        
        if (stype.navigationProperties) {
            stype.navigationProperties.forEach(function(np) {
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
                            val = breeze.makeRelationArray([], entity, np);
                            bbSet.call(entity, np.name, val);
                        }
                    }
                } else {
                    if (np.isScalar) {
                        bbSet.call(entity, np.name, null);
                    } else {
                        val = breeze.makeRelationArray([], entity, np);
                        bbSet.call(entity, np.name, val);
                    }
                }
            });
        }
    };

    breeze.config.registerAdapter("modelLibrary", ctor);

    // private methods

}));
