
define(function () {
    "use strict";

    var hasOwnProperty = Object.prototype.hasOwnProperty;

    // iterate over object
    function objectForEach(obj, kvFn) {
        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                kvFn(key, obj[key]);
            }
        }
    }
    
    
    function objectFirst(obj, kvPredicate) {
        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                var value = obj[key];
                if (kvPredicate(key, value)) {
                    return { key: key, value: value };
                }
            }
        }
        return null;
    };

    function objectMapToArray(obj, kvFn) {
        var results = [];
        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                var result = kvFn(key, obj[key]);
                if (result) {
                    results.push(result);
                }
            }
        }
        return results;
    }
    
    // Not yet needed 

    //// transform an object's values
    //function objectMapValue(obj, kvProjection) {
    //    var value, newMap = {};
    //    for (var key in obj) {
    //        if (hasOwnProperty.call(obj, key)) {
    //            value = kvProjection(key, obj[key]);
    //            if (value !== undefined) {
    //                newMap[key] = value;
    //            }
    //        }
    //    }
    //    return newMap;
    //}


    //// shrink an object's surface
    //function objectFilter(obj, kvPredicate) {
    //    var result = {};
    //    for (var key in obj) {
    //        if (hasOwnProperty.call(obj, key)) {
    //            var value = obj[key];
    //            if (kvPredicate(key, value)) {
    //                result[key] = value;
    //            }
    //        }
    //    }
    //    return result;
    //};
    
   

    // Functional extensions 

    // can be used like: persons.filter(propEq("firstName", "John"))
    function propEq(propertyName, value) {
        return function (obj) {
            return obj[propertyName] === value;
        };
    }

    // can be used like persons.map(pluck("firstName"))
    function pluck(propertyName) {
        return function (obj) { return obj[propertyName]; };
    }

    // end functional extensions


    function getOwnPropertyValues(source) {
        var result = [];
        for (var name in source) {
            if (hasOwnProperty.call(source, name)) {
                result.push(source[name]);
            }
        }
        return result;
    }

    function extend(target, source) {
        if (!source) return target;
        for (var name in source) {
            if (hasOwnProperty.call(source, name)) {
                target[name] = source[name];
            }
        }
        return target;
    }


    // array functions

    function arrayFirst(array, predicate) {
        for (var i = 0, j = array.length; i < j; i++) {
            if (predicate(array[i])) {
                return array[i];
            }
        }
        return null;
    }

    function arrayIndexOf(array, predicate) {
        for (var i = 0, j = array.length; i < j; i++) {
            if (predicate(array[i])) return i;
        }
        return -1;
    }

    function arrayRemoveItem(array, predicateOrItem) {
        var predicate = isFunction(predicateOrItem) ? predicateOrItem : undefined;
        var l = array.length;
        for (var index = 0; index < l; index++) {
            if (predicate ? predicate(array[index]) : (array[index] === predicateOrItem)) {
                array.splice(index, 1);
                return index;
            }
        }
        return -1;
    }

    function arrayZip(a1, a2, callback) {

        var result = [];
        var n = Math.min(a1.length, a2.length);
        for (var i = 0; i < n; ++i) {
            result.push(callback(a1[i], a2[i]));
        }

        return result;
    }

    function arrayDistinct(array) {
        array = array || [];
        var result = [];
        for (var i = 0, j = array.length; i < j; i++) {
            if (result.indexOf(array[i]) < 0)
                result.push(array[i]);
        }
        return result;
    }

    // Not yet needed
    //// much faster but only works on array items with a toString method that
    //// returns distinct string for distinct objects.  So this is safe for arrays with primitive
    //// types but not for arrays with object types, unless toString() has been implemented.
    //function arrayDistinctUnsafe(array) {
    //    var o = {}, i, l = array.length, r = [];
    //    for (i = 0; i < l; i += 1) {
    //        var v = array[i];
    //        o[v] = v;
    //    }
    //    for (i in o) r.push(o[i]);
    //    return r;
    //}

    function arrayEquals(a1, a2, equalsFn) {
        //Check if the arrays are undefined/null
        if (!a1 || !a2) return false;

        if (a1.length != a2.length) return false;

        //go thru all the vars
        for (var i = 0; i < a1.length; i++) {
            //if the var is an array, we need to make a recursive check
            //otherwise we'll just compare the values
            if (Array.isArray( a1[i])) {
                if (!arrayEquals(a1[i], a2[i])) return false;
            } else {
                if (equalsFn) {
                    if (!equalsFn(a1[i], a2[i])) return false;
                } else {
                    if (a1[i] != a2[i]) return false;
                }
            }
        }
        return true;
    }

    // end of array functions
    
    function requireLib(libNames, errMessage) {
        var arrNames = libNames.split(";");
        for (var i = 0, j = arrNames.length; i < j; i++) {
            var lib = requireLibCore(arrNames[i]);
            if (lib) return lib;
        }
        throw new Error("Unable to initialize " + libNames + ".  " + errMessage || "");
    }
    
    function requireLibCore(libName) {
        var lib = window[libName];
        if (lib) return lib;
        if (require) {
            lib = require(libName);
        }
        if (lib) return lib;
        return null;
    }

    function using(obj, property, tempValue, fn) {
        var originalValue = obj[property];
        if (tempValue === originalValue) {
            return fn();
        }
        obj[property] = tempValue;
        try {
            return fn();
        } finally {
            obj[property] = originalValue;
        }
    }
    
    function wrapExecution(startFn, endFn, fn) {
        var state;
        try {
            state = startFn();
            return fn();
        } finally {
            endFn(state);
        }
    }

    function memoize(fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments),
                hash = "",
                i = args.length,
                currentArg = null;
            while (i--) {
                currentArg = args[i];
                hash += (currentArg === Object(currentArg)) ?
            JSON.stringify(currentArg) : currentArg;
                fn.memoize || (fn.memoize = {});
            }
            return (hash in fn.memoize) ?
                fn.memoize[hash] :
                fn.memoize[hash] = fn.apply(this, args);
        };
    }

    function getUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // assumes no timezone in isoDateString
    function dateFromIsoString(isoDateString) {
        return fastDateParse.apply(null, isoDateString.split(/\D/));
    }
    
    // used internally above
    function fastDateParse(y, m, d, h, i, s, ms){
        return new Date(y, m - 1, d, h || 0, i || 0, s || 0, ms || 0);
    }


    // is functions 

    function classof(o) {
        if (o === null) {
            return "null";
        }
        if (o === undefined) {
            return "undefined";
        }
        return Object.prototype.toString.call(o).slice(8, -1).toLowerCase();
    }

    function isDate(o) {
        return classof(o) === "date";
    }

    function isFunction(o) {
        return classof(o) === "function";
    }

    function isGuid(value) {
        return (typeof value === "string") && /[a-fA-F\d]{8}-(?:[a-fA-F\d]{4}-){3}[a-fA-F\d]{12}/.test(value);
    }

    function isEmpty(obj) {
        if (obj === null || obj === undefined) {
            return true;
        }
        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                return false;
            }
        }
        return true;
    }

    function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    // end of is Functions



    // string functions

    function stringStartsWith(str, prefix) {
        // returns false for empty strings too
        if ((!str) || !prefix) return false;
        return str.indexOf(prefix, 0) === 0;
    }

    function stringEndsWith(str, suffix) {
        // returns false for empty strings too
        if ((!str) || !suffix) return false;
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    // Based on fragment from Dean Edwards' Base 2 library
    // format("a %1 and a %2", "cat", "dog") -> "a cat and a dog"
    function formatString(string) {
        var args = arguments;
        var pattern = RegExp("%([1-" + (arguments.length - 1) + "])", "g");
        return string.replace(pattern, function (match, index) {
            return args[index];
        });
    };

    // end of string functions

    // shims

    if (!Object.create) {
        Object.create = function (parent) {
            var F = function () { };
            F.prototype = parent;
            return new F();
        };
    }

    return {
        getOwnPropertyValues: getOwnPropertyValues,
        objectForEach: objectForEach,
        objectMapToArray: objectMapToArray,
        objectFirst: objectFirst,
        //objectMapValue: objectMapValue,
        //objectFilter: objectFilter,

        extend: extend,
        propEq: propEq,
        pluck: pluck,

        arrayDistinct: arrayDistinct,
        // arrayDistinctUnsafe: arrayDistinctUnsafe,
        arrayEquals: arrayEquals,
        arrayFirst: arrayFirst,
        arrayIndexOf: arrayIndexOf,
        arrayRemoveItem: arrayRemoveItem,
        arrayZip: arrayZip,

        requireLib: requireLib,
        using: using,
        wrapExecution: wrapExecution,
        memoize: memoize,
        getUuid: getUuid,
        dateFromIsoString: dateFromIsoString,

        isDate: isDate,
        isGuid: isGuid,
        isFunction: isFunction,
        isEmpty: isEmpty,
        isNumeric: isNumeric,

        stringStartsWith: stringStartsWith,
        stringEndsWith: stringEndsWith,
        formatString: formatString
    };

});

