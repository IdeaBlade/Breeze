/**
 @module core
 **/

var __hasOwnProperty = uncurry(Object.prototype.hasOwnProperty);
var __arraySlice = uncurry(Array.prototype.slice);

// iterate over object
function __objectForEach(obj, kvFn) {
    for (var key in obj) {
        if (__hasOwnProperty(obj, key)) {
            kvFn(key, obj[key]);
        }
    }
}
    
function __objectFirst(obj, kvPredicate) {
    for (var key in obj) {
        if (__hasOwnProperty(obj, key)) {
            var value = obj[key];
            if (kvPredicate(key, value)) {
                return { key: key, value: value };
            }
        }
    }
    return null;
}

function __objectMapToArray(obj, kvFn) {
    var results = [];
    for (var key in obj) {
        if (__hasOwnProperty(obj, key)) {
            var result = kvFn ? kvFn(key, obj[key]) : obj[key];
            if (result !== undefined) {
                results.push(result);
            }
        }
    }
    return results;
}

// Functional extensions 

// can be used like: persons.filter(propEq("firstName", "John"))
function __propEq(propertyName, value) {
    return function (obj) {
        return obj[propertyName] === value;
    };
}

// can be used like persons.map(pluck("firstName"))
function __pluck(propertyName) {
    return function (obj) { return obj[propertyName]; };
}

// end functional extensions


function __getOwnPropertyValues(source) {
    var result = [];
    for (var name in source) {
        if (__hasOwnProperty(source, name)) {
            result.push(source[name]);
        }
    }
    return result;
}

function __extend(target, source) {
    if (!source) return target;
    for (var name in source) {
        if (__hasOwnProperty(source, name)) {
            target[name] = source[name];
        }
    }
    return target;
}

function __updateWithDefaults(target, defaults) {
    for (var name in defaults) {
        if (target[name] === undefined) {
            target[name] = defaults[name];
        }
    }
    return target;
}


function __setAsDefault(target, ctor) {
    // we want to insure that the object returned by ctor.defaultInstance is always immutable
    // Use 'target' as the primary template for the ctor.defaultInstance; 
    // Use current 'ctor.defaultInstance' as the template for any missing properties
    // creates a new instance for ctor.defaultInstance
    // returns target unchanged 
    ctor.defaultInstance = __updateWithDefaults(new ctor(target), ctor.defaultInstance);
    return target;
}


// template keys are the keys to return
// template values are the 'default' value of these keys - value is not serialized if it == the default value
function __toJson(source, template) {
    var target = {};

    for (var propName in template) {
        if (!(propName in source)) continue;
        var value = source[propName];
        var defaultValue = template[propName];
        // == is deliberate here - idea is that null or undefined values will never get serialized if default value is set to null.
        if (value == defaultValue) continue;
        if (Array.isArray(value) && value.length === 0) continue;
        if (typeof(defaultValue) === "function") {
            value = defaultValue(value);
        } else if (typeof (value) === "object") {
            if (value && value.parentEnum) {
                value = value.name;
            }
        }
        if (value === undefined) continue;
        target[propName] = value;
    }
    return target;
}

// resolves the values of a list of properties by checking each property in multiple sources until a value is found.
function __resolveProperties(sources, propertyNames) {
    var r = {};
    var length = sources.length;
    propertyNames.forEach(function (pn) {
        for (var i = 0; i < length; i++) {
            var src = sources[i];
            if (src) {
                var val = src[pn];
                if (val !== undefined) {
                    r[pn] = val;
                    break;
                }
            }
        }
    });
    return r;
}


// array functions

function __arrayFirst(array, predicate) {
    for (var i = 0, j = array.length; i < j; i++) {
        if (predicate(array[i])) {
            return array[i];
        }
    }
    return null;
}

function __arrayIndexOf(array, predicate) {
    for (var i = 0, j = array.length; i < j; i++) {
        if (predicate(array[i])) return i;
    }
    return -1;
}

function __arrayRemoveItem(array, predicateOrItem) {
    var predicate = __isFunction(predicateOrItem) ? predicateOrItem : undefined;
    var l = array.length;
    for (var index = 0; index < l; index++) {
        if (predicate ? predicate(array[index]) : (array[index] === predicateOrItem)) {
            array.splice(index, 1);
            return index;
        }
    }
    return -1;
}

function __arrayZip(a1, a2, callback) {

    var result = [];
    var n = Math.min(a1.length, a2.length);
    for (var i = 0; i < n; ++i) {
        result.push(callback(a1[i], a2[i]));
    }

    return result;
}

function __arrayDistinct(array) {
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

function __arrayEquals(a1, a2, equalsFn) {
    //Check if the arrays are undefined/null
    if (!a1 || !a2) return false;

    if (a1.length !== a2.length) return false;

    //go thru all the vars
    for (var i = 0; i < a1.length; i++) {
        //if the var is an array, we need to make a recursive check
        //otherwise we'll just compare the values
        if (Array.isArray( a1[i])) {
            if (!__arrayEquals(a1[i], a2[i])) return false;
        } else {
            if (equalsFn) {
                if (!equalsFn(a1[i], a2[i])) return false;
            } else {
                if (a1[i] !== a2[i]) return false;
            }
        }
    }
    return true;
}

// end of array functions

function __getArray(source, propName) {
    var arr = source[propName];
    if (!arr) {
        arr = [];
        source[propName] = arr;
    }
    return arr;
}
    
function __requireLib(libNames, errMessage) {
    var arrNames = libNames.split(";");
    for (var i = 0, j = arrNames.length; i < j; i++) {
        var lib = __requireLibCore(arrNames[i]);
        if (lib) return lib;
    }
    throw new Error("Unable to initialize " + libNames + ".  " + errMessage || "");
}
    
function __requireLibCore(libName) {
    var lib = window[libName];
    if (lib) return lib;
    if (window.require) {
        lib = window.require(libName);
    }
    if (lib) return lib;
    return null;
}

function __using(obj, property, tempValue, fn) {
    var originalValue = obj[property];
    if (tempValue === originalValue) {
        return fn();
    }
    obj[property] = tempValue;
    try {
        return fn();
    } finally {
        if (originalValue === undefined) {
            delete obj[property];
        } else {
            obj[property] = originalValue;
        }
    }
}
    
function __wrapExecution(startFn, endFn, fn) {
    var state;
    try {
        state = startFn();
        return fn();
    } catch (e) {
        if (typeof(state) === 'object') {
            state.error = e;
        }
        throw e;
    } finally {
        endFn(state);
    }
}

function __memoize(fn) {
    return function () {
        var args = __arraySlice(arguments),
            hash = "",
            i = args.length,
            currentArg = null;
        while (i--) {
            currentArg = args[i];
            hash += (currentArg === Object(currentArg)) ? JSON.stringify(currentArg) : currentArg;
            fn.memoize || (fn.memoize = {});
        }
        return (hash in fn.memoize) ?
            fn.memoize[hash] :
            fn.memoize[hash] = fn.apply(this, args);
    };
}

function __getUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
    
function __durationToSeconds(duration) {
    // basic algorithm from https://github.com/nezasa/iso8601-js-period
    if (typeof duration !== "string") throw new Error("Invalid ISO8601 duration '" + duration + "'");

    // regex splits as follows - grp0, grp1, y, m, d, grp2, h, m, s
    //                           0     1     2  3  4  5     6  7  8   
    var struct = /^P((\d+Y)?(\d+M)?(\d+D)?)?(T(\d+H)?(\d+M)?(\d+S)?)?$/.exec(duration);
    if (!struct) throw new Error("Invalid ISO8601 duration '" + duration + "'");
        
    var ymdhmsIndexes = [2, 3, 4, 6, 7, 8]; // -> grp1,y,m,d,grp2,h,m,s 
    var factors = [31104000, // year (360*24*60*60) 
        2592000,             // month (30*24*60*60) 
        86400,               // day (24*60*60) 
        3600,                // hour (60*60) 
        60,                  // minute (60) 
        1];                  // second (1)

    var seconds = 0;
    for (var i = 0; i < 6; i++) {
        var digit = struct[ymdhmsIndexes[i]];
        // remove letters, replace by 0 if not defined
        digit = digit ? +digit.replace(/[A-Za-z]+/g, '') : 0;
        seconds += digit * factors[i];
    }
    return seconds;

}
    
// is functions 

function __classof(o) {
    if (o === null) {
        return "null";
    }
    if (o === undefined) {
        return "undefined";
    }
    return Object.prototype.toString.call(o).slice(8, -1).toLowerCase();
}

function __isDate(o) {
    return __classof(o) === "date" && !isNaN(o.getTime());
}

function __isFunction(o) {
    return __classof(o) === "function";
}

function __isGuid(value) {
    return (typeof value === "string") && /[a-fA-F\d]{8}-(?:[a-fA-F\d]{4}-){3}[a-fA-F\d]{12}/.test(value);
}
    
function __isDuration(value) {
    return (typeof value === "string") && /^(-|)?P([0-9]+Y|)?([0-9]+M|)?([0-9]+D|)?T?([0-9]+H|)?([0-9]+M|)?([0-9]+S|)?/.test(value);
}

function __isEmpty(obj) {
    if (obj === null || obj === undefined) {
        return true;
    }
    for (var key in obj) {
        if (__hasOwnProperty(obj, key)) {
            return false;
        }
    }
    return true;
}

function __isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

// end of is Functions

// string functions

function __stringStartsWith(str, prefix) {
    // returns false for empty strings too
    if ((!str) || !prefix) return false;
    return str.indexOf(prefix, 0) === 0;
}

function __stringEndsWith(str, suffix) {
    // returns false for empty strings too
    if ((!str) || !suffix) return false;
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

// Based on fragment from Dean Edwards' Base 2 library
// format("a %1 and a %2", "cat", "dog") -> "a cat and a dog"
function __formatString(string) {
    var args = arguments;
    var pattern = RegExp("%([1-" + (arguments.length - 1) + "])", "g");
    return string.replace(pattern, function (match, index) {
        return args[index];
    });
}

// end of string functions

// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
function uncurry(f) {
    var call = Function.call;
    return function () {
        return call.apply(f, arguments);
    };
}


// shims

if (!Object.create) {
    Object.create = function (parent) {
        var F = function () { };
        F.prototype = parent;
        return new F();
    };
}

var core = {};

// core.getOwnPropertyValues = __getOwnPropertyValues;
core.objectForEach= __objectForEach;
// core.objectMapToArray= __objectMapToArray;
// core.objectFirst= __objectFirst;

core.extend = __extend;
core.propEq = __propEq;
core.pluck  = __pluck;

core.arrayEquals = __arrayEquals;
// core.arrayDistint = __arrayDistinct;
core.arrayFirst = __arrayFirst;
core.arrayIndexOf = __arrayIndexOf;
core.arrayRemoveItem = __arrayRemoveItem;
core.arrayZip = __arrayZip;

core.requireLib = __requireLib;
core.using = __using;
// core.wrapExecution = __wrapExecution;
core.memoize = __memoize;
core.getUuid = __getUuid;
core.durationToSeconds = __durationToSeconds;


core.isDate = __isDate;
core.isGuid = __isGuid;
core.isDuration = __isDuration;
core.isFunction= __isFunction;
core.isEmpty= __isEmpty;
core.isNumeric= __isNumeric;

core.stringStartsWith= __stringStartsWith;
core.stringEndsWith= __stringEndsWith;
core.formatString = __formatString;

core.parent = breeze;
breeze.core = core;


