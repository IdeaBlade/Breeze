
define(function () {
    "use strict";

    // Not yet needed 

    // transform an object's values
    function objectMapValue(obj, kvProjection) {
        var value, newMap = {};
        for (var key in obj) {
            if (__hasOwnProperty.call(obj, key)) {
                value = kvProjection(key, obj[key]);
                if (value !== undefined) {
                    newMap[key] = value;
                }
            }
        }
        return newMap;
    }


    // shrink an object's surface
    function objectFilter(obj, kvPredicate) {
        var result = {};
        for (var key in obj) {
            if (__hasOwnProperty.call(obj, key)) {
                var value = obj[key];
                if (kvPredicate(key, value)) {
                    result[key] = value;
                }
            }
        }
        return result;
    };

    function stringTrimLeft(str) {
        return str.replace(/^\s+/, '');
    }

    function stringTrimRight(str) {
        return str.replace(/\s+$/, '');
    }


    // not sure if we have a good use case yet for these
    function applyMethod(method, args) {
        return function (obj) {
            return method.apply(obj, args);
        };
    }

    function applyFunction(fn) {
        return function(obj) {
            return fn(obj);
        };
    }

    /* Returns the class name of the argument or undefined if
    it's not a valid JavaScript object.
    */
    function getObjectClass(obj) {
        if (obj && obj.constructor && obj.constructor.toString) {
            var arr = obj.constructor.toString().match(
                /function\s*(\w+)/);

            if (arr && arr.length == 2) {
                return arr[1];
            }
        }
        return undefined;
    }

    
    function toISODateString(d) {
        function pad(n) {
            return n < 10 ? '0' + n : n;
        }

        return d.getUTCFullYear() + '-'
            + pad(d.getUTCMonth() + 1) + '-'
            + pad(d.getUTCDate()) + 'T'
            + pad(d.getUTCHours()) + ':'
            + pad(d.getUTCMinutes()) + ':'
            + pad(d.getUTCSeconds()) + 'Z';
    }

    function getOwnPropertyNames(object) {
        var result = [];
        for (var name in object) {
            if (object.hasOwnProperty(name)) {
                result.push(name);
            }
        }
        return result;
    }
    
    function isArray(o) {
        return classof(o) === "array";
    }

    function isObject(o) {
        return classof(o) === "object";
    }
    

    // object.watch polyfill
    function watch(obj, prop, interceptor) {

        var val = obj[prop],
        getter = function () {
            return val;
        },
        setter = function (newval) {
            val = interceptor.call(obj, prop, val, newval);
        };

        if (delete this[prop]) { // can't watch constants
            if (Object.defineProperty) { // ECMAScript 5
                Object.defineProperty(this, prop, {
                    get: getter,
                    set: setter,
                    enumerable: false,
                    configurable: true
                });
            } else if (Object.prototype.__defineGetter__ && Object.prototype.__defineSetter__) { // legacy
                Object.prototype.__defineGetter__.call(this, prop, getter);
                Object.prototype.__defineSetter__.call(this, prop, setter);
            }
        }
    }


    function unwatch(obj, prop) {
        var val = obj[prop];
        delete obj[prop];
        obj.prop = val;
    }

    // shims and shim like functions

    if (!String.prototype.trim) {
        String.prototype.trim = function () { return this.replace(/^\s\s*/, '').replace(/\s\s*$/, ''); };
    }

