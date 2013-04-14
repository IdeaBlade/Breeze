/**
 @module core
 **/

var Param = (function () {
    // The %1 parameter 
    // is required
    // must be a %2
    // must be an instance of %2
    // must be an instance of the %2 enumeration
    // must have a %2 property
    // must be an array where each element  
    // is optional or 

    var ctor = function(v, name) {
        this.v = v;
        this.name = name;
        this._contexts = [null];

    };
    var proto = ctor.prototype;

    proto.isObject = function() {
        return this.isTypeOf("object");
    };

    proto.isBoolean = function() {
        return this.isTypeOf('boolean');
    };

    proto.isString = function() {
        return this.isTypeOf('string');
    };

    proto.isNonEmptyString = function() {
        return addContext(this, {
            fn: isNonEmptyString,
            msg: "must be a nonEmpty string"
        });
    };

    function isNonEmptyString(context, v) {
        if (v == null) return false;
        return (typeof(v) === 'string') && v.length > 0;
    }

    proto.isNumber = function() {
        return this.isTypeOf('number');
    };

    proto.isFunction = function() {
        return this.isTypeOf('function');
    };


    proto.isTypeOf = function(typeName) {
        return addContext(this, {
            fn: isTypeOf,
            typeName: typeName,
            msg: __formatString("must be a '%1'", typeName)
        });
    };

    function isTypeOf(context, v) {
        if (v == null) return false;
        if (typeof(v) === context.typeName) return true;
        return false;
    }

    proto.isInstanceOf = function (type, typeName) {
        typeName = typeName || type.prototype._$typeName;
        return addContext(this, {
            fn: isInstanceOf,
            type: type,
            typeName: typeName,
            msg: __formatString("must be an instance of '%1'", typeName)
        });
    };

    function isInstanceOf(context, v) {
        if (v == null) return false;
        return (v instanceof context.type);
    }

    proto.hasProperty = function(propertyName) {
        return addContext(this, {
            fn: hasProperty,
            propertyName: propertyName,
            msg: __formatString("must have a '%1' property ", propertyName)
        });
    };

    function hasProperty(context, v) {
        if (v == null) return false;
        return (v[context.propertyName] !== undefined);
    }

    proto.isEnumOf = function(enumType) {
        return addContext(this, {
            fn: isEnumOf,
            enumType: enumType,
            msg: __formatString("must be an instance of the '%1' enumeration", enumType.name)
        });
    };

    function isEnumOf(context, v) {
        if (v == null) return false;
        return context.enumType.contains(v);
    }

    proto.isRequired = function(allowNull) {
        return addContext(this, {
            fn: isRequired,
            allowNull: allowNull,
            msg: "is required"
        });
    };

    function isRequired(context, v) {
        if (context.allowNull) {
            return v !== undefined;
        } else {
            return v != null;
        }
    }

    // combinable methods.

    proto.isOptional = function() {
        var context = {
            fn: isOptional,
            prevContext: null,
            msg: isOptionalMessage
        };
        return addContext(this, context);
    };

    function isOptional(context, v) {
        if (v == null) return true;
        var prevContext = context.prevContext;
        if (prevContext) {
            return prevContext.fn(prevContext, v);
        } else {
            return true;
        }
    }

    function isOptionalMessage(context, v) {
        var prevContext = context.prevContext;
        var element = prevContext ? " or it " + getMessage(prevContext, v) : "";
        return "is optional" + element;
    }

    proto.isNonEmptyArray = function() {
        return this.isArray(true);
    };

    proto.isArray = function(mustNotBeEmpty) {
        var context = {
            fn: isArray,
            mustNotBeEmpty: mustNotBeEmpty,
            prevContext: null,
            msg: isArrayMessage
        };
        return addContext(this, context);
    };


    function isArray(context, v) {
        if (!Array.isArray(v)) {
            return false;
        }
        if (context.mustNotBeEmpty) {
            if (v.length === 0) return false;
        }
        // allow standalone is array call.
        var prevContext = context.prevContext;
        if (!prevContext) return true;

        return v.every(function(v1) {
            return prevContext.fn(prevContext, v1);
        });
    }

    function isArrayMessage(context, v) {
        var arrayDescr = context.mustNotBeEmpty ? "a nonEmpty array" : "an array";
        var prevContext = context.prevContext;
        var element = prevContext ? " where each element " + getMessage(prevContext, v) : "";
        return " must be " + arrayDescr + element;
    }

    function getMessage(context, v) {
        var msg = context.msg;
        if (typeof(msg) === "function") {
            msg = msg(context, v);
        }
        return msg;
    }

    proto.or = function() {
        this._contexts.push(null);
        this._context = null;
        return this;
    };

    proto.check = function(defaultValue) {
        var ok = exec(this);
        if (ok === undefined) return;
        if (!ok) {
            throw new Error(this.getMessage());
        }

        if (this.v !== undefined) {
            return this.v;
        } else {
            return defaultValue;
        }
    };

    // called from outside this file.
    proto._addContext = function(context) {
        return addContext(this, context);
    };

    function addContext(that, context) {
        if (that._context) {
            var curContext = that._context;

            while (curContext.prevContext != null) {
                curContext = curContext.prevContext;
            }

            if (curContext.prevContext === null) {
                curContext.prevContext = context;
                // just update the prevContext but don't change the curContext.
                return that;
            } else if (context.prevContext === null) {
                context.prevContext = that._context;
            } else {
                throw new Error("Illegal construction - use 'or' to combine checks");
            }
        }
        return setContext(that, context);
    }

    function setContext(that, context) {
        that._contexts[that._contexts.length - 1] = context;
        that._context = context;
        return that;
    }


    function exec(self) {
        // clear off last one if null 
        var contexts = self._contexts;
        if (contexts[contexts.length - 1] == null) {
            contexts.pop();
        }
        if (contexts.length === 0) {
            return undefined;
        }
        return contexts.some(function(context) {
            return context.fn(context, self.v);
        });
    }


    proto.getMessage = function() {
        var that = this;
        var message = this._contexts.map(function(context) {
            return getMessage(context, that.v);
        }).join(", or it ");
        return __formatString(this.MESSAGE_PREFIX, this.name) + " " + message;
    };

    proto.withDefault = function(defaultValue) {
        this.defaultValue = defaultValue;
        return this;
    };

    proto.whereParam = function(propName) {
        return this.parent.whereParam(propName);
    };


    proto.applyAll = function(instance, checkOnly, throwIfUnknownProperty) {
        throwIfUnknownProperty = throwIfUnknownProperty == null ? true : throwIfUnknownProperty;
        var clone = __extend({}, this.parent.config);
        this.parent.params.forEach(function(p) {
            if (throwIfUnknownProperty) delete clone[p.name];
            p.check();
            (!checkOnly) && p._applyOne(instance);
        });
        // should be no properties left in the clone
        if (throwIfUnknownProperty) {
            for (var key in clone) {
                // allow props with an undefined value
                if (clone[key] !== undefined) {
                    throw new Error(__formatString("Unknown property '%1' found while configuring an instance of '%2'.", key, (instance && instance._$typeName) || "object"));
                }
            }
        }
    };

    proto._applyOne = function(instance) {
        if (this.v !== undefined) {
            instance[this.name] = this.v;
        } else {
            if (this.defaultValue !== undefined) {
                instance[this.name] = this.defaultValue;
            }
        }
    };

    proto.MESSAGE_PREFIX = "The '%1' parameter ";
    return ctor;
})();

var assertParam = function (v, name) {
    return new Param(v, name);
};

var ConfigParam = (function() {
    var ctor = function(config) {
        if (typeof(config) !== "object") {
            throw new Error("Configuration parameter should be an object, instead it is a: " + typeof(config));
        }
        this.config = config;
        this.params = [];
    };
    var proto = ctor.prototype;

    proto.whereParam = function(propName) {
        var param = new Param(this.config[propName], propName);
        param.parent = this;
        this.params.push(param);
        return param;
    };
    return ctor;
})();

var assertConfig = function(config) {
    return new ConfigParam(config);
};

// Param is exposed so that additional 'is' methods can be added to the prototype.
core.Param = Param;
core.assertParam = assertParam;
core.assertConfig = assertConfig;



