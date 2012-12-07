/*
 * Copyright 2012 IdeaBlade, Inc.  All Rights Reserved.  
 * Use, reproduction, distribution, and modification of this code is subject to the terms and 
 * conditions of the IdeaBlade Breeze license, available at http://www.breezejs.com/license
 *
 * Author: Jay Traband
 */
(function (window, definitionFn) {
    if ( typeof define === "function") {
        if (define.amd && define.amd.breeze ) {
            define( "breeze", [], definitionFn );
        } else {
            define([], definitionFn);
        }
    } else {
        definitionFn();
    }
    
}(window, function () {

/**
 * almond 0.0.3 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
/*jslint strict: false, plusplus: false */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {

    var defined = {},
        waiting = {},
        aps = [].slice,
        main, req;

    if (typeof define === "function") {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseName = baseName.split("/");
                baseName = baseName.slice(0, baseName.length - 1);

                name = baseName.concat(name.split("/"));

                //start trimDots
                var i, part;
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }
        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            main.apply(undef, args);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, i, ret, map;

        //Use name if no relName
        if (!relName) {
            relName = name;
        }

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Default to require, exports, module if no deps if
            //the factory arg has any arguments specified.
            if (!deps.length && callback.length) {
                deps = ['require', 'exports', 'module'];
            }

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name]
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw name + ' missing ' + depName;
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef) {
                    defined[name] = cjsModule.exports;
                } else if (!usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {

            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            //Drop the config stuff on the ground.
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = arguments[2];
            } else {
                deps = [];
            }
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function () {
        return req;
    };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (define.unordered) {
            waiting[name] = [name, deps, callback];
        } else {
            main(name, deps, callback);
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../ThirdParty/almond.js", function(){});


define('coreFns',[],function () {
    

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



define('enum',["coreFns"], function (core) {
    
    
    /**
    @module core
    **/


    // TODO: think about CompositeEnum (flags impl).

    
    /**
    Base class for all Breeze enumerations, such as EntityState, DataType, FetchStrategy, MergeStrategy etc.
    A Breeze Enum is a namespaced set of constant values.  Each Enum consists of a group of related constants, called 'symbols'.
    Unlike enums in some other environments, each 'symbol' can have both methods and properties.
    See the example below:

        // Example of creating a new Enum
        var prototype = {
            nextDay: function () {
                var nextIndex = (this.dayIndex+1) % 7;
                return DayOfWeek.getSymbols()[nextIndex];
            }
        };

        var DayOfWeek = new Enum("DayOfWeek", prototype);
        DayOfWeek.Monday    = DayOfWeek.addSymbol( { dayIndex: 0 });
        DayOfWeek.Tuesday   = DayOfWeek.addSymbol( { dayIndex: 1 });
        DayOfWeek.Wednesday = DayOfWeek.addSymbol( { dayIndex: 2 });
        DayOfWeek.Thursday  = DayOfWeek.addSymbol( { dayIndex: 3 });
        DayOfWeek.Friday    = DayOfWeek.addSymbol( { dayIndex: 4 });
        DayOfWeek.Saturday  = DayOfWeek.addSymbol( { dayIndex: 5, isWeekend: true });
        DayOfWeek.Sunday    = DayOfWeek.addSymbol( { dayIndex: 6, isWeekend: true });
        DayOfWeek.seal();

        // custom methods
        ok(DayOfWeek.Monday.nextDay() === DayOfWeek.Tuesday);
        ok(DayOfWeek.Sunday.nextDay() === DayOfWeek.Monday);
        // custom properties
        ok(DayOfWeek.Tuesday.isWeekend === undefined);
        ok(DayOfWeek.Saturday.isWeekend == true);
        // Standard enum capabilities
        ok(DayOfWeek instanceof Enum);
        ok(Enum.isSymbol(DayOfWeek.Wednesday));
        ok(DayOfWeek.contains(DayOfWeek.Thursday));
        ok(DayOfWeek.Tuesday.parentEnum == DayOfWeek);
        ok(DayOfWeek.getSymbols().length === 7);
        ok(DayOfWeek.Friday.toString() === "Friday");


    @class Enum
    **/
        
    /**
    Enum constructor - may be used to create new Enums.
    @example
        var prototype = {
            nextDay: function () {
                var nextIndex = (this.dayIndex+1) % 7;
                return DayOfWeek.getSymbols()[nextIndex];
            }
        };

        var DayOfWeek = new Enum("DayOfWeek", prototype);
    @method <ctor> Enum
    @param name {String}
    @param [methodObj] {Object}
    **/
    function Enum(name, methodObj) {
        this.name = name;
        var prototype = new EnumSymbol(methodObj);
        prototype.parentEnum = this;
        this._symbolPrototype = prototype;
        if (methodObj) {
            Object.keys(methodObj).forEach(function (key) {
                prototype[key] = methodObj[key];
            });
        }
    };

    /**
    Checks if an object is an Enum 'symbol'.
    @example
         if (Enum.isSymbol(DayOfWeek.Wednesday)) {
            // do something ...
         };
    @method isSymbol
    @return {Boolean}
    @static
    **/
    Enum.isSymbol = function (obj) {
        return obj instanceof EnumSymbol;
    };

    /**
    Returns an Enum symbol given its name.
    @example
         var dayOfWeek = DayOfWeek.from("Thursday");
         // nowdayOfWeek === DayOfWeek.Thursday            
    @method fromName
    @param name {String} Name for which an enum symbol should be returned.
    @return {EnumSymbol} The symbol that matches the name or 'undefined' if not found.
    **/
    Enum.prototype.fromName = function (name) {
        return this[name];
    };

    /**
    Adds a new symbol to an Enum.
    @example
        var DayOfWeek = new Enum("DayOfWeek", prototype);
        DayOfWeek.Monday    = DayOfWeek.addSymbol( { dayIndex: 0 });
    @method addSymbol
    @param [propertiesObj] {Object} A collection of properties that should be added to the new symbol.
    In other words, the 'propertiesObj' is any state that should be held by the symbol.
    @return {EnumSymbol} The new symbol
    **/
    Enum.prototype.addSymbol = function (propertiesObj) {
        // TODO: check if sealed.
        var newSymbol = Object.create(this._symbolPrototype);
        if (propertiesObj) {
            Object.keys(propertiesObj).forEach(function (key) {
                newSymbol[key] = propertiesObj[key];
            });
        }
        setTimeout(function () { newSymbol.getName(); }, 0);
        return newSymbol;
    };

    /**
    Seals this enum so that no more symbols may be added to it. This should only be called after all symbols
    have already been added to the Enum.
    @example
        DayOfWeek.seal();
    @method seal
    **/
    Enum.prototype.seal = function () {
        this.getSymbols().forEach(function (sym) { return sym.getName(); });
    };

    // TODO: remove or rethink this.
    Enum.prototype.combineSymbols = function () {
        var proto = this._symbolPrototype;
        var newSymbol = Object.create(proto);
        newSymbol._symbols = Array.prototype.slice.call(arguments);

        Object.keys(proto).forEach(function (key) {
            var result;
            var oldMethod = proto[key];
            if (core.isFunction(oldMethod)) {
                var newMethod = function () {

                    if (this._symbols) {
                        result = this._symbols.map(function (sym) {
                            return oldMethod.apply(sym);
                        });
                    } else {
                        result = oldMethod.apply(this);
                    }
                    return result;
                };
                proto[key] = newMethod;
            }
        });
        return newSymbol;
    };

    /**
    Returns all of the symbols contained within this Enum.
    @example
        var symbols = DayOfWeek.getSymbols();
    @method getSymbols
    @return {Array of EnumSymbol} All of the symbols contained within this Enum.
    **/       
    Enum.prototype.getSymbols = function () {
        return this.getNames().map(function (key) {
            return this[key];
        }, this);
    };

    /**
    Returns the names of all of the symbols contained within this Enum.
    @example
        var symbols = DayOfWeek.getNames();
    @method getNames
    @return {Array of String} All of the names of the symbols contained within this Enum.
    **/       
    Enum.prototype.getNames = function () {
        return Object.keys(this).filter(
            function (key) { return key != "name" && key.substr(0, 1) !== "_"; }
        );
    };

    /**
    Returns whether an Enum contains a specified symbol. 
    @example
        var symbol = DayOfWeek.Friday;
        if (DayOfWeek.contains(symbol)) {
            // do something
        }
    @method contains
    @param {Object} Object or symbol to test.
    @return {Boolean} Whether this Enum contains the specified symbol.
    **/       
    Enum.prototype.contains = function (sym) {
        if (!(sym instanceof EnumSymbol)) {
            return false;
        }
        return this[sym.getName()] === sym;
    };

    /**
    One of the constant values that is generated by the {{#crossLink "Enum"}}{{/crossLink}} "addSymbol" method.  EnumSymbols should ONLY be created via
    the Enum.addSymbol method.

         var DayOfWeek = new Enum("DayOfWeek");
         DayOfWeek.Monday    = DayOfWeek.addSymbol();
    @class EnumSymbol
    **/
    function EnumSymbol() {
    }
    
    /**
    The {{#crossLink "Enum"}}{{/crossLink}} to which this symbol belongs.
    __readOnly__
    @property parentEnum {Enum}
    **/

    /**
    Returns the name of this symbol.
    @example
        var name = DayOfWeek.Monday.getName();
        // name === "Monday"
    @method getName
    **/
    EnumSymbol.prototype.getName = function () {
        if (!this.name) {
            var that = this;
            this.name = core.arrayFirst(this.parentEnum.getNames(), function (name) {
                return that.parentEnum[name] === that;
            });
        }
        return this.name;
    };

    /**
    Same as the getName method. Returns the name of this symbol.
    @example
        var name = DayOfWeek.Monday.toString();
        // name === "Monday"
    @method toString
    **/
    EnumSymbol.prototype.toString = function () {
        return this.getName();
    };

    EnumSymbol.prototype.toJSON = function () {
        return {
            _$typeName: this.parentEnum.name,
            name: this.name
        };
    };

    return Enum;

});

define('assertParam',["coreFns"], function (core) {

    // The %1 parameter 
    // is required
    // must be a %2
    // must be an instance of %2
    // must be an instance of the %2 enumeration
    // must have a %2 property
    // must be an array where each element  
    // is optional or 

    var Param = function (v, name) {
        this.v = v;
        this.name = name;
        this._fns = [null];
        this._pending = [];
    };

    Param.prototype.isObject = function() {
        return this.isTypeOf("object");
    };

    Param.prototype.isBoolean = function () {
        return this.isTypeOf('boolean');
    };

    Param.prototype.isString = function () {
        return this.isTypeOf('string');
    };

    Param.prototype.isNonEmptyString = function() {
        var result = function(that, v) {
            if (v == null) return false;
            return (typeof(v) === 'string') && v.length > 0;
        };
        result.getMessage = function() {
            return " must be a nonEmpty string";
        };
        return this.compose(result);
    };

    Param.prototype.isNumber = function () {
        return this.isTypeOf('number');
    };

    Param.prototype.isFunction = function () {
        return this.isTypeOf('function');
    };

    Param.prototype.isTypeOf = function (typeName) {
        var result = function (that, v) {
            if (v == null) return false;
            if (typeof (v) === typeName) return true;
            return false;
        };
        result.getMessage = function () {
            return core.formatString(" must be a '%1'", typeName);
        };
        return this.compose(result);
    };

    Param.prototype.isInstanceOf = function (type, typeName) {
        var result = function (that, v) {
            if (v == null) return false;
            return (v instanceof type);
        };
        typeName = typeName || type.prototype._$typeName;
        result.getMessage = function () {
            return core.formatString(" must be an instance of '%1'", typeName);
        };
        return this.compose(result);
    };

    Param.prototype.hasProperty = function (propertyName) {
        var result = function (that, v) {
            if (v == null) return false;
            return (v[propertyName] !== undefined);
        };
        result.getMessage = function () {
            return core.formatString(" must have a '%1' property ", propertyName);
        };
        return this.compose(result);
    };

    Param.prototype.isEnumOf = function (enumType) {
        var result = function (that, v) {
            if (v == null) false;
            return enumType.contains(v);
        };
        result.getMessage = function () {
            return core.formatString(" must be an instance of the '%1' enumeration", enumType.name);
        };
        return this.compose(result);
    };

    Param.prototype.isRequired = function () {
        if (this.fn && !this._or) {
            return this;
        } else {
            var result = function (that, v) {
                return v != null;
            };
            result.getMessage = function () {
                return " is required";
            };
            return this;
        }
    };

    Param.prototype.isOptional = function () {
        if (this._fn) {
            setFn(this, makeOptional(this._fn));
        } else {
            this._pending.push(function (that, fn) {
                return makeOptional(fn);
            });
        }
        return this;
    };

    Param.prototype.isNonEmptyArray = function () {
        return this.isArray(true);
    };

    Param.prototype.isArray = function (mustBeNonEmpty) {
        if (this._fn) {
            setFn(this, makeArray(this._fn, mustBeNonEmpty));
        } else {
            setFn(this, makeArray(null, mustBeNonEmpty));
            this._pending.push(function (that, fn) {
                return makeArray(fn, mustBeNonEmpty);
            });
        }
        return this;
    };

    Param.prototype.or = function () {
        this._fns.push(null);
        this._fn = null;
        return this;
    };

    Param.prototype.getMessage = function () {
        var msg = this._fns.map(function (fn) {
            return fn.getMessage();
        }).join(", or it");
        return core.formatString(this.MESSAGE_PREFIX, this.name) + " " + msg;
    };

    Param.prototype.check = function (defaultValue) {
        var fn = compile(this);
        if (!fn) return;
        if (!fn(this, this.v)) {
            throw new Error(this.getMessage());
        }
        if (this.v !== undefined) {
            return this.v;
        } else {
            return defaultValue;
        }
    };

    Param.prototype.checkMsg = function () {
        var fn = compile(this);
        if (!fn) return;
        if (!fn(this, this.v)) {
            return this.getMessage();
        }
    };

    Param.prototype.withDefault = function(defaultValue) {
        this.defaultValue = defaultValue;
        return this;
    };
    
    Param.prototype.whereParam = function(propName) {
        return this.parent.whereParam(propName);
    };

    Param.prototype.applyAll = function(instance, throwIfUnknownProperty) {
        throwIfUnknownProperty = throwIfUnknownProperty == null ? true : throwIfUnknownProperty;
        var clone = core.extend({ }, this.parent.config);
        this.parent.params.forEach(function(p) {
            if (throwIfUnknownProperty) delete clone[p.name];
            p._applyOne(instance, p.defaultValue);
        });
        // should be no properties left in the clone
        if (throwIfUnknownProperty) {
            for (var key in clone) {
                throw new Error("Invalid property in config: " + key);
            }
        }
    };

    Param.prototype._applyOne = function (instance, defaultValue) {
        this.check();
        if (this.v !== undefined) {
            instance[this.name] = this.v;
        } else {
            if (defaultValue !== undefined) {
                instance[this.name] = defaultValue;
            }
        }
    };

    Param.prototype.compose = function (fn) {

        if (this._pending.length > 0) {
            while (this._pending.length > 0) {
                var pending = this._pending.pop();
                fn = pending(this, fn);
            }
            setFn(this, fn);
        } else {
            if (this._fn) {
                throw new Error("Illegal construction - use 'or' to combine checks");
            }
            setFn(this, fn);
        }
        return this;
    };

    Param.prototype.MESSAGE_PREFIX = "The '%1' parameter ";

    var assertParam = function (v, name) {
        return new Param(v, name);
    };

    var CompositeParam = function(config) {
        if (typeof (config) !== "object") {
            throw new Error("Configuration parameter should be an object, instead it is a: " + typeof (config) );
        }
        this.config = config;
        this.params = [];
    };

    CompositeParam.prototype.whereParam = function(propName) {
        var param = new Param(this.config[propName], propName);
        param.parent = this;
        this.params.push(param);
        return param;
    };

    var assertConfig = function(config) {
        return new CompositeParam(config);
    };

    // private functions

    function makeOptional(fn) {
        var result = function (that, v) {
            if (v == null) return true;
            return fn(that, v);
        };

        result.getMessage = function () {
            return " is optional, or it" + fn.getMessage();
        };
        return result;
    }

    function makeArray(fn, mustNotBeEmpty) {
        var result = function (that, v) {
            if (!Array.isArray(v)) {
                return false;
            }
            if (mustNotBeEmpty) {
                if (v.length === 0) return false;
            }
            // allow standalone is array call.
            if (!fn) return true;

            return v.every(function (v1) {
                return fn(that, v1);
            });
        };
        result.getMessage = function () {
            var arrayDescr = mustNotBeEmpty ? "a nonEmpty array" : "an array";
            var element = fn ? " where each element" + fn.getMessage() : "";
            return " must be " + arrayDescr + element;
        };
        return result;
    }



    function setFn(that, fn) {
        that._fns[that._fns.length - 1] = fn;
        that._fn = fn;
    }

    function compile(self) {
        if (!self._compiledFn) {
            // clear off last one if null 
            if (self._fns[self._fns.length - 1] == null) {
                self._fns.pop();
            }
            if (self._fns.length === 0) {
                return undefined;
            }
            self._compiledFn = function (that, v) {
                return that._fns.some(function (fn) {
                    return fn(that, v);
                });
            };
        };
        return self._compiledFn;
    }


    // Param is exposed so that additional 'is' methods can be added to the prototype.
    return { Param: Param, assertParam: assertParam, assertConfig: assertConfig };



});
define('event',["coreFns", "assertParam"], function (core, m_assertParam) {
    
    var assertParam = m_assertParam.assertParam;
    
    

    /**
    @module core
    **/

    var __eventNameMap = { };

    /**
    Class to support basic event publication and subscription semantics.
    @class Event
    **/

    /**
    Constructor for an Event
    @example
        salaryEvent = new Event("salaryEvent", person);
    @method <ctor> Event
    @param name {String}
    @param publisher {Object} The object that will be doing the publication. i.e. the object to which this event is attached. 
    @param [defaultErrorCallback] {Function} If omitted then subscriber notification failures will be ignored.

    errorCallback([e])
    @param [defaultErrorCallback.e] {Error} Any error encountered during subscription execution.
    **/
    var Event = function (name, publisher, defaultErrorCallback, defaultFn) {
        assertParam(name, "eventName").isNonEmptyString();
        assertParam(publisher, "publisher").isObject();
        var that;
        if (defaultFn) {
            that = defaultFn;
        } else {
            that = this;
        }
        that.name = name;
        // register the name
        __eventNameMap[name] = true;
        that.publisher = publisher;
        that._nextUnsubKey = 1;
        if (defaultErrorCallback) {
            that._defaultErrorCallback = defaultErrorCallback;
        }
        if (defaultFn) {
            core.extend(defaultFn, Event.prototype);
            return defaultFn;
        }
    };

    /**
    Publish data for this event.
    @example
        // Assume 'salaryEvent' is previously constructed Event
        salaryEvent.publish( { eventType: "payRaise", amount: 100 });
    This event can also be published asychonously
    @example
        salaryEvent.publish( { eventType: "payRaise", amount: 100 }, true);
    And we can add a handler in case the subscriber 'mishandles' the event.
    @example
        salaryEvent.publish( { eventType: "payRaise", amount: 100 }, true, function(error) {
            // do something with the 'error' object
        });
    @method publish
    @param data {Object} Data to publish
    @param [publishAsync=false] Whether to publish asynchonously or not.
    @param [errorCallback] {Function} Will be called for any errors that occur during publication. If omitted, 
    errors will be eaten.

    errorCallback([e])
    @param [errorCallback.e] {Error} Any error encountered during publication execution.
    @return {Boolean} false if event is disabled; true otherwise.
    **/
    Event.prototype.publish = function(data, publishAsync, errorCallback) {

        function publishCore() {
            // subscribers from outer scope.
            subscribers.forEach(function(s) {
                try {
                    s.callback(data);
                } catch(e) {
                    e.context = "unable to publish on topic: " + this.name;
                    if (errorCallback) {
                        errorCallback(e);
                    } else if (this._defaultErrorCallback) {
                        this._defaultErrorCallback(e);
                    } else {
                        fallbackErrorHandler(e);
                    }
                }
            });
        }
        
        if (!Event._isEnabled(this.name, this.publisher)) return false;
        var subscribers = this._subscribers;
        if (!subscribers) return true;
        
        if (publishAsync === true) {
            setTimeout(publishCore, 0);
        } else {
            publishCore();
        }
        return true;
    };

    /**
   Publish data for this event asynchronously.
   @example
       // Assume 'salaryEvent' is previously constructed Event
       salaryEvent.publishAsync( { eventType: "payRaise", amount: 100 });
   And we can add a handler in case the subscriber 'mishandles' the event.
   @example
       salaryEvent.publishAsync( { eventType: "payRaise", amount: 100 }, function(error) {
           // do something with the 'error' object
       });
   @method publishAsync
   @param data {Object} Data to publish
   @param [errorCallback] {Function} Will be called for any errors that occur during publication. If omitted, 
   errors will be eaten.

   errorCallback([e])
   @param [errorCallback.e] {Error} Any error encountered during publication execution.
   **/
    Event.prototype.publishAsync = function(data, errorCallback) {
        this.publish(data, true, errorCallback);
    };

    /**
    Subscribe to this event.
    @example
        // Assume 'salaryEvent' is previously constructed Event
        salaryEvent.subscribe(function (eventArgs) {
            if (eventArgs.eventType === "payRaise") {
               // do something
            }
        });
    There are several built in Breeze events, such as EntityAspect.propertyChanged, EntityAspect.validationErrorsChanged as well.
    @example
         // Assume order is a preexisting 'order' entity
         order.entityAspect.propertyChanged.subscribe(function (pcEvent) {
             if ( pcEvent.propertyName === "OrderDate") {
                 // do something
             }
         });
    @method subscribe
    @param [callback] {Function} Will be called whenever 'data' is published for this event. 

        callback([data])
        @param [callback.data] {Object} Whatever 'data' was published.  This should be documented on the specific event.
    @return {Number} This is a key for 'unsubscription'.  It can be passed to the 'unsubscribe' method.
    **/
    Event.prototype.subscribe = function(callback) {
        if (!this._subscribers) {
            this._subscribers = [];
        }

        var unsubKey = this._nextUnsubKey;
        this._subscribers.push({ unsubKey: unsubKey, callback: callback });
        ++this._nextUnsubKey;
        return unsubKey;
    };

    /**
    Unsubscribe from this event. 
    @example
        // Assume order is a preexisting 'order' entity
        var token = order.entityAspect.propertyChanged.subscribe(function (pcEvent) {
                // do something
        });
        // sometime later
        order.entityAspect.propertyChanged.unsubscribe(token);
    @method unsubscribe
    @param unsubKey {Number} The value returned from the 'subscribe' method may be used to unsubscribe here.
    @return {Boolean} Whether unsubscription occured. This will return false if already unsubscribed or if the key simply
    cannot be found.
    **/
    Event.prototype.unsubscribe = function(unsubKey) {
        if (!this._subscribers) return false;
        var subs = this._subscribers;
        var ix = core.arrayIndexOf(subs, function(s) {
            return s.unsubKey === unsubKey;
        });
        if (ix !== -1) {
            subs.splice(ix, 1);
            if (subs.length === 0) {
                delete this._subscribers;
            }
            return true;
        } else {
            return false;
        }
    };
    
    // event bubbling - document later.
    Event.bubbleEvent = function (target, getParentFn) {
        target._getEventParent = getParentFn;
    };

    /**
    Enables or disables the named event for an object and all of its children. 
    @example
        Event.enable(“propertyChanged”, myEntityManager, false) 
    will disable all EntityAspect.propertyChanged events within a EntityManager.
    @example
        Event.enable(“propertyChanged”, myEntityManager, true) 
    will enable all EntityAspect.propertyChanged events within a EntityManager.
    @example
        Event.enable(“propertyChanged”, myEntity.entityAspect, false) 
    will disable EntityAspect.propertyChanged events for a specific entity.
    @example
        Event.enable(“propertyChanged”, myEntity.entityAspect, null) 
    will removes any enabling / disabling at the entity aspect level so now any 'Event.enable' calls at the EntityManager level, 
    made either previously or in the future, will control notification.
    @example
        Event.enable(“validationErrorsChanged”, myEntityManager, function(em) {     
           return em.customTag === “blue”;
        })                 
    will either enable or disable myEntityManager based on the current value of a ‘customTag’ property on myEntityManager. 
    Note that this is dynamic, changing the customTag value will cause events to be enabled or disabled immediately.
    @method enable
    @static
    @param eventName {String} The name of the event. 
    @param target {Object} The object at which enabling or disabling will occur.  All event notifications that occur to this object or 
    children of this object will be enabled or disabled. 
    @param isEnabled {Boolean|null|Function} A boolean, a null or a function that returns either a boolean or a null. 
    **/
    Event.enable = function (eventName, obj, isEnabled) {
        assertParam(eventName, "eventName").isNonEmptyString();
        assertParam(obj, "obj").isObject();
        assertParam(isEnabled, "isEnabled").isBoolean().isOptional().or().isFunction();
        eventName = getFullEventName(eventName);
        if (!obj._$eventMap) {
            obj._$eventMap = {};
        }
        obj._$eventMap[eventName] = isEnabled;
    };

    Event._enableFast = function(event, obj, isEnabled) {
        if (!obj._$eventMap) {
            obj._$eventMap = {};
        }
        obj._$eventMap[event.name] = isEnabled;
    };

    /**
    Returns whether for a specific event and a specific object and its children, notification is enabled or disabled or not set. 
    @example
        Event.isEnabled(“propertyChanged”, myEntityManager) 
    
    @method isEnabled
    @static
    @param eventName {String} The name of the event. 
    @param target {Object} The object for which we want to know if notifications are enabled. 
    @return {Boolean|null} A null is returned if this value has not been set.
    **/
    Event.isEnabled = function (eventName, obj) {
        assertParam(eventName, "eventName").isNonEmptyString();
        assertParam(obj, "obj").isObject();
        if (!obj._getEventParent) {
            throw new Error("This object does not support event enabling/disabling");
        }
        return Event._isEnabled(obj, getFullEventName(eventName));
    };

    Event._isEnabled = function(eventName, obj) {
        var isEnabled = null;
        var eventMap = obj._$eventMap;
        if (eventMap) {
            isEnabled = eventMap[eventName];
        }
        if (isEnabled != null) {
            if (typeof isEnabled === 'function') {
                return isEnabled(obj);
            } else {
                return !!isEnabled;
            }
        } else {
            var parent = obj._getEventParent && obj._getEventParent();
            if (parent) {
                return Event._isEnabled(eventName, parent);
            } else {
                // default if not explicitly disabled.
                return true;
            }
        }
    };

    function getFullEventName(eventName) {
        if (__eventNameMap[eventName]) return eventName;
        // find the closest event name that matches
        var fullEventName = core.arrayFirst(Object.keys(__eventNameMap), function (name) {
            return name.indexOf(eventName) === 0;
        });
        if (!fullEventName) {
            throw new Error("Unable to find any registered event that matches: " + eventName);
        }
        return fullEventName;
    }
    
    function fallbackErrorHandler(e) {
        // TODO: maybe log this 
        // for now do nothing;
    }



    return Event;
});

define('core',["coreFns", "enum", "event", "assertParam"],
function (core, Enum, Event, m_assertParam) {

    /**
    Utility types and functions of generally global applicability.
    @module core
    @main core
    **/
    core.Enum = Enum;
    core.Event = Event;
    core.extend(core, m_assertParam);

    return core;
});

define('config',["core" ] ,
function (core) {
    
    /**
    @module breeze   
    **/

    var assertParam = core.assertParam;
    var assertConfig = core.assertConfig;
    var Event = core.Event;
    
    // alias for within fns with a config param
    var a_config = {};
    
    
    a_config.functionRegistry = { };
    a_config.typeRegistry = { };
    a_config.objectRegistry = {};
    a_config.interfaceInitialized = new Event("interfaceInitialized_config", a_config);
    
    var InterfaceDef = function(name) {
        this.name = name;
        this.defaultInstance = null;
        this._implMap = {};
        
    };
    InterfaceDef.prototype.registerCtor = function(adapterName, ctor) {
        this._implMap[adapterName.toLowerCase()] = { ctor: ctor, defaultInstance: null };
    };
    InterfaceDef.prototype.getImpl = function(adapterName) {
        return this._implMap[adapterName.toLowerCase()];
    };
    InterfaceDef.prototype.getFirstImpl = function() {
        var kv = core.objectFirst(this._implMap, function () { return true; });
        return kv ? kv.value : null;
    };
    
    a_config.interfaceRegistry = {
        ajax: new InterfaceDef("ajax"),
        modelLibrary: new InterfaceDef("modelLibrary"),
        dataService: new InterfaceDef("dataService")
    };
   
    /**
    A singleton object that is the repository of all configuration options.

        config.initializeAdapterInstance( {
            modelLibrary: "ko",
            dataService: "webApi"
        });
        
    @class config
    **/
    
    /**
    This method is now OBSOLETE.  Use the "initializeAdapterInstances" to accomplish the same result.
    @method setProperties
    @deprecated
    @param config {Object}
        @param [config.remoteAccessImplementation] { implementation of remoteAccess-interface }
        @param [config.trackingImplementation] { implementation of entityTracking-interface }
        @param [config.ajaxImplementation] {implementation of ajax-interface }
    **/
    a_config.setProperties = function (config) {
        assertConfig(config)
            .whereParam("remoteAccessImplementation").isOptional()
            .whereParam("trackingImplementation").isOptional()
            .whereParam("ajaxImplementation").isOptional()
            .applyAll(config);
        if (config.remoteAccessImplementation) {
            a_config.initializeAdapterInstance("dataService", config.remoteAccessImplementation);
        }
        if (config.trackingImplementation) {
            // note the name change
            a_config.initializeAdapterInstance("modelLibrary", config.trackingImplementation);
        }
        if (config.ajaxImplementation) {
            a_config.initializeAdapterInstance("ajax", config.ajaxImplementation);
        }
    };
    
    /**
    Method use to register implementations of standard breeze interfaces.  Calls to this method are usually
    made as the last step within an adapter implementation. 
    @method registerAdapter
    @param interfaceName {String} - one of the following interface names "ajax", "dataService" or "modelLibrary"
    @param adapterCtor {Function} - an ctor function that returns an instance of the specified interface.  
    **/
    a_config.registerAdapter = function (interfaceName, adapterCtor) {
        assertParam(interfaceName, "interfaceName").isNonEmptyString();
        assertParam(adapterCtor, "adapterCtor").isFunction();
        // this impl will be thrown away after the name is retrieved.
        var impl = new adapterCtor();
        var implName = impl.name;
        if (!implName) {
            throw new Error("Unable to locate a 'name' property on the constructor passed into the 'registerAdapter' call.");
        }
        var idef = getInterfaceDef(interfaceName);
        idef.registerCtor(implName, adapterCtor);
        
    };
    
    /**
    Returns the ctor function used to implement a specific interface with a specific adapter name.
    @method getAdapter
    @param interfaceName {String} One of the following interface names "ajax", "dataService" or "modelLibrary"
    @param [adapterName] {String} The name of any previously registered adapter. If this parameter is omitted then
    this method returns the "default" adapter for this interface. If there is no default adapter, then a null is returned.
    @return {Function|null} Returns either a ctor function or null.
    **/
    a_config.getAdapter = function (interfaceName, adapterName) {
        var idef = getInterfaceDef(interfaceName);
        if (adapterName) {
            var impl = idef.getImpl(adapterName);
            return impl ? impl.ctor : null;
        } else {
            return idef.defaultInstance ? idef.defaultInstance._$impl.ctor : null;
        }
    };

    /**
    Initializes a collection of adapter implementations and makes each one the default for its corresponding interface.
    @method initializeAdapterInstances
    @param config {Object}
    @param [config.ajax] {String} - the name of a previously registered "ajax" adapter
    @param [config.dataService] {String} - the name of a previously registered "dataService" adapter
    @param [config.modelLibrary] {String} - the name of a previously registered "modelLibrary" adapter
    @return [array of instances]
    **/
    a_config.initializeAdapterInstances = function (config) {
        assertConfig(config)
            .whereParam("dataService").isOptional()
            .whereParam("modelLibrary").isOptional()
            .whereParam("ajax").isOptional();
        return core.objectMapToArray(config, a_config.initializeAdapterInstance);
        
    };

    /**
    Initializes a single adapter implementation. Initialization means either newing a instance of the 
    specified interface and then calling "initialize" on it or simply calling "initialize" on the instance
    if it already exists.
    @method initializeAdapterInstance
    @param interfaceName {String} The name of the interface to which the adapter to initialize belongs.
    @param adapterName {String} - The name of a previously registered adapter to initialize.
    @param [isDefault=true] {Boolean} - Whether to make this the default "adapter" for this interface. 
    @return {an instance of the specified adapter}
    **/
    a_config.initializeAdapterInstance = function (interfaceName, adapterName, isDefault) {
        isDefault = isDefault === undefined ? true : isDefault;
        assertParam(interfaceName, "interfaceName").isNonEmptyString().check();
        assertParam(adapterName, "adapterName").isNonEmptyString().check();
        assertParam(isDefault, "isDefault").isBoolean().check();
        
        var idef = getInterfaceDef(interfaceName);
        var impl = idef.getImpl(adapterName);
        if (!impl) {
            throw new Error("Unregistered adapter.  Interface: " + interfaceName + " AdapterName: " + adapterName);
        }

        return initializeAdapterInstanceCore(idef, impl, isDefault);
    };

    /**
    Returns the adapter instance corresponding to the specified interface and adapter names.
    @method getAdapterInstance
    @param interfaceName {String} The name of the interface.
    @param [adapterName] {String} - The name of a previously registered adapter.  If this parameter is
    omitted then the default implementation of the specified interface is returned. If there is
    no defaultInstance of this interface, then the first registered instance of this interface is returned.
    @return {an instance of the specified adapter}
    **/
    a_config.getAdapterInstance = function (interfaceName, adapterName) {
        var idef = getInterfaceDef(interfaceName);
        var impl;
        if (adapterName & adapterName !== "") {
            impl = idef.getImpl(adapterName);
            return impl ? impl.defaultInstance : null;
        } else {
            if (idef.defaultInstance) {
                return idef.defaultInstance;
            } else {
                impl = idef.getFirstImpl();
                if (impl.defaultInstance) {
                    return impl.defaultInstance;
                } else {
                    return initializeAdapterInstanceCore(idef, impl, true);
                }
            }
        }
    };
   
    // this is needed for reflection purposes when deserializing an object that needs a fn or ctor
    // used to register validators.
    a_config.registerFunction = function (fn, fnName) {
        core.assertParam(fn, "fn").isFunction().check();
        core.assertParam(fnName, "fnName").isString().check();
        fn.prototype._$fnName = fnName;
        a_config.functionRegistry[fnName] = fn;
    };

    a_config.registerObject = function (obj, objName) {
        core.assertParam(obj, "obj").isObject().check();
        core.assertParam(objName, "objName").isString().check();

        a_config.objectRegistry[objName] = obj;
    };
  
    a_config.registerType = function (ctor, typeName) {
        core.assertParam(ctor, "ctor").isFunction().check();
        core.assertParam(typeName, "typeName").isString().check();
        ctor.prototype._$typeName = typeName;
        a_config.typeRegistry[typeName] = ctor;
    };
   
    a_config.stringifyPad = "  ";
    
    function initializeAdapterInstanceCore(interfaceDef, impl, isDefault) {
        var instance = impl.defaultInstance;
        if (!instance) {
            instance = new (impl.ctor)();
            impl.defaultInstance = instance;
            instance._$impl = impl;
        }

        instance.initialize();

        if (isDefault) {
            // next line needs to occur before any recomposition 
            interfaceDef.defaultInstance = instance;
        }

        // recomposition of other impls will occur here.
        a_config.interfaceInitialized.publish({ interfaceName: interfaceDef.name, instance: instance, isDefault: true });

        if (instance.checkForRecomposition) {
            // now register for own dependencies.
            a_config.interfaceInitialized.subscribe(function (interfaceInitializedArgs) {
                instance.checkForRecomposition(interfaceInitializedArgs);
            });
        }

        return instance;
    }

    function getInterfaceDef(interfaceName) {
        var lcName = interfaceName.toLowerCase();
        // source may be null
        var kv = core.objectFirst(a_config.interfaceRegistry || {}, function (k, v) {
            return k.toLowerCase() === lcName;
        });
        if (!kv) {
            throw new Error("Unknown interface name: " + interfaceName);
        }
        return kv.value;
    }

    return a_config;
});

define('validate',["core", "config"],
function (core, a_config) {
    
    /**
    @module breeze
    **/

    var assertParam = core.assertParam;

    var Validator = function () {

        var INT16_MIN = -32768;
        var INT16_MAX = 32767;

        var INT32_MIN = -2147483648;
        var INT32_MAX = 2147483647;

        var BYTE_MIN = 0;
        var BYTE_MAX = 255;

        // add common props and methods for every validator 'context' here.
        var rootContext = {
            displayName: function (context) {
                if (context.property) {
                    return context.property.displayName || context.property.name;
                } else {
                    return "Value";
                }
            }
        };

        /**
        Instances of the Validator class provide the logic to validate another object and provide a description of any errors
        encountered during the validation process.  They are typically associated with a 'validators' property on the following types: {{#crossLink "EntityType"}}{{/crossLink}}, 
        {{#crossLink "DataProperty"}}{{/crossLink}} or {{#crossLink "NavigationProperty"}}{{/crossLink}}.
        
        A number of property level validators are registered automatically, i.e added to each DataProperty.validators property 
        based on {{#crossLink "DataProperty"}}{{/crossLink}} metadata.  For example, 
        
        - DataProperty.dataType -> one of the 'dataType' validator methods such as Validator.int64, Validator.date, Validator.bool etc.
        - DataProperty.maxLength -> Validator.maxLength 
        - DataProperty.isNullable -> Validator.required (if not nullable)

        @class Validator
        **/
        
        /**
        Validator constructor - This method is used to create create custom validations.  Several
        basic "Validator" construction methods are also provided as static methods to this class. These methods
        provide a simpler syntax for creating basic validations.

        However, sometimes a custom validator will be required.
        @example
        Most validators will be 'property' level validators, like this.
        @example
            // v is this function is the value to be validated, in this case a "country" string.
            var valFn = function (v) {
                if (v == null) return true;
                return (core.stringStartsWith(v, "US"));
            };
            var countryValidator = new Validator("countryIsUS", valFn, { 
                displayName: "Country", 
                messageTemplate: "'%displayName%' must start with 'US'" 
            });

            // Now plug it into Breeze.
            // Assume em1 is a preexisting EntityManager.
            var custType = metadataStore.getEntityType("Customer");
            var countryProp = custType.getProperty("Country");
            // Note that validator is added to a 'DataProperty' validators collection.
            prop.validators.push(countryValidator);
        Entity level validators are also possible
        @example
            function isValidZipCode(value) {
                var re = /^\d{5}([\-]\d{4})?$/;
                return (re.test(value));
            }               
           
            // v in this case will be a Customer entity
            var valFn = function (v) {
                // This validator only validates US Zip Codes.
                if ( v.getProperty("Country") === "USA") {
                    var postalCode = v.getProperty("PostalCode");
                    return isValidZipCode(postalCode);
                }
                return true;
            };
            var zipCodeValidator = new Validator("zipCodeValidator", valFn, 
                { messageTemplate: "For the US, this is not a valid PostalCode" });
        
            // Now plug it into Breeze.
            // Assume em1 is a preexisting EntityManager.
            var custType = em1.metadataStore.getEntityType("Customer");
            // Note that validator is added to an 'EntityType' validators collection.
            custType.validators.push(zipCodeValidator);
        What is commonly needed is a way of creating a parameterized function that will itself
        return a new Validator.  This requires the use of a 'context' object.
        @example
            // create a function that will take in a config object
            // and will return a validator
            var numericRangeValidator = function(context) {
                var valFn = function(v, ctx) {
                    if (v == null) return true;
                    if (typeof(v) !== "number") return false;
                    if (ctx.min != null && v < ctx.min) return false;
                    if (ctx.max != null && v > ctx.max) return false;
                    return true;
                };
                // The last parameter below is the 'context' object that will be passed into the 'ctx' parameter above
                // when this validator executes. Several other properties, such as displayName will get added to this object as well.
                return new Validator("numericRange", valFn, {
                    messageTemplate: "'%displayName%' must be an integer between the values of %min% and %max%",
                    min: context.min,
                    max: context.max
                });
            };
            // Assume that freightProperty is a DataEntityProperty that describes numeric values.
            // register the validator
            freightProperty.validators.push(numericRangeValidator({ min: 100, max: 500 }));

        @method <ctor> Validator
        @param name {String} The name of this validator.
        @param validatorFn {Function} A function to perform validation.
            
        validatorFn(value, context)
        @param validatorFn.value {Object} Value to be validated
        @param validatorFn.context {Object} The same context object passed into the constructor with the following additonal properties if not 
        otherwise specified.
        @param validatorFn.context.value {Object} The value being validated.
        @param validatorFn.context.validatorName {String} The name of the validator being executed.
        @param validatorFn.context.displayName {String} This will be either the value of the property's 'displayName' property or
        the value of its 'name' property or the string 'Value'
        @param validatorFn.context.messageTemplate {String} This will either be the value of Validator.messageTemplates[ {this validators name}] or null. Validator.messageTemplates
        is an object that is keyed by validator name and that can be added to in order to 'register' your own message for a given validator. 
        The following property can also be specified for any validator to force a specific errorMessage string
        @param [validatorFn.context.message] {String} If this property is set it will be used instead of the 'messageTemplate' property when an
        error message is generated. 
                    
        @param [context] {Object} A free form object whose properties will made available during the validation and error message creation process.
        This object will be passed into the Validator's validation function whenever 'validate' is called. See above for a description
        of additional properties that will be automatically added to this object if not otherwise specified. 
        **/
        var ctor = function (name, valFn, context) {
            // _baseContext is what will get serialized 
            this._baseContext = context || {};
            this._baseContext.validatorName = name;
            context = core.extend(Object.create(rootContext), this._baseContext);
            context.messageTemplate = context.messageTemplate || ctor.messageTemplates[name];
            this.name = name;
            this.valFn = valFn;
            this.context = context;
        };


        /**
        Run this validator against the specified value.  This method will usually be called internally either
        automatically by an property change, entity attach, query or save operation, or manually as a result of
        a validateEntity call on the EntityAspect. The resulting ValidationResults are available via the 
        EntityAspect.getValidationErrors method.

        However, you can also call a validator directly either for testing purposes or some other reason if needed.
        @example
            // using one of the predefined validators
            var validator = Validator.maxLength({ maxLength: 5, displayName: "City" });
            // should be ok because "asdf".length < 5
            var result = validator.validate("asdf");
            ok(result === null);
            result = validator.validate("adasdfasdf");
            // extract all of the properties of the 'result'
            var errMsg = result.errorMessage;
            var context = result.context;
            var sameValidator = result.validator;
        @method validate
        @param value {Object} Value to validate
        @param additionalContext {Object} Any additional contextual information that the Validator
        can make use of.
        @return {ValidationError|null} A ValidationError if validation fails, null otherwise
        **/
        ctor.prototype.validate = function (value, additionalContext) {
            var currentContext;
            if (additionalContext) {
                currentContext = core.extend(Object.create(this.context), additionalContext);
            } else {
                currentContext = this.context;
            }
            this.currentContext = currentContext;
            if (!this.valFn(value, currentContext)) {
                currentContext.value = value;
                var valContext = {
                    property: currentContext.property,
                    value: value
                };
                return new ValidationError(this, valContext, this.getMessage());
            }
            return null;
        };


        // context.value is not avail unless validate was called first.

        /**
        Returns the message generated by the most recent execution of this Validator.
        @example
            var v0 = Validator.maxLength({ maxLength: 5, displayName: "City" });
            v0.validate("adasdfasdf");
            var errMessage = v0.getMessage());
        @method getMessage
        @return {String}
        **/
        ctor.prototype.getMessage = function () {
            try {
                var context = this.currentContext;
                var message = context.message;
                if (message) {
                    if (typeof (message) == "function") {
                        return message(context);
                    } else {
                        return message;
                    }
                } else if (context.messageTemplate) {
                    return formatTemplate(context.messageTemplate, context);
                } else {
                    return "invalid value: " + this.validatorName || "{unnamed validator}";
                }
            } catch (e) {
                return "Unable to format error message" + e.toString();
            }
        };

        ctor.prototype.toJSON = function () {
            return this._baseContext;
        };

        ctor.fromJSON = function (json) {
            var validatorName = "Validator." + json.validatorName;
            var fn = a_config.functionRegistry[validatorName];
            if (!fn) {
                throw new Error("Unable to locate a validator named:" + json.validatorName);
            }
            return fn(json);
        };

        /**
        Map of standard error message templates keyed by validator name.
        You can add to or modify this object to customize the template used for any validation error message.
        @example
            // v is this function is the value to be validated, in this case a "country" string.
            var valFn = function (v) {
                if (v == null) return true;
                return (core.stringStartsWith(v, "US"));
            };
            var countryValidator = new Validator("countryIsUS", valFn, { displayName: "Country" }); 
            Validator.messageTemplates["countryIsUS", "'%displayName%' must start with 'US'");
        This will have a similar effect to this
             var countryValidator = new Validator("countryIsUS", valFn, { 
                displayName: "Country", 
                messageTemplate: "'%displayName%' must start with 'US'" 
            });
        @property messageTemplates {Object}
        @static
        **/
        ctor.messageTemplates = {
            required: "'%displayName%' is required",
            date: "'%displayName%' must be a date",
            string: "'%displayName%' must be a string",
            bool: "'%displayName%' must be a 'true' or 'false' value",
            guid: "'%displayName%' must be a GUID",
            number: "'%displayName%' must be a number",
            integer: "'%displayName%' must be an integer",
            integerRange: "'%displayName%' must be an integer between the values of %minValue% and %maxValue%",
            maxLength: "'%displayName%' must be a string with less than %maxLength% characters",
            stringLength: "'%displayName%' must be a string with between %minLength% and %maxLength% characters"
        };

        /**
        Returns a standard 'required value' Validator
        @example
            // Assume em1 is a preexisting EntityManager.
            var custType = em1.metadataStore.getEntityType("Customer");
            var regionProperty - custType.getProperty("Region");
            // Makes "Region" on Customer a required property.
            regionProperty.validators.push(Validator.required());
        @method required
        @static
        @return {Validator} A new Validator
        **/
        ctor.required = function () {
            var valFn = function (v, ctx) {
                if (typeof v === "string") {
                    if (ctx && ctx.allowEmptyStrings) return true;
                    return v.length > 0;
                } else {
                    return v != null;
                }
            };
            return new ctor("required", valFn);
        };

        /**
        Returns a standard maximum string length Validator; the maximum length must be specified
        @example
            // Assume em1 is a preexisting EntityManager.
            var custType = em1.metadataStore.getEntityType("Customer");
            var regionProperty - custType.getProperty("Region");
            // Validates that the value of the Region property on Customer will be less than or equal to 5 characters.
            regionProperty.validators.push(Validator.maxLength( {maxLength: 5}));
        @method maxLength
        @static
        @param context {Object} 
        @param context.maxLength {Integer}
        @return {Validator} A new Validator
        **/
        ctor.maxLength = function (context) {
            var valFn = function (v, ctx) {
                if (v == null) return true;
                if (typeof (v) != "string") return false;
                return v.length <= ctx.maxLength;
            };
            return new ctor("maxLength", valFn, context);
        };

        /**
        Returns a standard maximum string length Validator; both minimum and maximum lengths must be specified.
        @example
            // Assume em1 is a preexisting EntityManager.
            var custType = em1.metadataStore.getEntityType("Customer");
            var regionProperty - custType.getProperty("Region");
            // Validates that the value of the Region property on Customer will be 
            // between 2 and 5 characters
            regionProperty.validators.push(Validator.stringLength( {minLength: 2, maxLength: 5});
        @method stringLength
        @static
        @param context {Object} 
        @param context.maxLength {Integer}
        @param context.minLength {Integer}
        @return {Validator} A new Validator
        **/
        ctor.stringLength = function (context) {
            var valFn = function (v, ctx) {
                if (v == null) return true;
                if (typeof (v) != "string") return false;
                if (ctx.minLength != null && v.length < ctx.minLength) return false;
                if (ctx.maxLength != null && v.length > ctx.maxLength) return false;
                return true;
            };
            return new ctor("stringLength", valFn, context);
        };

        /**
        Returns a standard string dataType Validator.
        @example
            // Assume em1 is a preexisting EntityManager.
            var custType = em1.metadataStore.getEntityType("Customer");
            var regionProperty - custType.getProperty("Region");
            // Validates that the value of the Region property on Customer is a string.
            regionProperty.validators.push(Validator.string());
        @method string
        @static
        @return {Validator} A new Validator
        **/
        ctor.string = function () {
            var valFn = function (v) {
                if (v == null) return true;
                return (typeof v === "string");
            };
            return new ctor("string", valFn );
        };

        /**
        Returns a standard string data type Validator.
        @example
            // Assume em1 is a preexisting EntityManager.
            var custType = em1.metadataStore.getEntityType("Customer");
            var customerIdProperty - custType.getProperty("CustomerID");
            // Validates that the value of the CustomerID property on Customer is a Guid.
            customerIdProperty.validators.push(Validator.guid());
        @method guid
        @static
        @return {Validator} A new Validator
        **/
        ctor.guid = function () {
            var valFn = function (v) {
                if (v == null) return true;
                return core.isGuid(v);
            };
            return new ctor("guid", valFn);
        };

        /**
        Returns a standard numeric data type Validator.
        @example
            // Assume em1 is a preexisting EntityManager.
            var orderType = em1.metadataStore.getEntityType("Order");
            var freightProperty - orderType.getProperty("Freight");
            // Validates that the value of the Freight property on Order is a number.
            freightProperty.validators.push(Validator.number());
        @method number 
        @static
        @return {Validator} A new Validator
        **/

        // TODO: may need to have seperate logic for single.
        ctor.number = ctor.double = ctor.single = function (context) {
            var valFn = function (v, ctx) {
                if (v == null) return true;
                if (typeof v === "string" && ctx && ctx.allowString) {
                    v = parseInt(v, 10);
                }
                return (typeof v === "number" && !isNaN(v));
            };
            return new ctor("number", valFn, context);
        };

        /**
        Returns a standard large integer data type - 64 bit - Validator.
        @example
            // Assume em1 is a preexisting EntityManager.
            var orderType = em1.metadataStore.getEntityType("Order");
            var freightProperty - orderType.getProperty("Freight");
            // Validates that the value of the Freight property on Order is within the range of a 64 bit integer.
            freightProperty.validators.push(Validator.int64());
        @method int64
        @static
        @return {Validator} A new Validator
        **/
        ctor.integer = ctor.int64 = function (context) {
            var valFn = function (v, ctx) {
                if (v == null) return true;
                if (typeof v === "string" && ctx && ctx.allowString) {
                    v = parseInt(v, 10);
                }
                return (typeof v === "number") && (!isNaN(v)) && Math.floor(v) === v;
            };
            return new ctor("integer", valFn, context );
        };

        /**
        Returns a standard 32 bit integer data type Validator.
        @example
            // Assume em1 is a preexisting EntityManager.
            var orderType = em1.metadataStore.getEntityType("Order");
            var freightProperty - orderType.getProperty("Freight");
            freightProperty.validators.push(Validator.int32());
        @method int32
        @static
        @return {Validator} A new Validator
        **/
        ctor.int32 = function(context) {
            return intRangeValidatorCtor("int32", INT32_MIN, INT32_MAX, context)();
        };

        /**
        Returns a standard 16 bit integer data type Validator.
        @example
            // Assume em1 is a preexisting EntityManager.
            var orderType = em1.metadataStore.getEntityType("Order");
            var freightProperty - orderType.getProperty("Freight");
            // Validates that the value of the Freight property on Order is within the range of a 16 bit integer.
            freightProperty.validators.push(Validator.int16());
        @method int16
        @static
        @return {Validator} A new Validator
        **/
        ctor.int16 = function (context) {
            return intRangeValidatorCtor("int16", INT16_MIN, INT16_MAX, context)();
        };

        /**
        Returns a standard byte data type Validator. (This is a integer between 0 and 255 inclusive for js purposes).
        @example
            // Assume em1 is a preexisting EntityManager.
            var orderType = em1.metadataStore.getEntityType("Order");
            var freightProperty - orderType.getProperty("Freight");
            // Validates that the value of the Freight property on Order is within the range of a 16 bit integer.
            // Probably not a very good validation to place on the Freight property.
            regionProperty.validators.push(Validator.byte());
        @method byte
        @static
        @return {Validator} A new Validator
        **/
        ctor.byte = function (context) {
            return intRangeValidatorCtor("byte", BYTE_MIN, BYTE_MAX, context)();
        };

        /**
        Returns a standard boolean data type Validator.
        @example
            // Assume em1 is a preexisting EntityManager.
            var productType = em1.metadataStore.getEntityType("Product");
            var discontinuedProperty - productType.getProperty("Discontinued");
            // Validates that the value of the Discontinued property on Product is a boolean
            discontinuedProperty.validators.push(Validator.bool());
        @method bool
        @static
        @return {Validator} A new Validator
        **/
        ctor.bool = function () {
            var valFn = function (v) {
                if (v == null) return true;
                return (v === true) || (v === false);
            };
            return new ctor("bool", valFn );
        };

        ctor.none = function () {
            var valFn = function (v) {
                return true;
            };
            return new ctor("none", valFn);
        };

        /**
        Returns a standard date data type Validator.
        @example
            // Assume em1 is a preexisting EntityManager.
            var orderType = em1.metadataStore.getEntityType("Order");
            var orderDateProperty - orderType.getProperty("OrderDate");
            // Validates that the value of the OrderDate property on Order is a date
            // Probably not a very good validation to place on the Freight property.
            orderDateProperty.validators.push(Validator.date());
        @method date
        @static
        @return {Validator} A new Validator
        **/
        ctor.date = function () {
            var valFn = function (v) {
                if (v == null) return true;
                if (typeof v === "string") {
                    try {
                        return !isNaN(Date.parse(v));
                        // old code
                        // return core.isDate(new Date(v));
                    } catch (e) {
                        return false;
                    }
                } else {
                    return core.isDate(v);
                }
            };
            return new ctor("date", valFn );
        };

        // register all validators
        core.objectForEach(ctor, function (key, value) {
            if (typeof (value) !== "function") {
                return;
            }
            if (key === "fromJSON" || key === "createValidator") {
                return;
            }

            a_config.registerFunction(value, "Validator." + key);
        });


        // private funcs

        function formatTemplate(template, vars, ownPropertiesOnly) {
            if (!vars) return template;
            return template.replace(/%([^%]+)%/g, function (_, key) {
                var valOrFn;
                if (ownPropertiesOnly) {
                    valOrFn = vars.hasOwnProperty(key) ? vars[key] : '';
                } else {
                    valOrFn = vars[key];
                }
                if (valOrFn) {
                    if (core.isFunction(valOrFn)) {
                        return valOrFn(vars);
                    } else {
                        return valOrFn;
                    }
                } else {
                    return "";
                }
            });
        }

        function intRangeValidatorCtor(validatorName, minValue, maxValue, context) {
            ctor.messageTemplates[validatorName] = core.formatString("'%displayName%' must be an integer between the values of %1 and %2",
                minValue, maxValue);
            return function () {
                var valFn = function (v, ctx) {
                    if (v == null) return true;
                    if (typeof v === "string" && ctx && ctx.allowString)  {
                        v = parseInt(v, 0);
                    }
                    if ((typeof v === "number") && (!isNaN(v)) && Math.floor(v) === v) {
                        if (minValue != null && v < minValue) {
                            return false;
                        }
                        if (maxValue != null && v > maxValue) {
                            return false;
                        }
                        return true;
                    } else {
                        return false;
                    }
                };
                return new ctor(validatorName, valFn, context);
            };

        }

        return ctor;
    } ();

    var ValidationError = function () {
         /**
        A ValidatationError is used to describe a failed validation.

        @class ValidationError
        **/
        
        /**
        @method <ctor> ValidationError
        @param validator {Validator}
        @param context {Object}
        @param errorMessage {String}
        **/
        var ctor = function (validator, context, errorMessage) {
            assertParam(validator, "validator").isString().or().isInstanceOf(Validator).check();

            this.validator = validator;
            this.context = context || {};
            this.property = context ? context.property : null;
            this.errorMessage = errorMessage;
            this.key = ValidationError.getKey(validator, this.property);
        };
        
        /**
        The Validator associated with this ValidationError.

        __readOnly__
        @property validator {Validator}
        **/
        
        /**
        A 'context' object associated with this ValidationError.

        __readOnly__
        @property context {Object}
        **/
        
        /**
        The DataProperty or NavigationProperty associated with this ValidationError.

        __readOnly__
        @property property {DataProperty|NavigationProperty}
        **/
        
        /**
        The error message associated with the ValidationError.

        __readOnly__
        @property errorMessage {string}
        **/

        ctor.getKey = function (validator, property) {
            return (property ? property.name : "") + ":" + validator.name;
        };

        return ctor;
    } ();

    return {
        Validator: Validator,
        ValidationError: ValidationError
    };
});


define('entityAspect',["core", "config", "validate"],
function (core, a_config, m_validate) {
    /**
    @module breeze   
    **/

    var Enum = core.Enum;
    var Event = core.Event;
    var assertParam = core.assertParam;

    var Validator = m_validate.Validator;
    var ValidationError = m_validate.ValidationError;

    var v_modelLibraryDef = a_config.interfaceRegistry.modelLibrary;   

    var EntityState = (function () {
        /**
        EntityState is an 'Enum' containing all of the valid states for an 'Entity'.

        @class EntityState
        @static
        **/
        var entityStateMethods = {
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isUnchanged();
            is the same as
            @example
                return es === EntityState.Unchanged;
            @method isUnchanged
            @return {Boolean} Whether an entityState instance is EntityState.Unchanged.
            **/
            isUnchanged: function () { return this === EntityState.Unchanged; },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isAdded();
            is the same as
            @example
                return es === EntityState.Added;
            @method isAdded
            @return {Boolean} Whether an entityState instance is EntityState.Added.
            **/
            isAdded: function () { return this === EntityState.Added; },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isModified();
            is the same as
            @example
                return es === EntityState.Modified;
            @method isModified
            @return {Boolean} Whether an entityState instance is EntityState.Modified.
            **/
            isModified: function () { return this === EntityState.Modified; },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isDeleted();
            is the same as
            @example
                return es === EntityState.Deleted;
            @method isDeleted
            @return  {Boolean} Whether an entityState instance is EntityState.Deleted.
            **/
            isDeleted: function () { return this === EntityState.Deleted; },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isDetached();
            is the same as
            @example
                return es === EntityState.Detached;
            @method isDetached
            @return  {Boolean} Whether an entityState instance is EntityState.Detached.
            **/
            isDetached: function () { return this === EntityState.Detached; },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isUnchangedOrModified();
            is the same as
            @example
                return es === EntityState.Unchanged || es === EntityState.Modified
            @method isUnchangedOrModified
            @return {Boolean} Whether an entityState instance is EntityState.Unchanged or EntityState.Modified.
            **/
            isUnchangedOrModified: function () {
                return this === EntityState.Unchanged || this === EntityState.Modified;
            },
            /**
            @example
                var es = anEntity.entityAspect.entityState;
                return es.isAddedModifiedOrDeleted();
            is the same as
            @example
                return es === EntityState.Added || es === EntityState.Modified || es === EntityState.Deleted
            @method isAddedModifiedOrDeleted
            @return {Boolean} Whether an entityState instance is EntityState.Unchanged or EntityState.Modified or EntityState.Deleted.
            **/
            isAddedModifiedOrDeleted: function () {
                return this === EntityState.Added ||
                    this === EntityState.Modified ||
                    this === EntityState.Deleted;
            }
        };

        var EntityState = new Enum("EntityState", entityStateMethods);
        /**
        The 'Unchanged' state.

        @property Unchanged {EntityState}
        @final
        @static
        **/
        EntityState.Unchanged = EntityState.addSymbol();
        /**
        The 'Added' state.

        @property Added {EntityState}
        @final
        @static
        **/
        EntityState.Added = EntityState.addSymbol();
        /**
        The 'Modified' state.

        @property Modified {EntityState}
        @final
        @static
        **/
        EntityState.Modified = EntityState.addSymbol();
        /**
        The 'Deleted' state.

        @property Deleted {EntityState}
        @final
        @static
        **/
        EntityState.Deleted = EntityState.addSymbol();
        /**
        The 'Detached' state.

        @property Detached {EntityState}
        @final
        @static
        **/
        EntityState.Detached = EntityState.addSymbol();
        EntityState.seal();
        return EntityState;
    })();
    
    var EntityAction = (function () {
        /**
        EntityAction is an 'Enum' containing all of the valid actions that can occur to an 'Entity'.

        @class EntityAction
        @static
        **/
        var entityActionMethods = {
            isAttach: function () { return !!this.isAttach; },
            isDetach: function () { return !!this.isDetach; },
            isModification: function () { return !!this.isModification; }
        };

        var EntityAction = new Enum("EntityAction", entityActionMethods);
        
        /**
        Attach - Entity was attached via an AttachEntity call.

        @property Attach {EntityAction}
        @final
        @static
        **/
        EntityAction.Attach = EntityAction.addSymbol({ isAttach: true});
        
        /**
        AttachOnQuery - Entity was attached as a result of a query.

        @property AttachOnQuery {EntityAction}
        @final
        @static
        **/
        EntityAction.AttachOnQuery = EntityAction.addSymbol({ isAttach: true});
        
        /**
        AttachOnImport - Entity was attached as a result of an import.

        @property AttachOnImport {EntityAction}
        @final
        @static
        **/
        EntityAction.AttachOnImport = EntityAction.addSymbol({ isAttach: true});
        
        
        /**
        AttachOnQuery - Entity was detached.

        @property Detach {EntityAction}
        @final
        @static
        **/
        EntityAction.Detach = EntityAction.addSymbol( { isDetach: true });
        
        /**
        MergeOnQuery - Properties on the entity were merged as a result of a query.

        @property MergeOnQuery {EntityAction}
        @final
        @static
        **/
        EntityAction.MergeOnQuery = EntityAction.addSymbol( { isModification: true });
        
        /**
        MergeOnImport - Properties on the entity were merged as a result of an import.

        @property MergeOnImport {EntityAction}
        @final
        @static
        **/
        EntityAction.MergeOnImport = EntityAction.addSymbol( { isModification: true });
        
        /**
        MergeOnImport - Properties on the entity were merged as a result of a save

        @property MergeOnImport {EntityAction}
        @final
        @static
        **/
        EntityAction.MergeOnSave = EntityAction.addSymbol( { isModification: true });
        
        /**
        PropertyChange - A property on the entity was changed.

        @property PropertyChange {EntityAction}
        @final
        @static
        **/
        EntityAction.PropertyChange = EntityAction.addSymbol({ isModification: true});
        
        /**
        EntityStateChange - The EntityState of the entity was changed.

        @property EntityStateChange {EntityAction}
        @final
        @static
        **/
        EntityAction.EntityStateChange = EntityAction.addSymbol();
        
        
        /**
        AcceptChanges - AcceptChanges was called on the entity, or its entityState was set to Unmodified.

        @property AcceptChanges {EntityAction}
        @final
        @static
        **/
        EntityAction.AcceptChanges = EntityAction.addSymbol();

        /**
        RejectChanges - RejectChanges was called on the entity.

        @property RejectChanges {EntityAction}
        @final
        @static
        **/
        EntityAction.RejectChanges = EntityAction.addSymbol({ isModification: true});
        
        /**
        Clear - The EntityManager was cleared.  All entities detached.

        @property Clear {EntityAction}
        @final
        @static
        **/
        EntityAction.Clear = EntityAction.addSymbol({ isDetach: true});
        
        EntityAction.seal();
        return EntityAction;
    })();

    var EntityAspect = function () {
        /**
        An EntityAspect instance is associated with every attached entity and is accessed via the entity's 'entityAspect' property. 
        
        The EntityAspect itself provides properties to determine and modify the EntityState of the entity and has methods 
        that provide a variety of services including validation and change tracking.

        An EntityAspect will almost never need to be constructed directly. You will usually get an EntityAspect by accessing
        an entities 'entityAspect' property.  This property will be automatically attached when an entity is created via either 
        a query, import or EntityManager.createEntity call.
        
            // assume order is an order entity attached to an EntityManager.
            var aspect = order.entityAspect;
            var currentState = aspect.entityState;
        @class EntityAspect
        **/
        var ctor = function (entity, deferInitialization) {
            if (!entity) {
                throw new Error("The EntityAspect ctor requires an entity as its only argument.");
            }
            if (entity.entityAspect) {
                return entity.entityAspect;
            }
            // if called without new
            if (!(this instanceof EntityAspect)) {
                return new EntityAspect(entity, deferInitialization);
            }

            // entityType should already be on the entity from 'watch'
            this.entity = entity;
            entity.entityAspect = this;

            // TODO: keep public or not?
            this.entityGroup = null;
            this.entityManager = null;
            this.entityState = EntityState.Detached;
            this.isBeingSaved = false;
            this.originalValues = {};
            this._validationErrors = {};
            this.validationErrorsChanged = new Event("validationErrorsChanged_entityAspect", this);
            this.propertyChanged = new Event("propertyChanged_entityAspect", this);
            var entityType = entity.entityType;
            if (!entityType) {
                var typeName = entity.prototype._$typeName;
                if (!typeName) {
                    throw new Error("This entity is not registered as a valid EntityType");
                } else {
                    throw new Error("Metadata for this entityType has not yet been resolved: " + typeName);
                }
            }
            var entityCtor = entityType.getEntityCtor();
            v_modelLibraryDef.defaultInstance.startTracking(entity, entityCtor.prototype);
            if (!deferInitialization) {
                this._postInitialize();
            }

        };

        ctor.prototype._postInitialize = function () {
            var entity = this.entity;
            var entityCtor = entity.entityType.getEntityCtor();
            var initFn = entityCtor._$initializationFn;
            if (initFn) {
                if (typeof initFn === "string") {
                    entity[initFn](entity);
                } else {
                    entityCtor._$initializationFn(entity);
                }
            }
        };

        Event.bubbleEvent(ctor.prototype, function() {
            return this.entityManager;
        });

        /**
        The Entity that this aspect is associated with.

        __readOnly__
        @property entity {Entity} 
        **/

        /**
        The {{#crossLink "EntityManager"}}{{/crossLink}} that contains this entity.

        __readOnly__
        @property entityManager {EntityManager}
        **/

        /**
        The {{#crossLink "EntityState"}}{{/crossLink}} of this entity.

        __readOnly__
        @property entityState {EntityState}
        **/
        
          /**
        Whether this entity is in the process of being saved.

        __readOnly__
        @property isBeingSaved {Boolean}
        **/

        /**
        The 'original values' of this entity where they are different from the 'current values'. 
        This is a map where the key is a property name and the value is the 'original value' of the property.

        __readOnly__
        @property originalValues {Object} 
        **/

        /**
        An {{#crossLink "Event"}}{{/crossLink}} that fires whenever a value of one of this entity's properties change.
        @example
            // assume order is an order entity attached to an EntityManager.
            order.entityAspect.propertyChanged.subscribe(
                function (propertyChangedArgs) {
                    // this code will be executed anytime a property value changes on the 'order' entity.
                    var entity = propertyChangedArgs.entity; // Note: entity === order
                    var propertyNameChanged = propertyChangedArgs.propertyName;
                    var oldValue = propertyChangedArgs.oldValue;
                    var newValue = propertyChangedArgs.newValue;
                });
        @event propertyChanged 
        @param entity {Entity} The entity whose property is changing.
        @param propertyName {String} The property that changed. This value will be 'null' for operations that replace the entire entity.  This includes
        queries, imports and saves that require a merge. The remaining parameters will not exist in this case either.
        @param oldValue {Object} The old value of this property before the change.
        @param newValue {Object} The new value of this property after the change.
        @readOnly
        **/

        /**
        An {{#crossLink "Event"}}{{/crossLink}} that fires whenever any of the validation errors on this entity change. 
        Note that this might be the removal of an error when some data on the entity is fixed. 
        @example
            // assume order is an order entity attached to an EntityManager.
            order.entityAspect.validationErrorsChanged.subscribe(
                function (validationChangeArgs) {
                    // this code will be executed anytime a property value changes on the 'order' entity.
                    var entity == validationChangeArgs.entity; // Note: entity === order
                    var errorsAdded = validationChangeArgs.added;
                    var errorsCleared = validationChangeArgs.removed;
                });
        @event validationErrorsChanged 
        @param entity {Entity} The entity on which the validation errors are being added or removed.
        @param added {Array of ValidationError} An array containing any newly added {{#crossLink "ValidationError"}}{{/crossLink}}s
        @param removed {Array of ValidationError} An array containing any newly removed {{#crossLink "ValidationError"}}{{/crossLink}}s. This is those
        errors that have been 'fixed'
        @readOnly
        **/

        /**
        Returns the {{#crossLink "EntityKey"}}{{/crossLink}} for this Entity. 
        @example
             // assume order is an order entity attached to an EntityManager.
            var entityKey = order.entityAspect.getKey();
        @method getKey
        @param [forceRefresh=false] {Boolean} Forces the recalculation of the key.  This should normally be unnecessary.
        @return {EntityKey} The {{#crossLink "EntityKey"}}{{/crossLink}} associated with this Entity.
        **/
        ctor.prototype.getKey = function (forceRefresh) {
            forceRefresh = core.assertParam(forceRefresh, "forceRefresh").isBoolean().isOptional().check(false);
            if (forceRefresh || !this._entityKey) {
                var entityType = this.entity.entityType;
                var keyProps = entityType.keyProperties;
                var values = keyProps.map(function (p) {
                    return this.entity.getProperty(p.name);
                }, this);
                this._entityKey = new EntityKey(entityType, values);
            }
            return this._entityKey;
        };

        /**
        Returns the entity to an {{#crossLink "EntityState"}}{{/crossLink}} of 'Unchanged' by committing all changes made since the entity was last queried 
        had 'acceptChanges' called on it. 
        @example
             // assume order is an order entity attached to an EntityManager.
             order.entityAspect.acceptChanges();
             // The 'order' entity will now be in an 'Unchanged' state with any changes committed.
        @method acceptChanges
        **/
        ctor.prototype.acceptChanges = function () {
            var em = this.entityManager;
            if (this.entityState.isDeleted()) {
                em.detachEntity(this.entity);
            } else {
                this.setUnchanged();
            }
            em.entityChanged.publish({ entityAction: EntityAction.AcceptChanges, entity: this.entity });
        };

        /**
        Returns the entity to an EntityState of 'Unchanged' by rejecting all changes made to it since the entity was last queried 
        had 'rejectChanges' called on it. 
        @example
             // assume order is an order entity attached to an EntityManager.
             order.entityAspect.rejectChanges();
             // The 'order' entity will now be in an 'Unchanged' state with any changes rejected. 
        @method rejectChanges
        **/
        ctor.prototype.rejectChanges = function () {
            var originalValues = this.originalValues;
            var entity = this.entity;
            var entityManager = this.entityManager;
            // we do not want PropertyChange or EntityChange events to occur here
            core.using(entityManager, "isRejectingChanges", true, function() {
                for (var propName in originalValues) {
                    entity.setProperty(propName, originalValues[propName]);
                }
            });
            if (this.entityState.isAdded()) {
                // next line is needed becuase the following line will cause this.entityManager -> null;
                entityManager.detachEntity(entity);
                // need to tell em that an entity that needed to be saved no longer does.
                entityManager._notifyStateChange(entity, false);
            } else {
                if (this.entityState.isDeleted()) {
                    this.entityManager._linkRelatedEntities(entity);
                } 
                this.setUnchanged();
                // propertyChanged propertyName is null because more than one property may have changed.
                this.propertyChanged.publish({ entity: entity, propertyName: null });
                this.entityManager.entityChanged.publish({ entityAction: EntityAction.RejectChanges, entity: entity });
            }
        };

        /**
        Sets the entity to an EntityState of 'Unchanged'.  This is also the equivalent of calling {{#crossLink "EntityAspect/acceptChanges"}}{{/crossLink}}
         @example
             // assume order is an order entity attached to an EntityManager.
             order.entityAspect.setUnchanged();
             // The 'order' entity will now be in an 'Unchanged' state with any changes committed.
        @method setUnchanged
        **/
        ctor.prototype.setUnchanged = function () {
            this.originalValues = {};
            delete this.hasTempKey;
            this.entityState = EntityState.Unchanged;
            this.entityManager._notifyStateChange(this.entity, false);
        };

        // Dangerous method - see notes - talk to Jay - this is not a complete impl
        //        ctor.prototype.setAdded = function () {
        //            this.originalValues = {};
        //            this.entityState = EntityState.Added;
        //            if (this.entity.entityType.autoGeneratedKeyType !== AutoGeneratedKeyType.None) {
        //                this.entityManager.generateTempKeyValue(this.entity);
        //            }
        //        };

        /**
        Sets the entity to an EntityState of 'Modified'.  This can also be achieved by changing the value of any property on an 'Unchanged' entity.
        @example
            // assume order is an order entity attached to an EntityManager.
            order.entityAspect.setModified();
            // The 'order' entity will now be in a 'Modified' state. 
        @method setModified
        **/
        ctor.prototype.setModified = function () {
            this.entityState = EntityState.Modified;
            this.entityManager._notifyStateChange(this.entity, true);
        };

        /**
        Sets the entity to an EntityState of 'Deleted'.  This both marks the entity as being scheduled for deletion during the next 'Save' call
        but also removes the entity from all of its related entities. 
        @example
            // assume order is an order entity attached to an EntityManager.
            order.entityAspect.setDeleted();
            // The 'order' entity will now be in a 'Deleted' state and it will no longer have any 'related' entities. 
        @method setDeleted
        **/
        ctor.prototype.setDeleted = function () {
            if (this.entityState.isAdded()) {
                this.entityManager.detachEntity(this.entity);
            } else {
                this.entityState = EntityState.Deleted;
                this._removeFromRelations();
                this.entityManager._notifyStateChange(this.entity, true);
            }
            // TODO: think about cascade deletes
        };

        /**
        Performs validation on the entity, any errors encountered during the validation are available via the 
        {{#crossLink "EntityAspect.getValidationErrors"}}{{/crossLink}} method. Validating an entity means executing
        all of the validators on both the entity itself as well as those on each of its properties.
        @example
            // assume order is an order entity attached to an EntityManager.
            var isOk = order.entityAspect.validateEntity();
            // isOk will be 'true' if there are no errors on the entity.
            if (!isOk) {
                var errors = order.entityAspect.getValidationErrors();
            }
        @method validateEntity
        @return {Boolean} Whether the entity passed validation.
        **/
        ctor.prototype.validateEntity = function () {
            var ok = true;
            var entityType = this.entity.entityType;
            this._processValidationOpAndPublish(function (that) {
                // property level first
                entityType.getProperties().forEach(function (p) {
                    var value = that.entity.getProperty(p.name);
                    if (p.validators.length > 0) {
                        ok = that._validateProperty(p, value) && ok;
                    }
                });
                // then entity level
                entityType.validators.forEach(function (validator) {
                    ok = validate(that, validator, that.entity) && ok;
                });
            });

            return ok;
        };

        /**
        Performs validation on a specific property of this entity, any errors encountered during the validation are available via the 
        {{#crossLink "EntityAspect.getValidationErrors"}}{{/crossLink}} method. Validating a property means executing
        all of the validators on the specified property.  This call is also made automatically anytime a property
        of an entity is changed.
        @example
            // assume order is an order entity attached to an EntityManager.
            var isOk = order.entityAspect.validateProperty("Order"); 
        or
        @example
            var orderDateProperty = order.entityType.getProperty("OrderDate");
            var isOk = order.entityAspect.validateProperty(OrderDateProperty); 
        @method validateProperty
        @param property {DataProperty|NavigationProperty} The {{#crossLink "DataProperty"}}{{/crossLink}} or 
        {{#crossLink "NavigationProperty"}}{{/crossLink}} to validate.
        @param [context] {Object} A context object used to pass additional information to each  {{#crossLink "Validator"}}{{/crossLink}}
        @return {Boolean} Whether the entity passed validation.
        **/
        ctor.prototype.validateProperty = function (property, context) {
            assertParam(property, "property").isString().or().isEntityProperty().check();
            if (typeof (property) === 'string') {
                property = this.entity.entityType.getProperty(property, true);
            }

            var value = this.entity.getProperty(property.name);
            return this._validateProperty(property, value, context);
        };

        /**
        Returns the validation errors associated with either the entire entity or any specified property.
        @example
        This method can return all of the errors for an Entity
        @example
            // assume order is an order entity attached to an EntityManager.
            var valErrors = order.entityAspect.getValidationErrors();
        as well as those for just a specific property.
        @example
            // assume order is an order entity attached to an EntityManager.
            var orderDateErrors = order.entityAspect.getValidationErrors("OrderDate");
        which can also be expressed as
        @example
            // assume order is an order entity attached to an EntityManager.
            var orderDateProperty = order.entityType.getProperty("OrderDate");
            var orderDateErrors = order.entityAspect.getValidationErrors(orderDateProperty);
        @method getValidationErrors
        @param [property] {DataProperty|NavigationProperty} The property for which validation errors should be retrieved.
        If omitted, all of the validation errors for this entity will be returned.
        @return {Array of ValidationError}
        **/
        ctor.prototype.getValidationErrors = function (property) {
            assertParam(property, "property").isOptional().isEntityProperty().or().isString();
            var result = core.getOwnPropertyValues(this._validationErrors);
            if (property) {
                var propertyName = typeof (property) === 'string' ? property : property.name;
                result = result.filter(function (ve) {
                    return (ve.property.name === propertyName);
                });
            }
            return result;
        };

        /**
        Adds a validation error for a specified property.
        @method addValidationError
        @param validationError {ValidationError} 
        **/
        ctor.prototype.addValidationError = function (validationError) {
            assertParam(validationError, "validationError").isInstanceOf(ValidationError).check();
            this._processValidationOpAndPublish(function (that) {
                that._addValidationError(validationError);
            });
        };

        /**
        Removes a validation error for a specified property.
        @method removeValidationError
        @param validator {Validator}
        @param [property] {DataProperty|NavigationProperty}
        **/
        ctor.prototype.removeValidationError = function (validator, property) {
            assertParam(validator, "validator").isString().or().isInstanceOf(Validator).check();
            assertParam(property, "property").isOptional().isEntityProperty();
            this._processValidationOpAndPublish(function (that) {
                that._removeValidationError(validator, property);
            });
        };

        /**
        Performs a query for the value of a specified {{#crossLink "NavigationProperty"}}{{/crossLink}}.
        @example
               emp.entityAspect.loadNavigationProperty("Orders")
                .then(function (data) {
                    var orders = data.results;
                }).fail(function (exception) {
                    // handle exception here;
                });
        @method loadNavigationProperty
        @async
        @param navigationProperty {NavigationProperty} The NavigationProperty to 'load'.
        @param [callback] {Function} Function to call on success.
        @param [errorCallback] {Function} Function to call on failure.
        @return {Promise} 

            promiseData.results {Array of Entity}
            promiseData.query {EntityQuery} The original query
            promiseData.XHR {XMLHttpRequest} The raw XMLHttpRequest returned from the server.
        **/
        // This method is provided in entityQuery.js.
        // ctor.prototype.loadNavigationProperty = function(navigationProperty, callback, errorCallback) 

        // returns null for np's that do not have a parentKey
        ctor.prototype.getParentKey = function (navigationProperty) {
            // NavigationProperty doesn't yet exist
            // core.assertParam(navigationProperty, "navigationProperty").isInstanceOf(NavigationProperty).check();
            var fkNames = navigationProperty.foreignKeyNames;
            if (fkNames.length === 0) return null;
            var that = this;
            var fkValues = fkNames.map(function (fkn) {
                return that.entity.getProperty(fkn);
            });
            return new EntityKey(navigationProperty.entityType, fkValues);
        };

        // internal methods

        ctor.prototype._removeFromRelations = function () {
            var entity = this.entity;

            // remove this entity from any collections.
            // mark the entity deleted
            entity.entityType.navigationProperties.forEach(function (np) {
                var inverseNp = np.inverse;
                if (!inverseNp) return;
                var npValue = entity.getProperty(np.name);
                if (np.isScalar) {
                    if (npValue) {
                        if (inverseNp.isScalar) {
                            npValue.setProperty(inverseNp.name, null);
                        } else {
                            var collection = npValue.getProperty(inverseNp.name);
                            if (collection.length) {
                                core.arrayRemoveItem(collection, entity);
                            }
                        }
                    }
                } else {
                    // npValue is a live list so we need to copy it first.
                    npValue.slice(0).forEach(function (v) {
                        if (inverseNp.isScalar) {
                            v.setProperty(inverseNp.name, null);
                        } else {
                            // TODO: many to many - not yet handled.
                        }
                    });
                    // now clear it.
                    npValue.length = 0;
                }
            });

        };

        // called from defaultInterceptor.
        ctor.prototype._validateProperty = function (property, value, context) {
            var ok = true;
            this._processValidationOpAndPublish(function (that) {
                if (context) {
                    context.property = property;
                } else {
                    context = { property: property };
                }
                property.validators.forEach(function (validator) {
                    ok = ok && validate(that, validator, value, context);
                });
            });
            return ok;
        };

        ctor.prototype._processValidationOpAndPublish = function (validationFn) {
            if (this._pendingValidationResult) {
                // only top level processValidations call publishes
                validationFn(this);
            } else {
                try {
                    this._pendingValidationResult = { entity: this.entity, added: [], removed: [] };
                    validationFn(this);
                    if (this._pendingValidationResult.added.length > 0 || this._pendingValidationResult.removed.length > 0) {
                        this.validationErrorsChanged.publish(this._pendingValidationResult);
                    }
                } finally {
                    this._pendingValidationResult = undefined;
                }
            }
        };

        ctor.prototype._addValidationError = function (validationError) {
            this._validationErrors[validationError.key] = validationError;
            this._pendingValidationResult.added.push(validationError);
        };

        ctor.prototype._removeValidationError = function (validator, property) {
            var key = ValidationError.getKey(validator, property);
            var valError = this._validationErrors[key];
            if (valError) {
                delete this._validationErrors[key];
                this._pendingValidationResult.removed.push(valError);
            }
        };

        function validate(aspect, validator, value, context) {
            var ve = validator.validate(value, context);
            if (ve) {
                aspect._addValidationError(ve);
                return false;
            } else {
                aspect._removeValidationError(validator, context ? context.property: null);
                return true;
            }
        }

        return ctor;

    } ();

    var EntityKey = (function () {

        var ENTITY_KEY_DELIMITER = ":::";

        /**
        An EntityKey is an object that represents the unique identity of an entity.  EntityKey's are immutable. 

        @class EntityKey
        **/
        
        /** 
        Constructs a new EntityKey.  Each entity within an EntityManager will have a unique EntityKey. 
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var empType = em1.metadataStore.getEntityType("Employee");
            var entityKey = new EntityKey(empType, 1);
        EntityKey's may also be found by calling EntityAspect.getKey()
        @example
            // assume employee1 is an existing Employee entity
            var empKey = employee1.entityAspect.getKey();
        Multipart keys are created by passing an array as the 'keyValues' parameter
        @example
            var empTerrType = em1.metadataStore.getEntityType("EmployeeTerritory");            
            var empTerrKey = new EntityKey(empTerrType, [ 1, 77]);
            // The order of the properties in the 'keyValues' array must be the same as that 
            // returned by empTerrType.keyProperties
        @method <ctor> EntityKey
        @param entityType {EntityType} The {{#crossLink "EntityType"}}{{/crossLink}} of the entity.
        @param keyValues {value|Array of values} A single value or an array of values.
        **/
        var ctor = function (entityType, keyValues) {
            // can't ref EntityType here because of module circularity
            // assertParam(entityType, "entityType").isInstanceOf(EntityType);
            if (!Array.isArray(keyValues)) {
                keyValues = Array.prototype.slice.call(arguments, 1);
            }
            // fluff
            //if (!(this instanceof ctor)) {
            //    return new ctor(entityType, keyValues);
            //}
            this.entityType = entityType;
            this.values = keyValues;
            this._keyInGroup = createKeyString(keyValues);
        };
        ctor._$typeName = "EntityKey";

        ctor.prototype.toJSON = function () {
            return {
                entityType: this.entityType.name,
                values: this.values
            };
        };

        ctor.fromJSON = function (json, metadataStore) {
            var et = metadataStore.getEntityType(json.entityType, true);
            return new EntityKey(et, json.values);
        };

        /**
        Used to compare EntityKeys are determine if they refer to the same Entity.
        There is also an static version of 'equals' with the same functionality. 
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var empType = em1.metadataStore.getEntityType("Employee");
            var empKey1 = new EntityKey(empType, 1);
            // assume employee1 is an existing Employee entity
            var empKey2 = employee1.entityAspect.getKey();
            if (empKey1.equals(empKey2)) {
               // do something  ...
            }
        @method equals
        @param entityKey {EntityKey}
        **/
        ctor.prototype.equals = function (entityKey) {
            if (!(entityKey instanceof EntityKey)) return false;
            return (this.entityType === entityKey.entityType) &&
                core.arrayEquals(this.values, entityKey.values);
        };

        /*
        Returns a human readable representation of this EntityKey.
        @method toString
        */
        ctor.prototype.toString = function () {
            return this.entityType.name + '-' + this._keyInGroup;
        };

        /**
        Used to compare EntityKeys are determine if they refer to the same Entity. 
        There is also an instance version of 'equals' with the same functionality. 
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var empType = em1.metadataStore.getEntityType("Employee");
            var empKey1 = new EntityKey(empType, 1);
            // assume employee1 is an existing Employee entity
            var empKey2 = employee1.entityAspect.getKey();
            if (EntityKey.equals(empKey1, empKey2)) {
               // do something  ...
            }
        @method equals
        @static
        @param k1 {EntityKey}
        @param k2 {EntityKey}
        **/
        ctor.equals = function (k1, k2) {
            if (!(k1 instanceof EntityKey)) return false;
            return k1.equals(k2);
        };

        // TODO: we may want to compare to default values later.
        ctor.prototype._isEmpty = function () {
            return this.values.join("").length === 0;
        };

        ctor._fromRawEntity = function (rawEntity, entityType) {
            var keyValues = entityType.keyProperties.map(function (p) {
                return rawEntity[p.nameOnServer];
            });
            return new EntityKey(entityType, keyValues);
        };



        function createKeyString(keyValues) {
            return keyValues.join(ENTITY_KEY_DELIMITER);
        }

        return ctor;
    })();

    // expose

    return {
        EntityAspect: EntityAspect,
        EntityState: EntityState,
        EntityAction: EntityAction,
        EntityKey: EntityKey
    };


});


define('defaultPropertyInterceptor',["core", "entityAspect"],
function (core, m_entityAspect) {

    var EntityKey = m_entityAspect.EntityKey;
    var EntityState = m_entityAspect.EntityState;
    var EntityAction = m_entityAspect.EntityAction;

    function defaultPropertyInterceptor(property, newValue, rawAccessorFn) {
        // 'this' is the entity itself in this context.

        var oldValue = rawAccessorFn();
        // exit if no change
        if (newValue === oldValue) {
            return;
        }
        var propName = property.name;

        // CANNOT DO NEXT LINE because it has the possibility of creating a new property
        // 'entityAspect' on 'this'.  - Not permitted by IE inside of a defined property on a prototype.
        // var aspect = new EntityAspect(this);

        var aspect = this.entityAspect;
        if (aspect._inProcess && aspect._inProcess === property) {
            // recursion avoided.
            return;
        }

        // TODO: we actually need to handle multiple properties in process. not just one
        // NOTE: this may not be needed because of the newValue === oldValue test above.
        // to avoid recursion.
        // We could use core.using here but decided not to for perf reasons - this method runs a lot.
        // i.e core.using(aspect, "_inProcess", property, function() {...
        aspect._inProcess = property;
        try {

            var entityManager = aspect.entityManager;
            // store an original value for this property if not already set
            if (aspect.entityState.isUnchangedOrModified()) {
                if (!aspect.originalValues[propName] && property.isDataProperty) {
                    // the || property.defaultValue is to insure that undefined -> null; 
                    // otherwise this entry will be skipped during serialization
                    aspect.originalValues[propName] = oldValue || property.defaultValue;
                }
            }

            // set the value
            if (property.isNavigationProperty) {
                if (!property.isScalar) {
                    throw new Error("Nonscalar navigation properties are readonly - entities can be added or removed but the collection may not be changed.");
                }

                var inverseProp = property.inverse;
                var oldSiblings;
                if (newValue) {
                    if (entityManager) {
                        if (newValue.entityAspect.entityState.isDetached()) {
                            if (!entityManager.isLoading) {
                                entityManager.attachEntity(newValue, EntityState.Added);
                            }
                        } else {
                            if (newValue.entityAspect.entityManager !== entityManager) {
                                throw new Error("An Entity cannot be attached to an entity in another EntityManager. One of the two entities must be detached first.");
                            }
                        }
                    } else {
                        if (newValue.entityAspect && newValue.entityAspect.entityManager) {
                            entityManager = newValue.entityAspect.entityManager;
                            var newState = entityManager.isLoading ? EntityState.Unchanged : EntityState.Added;
                            entityManager.attachEntity(aspect.entity, newState);
                        }
                    }
                    
                    // process related updates ( the inverse relationship) first so that collection dups check works properly.
                    // update inverse relationship

                    if (inverseProp) {
                        if (inverseProp.isScalar) {
                            // navigation property change - undo old relation
                            if (oldValue) {
                                // TODO: null -> NullEntity later
                                oldValue.setProperty(inverseProp.name, null);
                            }
                            newValue.setProperty(inverseProp.name, this);
                        } else {
                            // navigation property change - undo old relation
                            if (oldValue) {
                                oldSiblings = oldValue.getProperty(inverseProp.name);
                                var ix = oldSiblings.indexOf(this);
                                if (ix !== -1) {
                                    oldSiblings.splice(ix, 1);
                                }
                            }
                            var siblings = newValue.getProperty(inverseProp.name);
                            // recursion check if already in the collection is performed by the relationArray
                            siblings.push(this);
                        }
                    }
                } else {
                     if (inverseProp) {
                        if (inverseProp.isScalar) {
                            // navigation property change - undo old relation
                            if (oldValue) {
                                // TODO: null -> NullEntity later
                                oldValue.setProperty(inverseProp.name, null);
                            }
                        } else {
                            // navigation property change - undo old relation
                            if (oldValue) {
                                oldSiblings = oldValue.getProperty(inverseProp.name);
                                var ix = oldSiblings.indexOf(this);
                                if (ix !== -1) {
                                    oldSiblings.splice(ix, 1);
                                }
                            }
                        }
                    }
                }

             
                rawAccessorFn(newValue);
                if (entityManager && !entityManager.isLoading) {
                    if (aspect.entityState.isUnchanged() && !property.isUnmapped) {
                        aspect.setModified();
                    }
                    if (entityManager.validationOptions.validateOnPropertyChange) {
                        aspect._validateProperty(property, newValue, { entity: this, oldValue: oldValue });
                    }
                }
                // update fk data property
                if (property.relatedDataProperties) {
                    if (!aspect.entityState.isDeleted()) {
                        var inverseKeyProps = property.entityType.keyProperties;
                        if (inverseKeyProps.length !== 1 && !newValue) {
                            throw new Error("Only single property foreign keys are currently supported.");
                        }
                        var keyProp = inverseKeyProps[0];
                        var relatedValue = newValue ? newValue.getProperty(keyProp.name) : keyProp.defaultValue;

                        this.setProperty(property.relatedDataProperties[0].name, relatedValue);
                    }
                }

            } else {
              
                // updating a dataProperty
                if (property.isPartOfKey && entityManager && !entityManager.isLoading) {
                    
                    var keyProps = this.entityType.keyProperties;
                    var values = keyProps.map(function(p) {
                        if (p == property) {
                            return newValue;
                        } else {
                            return this.getProperty(p.name);
                        }
                    }, this);
                    var newKey = new EntityKey(this.entityType, values);
                    if (entityManager.findEntityByKey(newKey)) {
                        throw new Error("An entity with this key is already in the cache: " + newKey.toString());
                    }
                    var oldKey = this.entityAspect.getKey();
                    var eg = entityManager.findEntityGroup(this.entityType);
                    eg._replaceKey(oldKey, newKey);
                }
                rawAccessorFn(newValue);
                  // NOTE: next few lines are the same as above but not refactored for perf reasons.
                if (entityManager && !entityManager.isLoading) {
                    if (aspect.entityState.isUnchanged() && !property.isUnmapped) {
                        aspect.setModified();
                    }
                    if (entityManager.validationOptions.validateOnPropertyChange) {
                        aspect._validateProperty(property, newValue, { entity: this, oldValue: oldValue });
                    }
                }
                // update corresponding nav property if attached.
                if (property.relatedNavigationProperty && entityManager) {
                    var relatedNavProp = property.relatedNavigationProperty;
                    if (newValue) {
                        var key = new EntityKey(relatedNavProp.entityType, [newValue]);
                        var relatedEntity = entityManager.findEntityByKey(key);

                        if (relatedEntity) {
                            this.setProperty(relatedNavProp.name, relatedEntity);
                        } else {
                            // it may not have been fetched yet in which case we want to add it as an unattachedChild.    
                            entityManager._unattachedChildrenMap.addChild(key, relatedNavProp, this);
                        }
                    } else {
                        this.setProperty(relatedNavProp.name, null);
                    }
                }

                if (property.isPartOfKey) {
                    // propogate pk change to all related entities;
                    if (oldValue && !aspect.entityState.isDetached()) {
                        aspect.primaryKeyWasChanged = true;
                        
                    }
                    var that = this;
                    this.entityType.navigationProperties.forEach(function(np) {
                        var inverseNp = np.inverse;
                        if (!inverseNp) return;
                        if (inverseNp.foreignKeyNames.length === 0) return;
                        var npValue = that.getProperty(np.name);
                        var propertyIx = that.entityType.keyProperties.indexOf(property);
                        var fkName = inverseNp.foreignKeyNames[propertyIx];
                        if (np.isScalar) {
                            if (!npValue) return;
                            npValue.setProperty(fkName, newValue);

                        } else {
                            npValue.forEach(function(iv) {
                                iv.setProperty(fkName, newValue);
                            });
                        }
                    });
                    // insure that cached key is updated.
                    aspect.getKey(true);
                }
            }

            var propChangedArgs = { entity: this, propertyName: propName, oldValue: oldValue, newValue: newValue };
            if (entityManager) {
                // propertyChanged will be fired during loading but we only want to fire it once per entity, not once per property.
                // so propertyChanged is fired in the entityManager mergeEntity method if not fired here.
                if ( (!entityManager.isLoading) && (!entityManager.isRejectingChanges)) {
                    aspect.propertyChanged.publish(propChangedArgs);
                    // don't fire entityChanged event if propertyChanged is suppressed.
                    entityManager.entityChanged.publish({ entityAction: EntityAction.PropertyChange, entity: this, args: propChangedArgs });
                }
            } else {
                aspect.propertyChanged.publish(propChangedArgs);
            }
        } finally {
             aspect._inProcess = null;
        }
    }
    
    return defaultPropertyInterceptor;

});


define('dataType',["core", "validate"],
function (core, m_validate) {
    /**
    @module breeze
    **/

    var Enum = core.Enum;
    var Validator = m_validate.Validator;

    /**
    DataType is an 'Enum' containing all of the supported data types.

    @class DataType
    @static
    **/

    /**
    The default value of this DataType.
    @property defaultValue {any}
    **/

    /**
    Whether this is a 'numeric' DataType. 
    @property isNumeric {Boolean}
    **/

    var dataTypeMethods = {

    };

    var DataType = new Enum("DataType", dataTypeMethods);
    /**
    @property String {DataType}
    @final
    @static
    **/
    DataType.String = DataType.addSymbol({ defaultValue: "" });
    /**
    @property Int64 {DataType}
    @final
    @static
    **/
    DataType.Int64 = DataType.addSymbol({ defaultValue: 0, isNumeric: true, isInteger: true });
    /**
    @property Int32 {DataType}
    @final
    @static
    **/
    DataType.Int32 = DataType.addSymbol({ defaultValue: 0, isNumeric: true , isInteger: true });
    /**
    @property Int16 {DataType}
    @final
    @static
    **/
    DataType.Int16 = DataType.addSymbol({ defaultValue: 0, isNumeric: true, isInteger: true });
    /**
    @property Decimal {DataType}
    @final
    @static
    **/
    DataType.Decimal = DataType.addSymbol({ defaultValue: 0, isNumeric: true });
    /**
    @property Double {DataType}
    @final
    @static
    **/
    DataType.Double = DataType.addSymbol({ defaultValue: 0, isNumeric: true });
    /**
    @property Single {DataType}
    @final
    @static
    **/
    DataType.Single = DataType.addSymbol({ defaultValue: 0, isNumeric: true });
    /**
    @property DateTime {DataType}
    @final
    @static
    **/
    DataType.DateTime = DataType.addSymbol({ defaultValue: Date.now() });
    /**
    @property Boolean {DataType}
    @final
    @static
    **/
    DataType.Boolean = DataType.addSymbol({ defaultValue: false });
    /**
    @property Guid {DataType}
    @final
    @static
    **/
    DataType.Guid = DataType.addSymbol({ defaultValue: "00000000-0000-0000-0000-000000000000" });
    /**
    @property Byte {DataType}
    @final
    @static
    **/
    DataType.Byte = DataType.addSymbol({ defaultValue: 0 });
    /**
    @property Binary {DataType}
    @final
    @static
    **/
    DataType.Binary = DataType.addSymbol({ defaultValue: null });
    /**
    @property Undefined {DataType}
    @final
    @static
    **/
    DataType.Undefined = DataType.addSymbol({ defaultValue: undefined });
    DataType.seal();
    DataType.getSymbols().forEach(function (sym) {
        sym.validatorCtor = getValidatorCtor(sym);
    });

    /**
    Returns the DataType for a specified EDM type name.
    @method fromEdmDataType
    @static
    @param typeName {String}
    @return {DataType} A DataType.
    **/
    DataType.fromEdmDataType = function (typeName) {
        // if OData style
        var dt;
        var parts = typeName.split("Edm.");
        if (parts.length > 1) {
            if (parts[1] === "image") {
                // hack
                dt = DataType.Byte;
            } else {
                dt = DataType.fromName(parts[1]);
            }
        }

        if (!dt) {
            throw new Error("Unable to recognize DataType for: " + typeName);
        }
        return dt;
    };
    
    DataType.fromJsType = function (typeName) {
        switch (typeName) {
            case "string":
                return DataType.String;
            case "boolean":
                return DataType.Boolean;
            case "number":
                return DataType.Int32;
        }
        return null;
    };

    function getValidatorCtor(symbol) {
        switch (symbol) {
            case DataType.String:
                return Validator.string;
            case DataType.Int64:
                return Validator.int64;
            case DataType.Int32:
                return Validator.int32;
            case DataType.Int16:
                return Validator.int16;
            case DataType.Decimal:
                return Validator.number;
            case DataType.Double:
                return Validator.number;
            case DataType.Single:
                return Validator.number;
            case DataType.DateTime:
                return Validator.date;
            case DataType.Boolean:
                return Validator.bool;
            case DataType.Guid:
                return Validator.guid;
            case DataType.Byte:
                return Validator.byte;
            case DataType.Binary:
                // TODO: don't quite know how to validate this yet.
                return Validator.none;
            case DataType.Undefined:
                return Validator.none;
        }
    };


    return DataType;

});



define('entityMetadata',["core", "config", "dataType", "entityAspect", "validate", "defaultPropertyInterceptor"],
function (core, a_config, DataType, m_entityAspect, m_validate, defaultPropertyInterceptor) {
    
    /**
    @module breeze
    **/

    var Enum = core.Enum;
    var assertParam = core.assertParam;
    var assertConfig = core.assertConfig;
    
    var v_modelLibraryDef = a_config.interfaceRegistry.modelLibrary;

    var EntityAspect = m_entityAspect.EntityAspect;
    var Validator = m_validate.Validator;

    var Q = core.requireLib("Q", "See https://github.com/kriskowal/q ");

    // TODO: still need to handle inheritence here.

    /**
    A LocalQueryComparisonOptions instance is used to specify the "comparison rules" used when performing "local queries" in order 
    to match the semantics of these same queries when executed against a remote service.  These options should be set based on the 
    manner in which your remote service interprets certain comparison operations.

    The default LocalQueryComparisonOptions stipulates 'caseInsensitive" queries with ANSI SQL rules regarding comparisons of unequal
    length strings. 

    @class LocalQueryComparisonOptions
    **/

    /**
    LocalQueryComparisonOptions constructor
    @example
        // create a 'caseSensitive - non SQL' instance.
        var lqco = new LocalQueryComparisonOptions({
            name: "caseSensitive-nonSQL"
            isCaseSensitive: true;
            usesSql92CompliantStringComparison: false;
        });
        // either apply it globally
        lqco.setAsDefault();
        // or to a specific MetadataStore
        var ms = new MetadataStore({ localQueryComparisonOptions: lqco });
        var em = new EntityManager( { metadataStore: ms });

    @method <ctor> LocalQueryComparisonOptions
    @param config {Object}
    @param [config.name] {String}
    @param [config.isCaseSensitive] {Boolean} Whether predicates that involve strings will be interpreted in a "caseSensitive" manner. Default is 'false'
    @param [config.usesSql92CompliantStringComparison] {Boolean} Whether of not to enforce the ANSI SQL standard 
       of padding strings of unequal lengths before comparison with spaces. Note that per the standard, padding only occurs with equality and 
       inequality predicates, and not with operations like 'startsWith', 'endsWith' or 'contains'.  Default is true.
    **/
    var LocalQueryComparisonOptions = (function() {
        var ctor = function (config) {
            assertConfig(config || {})
                .whereParam("name").isOptional().isString()
                .whereParam("isCaseSensitive").isOptional().isBoolean().withDefault(false)
                .whereParam("usesSql92CompliantStringComparison").isBoolean().withDefault(true)
                .applyAll(this);
            if (!this.name) {
                this.name = core.getUuid();
            }
            a_config.registerObject(this, "LocalQueryComparisonOptions:" + this.name);
        };
        
        // 
        /**
        Case insensitive SQL compliant options - this is also the default unless otherwise changed.
        @property caseInsensitiveSQL {LocalQueryComparisonOptions}
        @static
        **/
        ctor.caseInsensitiveSQL = new ctor({
            name: "caseInsensitiveSQL",
            isCaseSensitive: false,
            usesSql92CompliantStringComparison: true
        });

        /**
        The default value whenever LocalQueryComparisonOptions are not specified. By default this is 'caseInsensitiveSQL'.
        @property defaultInstance {LocalQueryComparisonOptions}
        @static
        **/
        ctor.defaultInstance = ctor.caseInsensitiveSQL;

        /**
        Makes this instance the default instance.
        @method setAsDefault
        @example
            var lqco = new LocalQueryComparisonOptions({
                isCaseSensitive: false;
                usesSql92CompliantStringComparison: true;
            });
            lqco.setAsDefault();
        @chainable
        **/
        ctor.prototype.setAsDefault = function () {
            ctor.defaultInstance = this;
            return this;
        };


        return ctor;
    })();

    /**
    A NamingConvention instance is used to specify the naming conventions under which a MetadataStore 
    will translate property names between the server and the javascript client. 

    The default NamingConvention does not perform any translation, it simply passes property names thru unchanged.

    @class NamingConvention
    **/
        
    /**
    NamingConvention constructor
    @example
        // A naming convention that converts the first character of every property name to uppercase on the server
        // and lowercase on the client.
        var namingConv = new NamingConvention({
            serverPropertyNameToClient: function(serverPropertyName) {
                return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
            },
            clientPropertyNameToServer: function(clientPropertyName) {
                return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
            }            
        });
        var ms = new MetadataStore({ namingConvention: namingConv });
        var em = new EntityManager( { metadataStore: ms });
    @method <ctor> NamingConvention
    @param config {Object}
    @param config.serverPropertyNameToClient {Function} Function that takes a server property name add converts it into a client side property name.  
    @param config.clientPropertyNameToServer {Function} Function that takes a client property name add converts it into a server side property name.  
    **/
    var NamingConvention = (function() {
        var ctor = function(config) {
            assertConfig(config || {})
                .whereParam("name").isOptional().isString()
                .whereParam("serverPropertyNameToClient").isFunction()
                .whereParam("clientPropertyNameToServer").isFunction()
                .applyAll(this);
            if (!this.name) {
                this.name = core.getUuid();
            }
            a_config.registerObject(this, "NamingConvention:" + this.name);
        };
        
        /**
        The function used to convert server side property names to client side property names.

        @method serverPropertyNameToClient
        @param serverPropertyName {String}
        @param [property] {DataProperty|NavigationProperty} The actual DataProperty or NavigationProperty corresponding to the property name.
        @return {String} The client side property name.
        **/

        /**
        The function used to convert client side property names to server side property names.

        @method clientPropertyNameToServer
        @param clientPropertyName {String}
        @param [property] {DataProperty|NavigationProperty} The actual DataProperty or NavigationProperty corresponding to the property name.
        @return {String} The server side property name.
        **/
        
        /**
        A noop naming convention - This is the default unless another is specified.
        @property none {NamingConvention}
        @static
        **/
        ctor.none = new ctor({
            name: "noChange",
            serverPropertyNameToClient: function(serverPropertyName) {
                return serverPropertyName;
            },
            clientPropertyNameToServer: function(clientPropertyName) {
                return clientPropertyName;
            }
        });
        
        /**
        The "camelCase" naming convention - This implementation only lowercases the first character of the server property name
        but leaves the rest of the property name intact.  If a more complicated version is needed then one should be created via the ctor.
        @property camelCase {NamingConvention}
        @static
        **/
        ctor.camelCase = new ctor({
            name: "camelCase",
            serverPropertyNameToClient: function (serverPropertyName) {
                return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
            },
            clientPropertyNameToServer: function (clientPropertyName) {
                return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
            }
        });
        
        /**
       The default value whenever NamingConventions are not specified.
       @property defaultInstance {NamingConvention}
       @static
       **/
        ctor.defaultInstance = ctor.none;
        
        /**
        Makes this instance the default instance.
        @method setAsDefault
        @example
            var namingConv = new NamingConvention({
                serverPropertyNameToClient: function(serverPropertyName) {
                    return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
                },
                clientPropertyNameToServer: function(clientPropertyName) {
                    return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
                }            
            });
            namingConv.setAsDefault();
        @chainable
        **/
        ctor.prototype.setAsDefault = function() {
            ctor.defaultInstance = this;
            return this;
        };
        
        return ctor;
    })();
    
    var MetadataStore = (function () {

        /**
        An instance of the MetadataStore contains all of the metadata about a collection of {{#crossLink "EntityType"}}{{/crossLink}}'s.
        MetadataStores may be shared across {{#crossLink "EntityManager"}}{{/crossLink}}'s.  If an EntityManager is created without an
        explicit MetadataStore, the MetadataStore from the MetadataStore.defaultInstance property will be used.
        @class MetadataStore
        **/

        var __id = 0;
        
        /**
        Constructs a new MetadataStore.  
        @example
            var ms = new MetadataStore();
        The store can then be associated with an EntityManager
        @example
            var entityManager = new EntityManager( {
                serviceName: "api/NorthwindIBModel", 
                metadataStore: ms 
            });
        or for an existing EntityManager
        @example
            // Assume em1 is an existing EntityManager
            em1.setProperties( { metadataStore: ms });
        @method <ctor> MetadataStore
        @param [config] {Object} Configuration settings .
        @param [config.namingConvention=NamingConvention.defaultInstance] {NamingConvention} NamingConvention to be used in mapping property names
        between client and server. Uses the NamingConvention.defaultInstance if not specified.
        @param [config.localQueryComparisonOptions=LocalQueryComparisonOptions.defaultInstance] {LocalQueryComparisonOptions} The LocalQueryComparisonOptions to be
        used when performing "local queries" in order to match the semantics of queries against a remote service. 
        **/
        var ctor = function (config) {
            config = config || { };
            assertConfig(config)
                .whereParam("namingConvention").isOptional().isInstanceOf(NamingConvention).withDefault(NamingConvention.defaultInstance)
                .whereParam("localQueryComparisonOptions").isOptional().isInstanceOf(LocalQueryComparisonOptions).withDefault(LocalQueryComparisonOptions.defaultInstance)
                .applyAll(this);
            this.dataServices = []; // array of dataServices;
            this._resourceEntityTypeMap = {}; // key is resource name - value is qualified entityType name
            this._entityTypeResourceMap = {}; // key is qualified entitytype name - value is resourceName
            this._entityTypeMap = {}; // key is qualified entitytype name - value is entityType.
            this._shortNameMap = {}; // key is shortName, value is qualified name
            this._id = __id++;
            this._typeRegistry = {};
            this._incompleteTypeMap = {}; // key is entityTypeName; value is map where key is assocName and value is navProp
        };
        
        ctor.prototype._$typeName = "MetadataStore";
        ctor.ANONTYPE_PREFIX = "_IB_";

        /**
        Adds a DataService to this MetadataStore. If a DataService with the same serviceName is already
        in the MetadataStore an exception will be thrown. 
        @method addDataService
        @param dataService {DataService} The DataService to add
        **/
        
        ctor.prototype.addDataService = function(dataService) {
            assertParam(dataService, "dataService").isInstanceOf(DataService).check();
            var alreadyExists = this.dataServices.some(function(ds) {
                return dataService.serviceName === ds.serviceName;
            });
            if (alreadyExists) {
                throw new Error("A dataService with this name '" + dataService.serviceName + "' already exists in this MetadataStore");
            }
            this.dataServices.push(dataService);
        };

        /**
        Adds an EntityType to this MetadataStore.  No additional properties may be added to the EntityType after its has
        been added to the MetadataStore.
        @method addEntityType
        @param entityType {EntityType} The EntityType to add
        **/
        ctor.prototype.addEntityType = function(entityType) {
            entityType.metadataStore = this;
            // don't register anon types
            if (!entityType.isAnonymous) {
                this._registerEntityType(entityType);
            }
            entityType._fixup();
                                  
            entityType.getProperties().forEach(function(property) {
                if (!property.isUnmapped) {
                    entityType._mappedPropertiesCount++;
                }
            });

        };
        
        /**
        The  {{#crossLink "NamingConvention"}}{{/crossLink}} associated with this MetadataStore.

        __readOnly__
        @property namingConvention {NamingConvention}
        **/
        
        /**
        Exports this MetadataStore to a serialized string appropriate for local storage.   This operation is also called 
        internally when exporting an EntityManager. 
        @example
            // assume ms is a previously created MetadataStore
            var metadataAsString = ms.exportMetadata();
            window.localStorage.setItem("metadata", metadataAsString);
            // and later, usually in a different session imported
            var metadataFromStorage = window.localStorage.getItem("metadata");
            var newMetadataStore = new MetadataStore();
            newMetadataStore.importMetadata(metadataFromStorage);
        @method exportMetadata
        @return {String} A serialized version of this MetadataStore that may be stored locally and later restored. 
        **/
        ctor.prototype.exportMetadata = function () {
            var result = JSON.stringify(this, function (key, value) {
                if (key === "namingConvention" || key === "localQueryComparisonOptions") {
                    return value.name;
                }
                return value;
            }, a_config.stringifyPad);
            return result;
        };

        /**
        Imports a previously exported serialized MetadataStore into this MetadataStore.
        @example
            // assume ms is a previously created MetadataStore
            var metadataAsString = ms.exportMetadata();
            window.localStorage.setItem("metadata", metadataAsString);
            // and later, usually in a different session
            var metadataFromStorage = window.localStorage.getItem("metadata");
            var newMetadataStore = new MetadataStore();
            newMetadataStore.importMetadata(metadataFromStorage);
        @method importMetadata
        @param exportedString {String} A previously exported MetadataStore.
        @return {MetadataStore} This MetadataStore.
        @chainable
        **/
        ctor.prototype.importMetadata = function (exportedString) {
            var json = JSON.parse(exportedString);
            var ncName = json.namingConvention;
            var lqcoName = json.localQueryComparisonOptions;
            delete json.namingConvention;
            delete json.localQueryComparisonOptions;
            if (this.isEmpty()) {
                var nc = a_config.objectRegistry["NamingConvention:" + ncName];
                if (!nc) {
                    throw new Error("Unable to locate a naming convention named: " + ncName);
                }
                this.namingConvention = nc;
                var lqco = a_config.objectRegistry["LocalQueryComparisonOptions:" + lqcoName];
                if (!lqco) {
                    throw new Error("Unable to locate a LocalQueryComparisonOptions instance named: " + lqcoName);
                }
                this.localQueryComparisonOptions = lqco;
            } else {
                if (this.namingConvention.name !== ncName) {
                    throw new Error("Cannot import metadata with a different 'namingConvention' from the current MetadataStore");
                }
                if (this.localQueryComparisonOptions.name !== lqcoName) {
                    throw new Error("Cannot import metadata with different 'localQueryComparisonOptions' from the current MetadataStore");
                }
            }
            var entityTypeMap = {};
            var that = this;
            core.objectForEach(json._entityTypeMap, function (key, value) {
                var et = EntityType.fromJSON(value, that);
                entityTypeMap[key] = et;
            });
            json._entityTypeMap = entityTypeMap;
            core.extend(this, json);
            return this;
        };
        
        

        /**
        Creates a new MetadataStore from a previously exported serialized MetadataStore
        @example
            // assume ms is a previously created MetadataStore
            var metadataAsString = ms.exportMetadata();
            window.localStorage.setItem("metadata", metadataAsString);
            // and later, usually in a different session
            var metadataFromStorage = window.localStorage.getItem("metadata");
            var newMetadataStore = MetadataStore.importMetadata(metadataFromStorage);
        @method importMetadata
        @static
        @param exportedString {String} A previously exported MetadataStore.
        @return {MetadataStore} A new MetadataStore.
        
        **/
        ctor.importMetadata = function(exportedString) {
            var ms = new MetadataStore();
            ms.importMetadata(exportedString);
            return ms;
        };

        /**
        Returns whether Metadata has been retrieved for a specified service name.
        @example
            // Assume em1 is an existing EntityManager.
            if (!em1.metadataStore.hasMetadataFor("api/NorthwindIBModel"))) {
                // do something interesting
            }
        @method hasMetadataFor
        @param serviceName {String} The service name.
        @return {Boolean}
        **/
        ctor.prototype.hasMetadataFor = function(serviceName) {
            return !!this.getDataService(serviceName);
        };
        
        /**
       Returns the DataService for a specified service name
       @example
           // Assume em1 is an existing EntityManager.
           var ds = em1.metadataStore.getDataService("api/NorthwindIBModel");
           var adapterName = ds.adapterName; // may be null
           
       @method hasMetadataFor
       @param serviceName {String} The service name.
       @return {Boolean}
       **/
        ctor.prototype.getDataService = function (serviceName) {
            assertParam(serviceName, "serviceName").isString().check();

            serviceName = DataService._normalizeServiceName(serviceName);
            return core.arrayFirst(this.dataServices, function (ds) {
                return ds.serviceName === serviceName;
            });
        };

        /**
        Fetches the metadata for a specified 'service'. This method is automatically called 
        internally by an EntityManager before its first query against a new service.  

        @example
        Usually you will not actually process the results of a fetchMetadata call directly, but will instead
        ask for the metadata from the EntityManager after the fetchMetadata call returns.
        @example
            var ms = new MetadataStore();
            // or more commonly
            // var ms = anEntityManager.metadataStore;
            ms.fetchMetadata("api/NorthwindIBModel")
            .then(function(rawMetadata) {
                // do something with the metadata
            }
            .fail(function(exception) {
                // handle exception here
            };
        @method fetchMetadata
        @async
        @param dataService {DataService|String}  Either a DataService or just the name of the DataService to fetch metadata for.
        
        @param [callback] {Function} Function called on success.
        
            successFunction([data])
            @param [callback.data] {rawMetadata} 
  
        @param [errorCallback] {Function} Function called on failure.

            failureFunction([error])
            @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.

        @return {Promise} Promise
        **/
        ctor.prototype.fetchMetadata = function (dataService, callback, errorCallback) {
            assertParam(dataService, "dataService").isString().or().isInstanceOf(DataService).check();
            assertParam(callback, "callback").isFunction().isOptional().check();
            assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();
            
            if (typeof dataService === "string") {
                // use the dataService with a matching name or create a new one.
                dataService = this.getDataService(dataService) || new DataService({ serviceName: dataService });
            }

            var serviceName = dataService.serviceName;
            
            if (this.hasMetadataFor(serviceName)) {
                throw new Error("Metadata for a specific serviceName may only be fetched once per MetadataStore. ServiceName: " + serviceName);
            }
            
            var dataServiceAdapterInstance = a_config.getAdapterInstance("dataService", dataService.adapterName);

            var deferred = Q.defer();
            dataServiceAdapterInstance.fetchMetadata(this, serviceName, deferred.resolve, deferred.reject);
            var that = this;
            return deferred.promise.then(function (rawMetadata) {
                // might have been fetched by another query
                if (!that.hasMetadataFor(serviceName)) {
                    that.addDataService(dataService);
                }
                if (callback) callback(rawMetadata);
                return Q.resolve(rawMetadata);
            }, function (error) {
                if (errorCallback) errorCallback(error);
                return Q.reject(error);
            });
        };


        /**
        Used to register a constructor for an EntityType that is not known via standard Metadata discovery; 
        i.e. an unmapped type.  

        @method trackUnmappedType
        @param entityCtor {Function} The constructor for the 'unmapped' type. 
        @param [interceptor] {Function} A function
        **/
        ctor.prototype.trackUnmappedType = function (entityCtor, interceptor) {
            assertParam(entityCtor, "entityCtor").isFunction().check();
            assertParam(interceptor, "interceptor").isFunction().isOptional().check();
            // TODO: think about adding this to the MetadataStore.
            var entityType = new EntityType(this);
            entityType._setEntityCtor(entityCtor, interceptor);
        };

        /**
        Provides a mechanism to register a 'custom' constructor to be used when creating new instances
        of the specified entity type.  If this call is not made, a default constructor is created for
        the entity as needed.
        This call may be made before or after the corresponding EntityType has been discovered via
        Metadata discovery.
        @example
            var Customer = function () {
                this.miscData = "asdf";
            };
            Customer.prototype.doFoo() {
                ...
            }
            // assume em1 is a preexisting EntityManager;
            em1.metadataStore.registerEntityTypeCtor("Customer", Customer);
            // any queries or EntityType.create calls from this point on will call the Customer constructor
            // registered above.
        @method registerEntityTypeCtor
        @param entityTypeName {String} The name of the EntityType
        @param entityCtor {Function}  The constructor for this EntityType.
        @param [initializationFn] {Function} A function or the name of a function on the entity that is to be executed immediately after the entity has been created
        and populated with any initial values.
            
        initializationFn(entity)
        @param initializationFn.entity {Entity} The entity being created or materialized.
        **/
        ctor.prototype.registerEntityTypeCtor = function (entityTypeName, entityCtor, initializationFn) {
            assertParam(entityTypeName, "entityTypeName").isString().check();
            assertParam(entityCtor, "entityCtor").isFunction().check();
            assertParam(initializationFn, "initializationFn").isOptional().isFunction().or().isString().check();
            var qualifiedTypeName = getQualifiedTypeName(this, entityTypeName, false);
            var typeName;
            if (qualifiedTypeName) {
                var entityType = this._entityTypeMap[qualifiedTypeName];
                if (entityType) {
                    entityType._setEntityCtor(entityCtor);
                }
                typeName = qualifiedTypeName;
            } else {
                typeName = entityTypeName;
            }
            entityCtor.prototype._$typeName = typeName;
            this._typeRegistry[typeName] = entityCtor;
            if (initializationFn) {
                entityCtor._$initializationFn = initializationFn;
            }
        };
      

        /**
        Returns whether this MetadataStore contains any metadata yet.
        @example
            // assume em1 is a preexisting EntityManager;
            if (em1.metadataStore.isEmpty()) {
                // do something interesting
            }
        @method isEmpty
        @return {Boolean}
        **/
        ctor.prototype.isEmpty = function () {
            return this.dataServices.length === 0;
        };


        /**
        Returns an  {{#crossLink "EntityType"}}{{/crossLink}} given its name.
        @example
            // assume em1 is a preexisting EntityManager
            var odType = em1.metadataStore.getEntityType("OrderDetail");
        or to throw an error if the type is not found
        @example
            var badType = em1.metadataStore.getEntityType("Foo", false);
            // badType will not get set and an exception will be thrown.
        @method getEntityType
        @param entityTypeName {String}  Either the fully qualified name or a short name may be used. If a short name is specified and multiple types share
        that same short name an exception will be thrown. 
        @param [okIfNotFound=false] {Boolean} Whether to throw an error if the specified EntityType is not found.
        @return {EntityType} The EntityType or 'undefined' if not not found.
        **/
        ctor.prototype.getEntityType = function (entityTypeName, okIfNotFound) {
            assertParam(entityTypeName, "entityTypeName").isString().check();
            assertParam(okIfNotFound, "okIfNotFound").isBoolean().isOptional().check(false);
            var qualTypeName = getQualifiedTypeName(this, entityTypeName, false);
            var entityType = this._entityTypeMap[qualTypeName];
            if (!entityType) {
                if (okIfNotFound) return null;
                throw new Error("Unable to locate an 'EntityType' by the name: " + entityTypeName);
            }
            if (entityType.length) {
                var entityTypeNames = entityType.join(",");
                throw new Error("There are multiple entity types with this 'shortName': " + entityTypeNames);
            }
            return entityType;
        };

        /**
        Returns an array containing all of the  {{#crossLink "EntityType"}}{{/crossLink}}s in this MetadataStore.
        @example
            // assume em1 is a preexisting EntityManager
            var allTypes = em1.metadataStore.getEntityTypes();
        @method getEntityTypes
        @return {Array of EntityType}
        **/
        ctor.prototype.getEntityTypes = function () {
            var entityTypes = [];
            for (var key in this._entityTypeMap) {
                var value = this._entityTypeMap[key];
                // skip 'shortName' entries
                if (key === value.name) {
                    entityTypes.push(this._entityTypeMap[key]);
                }
            }
            return entityTypes;
        };

        ctor.prototype.getIncompleteNavigationProperties = function() {
            return core.objectMapToArray(this._entityTypeMap, function(key, value) {
                var badProps = value.navigationProperties.filter(function(np) {
                    return !np.entityType;
                });
                return badProps.length === 0 ? null : badProps;
            });
        };


        /*
        INTERNAL FOR NOW
        Returns a fully qualified entityTypeName for a specified resource name.  The reverse of this operation
        can be obtained via the  {{#crossLink "EntityType"}}{{/crossLink}} 'defaultResourceName' property
        @method getEntityTypeNameForResourceName
        @param resourceName {String}
        */
        ctor.prototype._getEntityTypeNameForResourceName = function (resourceName) {
            assertParam(resourceName, "resourceName").isString().check();
            // return this._resourceEntityTypeMap[resourceName.toLowerCase()];
            return this._resourceEntityTypeMap[resourceName];
        };

        /*
        INTERNAL FOR NOW
        Associates a resourceName with an entityType. 

        This method is only needed in those cases where multiple resources return the same
        entityType.  In this case Metadata discovery will only determine a single resource name for 
        each entityType.
        @method setEntityTypeForResourceName
        @param resourceName {String}
        @param entityTypeOrName {EntityType|String} If passing a string either the fully qualified name or a short name may be used. If a short name is specified and multiple types share
        that same short name an exception will be thrown. If the entityType has not yet been discovered then a fully qualified name must be used.
        */
        ctor.prototype._setEntityTypeForResourceName = function (resourceName, entityTypeOrName) {
            assertParam(resourceName, "resourceName").isString().check();
            assertParam(entityTypeOrName, "entityTypeOrName").isInstanceOf(EntityType).or().isString().check();
            // resourceName = resourceName.toLowerCase();
            var entityTypeName;
            if (entityTypeOrName instanceof EntityType) {
                entityTypeName = entityTypeOrName.name;
            } else {
                entityTypeName = getQualifiedTypeName(this, entityTypeOrName, true);
            }

            this._resourceEntityTypeMap[resourceName] = entityTypeName;
            this._entityTypeResourceMap[entityTypeName] = resourceName;
            var entityType = this.getEntityType(entityTypeName, true);
            if (entityType) {
                entityType.defaultResourceName = entityType.defaultResourceName || resourceName;
            }
        };

        // protected methods

       
        ctor.prototype._checkEntityType = function(entity) {
            if (entity.entityType) return;
            var typeName = entity.prototype._$typeName;
            if (!typeName) {
                throw new Error("This entity has not been registered. See the MetadataStore.registerEntityTypeCtor method");
            }
            var entityType = this.getEntityType(typeName);
            if (entityType) {
                entity.entityType = entityType;
            }
        };
       
        ctor.prototype._registerEntityType = function (entityType) {
            this._entityTypeMap[entityType.name] = entityType;
            this._shortNameMap[entityType.shortName] = entityType.name;
            // in case resourceName was registered before this point
            var resourceName = this._entityTypeResourceMap[entityType.name];
            if (resourceName) {
                entityType.defaultResourceName = resourceName;
            }
        };

        ctor.prototype._parseODataMetadata = function (serviceName, schemas) {
            var that = this;
            toArray(schemas).forEach(function (schema) {
                if (schema.entityContainer) {
                    toArray(schema.entityContainer).forEach(function (container) {
                        toArray(container.entitySet).forEach(function (entitySet) {
                            var entityTypeName = normalizeTypeName(entitySet.entityType, schema).typeName;
                            that._setEntityTypeForResourceName(entitySet.name, entityTypeName);
                        });
                    });
                }
                if (schema.entityType) {
                    toArray(schema.entityType).forEach(function (et) {
                        var entityType = convertFromODataEntityType(et, schema, that);

                        // check if this entityTypeName, short version or qualified version has a registered ctor.
                        var entityCtor = that._typeRegistry[entityType.name] || that._typeRegistry[entityType.shortName];
                        if (entityCtor) {
                             // next line is in case the entityType was originally registered with a shortname.
                             entityCtor.prototype._$typeName = entityType.name; 
                             entityType._setEntityCtor(entityCtor);
                             that._entityTypeMap[entityType.name] = entityType;
                        }
                            
                    });
                }
            });
            var badNavProps = this.getIncompleteNavigationProperties();
            if (badNavProps.length > 0) {
                throw new Error("Bad nav properties");
            }
        };
        
        

        function getQualifiedTypeName(metadataStore, entityTypeName, throwIfNotFound) {
            if (isQualifiedTypeName(entityTypeName)) return entityTypeName;
            var result = metadataStore._shortNameMap[entityTypeName];
            if (!result && throwIfNotFound) {
                throw new Error("Unable to locate 'entityTypeName' of: " + entityTypeName);
            }
            return result;
        }

        function convertFromODataEntityType(odataEntityType, schema, metadataStore) {
            var shortName = odataEntityType.name;
            var namespace = translateNamespace(schema, schema.namespace);
            var entityType = new EntityType({
                shortName: shortName,
                namespace: namespace,
            });
            var keyNamesOnServer = toArray(odataEntityType.key.propertyRef).map(core.pluck("name"));
            toArray(odataEntityType.property).forEach(function (prop) {
                convertFromOdataDataProperty(entityType, prop, keyNamesOnServer);
            });
            
            toArray(odataEntityType.navigationProperty).forEach(function (prop) {
                convertFromOdataNavProperty(entityType, prop, schema);
            });
            metadataStore.addEntityType(entityType);
            return entityType;
        }


        function convertFromOdataDataProperty(entityType, odataProperty, keyNamesOnServer) {
            var dataType = DataType.fromEdmDataType(odataProperty.type);
            var isNullable = odataProperty.nullable === 'true' || odataProperty.nullable == null;
            var fixedLength = odataProperty.fixedLength ? odataProperty.fixedLength === true : undefined;
            var isPartOfKey = keyNamesOnServer.indexOf(odataProperty.name) >= 0;
            if (entityType.autoGeneratedKeyType == AutoGeneratedKeyType.None) {
                if (isIdentityProperty(odataProperty)) {
                    entityType.autoGeneratedKeyType = AutoGeneratedKeyType.Identity;
                }
            }
            var maxLength = odataProperty.maxLength;
            maxLength = (maxLength == null || maxLength==="Max") ? null : parseInt(maxLength);
            // can't set the name until we go thru namingConventions and these need the dp.
            var dp = new DataProperty({
                nameOnServer: odataProperty.name,
                dataType: dataType,
                isNullable: isNullable,
                isPartOfKey: isPartOfKey,
                maxLength: maxLength,
                fixedLength: fixedLength,
                concurrencyMode: odataProperty.concurrencyMode
            });
            
            entityType.addProperty(dp);
            addValidators(dp);
            
            return dp;
        }

        function addValidators(dataProperty) {

            var typeValidator;
            if (!dataProperty.isNullable) {
                dataProperty.validators.push(Validator.required());
            }
            if (dataProperty.dataType === DataType.String) {
                if (dataProperty.maxLength) {
                    var validatorArgs = { maxLength: dataProperty.maxLength };
                    typeValidator = Validator.maxLength(validatorArgs);
                } else {
                    typeValidator = Validator.string();
                }
            } else {
                typeValidator = dataProperty.dataType.validatorCtor();
            }

            dataProperty.validators.push(typeValidator);

        }

        function convertFromOdataNavProperty(entityType, odataProperty, schema) {
            var association = getAssociation(odataProperty, schema);
            var toEnd = core.arrayFirst(association.end, function (assocEnd) {
                return assocEnd.role === odataProperty.toRole;
            });
            
            var isScalar = !(toEnd.multiplicity === "*");
            var dataType = normalizeTypeName(toEnd.type, schema).typeName;
            var fkNamesOnServer = [];
            if (toEnd && isScalar) {
                var constraint = association.referentialConstraint;
                if (constraint) {
                    var principal = constraint.principal;
                    var dependent = constraint.dependent;
                    var propRefs;
                    if (odataProperty.fromRole === principal.role) {
                        propRefs = toArray(principal.propertyRef);
                    } else {
                        propRefs = toArray(dependent.propertyRef);
                    }
                    // will be used later by np._update
                    fkNamesOnServer = propRefs.map(core.pluck("name"));
                }
            }
            var np = new NavigationProperty({
                nameOnServer: odataProperty.name,
                entityTypeName: dataType,
                isScalar: isScalar,
                associationName: association.name,
                foreignKeyNamesOnServer: fkNamesOnServer
            });
            entityType.addProperty(np);
       
            return np;
        }
        
        function isIdentityProperty(odataProperty) {
            // see if web api feed
            var propName = core.arrayFirst(Object.keys(odataProperty), function (pn) {
                return pn.indexOf("StoreGeneratedPattern") >= 0;
            });
            if (propName) {
                return (odataProperty[propName] === "Identity");
            } else {
                // see if Odata feed
                var extensions = odataProperty.extensions;
                if (!extensions) {
                    return false;
                }
                var identityExtn = core.arrayFirst(extensions, function (extension) {
                    return extension.name === "StoreGeneratedPattern" && extension.value === "Identity";
                });
                return !!identityExtn;
            }
        }

        // Fast version
        // np: schema.entityType[].navigationProperty.relationship -> schema.association
        //   match( shortName(np.relationship) == schema.association[].name
        //      --> association

        // Correct version
        // np: schema.entityType[].navigationProperty.relationship -> schema.association
        //   match( np.relationship == schema.entityContainer[0].associationSet[].association )
        //      -> associationSet.name
        //   match ( associationSet.name == schema.association[].name )
        //      -> association

        function getAssociation(odataNavProperty, schema) {
            var assocName = normalizeTypeName(odataNavProperty.relationship, schema).shortTypeName;
            var assocs = schema.association;
            if (!assocs) return null;
            if (!Array.isArray(assocs)) {
                assocs = [assocs];
            }
            var association = core.arrayFirst(assocs, function (assoc) {
                return assoc.name === assocName;
            });
            return association;
        }

        function toArray(item) {
            if (!item) {
                return [];
            } else if (Array.isArray(item)) {
                return item;
            } else {
                return [item];
            }
        }
        

        return ctor;
    })();

    var DataService = function() {
        var ctor = function(config) {
            if (arguments.length != 1) {
                throw new Error("The DataService ctor should be called with a single argument that is a configuration object.");
            }

            assertConfig(config)
                .whereParam("serviceName").isNonEmptyString()
                .whereParam("adapterName").isString().isOptional().withDefault(null)
                .whereParam("hasServerMetadata").isBoolean().isOptional().withDefault(true)
                .applyAll(this);
            this.serviceName = DataService._normalizeServiceName(this.serviceName);
            
        };

        ctor._normalizeServiceName = function(serviceName) {
            serviceName = serviceName.trim();
            if (serviceName.substr(-1) !== "/") {
                return serviceName + '/';
            } else {
                return serviceName;
            }
        };
        
        ctor.prototype._$typeName = "DataService";
        
        return ctor;
    }();

    var EntityType = (function () {
        /**
        Container for all of the metadata about a specific type of Entity.
        @class EntityType
        **/
        var __nextAnonIx = 0;
        

        /** 
        @example                    
            var entityType = new EntityType( {
                name: "person",
                namespace: "myAppNamespace"
             });
        @method <ctor> EntityType
        @param config {Object|MetadataStore} Configuration settings or a MetadataStore.  If this parameter is just a MetadataStore
        then what will be created is an 'anonymous' type that will never be communicated to or from the server. It is purely for
        client side use and will be given an automatically generated name. Normally, however, you will use a configuration object.
        @param config.shortName {String}
        @param [config.namespace=""] {String}
        **/
        var ctor = function (config) {
            if (arguments.length > 1) {
                throw new Error("The EntityType ctor has a single argument that is either a 'MetadataStore' or a configuration object.");
            }
            if  (config._$typeName === "MetadataStore") {
                this.metadataStore = config;
                this.shortName = "Anon_" + ++__nextAnonIx;
                this.namespace = "";
                this.isAnonymous = true;
            } else {
                assertConfig(config)
                    .whereParam("shortName").isNonEmptyString()
                    .whereParam("namespace").isString().isOptional().withDefault("")
                    .whereParam("defaultResourceName").isNonEmptyString().isOptional().withDefault(null)
                    .applyAll(this);
            }

            this.name = qualifyTypeName(this.shortName, this.namespace);
            
            // the defaultResourceName may also be set up either via metadata lookup or first query or via the 'setProperties' method
            
            this.dataProperties = [];
            this.navigationProperties = [];
            this.keyProperties = [];
            this.foreignKeyProperties = [];
            this.concurrencyProperties = [];
            this.unmappedProperties = []; // will be updated later.
            this.autoGeneratedKeyType = AutoGeneratedKeyType.None;
            this.validators = [];
            this._mappedPropertiesCount = 0;
            
        };
        
        /**
        The {{#crossLink "MetadataStore"}}{{/crossLink}} that contains this EntityType

        __readOnly__
        @property metadataStore {MetadataStore}
        **/
            
        /**
        The DataProperties (see {{#crossLink "DataProperty"}}{{/crossLink}}) associated with this EntityType.

        __readOnly__
        @property dataProperties {Array of DataProperty} 
        **/
            
        /**
        The NavigationProperties  (see {{#crossLink "NavigationProperty"}}{{/crossLink}}) associated with this EntityType.

        __readOnly__
        @property navigationProperties {Array of NavigationProperty} 
        **/
            
        /**
        The DataProperties associated with this EntityType that make up it's {{#crossLink "EntityKey"}}{{/crossLink}}.

        __readOnly__
        @property keyProperties {Array of DataProperty} 
        **/
            
        /**
        The DataProperties associated with this EntityType that are foreign key properties.

        __readOnly__
        @property foreignKeyProperties {Array of DataProperty} 
        **/
            
        /**
        The DataProperties associated with this EntityType that are concurrency properties.

        __readOnly__
        @property concurrencyProperties {Array of DataProperty} 
        **/

        /**
        The DataProperties associated with this EntityType that are not mapped to any backend datastore. These are effectively free standing
        properties.

        __readOnly__
        @property unmappedProperties {Array of DataProperty} 
        **/
            
        /**
        The default resource name associated with this EntityType.  An EntityType may be queried via a variety of 'resource names' but this one 
        is used as the default when no resource name is provided.  This will occur when calling {{#crossLink "EntityAspect/loadNavigationProperty"}}{{/crossLink}}
        or when executing any {{#crossLink "EntityQuery"}}{{/crossLink}} that was created via an {{#crossLink "EntityKey"}}{{/crossLink}}.

        __readOnly__
        @property defaultResourceName {String} 
        **/

        /**
        The fully qualifed name of this EntityType.

        __readOnly__
        @property name {String} 
        **/

        /**
        The short, unqualified, name for this EntityType.

        __readOnly__
        @property shortName {String} 
        **/

        /**
        The namespace for this EntityType.

        __readOnly__
        @property namespace {String} 
        **/

        /**
        The {{#crossLink "AutoGeneratedKeyType"}}{{/crossLink}} for this EntityType.
        
        __readOnly__
        @property autoGeneratedKeyType {AutoGeneratedKeyType} 
        @default AutoGeneratedKeyType.None
        **/

        /**
        The entity level validators associated with this EntityType. Validators can be added and
        removed from this collection.

        __readOnly__
        @property validators {Array of Validator} 
        **/
            

        ctor.prototype._$typeName = "EntityType";

        /**
        General purpose property set method
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            custType.setProperties( {
                autoGeneratedKeyType: AutoGeneratedKeyType.Identity;
                defaultResourceName: "CustomersAndIncludedOrders"
            )};
        @method setProperties
        @param config [object]
            @param [config.autogeneratedKeyType] {AutoGeneratedKeyType}
            @param [config.defaultResourceName] {String}
        **/
        ctor.prototype.setProperties = function (config) {
            assertConfig(config)
                .whereParam("autoGeneratedKeyType").isEnumOf(AutoGeneratedKeyType).isOptional()
                .whereParam("defaultResourceName").isString().isOptional()
                .applyAll(this);
            if (config.defaultResourceName) {
                this.defaultResourceName = config.defaultResourceName;
            }
        };

        /**
        Adds a  {{#crossLink "DataProperty"}}{{/crossLink}} or a {{#crossLink "NavigationProperty"}}{{/crossLink}} to this EntityType.
        @example
            // assume myEntityType is a newly constructed EntityType. 
            myEntityType.addProperty(dataProperty1);
            myEntityType.addProperty(dataProperty2);
            myEntityType.addProperty(navigationProperty1);
        @method addProperty
        @param property {DataProperty|NavigationProperty}
        **/
        ctor.prototype.addProperty = function (property) {
            assertParam(property, "dataProperty").isInstanceOf(DataProperty).or().isInstanceOf(NavigationProperty);
            if (this.metadataStore && !property.isUnmapped) {
                throw new Error("The '" + this.name + "' EntityType has already been added to a MetadataStore and therefore no additional properties may be added to it.");
            }
            if (property.parentEntityType) {
                if (property.parentEntityType !== this) {
                    throw new Error("This dataProperty has already been added to " + property.parentEntityType.name);
                } else {
                    return this;
                }
            }
            property.parentEntityType = this;
            if (property.isDataProperty) {
                this._addDataProperty(property);
            } else {
                this._addNavigationProperty(property);
            }
            return this;
        };
        
        ctor.prototype._addDataProperty = function (dp) {

            this.dataProperties.push(dp);

            if (dp.isPartOfKey) {
                this.keyProperties.push(dp);
            };

            if (dp.concurrencyMode && dp.concurrencyMode !== "None") {
                this.concurrencyProperties.push(dp);
            };

            if (dp.isUnmapped) {
                this.unmappedProperties.push(dp);
            }

        };
        
        ctor.prototype._addNavigationProperty = function (np) {

            this.navigationProperties.push(np);

            if (!isQualifiedTypeName(np.entityTypeName)) {
                np.entityTypeName = qualifyTypeName(np.entityTypeName, this.namespace);
            }
        };

        ctor.prototype._fixup = function() {
            var that = this;
            this.getProperties().forEach(function(property) {
                that._updatePropertyNames(property);
            });
            this.navigationProperties.forEach(function(np) {
                // sets navigation property: relatedDataProperties and dataProperty: relatedNavigationProperty
                resolveFks(np);
                // Tries to set - these two may get set later
                // this.inverse
                // this.entityType
                updateCrossEntityRelationship(np);
            });
            updateIncomplete(this);
        };

        function updateIncomplete(entityType) {
            var incompleteTypeMap = entityType.metadataStore._incompleteTypeMap;
            var incompleteMap = incompleteTypeMap[entityType.name];
            if (core.isEmpty(incompleteMap)) {
                delete incompleteTypeMap[entityType.name];
                return;
            }
            if (incompleteMap) {
                core.objectForEach(incompleteMap, function (assocName, np) {
                    if (!np.entityType) {
                        if (np.entityTypeName === entityType.name) {
                            np.entityType = entityType;
                            delete incompleteMap[assocName];
                            updateIncomplete(np.parentEntityType);
                        }
                    }
                });
            }

        }
        
        function resolveFks(np) {
            if (np.foreignKeyProperties) return;
            var fkProps = getFkProps(np);
            // returns null if can't yet finish
            if (!fkProps) return;

            fkProps.forEach(function (dp) {
                dp.relatedNavigationProperty = np;
                np.parentEntityType.foreignKeyProperties.push(dp);
                if (np.relatedDataProperties) {
                    np.relatedDataProperties.push(dp);
                } else {
                    np.relatedDataProperties = [dp];
                }
            });
        };



        // returns null if can't yet finish
        function getFkProps(np) {
            var fkNames = np.foreignKeyNames;
            var isNameOnServer = fkNames.length == 0;
            if (isNameOnServer) {
                fkNames = np.foreignKeyNamesOnServer;
                if (fkNames.length == 0) {
                    np.foreignKeyProperties = [];
                    return np.foreignKeyProperties;
                }
            }
            var ok = true;
            var parentEntityType = np.parentEntityType;
            var fkProps = fkNames.map(function (fkName) {
                var fkProp = parentEntityType.getDataProperty(fkName, isNameOnServer);
                ok = ok && !!fkProp;
                return fkProp;
            });

            if (ok) {
                if (isNameOnServer) {
                    np.foreignKeyNames = fkProps.map(core.pluck("name"));
                }
                np.foreignKeyProperties = fkProps;
                return fkProps;
            } else {
                return null;
            }
        }
        
        function updateCrossEntityRelationship(np) {
            var metadataStore = np.parentEntityType.metadataStore;
            var incompleteTypeMap = metadataStore._incompleteTypeMap;

            // ok to not find it yet
            var targetEntityType = metadataStore.getEntityType(np.entityTypeName, true);
            if (targetEntityType) {
                np.entityType = targetEntityType;
            }

            var assocMap = incompleteTypeMap[np.entityTypeName];
            if (!assocMap) {
                addToIncompleteMap(incompleteTypeMap, np);
            } else {
                var inverse = assocMap[np.associationName];
                if (inverse) {
                    removeFromIncompleteMap(incompleteTypeMap, np, inverse);
                } else {
                    addToIncompleteMap(incompleteTypeMap, np);
                }
            }
        };

        function addToIncompleteMap(incompleteTypeMap, np) {
            if (!np.entityType) {
                var assocMap = {};
                incompleteTypeMap[np.entityTypeName] = assocMap;
                assocMap[np.associationName] = np;
            }

            var altAssocMap = incompleteTypeMap[np.parentEntityType.name];
            if (!altAssocMap) {
                altAssocMap = {};
                incompleteTypeMap[np.parentEntityType.name] = altAssocMap;
            }
            altAssocMap[np.associationName] = np;
        }

        function removeFromIncompleteMap(incompleteTypeMap, np, inverse) {
            np.inverse = inverse;
            var assocMap = incompleteTypeMap[np.entityTypeName];

            delete assocMap[np.associationName];
            if (core.isEmpty(assocMap)) {
                delete incompleteTypeMap[np.entityTypeName];
            }
            if (!inverse.inverse) {
                inverse.inverse = np;
                // not sure if these are needed
                if (inverse.entityType == null) {
                    inverse.entityType = np.parentEntityType;
                }
                var altAssocMap = incompleteTypeMap[np.parentEntityType.name];
                if (altAssocMap) {
                    delete altAssocMap[np.associationName];
                    if (core.isEmpty(altAssocMap)) {
                        delete incompleteTypeMap[np.parentEntityType.name];
                    }
                }
            }
        }

        /**
        Create a new entity of this type.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var cust1 = custType.createEntity();
            em1.addEntity(cust1);
        @method createEntity
        @param [initialValues] {Config object} - Configuration object of the properties to set immediately after creation.
        @return {Entity} The new entity.
        **/
        ctor.prototype.createEntity = function (initialValues) {
            if (initialValues) {
                var entity = this._createEntity(true);
                core.objectForEach(initialValues, function(key, value) {
                    entity.setProperty(key, value);
                });
                entity.entityAspect._postInitialize();
                return entity;
            } else {
                return this._createEntity(false);
            }
            
        };

        ctor.prototype._createEntity = function(deferInitialization) {
            var entityCtor = this.getEntityCtor();
            var instance = new entityCtor();
            new EntityAspect(instance, deferInitialization);
            return instance;
        };

        /**
        Returns the constructor for this EntityType.
        @method getEntityCtor
        @return {Function} The constructor for this EntityType.
        **/
        ctor.prototype.getEntityCtor = function () {
            if (this._entityCtor) return this._entityCtor;
            var typeRegistry = this.metadataStore._typeRegistry;
            var entityCtor = typeRegistry[this.name] || typeRegistry[this.shortName];
            if (!entityCtor) {
                var createCtor = v_modelLibraryDef.defaultInstance.createCtor;
                if (createCtor) {
                    entityCtor = createCtor(this);
                } else {
                    entityCtor = function() {
                    };
                }
            }
            this._setEntityCtor(entityCtor);
            return entityCtor;
        };

        // May make public later.
        ctor.prototype._setEntityCtor = function (entityCtor, interceptor) {
            var instance = new entityCtor();

            // insure that all of the properties are on the 'template' instance before watching the class.
            calcUnmappedProperties(this, instance);

            var proto = entityCtor.prototype;
            proto.entityType = this;

            if (interceptor) {
                proto._$interceptor = interceptor;
            } else {
                proto._$interceptor = defaultPropertyInterceptor;
            }

            v_modelLibraryDef.defaultInstance.initializeEntityPrototype(proto);

            this._entityCtor = entityCtor;
        };

        /**
        Adds either an entity or property level validator to this EntityType.  
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var countryProp = custType.getProperty("Country");
            var valFn = function (v) {
                if (v == null) return true;
                return (core.stringStartsWith(v, "US"));
            };
            var countryValidator = new Validator("countryIsUS", valFn, 
                { displayName: "Country", messageTemplate: "'%displayName%' must start with 'US'" });
            custType.addValidator(countryValidator, countryProp);
        This is the same as adding an entity level validator via the 'validators' property of DataProperty or NavigationProperty
        @example
            countryProp.validators.push(countryValidator);
        Entity level validators can also be added by omitting the 'property' parameter.
        @example
            custType.addValidator(someEntityLevelValidator);
        or
        @example
            custType.validators.push(someEntityLevelValidator);
        @method addValidator
        @param validator {Validator} Validator to add.
        @param [property] Property to add this validator to.  If omitted, the validator is assumed to be an
        entity level validator and is added to the EntityType's 'validators'.
        **/
        ctor.prototype.addValidator = function (validator, property) {
            assertParam(validator, "validator").isInstanceOf(Validator).check();
            assertParam(property, "property").isOptional().isString().or().isEntityProperty().check();
            if (property) {
                if (typeof (property) === 'string') {
                    property = this.getProperty(property, true);
                }
                property.validators.push(validator);
            } else {
                this.validators.push(validator);
            }
        };

        /**
        Returns all of the properties ( dataProperties and navigationProperties) for this EntityType.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var arrayOfProps = custType.getProperties();
        @method getProperties
        @return {Array of DataProperty|NavigationProperty} Array of Data and Navigation properties.
        **/
        ctor.prototype.getProperties = function () {
            return this.dataProperties.concat(this.navigationProperties);
        };

        /**
        Returns all of the property names ( for both dataProperties and navigationProperties) for this EntityType.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var arrayOfPropNames = custType.getPropertyNames();
        @method getPropertyNames
        @return {Array of String}
        **/
        ctor.prototype.getPropertyNames = function () {
            return this.getProperties().map(core.pluck('name'));
        };

        /**
        Returns a data property with the specified name or null.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var customerNameDataProp = custType.getDataProperty("CustomerName");
        @method getDataProperty
        @param propertyName {String}
        @return {DataProperty} Will be null if not found.
        **/
        ctor.prototype.getDataProperty = function (propertyName, isServerName) {
            var propName = isServerName ? "nameOnServer" : "name";
            return core.arrayFirst(this.dataProperties, core.propEq(propName, propertyName));
        };

        /**
        Returns a navigation property with the specified name or null.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var customerOrdersNavProp = custType.getDataProperty("Orders");
        @method getNavigationProperty
        @param propertyName {String}
        @return {NavigationProperty} Will be null if not found.
        **/
        ctor.prototype.getNavigationProperty = function (propertyName, isServerName) {
            var propName = isServerName ? "nameOnServer" : "name";
            return core.arrayFirst(this.navigationProperties, core.propEq(propName, propertyName));
        };

        /**
        Returns either a DataProperty or a NavigationProperty with the specified name or null.  

        This method also accepts a '.' delimited property path and will return the 'property' at the 
        end of the path.
        @example
            var custType = em1.metadataStore.getEntityType("Customer");
            var companyNameProp = custType.getProperty("CompanyName");
        This method can also walk a property path to return a property
        @example
            var orderDetailType = em1.metadataStore.getEntityType("OrderDetail");
            var companyNameProp2 = orderDetailType.getProperty("Order.Customer.CompanyName");
            // companyNameProp === companyNameProp2 
        @method getProperty
        @param propertyPath {String}
        @param [throwIfNotFound=false] {Boolean} Whether to throw an exception if not found.
        @return {DataProperty|NavigationProperty} Will be null if not found.
        **/
        ctor.prototype.getProperty = function (propertyPath, throwIfNotFound) {
            throwIfNotFound = throwIfNotFound || false;
            var propertyNames = (Array.isArray(propertyPath)) ? propertyPath : propertyPath.trim().split('.');
            var propertyName = propertyNames[0];
            if (propertyNames.length === 1) {
                var prop = core.arrayFirst(this.getProperties(), core.propEq("name", propertyName));

                if (prop) {
                    return prop;
                } else if (throwIfNotFound) {
                    throw new Error("unable to locate property: " + propertyName + " on entityType: " + this.name);
                } else {
                    return null;
                }
            } else {
                var navProp = this.getNavigationProperty(propertyName);
                if (!navProp) {
                    if (throwIfNotFound) {
                        throw new Error("unable to locate navigation property: " + propertyName + " on entityType: " + this.name);
                    } else {
                        return null;
                    }
                }
                propertyNames.shift();
                var nextEntityType = navProp.entityType;
                return nextEntityType.getProperty(propertyNames, throwIfNotFound);
            }
        };

        /**
        Returns a string representation of this EntityType.
        @method toString
        @return {String}
        **/
        ctor.prototype.toString = function () {
            return this.name;
        };

        ctor.prototype.toJSON = function () {
            return {
                name: this.name,
                shortName: this.shortName,
                namespace: this.namespace,
                defaultResourceName: this.defaultResourceName,
                dataProperties: this.dataProperties,
                navigationProperties: this.navigationProperties,
                autoGeneratedKeyType: this.autoGeneratedKeyType.name,
                validators: this.validators
            };
        };

        // TODO: haven't yet handled _entityCtor.
        ctor.fromJSON = function (json, metadataStore) {
            var et = metadataStore.getEntityType(json.name, true);
            if (et) return et;
            et = new EntityType({
                shortName: json.shortName,
                namespace: json.namespace,
            });
                
            json.autoGeneratedKeyType = AutoGeneratedKeyType.fromName(json.autoGeneratedKeyType);
            json.validators = json.validators.map(function (v) {
                return Validator.fromJSON(v);
            });
            json.dataProperties = json.dataProperties.map(function (dp) {
                return DataProperty.fromJSON(dp, et);
            });
            json.navigationProperties = json.navigationProperties.map(function (dp) {
                return NavigationProperty.fromJSON(dp, et);
            });
            et = core.extend(et, json);
            metadataStore.addEntityType(et);
            return et;
        };
        
        ctor.prototype._clientPropertyPathToServer = function (propertyPath) {
            var fn = this.metadataStore.namingConvention.clientPropertyNameToServer;
            var that = this;
            var serverPropPath = propertyPath.split(".").map(function (propName) {
                var prop = that.getProperty(propName);
                return fn(propName, prop);
            }).join("/");
            return serverPropPath;
        };

        ctor.prototype._clientObjectToServer = function (clientObject) {
            var fn = this.metadataStore.namingConvention.clientPropertyNameToServer;
            var result = {};
            var that = this;
            core.objectForEach(clientObject, function (propName, value) {
                var prop = that.getProperty(propName);
                result[fn(propName, prop)] = value;
            });
            return result;
        };

        ctor.prototype._updatePropertyNames = function (property) {
            var nc = this.metadataStore.namingConvention;
            var serverName = property.nameOnServer;
            var clientName, testName;
            if (serverName) {
                clientName = nc.serverPropertyNameToClient(serverName, property);
                testName = nc.clientPropertyNameToServer(clientName, property);
                if (serverName !== testName) {
                    throw new Error("NamingConvention for this server property name does not roundtrip properly:" + serverName + "-->" + testName);
                }
                property.name = clientName;
            } else {
                clientName = property.name;
                serverName = nc.clientPropertyNameToServer(clientName, property);
                testName = nc.serverPropertyNameToClient(serverName, property);
                if (clientName !== testName) {
                    throw new Error("NamingConvention for this client property name does not roundtrip properly:" + clientName + "-->" + testName);
                }
                property.nameOnServer = serverName;
            }
        };

        ctor._getNormalizedTypeName = core.memoize(function (rawTypeName) {
            return rawTypeName && normalizeTypeName(rawTypeName).typeName;
        });
        // for debugging use the line below instead.
        //ctor._getNormalizedTypeName = function (rawTypeName) { return normalizeTypeName(rawTypeName).typeName; };

        ctor.prototype._checkNavProperty = function (navigationProperty) {
            if (navigationProperty.isNavigationProperty) {
                if (navigationProperty.parentEntityType != this) {
                    throw new Error(core.formatString("The navigationProperty '%1' is not a property of entity type '%2'",
                            navigationProperty.name, this.name));
                }
                return navigationProperty;
            }

            if (typeof (navigationProperty) === 'string') {
                var np = this.getProperty(navigationProperty);
                if (np && np.isNavigationProperty) return np;
            }
            throw new Error("The 'navigationProperty' parameter must either be a NavigationProperty or the name of a NavigationProperty");
        };
        
        function calcUnmappedProperties(entityType, instance) {
            var metadataPropNames = entityType.getPropertyNames();
            var trackablePropNames = v_modelLibraryDef.defaultInstance.getTrackablePropertyNames(instance);
            trackablePropNames.forEach(function (pn) {
                if (metadataPropNames.indexOf(pn) == -1) {
                    var newProp = new DataProperty({
                        name: pn,
                        dataType: DataType.Undefined,
                        isNullable: true,
                        isUnmapped: true
                    });
                    entityType.addProperty(newProp);
                }
            });
        }

        return ctor;
    })();
   
    var DataProperty = (function () {

        /**
        A DataProperty describes the metadata for a single property of an  {{#crossLink "EntityType"}}{{/crossLink}} that contains simple data. 

        Instances of the DataProperty class are constructed automatically during Metadata retrieval. However it is also possible to construct them
        directly via the constructor.
        @class DataProperty
        **/
        
        /** 
        @example                    
            var lastNameProp = new DataProperty( {
                name: "lastName",
                dataType: DataType.String,
                isNullable: true,
                maxLength: 20
            });
            // assuming personEntityType is a newly constructed EntityType
            personEntityType.addProperty(lastNameProperty);
        @method <ctor> DataProperty
        @param config {configuration Object} 
        @param [config.name] {String}  The name of this property. 
        @param [config.nameOnServer] {String} Same as above but the name is that defined on the server.
        Either this or the 'name' above must be specified. Whichever one is specified the other will be computed using
        the NamingConvention on the MetadataStore associated with the EntityType to which this will be added.
        @param [config.dataType=DataType.String] {DataType}
        @param [config.isNullable=false] {Boolean}
        @param [config.isPartOfKey=false] {Boolean}
        @param [config.isUnmapped=false] {Boolean}
        @param [config.concurrencyMode] {String}
        @param [config.maxLength] {Integer} Only meaningfull for DataType.String
        @param [config.fixedLength] {Boolean} Only meaningfull for DataType.String
        @param [config.validators] {Array of Validator}
        **/
        var ctor = function(config) {
            assertConfig(config)
                .whereParam("name").isString().isOptional()
                .whereParam("nameOnServer").isString().isOptional()
                .whereParam("dataType").isEnumOf(DataType).isOptional().withDefault(DataType.String)
                .whereParam("isNullable").isBoolean().isOptional().withDefault(false)
                .whereParam("defaultValue").isOptional()
                .whereParam("isPartOfKey").isBoolean().isOptional()
                .whereParam("isUnmapped").isBoolean().isOptional()
                .whereParam("concurrencyMode").isString().isOptional()
                .whereParam("maxLength").isNumber().isOptional()
                .whereParam("fixedLength").isBoolean().isOptional()
                .whereParam("validators").isInstanceOf(Validator).isArray().isOptional().withDefault([])
                .applyAll(this);
            var hasName = !!(this.name || this.nameOnServer);
            if (!hasName) {
                throw new Error("A DataProperty must be instantiated with either a 'name' or a 'nameOnServer' property");
            }
            if (this.defaultValue === undefined) {
                this.defaultValue = this.isNullable ? null : this.dataType.defaultValue;
            } else if (this.defaultValue === null && !this.isNullable) {
                throw new Error("A nonnullable DataProperty cannot have a null defaultValue. Name: " + this.name);
            }
        };
        

        
        ctor.prototype._$typeName = "DataProperty";

        /**
        The name of this property

        __readOnly__
        @property name {String}
        **/

        /**
        The {{#crossLink "EntityType"}}{{/crossLink}} that this property belongs to.

        __readOnly__
        @property parentEntityType {EntityType}
        **/

        /**
        The {{#crossLink "DataType"}}{{/crossLink}} of this property.

        __readOnly__
        @property dataType {DataType}
        **/

        /**
        Whether this property is nullable. 

        __readOnly__
        @property isNullable {Boolean}
        **/

        /**
        Whether this property is a 'key' property. 

        __readOnly__
        @property isPartOfKey {Boolean}
        **/

        /**
        Whether this property is an 'unmapped' property. 

        __readOnly__
        @property isUnmapped {Boolean}
        **/

        /**
        __Describe this__

        __readOnly__
        @property concurrencyMode {String}
        **/

        /**
        The maximum length for the value of this property.

        __readOnly__
        @property maxLength {Number}
        **/

        /**
        Whether this property is of 'fixed' length or not.

        __readOnly__
        @property fixedLength {Boolean}
        **/

        /**
        The {{#crossLink "Validator"}}{{/crossLink}}s that are associated with this property. Validators can be added and
        removed from this collection.

        __readOnly__
        @property validators {Array of Validator}
        **/

        /**
        The default value for this property.

        __readOnly__
        @property defaultValue {any}
        **/

        /**
        The navigation property related to this property.  Will only be set if this is a foreign key property. 

        __readOnly__
        @property relatedNavigationProperty {NavigationProperty}
        **/

        ctor.prototype.isDataProperty = true;
        ctor.prototype.isNavigationProperty = false;

        ctor.prototype.toJSON = function () {
            return {
                name: this.name,
                nameOnServer: this.nameOnServer,
                dataType: this.dataType.name,
                isNullable: this.isNullable,
                isUnmapped: this.isUnmapped,
                concurrencyMode: this.concurrencyMode,
                maxLength: this.maxLength,
                fixedLength: this.fixedLength,
                defaultValue: this.defaultValue,
                validators: this.validators,
                isPartOfKey: this.isPartOfKey
            };
        };

        ctor.fromJSON = function (json, parentEntityType) {
            
            json.dataType = DataType.fromName(json.dataType);
            json.validators = json.validators.map(function (v) {
                return Validator.fromJSON(v);
            });
            var dp = new DataProperty(json);
            parentEntityType.addProperty(dp);
            return dp;
        };

        return ctor;
    })();
  
    var NavigationProperty = (function () {

        /**
        A NavigationProperty describes the metadata for a single property of an  {{#crossLink "EntityType"}}{{/crossLink}} that return instances of other EntityTypes. 
    
        Instances of the NavigationProperty class are constructed automatically during Metadata retrieval.   However it is also possible to construct them
        directly via the constructor.
        @class NavigationProperty
        **/
        
        /** 
        @example                    
            var homeAddressProp = new NavigationProperty( {
                name: "homeAddress",
                entityTypeName: "Address:#myNamespace",
                isScalar: true,
                associationName: "address_person",
                foreignKeyNames: ["homeAddressId"]
            });
            var homeAddressIdProp = new DataProperty( {
                name: "homeAddressId"
                dataType: DataType.Integer,
            });
            // assuming personEntityType is a newly constructed EntityType
            personEntityType.addProperty(homeAddressProp);
            personEntityType.addProperty(homeAddressIdProp);
        @method <ctor> NavigationProperty
        @param config {configuration Object} 
        @param [config.name] {String}  The name of this property.
        @param [config.nameOnServer] {String} Same as above but the name is that defined on the server.
        Either this or the 'name' above must be specified. Whichever one is specified the other will be computed using
        the NamingConvention on the MetadataStore associated with the EntityType to which this will be added.
        @param config.entityTypeName {String} The fully qualified name of the type of entity that this property will return.  This type
        need not yet have been created, but it will need to get added to the relevant MetadataStore before this EntityType will be 'complete'.
        The entityType name is constructed as: {shortName} + ":#" + {namespace}
        @param [config.isScalar] {Boolean}
        @param [config.associationName] {String} A name that will be used to connect the two sides of a navigation. May be omitted for unidirectional navigations.
        @param [config.foreignKeyNames] {Array of String} An array of foreign key names. The array is needed to support the possibility of multipart foreign keys.
        Most of the time this will be a single foreignKeyName in an array.
        @param [config.foreignKeyNamesOnServer] {Array of String} Same as above but the names are those defined on the server. Either this or 'foreignKeyNames' must
        be specified, if there are foreignKeys. Whichever one is specified the other will be computed using
        the NamingConvention on the MetadataStore associated with the EntityType to which this will be added.
        @param [config.validators] {Array of Validator}
        **/
        var ctor = function(config) {
            assertConfig(config)
                .whereParam("name").isString().isOptional()
                .whereParam("nameOnServer").isString().isOptional()
                .whereParam("entityTypeName").isString()
                .whereParam("isScalar").isBoolean()
                .whereParam("associationName").isString().isOptional()
                .whereParam("foreignKeyNames").isArray().isString().isOptional().withDefault([])
                .whereParam("foreignKeyNamesOnServer").isArray().isString().isOptional().withDefault([])
                .whereParam("validators").isInstanceOf(Validator).isArray().isOptional().withDefault([])
                .applyAll(this);
            var hasName = !!(this.name || this.nameOnServer);
                                                              
            if (!hasName) {
                throw new Error("A Navigation property must be instantiated with either a 'name' or a 'nameOnServer' property");
            }
        };
        
        ctor.prototype._$typeName = "NavigationProperty";
        
        /**
        The {{#crossLink "EntityType"}}{{/crossLink}} that this property belongs to.
        __readOnly__
        @property parentEntityType {EntityType}
        **/

        /**
        The name of this property

        __readOnly__
        @property name {String}
        **/

        /**
        The {{#crossLink "EntityType"}}{{/crossLink}} returned by this property.

        __readOnly__
        @property entityType {EntityType}
        **/

        /**
        Whether this property returns a single entity or an array of entities.

        __readOnly__
        @property isScalar {Boolean}
        **/

        /**
        The name of the association to which that this property belongs.  This associationName will be shared with this 
        properties 'inverse'.

        __readOnly__
        @property associationName {String}
        **/

        /**
        The names of the foreign key DataProperties associated with this NavigationProperty. There will usually only be a single DataProperty associated 
        with a Navigation property except in the case of entities with multipart keys.

        __readOnly__
        @property foreignKeyNames {Array of String}
        **/

        /**
        The 'foreign key' DataProperties associated with this NavigationProperty. There will usually only be a single DataProperty associated 
        with a Navigation property except in the case of entities with multipart keys.

        __readOnly__
        @property relatedDataProperties {Array of DataProperty}
        **/

        /**
        The inverse of this NavigationProperty.  The NavigationProperty that represents a navigation in the opposite direction
        to this NavigationProperty.

        __readOnly__
        @property inverse {NavigationProperty}
        **/

        /**
        The {{#crossLink "Validator"}}{{/crossLink}}s that are associated with this property. Validators can be added and
        removed from this collection.

        __readOnly__
        @property validators {Array of Validator}
        **/

        /**
        Is this a DataProperty? - always false here 
        Allows polymorphic treatment of DataProperties and NavigationProperties.

        __readOnly__
        @property isDataProperty {Boolean}
        **/
        
        /**
        Is this a NavigationProperty? - always true here 
        Allows polymorphic treatment of DataProperties and NavigationProperties.

        __readOnly__
        @property isNavigationProperty {Boolean}
        **/
        
        ctor.prototype.isDataProperty = false;
        ctor.prototype.isNavigationProperty = true;

        ctor.prototype.toJSON = function () {
            return {
                name: this.name,
                nameOnServer: this.nameOnServer,
                entityTypeName: this.entityTypeName,
                isScalar: this.isScalar,
                associationName: this.associationName,
                foreignKeyNames: this.foreignKeyNames,
                foreignKeyNamesOnServer: this.foreignKeyNamesOnServer,
                validators: this.validators
            };
        };

        ctor.fromJSON = function (json, parentEntityType) {
            json.validators = json.validators.map(function (v) {
                return Validator.fromJSON(v);
            });
            var np = new NavigationProperty(json);
            parentEntityType.addProperty(np);
            return np;
        };

        return ctor;
    })();
    
    var AutoGeneratedKeyType = function () {
        /**
        AutoGeneratedKeyType is an 'Enum' containing all of the valid states for an automatically generated key.
        @class AutoGeneratedKeyType
        @static
        @final
        **/
        var ctor = new Enum("AutoGeneratedKeyType");
        /**
        This entity does not have an autogenerated key. 
        The client must set the key before adding the entity to the EntityManager
        @property None {AutoGeneratedKeyType}
        @final
        @static
        **/
        ctor.None = ctor.addSymbol();
        /**
        This entity's key is an Identity column and is set by the backend database. 
        Keys for new entities will be temporary until the entities are saved at which point the keys will
        be converted to their 'real' versions.
        @property Identity {AutoGeneratedKeyType}
        @final
        @static
        **/
        ctor.Identity = ctor.addSymbol();
        /**
        This entity's key is generated by a KeyGenerator and is set by the backend database. 
        Keys for new entities will be temporary until the entities are saved at which point the keys will
        be converted to their 'real' versions.
        @property KeyGenerator {AutoGeneratedKeyType}
        @final
        @static
        **/
        ctor.KeyGenerator = ctor.addSymbol();
        ctor.seal();

        return ctor;
    }();

    // mixin methods

    core.Param.prototype.isEntity = function () {
        var result = function (that, v) {
            if (v == null) return false;
            return (v.entityType !== undefined);
        };
        result.getMessage = function () {
            return " must be an entity";
        };
        return this.compose(result);
    };

    core.Param.prototype.isEntityProperty = function () {
        var result = function (that, v) {
            if (v == null) return false;
            return (v.isDataProperty || v.isNavigationProperty);
        };
        result.getMessage = function () {
            return " must be either a DataProperty or a NavigationProperty";
        };
        return this.compose(result);
    };

    function isQualifiedTypeName(entityTypeName) {
        return entityTypeName.indexOf(":#") >= 0;
    }
    
    function qualifyTypeName(simpleTypeName, namespace) {
        return simpleTypeName + ":#" + namespace;
    }

    // schema is only needed for navProperty type name
    function normalizeTypeName(entityTypeName, schema) {
        if (!entityTypeName) {
            return null;
        }
        if (core.stringStartsWith(entityTypeName, MetadataStore.ANONTYPE_PREFIX)) {
            return {
                shortTypeName: entityTypeName,
                namespace: "",
                typeName: entityTypeName,
                isAnon: true
            };
        }
        var entityTypeNameNoAssembly = entityTypeName.split(",")[0];
        var nameParts = entityTypeNameNoAssembly.split(".");
        if (nameParts.length > 1) {
            var namespaceParts = nameParts.slice(0, nameParts.length - 1);
            var simpleTypeName = nameParts[nameParts.length - 1];
            var namespace = namespaceParts.join(".");
            if (schema) {
                if (namespace == schema.alias || namespace == "Edm." + schema.alias) {
                    namespace = schema.namespace;
                } else if (core.stringStartsWith(namespace, "Edm.")) {
                    namespace = namespace.substr(4);
                }
            }
            if (schema) {
                namespace = translateNamespace(schema, namespace);
            }
            return {
                shortTypeName: simpleTypeName,
                namespace: namespace,
                typeName: qualifyTypeName(simpleTypeName, namespace)
            };
        } else {
            return {
                shortTypeName: entityTypeName,
                namespace: "",
                typeName: entityTypeName
            };
        }
    }

    // needed for Edmx models where the embedded ns is different from the clr namespace.
    function translateNamespace(schema, namespace) {
        var clrNamespace = schema.clrNamespace;
        if (!clrNamespace) return namespace;
        if (namespace === schema.namespace) {
            return clrNamespace;
        } else {
            return namespace;
        }
    }

    return {
        MetadataStore: MetadataStore,
        DataService: DataService,
        EntityType: EntityType,
        DataProperty: DataProperty,
        NavigationProperty: NavigationProperty,
        DataType: DataType,
        AutoGeneratedKeyType: AutoGeneratedKeyType,
        NamingConvention: NamingConvention
    };

})


;
define('entityQuery',["core", "entityMetadata", "entityAspect"],
function (core, m_entityMetadata, m_entityAspect) {
    
    /**
    @module breeze
    **/

    var Enum = core.Enum;
    var assertParam = core.assertParam;
    
    var MetadataStore = m_entityMetadata.MetadataStore;
    var NavigationProperty = m_entityMetadata.NavigationProperty;
    var EntityType = m_entityMetadata.EntityType;
    var DataType = m_entityMetadata.DataType;
    
    var EntityAspect = m_entityAspect.EntityAspect;
    var EntityKey = m_entityAspect.EntityKey;
    
    
    var EntityQuery = (function () {
        /**
        An EntityQuery instance is used to query entities either from a remote datasource or from a local {{#crossLink "EntityManager"}}{{/crossLink}}. 

        EntityQueries are immutable - this means that all EntityQuery methods that return an EntityQuery actually create a new EntityQuery.  This means that 
        EntityQueries can be 'modified' without affecting any current instances.

        @class EntityQuery
        **/
            
        /**
        @example                    
            var query = new EntityQuery("Customers")

        Usually this constructor will be followed by calls to filtering, ordering or selection methods
        @example
            var query = new EntityQuery("Customers")
               .where("CompanyName", "startsWith", "C")
               .orderBy("Region");

        @method <ctor> EntityQuery 
        @param [resourceName] {String}
        **/
        var ctor = function (resourceName) {
            assertParam(resourceName, "resourceName").isOptional().isString().check();
            this.resourceName = normalizeResourceName(resourceName);
            this.entityType = null;
            this.wherePredicate = null;
            this.orderByClause = null;
            this.selectClause = null;
            this.skipCount = null;
            this.takeCount = null;
            this.expandClause = null;
            this.inlineCountEnabled = false;
            // default is to get queryOptions from the entityManager.
            this.queryOptions = null;
            this.entityManager = null;                 
        };

        /**
        The resource name used by this query.

        __readOnly__
        @property resourceName {String}
        **/

        /**
        The 'where' predicate used by this query.

        __readOnly__
        @property wherePredicate {Predicate} 
        **/

        /**
        The {{#crossLink "OrderByClause"}}{{/crossLink}} used by this query.

        __readOnly__
        @property orderByClause {OrderByClause}
        **/

        /**
        The number of entities to 'skip' for this query.

        __readOnly__
        @property skipCount {Integer}
        **/

        /**
        The number of entities to 'take' for this query.

        __readOnly__
        @property takeCount {Integer}
        **/

        /**
        The {{#crossLink "QueryOptions"}}{{/crossLink}} for this query.

        __readOnly__
        @property queryOptions {QueryOptions}
        **/
        
        /**
        The {{#crossLink "EntityManager"}}{{/crossLink}} for this query. This may be null and can be set via the 'using' method.

        __readOnly__
        @property entityManager {EntityManager}
        **/

        /*
        Made internal for now.
        @method getEntityType
        @param metadataStore {MetadataStore} The {{#crossLink "MetadataStore"}}{{/crossLink}} in which to locate the 
        {{#crossLink "EntityType"}}{{/crossLink}} returned by this query. 
        @param [throwErrorIfNotFound = false] {Boolean} Whether or not to throw an error if an EntityType cannot be found.
        @return {EntityType} Will return a null if the resource has not yet been resolved and throwErrorIfNotFound is false. 
        */
        ctor.prototype._getEntityType = function (metadataStore, throwErrorIfNotFound) {
            assertParam(metadataStore, "metadataStore").isInstanceOf(MetadataStore).check();
            assertParam(throwErrorIfNotFound, "throwErrorIfNotFound").isBoolean().isOptional().check();
            var entityType = this.entityType;
            if (!entityType) {
                var resourceName = this.resourceName;
                if (!resourceName) {
                    throw new Error("There is no resourceName for this query");
                }
                if (metadataStore.isEmpty()) {
                    return null;
                }
                var entityTypeName = metadataStore._getEntityTypeNameForResourceName(resourceName);
                if (!entityTypeName) {
                    if (throwErrorIfNotFound) {
                        throw new Error("Cannot find resourceName of: " + resourceName);
                    } else {
                        return null;
                    }
                }
                entityType = metadataStore.getEntityType(entityTypeName);
                if (!entityType) {
                    if (throwErrorIfNotFound) {
                        throw new Error("Cannot find an entityType for an entityTypeName of: " + entityTypeName);
                    } else {
                        return null;
                    }
                }
                this.entityType = entityType;
            }
            return entityType;
        };

        /**
        Specifies the resource to query for this EntityQuery.
        @example                    
            var query = new EntityQuery()
                .from("Customers");
        is the same as 
        @example
            var query = new EntityQuery("Customers");
        @method from
        @param resourceName {String} The resource to query.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.from = function (resourceName) {
            // TODO: think about allowing entityType as well 
            assertParam(resourceName, "resourceName").isString().check();
            resourceName = normalizeResourceName(resourceName);
            var currentName = this.resourceName;
            if (currentName && currentName !== resourceName) {
                throw new Error("This query already has an resourceName - the resourceName may only be set once per query");
            }
            var eq = this._clone();
            eq.resourceName = resourceName;
            return eq;
        };
        
        /**
        This is a static version of the "from" method and it creates a 'base' entityQuery for the specified resource name. 
        @example                    
            var query = EntityQuery.from("Customers");
        is the same as 
        @example
            var query = new EntityQuery("Customers");
        @method from
        @static
        @param resourceName {String} The resource to query.
        @return {EntityQuery}
        @chainable
        **/
        ctor.from = function (resourceName) {
            assertParam(resourceName, "resourceName").isString().check();
            return new EntityQuery(resourceName);
        };


        /**
        Adds a filter to the query. Can be called multiple times which means to 'and' with any existing Predicate.
        @example                    
            var query = new EntityQuery("Customers")
                .where("CompanyName", "startsWith", "C");
        This can also be expressed using an explicit {{#crossLink "FilterQueryOp"}}{{/crossLink}} as
        @example
            var query = new EntityQuery("Customers")
                .where("CompanyName", FilterQueryOp.StartsWith, "C");
        or a preconstructed {{#crossLink "Predicate"}}{{/crossLink}} may be used
        @example
            var pred = new Predicate("CompanyName", FilterQueryOp.StartsWith, "C");
            var query = new EntityQuery("Customers")
                .where(pred);
        Predicates are often useful when you want to combine multiple conditions in a single filter, such as
        @example
            var pred = Predicate.create("CompanyName", "startswith", "C").and("Region", FilterQueryOp.Equals, null);
            var query = new EntityQuery("Customers")
                .where(pred);
        @example
        More complicated queries can make use of nested property paths
        @example
            var query = new EntityQuery("Products")
                .where("Category.CategoryName", "startswith", "S");
        or OData functions - A list of valid OData functions can be found within the {{#crossLink "Predicate"}}{{/crossLink}} documentation.
        @example
            var query = new EntityQuery("Customers")
                .where("toLower(CompanyName)", "startsWith", "c");
        or to be even more baroque
        @example
            var query = new EntityQuery("Customers")
               .where("toUpper(substring(CompanyName, 1, 2))", FilterQueryOp.Equals, "OM");
        @method where
        @param predicate {Predicate|property|property path, operator, value} Can be either
        
        - a single {{#crossLink "Predicate"}}{{/crossLink}}

        - or the parameters to create a 'simple' Predicate

            - a property name, a property path with '.' as path seperators or a property expression {String}
            - an operator {FilterQueryOp|String} Either a  {{#crossLink "FilterQueryOp"}}{{/crossLink}} or it's string representation. Case is ignored
            when if a string is provided and any string that matches one of the FilterQueryOp aliases will be accepted.
            - a value    
   
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.where = function (predicate) {
            var eq = this._clone();
            if (arguments.length === 0) {
                eq.wherePredicate = null;
                return eq;
            }
            var pred;
            if (Predicate.isPredicate(predicate)) {
                pred = predicate;
            } else {
                pred = Predicate.create(Array.prototype.slice.call(arguments));
            }
            if (eq.entityType) pred.validate(eq.entityType);
            if (eq.wherePredicate) {
                eq.wherePredicate = new CompositePredicate('and', [eq.wherePredicate, pred]);
            } else {
                eq.wherePredicate = pred;
            }
            return eq;
        };

        /**
        Returns a query that orders the results of the query by property name.  By default sorting occurs is ascending order, but sorting in descending order is supported as well. 
        @example
             var query = new EntityQuery("Customers")
                 .orderBy("CompanyName");

        or to sort across multiple properties
        @example
             var query = new EntityQuery("Customers")
                 .orderBy("Region, CompanyName");

        Nested property paths are also supported
        @example
             var query = new EntityQuery("Products")
                .orderBy("Category.CategoryName");

        Sorting in descending order is supported via the addition of ' desc' to the end of any property path.
        @example
             var query = new EntityQuery("Customers")
                .orderBy("CompanyName desc");

        or
        @example
             var query = new EntityQuery("Customers")
                .orderBy("Region desc, CompanyName desc");
        @method orderBy
        @param propertyPaths {String} A list of property paths seperated by ','. Each property path can optionally end with " desc" to force a descending sort order.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.orderBy = function (propertyPaths) {
            core.assertParam(propertyPaths, "propertyNames").isString();
            // deliberately don't pass in isDesc
            return orderByCore(this, propertyPaths);
        };

        /**
        Returns a query that orders the results of the query by property name in descending order.
        @example
             var query = new EntityQuery("Customers")
                 .orderByDesc("CompanyName");

        or to sort across multiple properties
        @example
             var query = new EntityQuery("Customers")
                 .orderByDesc("Region, CompanyName");

        Nested property paths are also supported
        @example
             var query = new EntityQuery("Products")
                .orderByDesc("Category.CategoryName");

        @method orderByDesc
        @param propertyPaths {String} A list of property paths seperated by ','.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.orderByDesc = function (propertyPaths) {
            core.assertParam(propertyPaths, "propertyNames").isString();
            return orderByCore(this, propertyPaths, true);
        };
        
        /**
        Returns a query that selects a list of properties from the results of the original query and returns the values of just these properties. This
        will be referred to as a projection. 
        If the result of this selection "projection" contains entities, these entities will automatically be added to EntityManager's cache and will 
        be made 'observable'.
        Any simple properties, i.e. strings, numbers or dates within a projection will not be cached are will NOT be made 'observable'.
        
        @example
        Simple data properties can be projected
        @example
            var query = new EntityQuery("Customers")
                .where("CompanyName", "startsWith", "C")
                .select("CompanyName");
        This will return an array of objects each with a single "CompanyName" property of type string.
        A similar query could return a navigation property instead
        @example
            var query = new EntityQuery("Customers")
                .where("CompanyName", "startsWith", "C")
                .select("Orders");
        where the result would be an array of objects each with a single "Orders" property that would itself be an array of "Order" entities.
        Composite projections are also possible:
        @example
            var query = new EntityQuery("Customers")
                .where("CompanyName", "startsWith", "C")
                .select("CompanyName, Orders");
        As well as projections involving nested property paths
        @example
            var query = EntityQuery("Orders")
                .where("Customer.CompanyName", "startsWith", "C")         
                .select("Customer.CompanyName, Customer, OrderDate");
        @method select
        @param propertyPaths {String} A list of property paths seperated by ','.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.select = function (propertyPaths) {
            core.assertParam(propertyPaths, "propertyPaths").isString();
            return selectCore(this, propertyPaths);
        };

        /**
        Returns a query that skips the specified number of entities when returning results.
        @example
            var query = new EntityQuery("Customers")
               .where("CompanyName", "startsWith", "C")
               .skip(5);
        @method skip
        @param count {Number} The number of entities to return. If omitted this clears the 
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.skip = function (count) {
            assertParam(count, "count").isOptional().isNumber().check();
            var eq = this._clone();
            if (arguments.length === 0) {
                eq.skipCount = null;
            } else {
                eq.skipCount = count;
            }
            return eq;
        };
        
        /**
        Returns a query that returns only the specified number of entities when returning results. - Same as 'take'.
        @example
            var query = new EntityQuery("Customers")
                .top(5);
        @method top
        @param count {Number} The number of entities to return.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.top = function(count) {
            return this.take(count);
        };

        /**
        Returns a query that returns only the specified number of entities when returning results - Same as 'top'
        @example
            var query = new EntityQuery("Customers")
                .take(5);
        @method take
        @param count {Number} The number of entities to return.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.take = function (count) {
            assertParam(count, "count").isOptional().isNumber().check();
            var eq = this._clone();
            if (arguments.length === 0) {
                eq.takeCount = null;
            } else {
                eq.takeCount = count;
            }
            return eq;
        };
        
        /**
        Returns a query that will return related entities nested within its results. The expand method allows you to identify related entities, via navigation property
        names such that a graph of entities may be retrieved with a single request. Any filtering occurs before the results are 'expanded'.
        @example
            var query = new EntityQuery("Customers")
                .where("CompanyName", "startsWith", "C")
                .expand("Orders");
        will return the filtered customers each with its "Orders" properties fully resolved.
        Multiple paths may be specified by separating the paths by a ','
        @example
            var query = new EntityQuery("Orders")
                .expand("Customer, Employee")
        and nested property paths my be specified as well
        @example
            var query = new EntityQuery("Orders")
                .expand("Customer, OrderDetails, OrderDetails.Product")
        @method expand
        @param propertyPaths {String} A comma-separated list of navigation property names. Each Navigation Property name can be followed
        by a '.' and another navigation property name to enable identifying a multi-level relationship
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.expand = function (propertyPaths) {
            assertParam(propertyPaths, "propertyPaths").isString().check();
            return expandCore(this, propertyPaths);
        };

        /**
        Returns the query with the 'inlineCount' capability either enabled or disabled.  With 'inlineCount' enabled, an additional 'inlineCount' property
        will be returned with the query results that will contain the number of entities that would have been returned by this
        query with only the 'where'/'filter' clauses applied, i.e. without any 'skip'/'take' operators applied. For local queries this clause is ignored. 

        @example
            var query = new EntityQuery("Customers")
                .take(20)
                .orderBy("CompanyName")
                .inlineCount(true);
        will return the first 20 customers as well as a count of all of the customers in the remote store.

        @method inlineCount
        @param enabled {Boolean=true} Whether or not inlineCount capability should be enabled. If this parameter is omitted, true is assumed. 
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.inlineCount = function(enabled) {
            if (enabled === undefined) enabled = true;
            var eq = this._clone();
            eq.inlineCountEnabled = enabled;
            return eq;
        };

         // Implementations found in EntityManager
        /**
        Returns a copy of this EntityQuery with the specified {{#crossLink "EntityManager"}}{{/crossLink}}, {{#crossLink "MergeStrategy"}}{{/crossLink}} 
        or {{#crossLink "FetchStrategy"}}{{/crossLink}} applied.
        @example
        'using' can be used to return a new query with a specified EntityManager.
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders")
                 .using(em);
        or with a specified {{#crossLink "MergeStrategy"}}{{/crossLink}} 
        @example
            var em = new EntityManager(serviceName);
            var query = new EntityQuery("Orders")
                .using(MergeStrategy.PreserveChanges);
        or with a specified {{#crossLink "FetchStrategy"}}{{/crossLink}} 
        @example
            var em = new EntityManager(serviceName);
            var query = new EntityQuery("Orders")
                .using(FetchStrategy.FromLocalCache);
        @example
        @method using
        @param obj {EntityManager|MergeStrategy|FetchStrategy} The object to update in creating a new EntityQuery from an existing one.
        @return {EntityQuery}
        @chainable
        **/
        
        // Implementations found in EntityManager
        /**
        Executes this query.  This method requires that an EntityManager have been previously specified via the "using" method.
        @example
        This method can be called using a 'promises' syntax ( recommended)
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders").using(em);
             query.execute()
               .then( function(data) {
                   ... query results processed here
             }).fail( function(err) {
                   ... query failure processed here
             });
        or with callbacks
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders").using(em);
             query.execute(
                function(data) {
                   var orders = data.results;
                   ... query results processed here
                },
                function(err) {
                   ... query failure processed here
                });
        Either way this method is the same as calling the EntityManager 'execute' method.
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders");
             em.executeQuery(query)
               .then( function(data) {
                   var orders = data.results;
                   ... query results processed here
             }).fail( function(err) {
                   ... query failure processed here
             });
         
        @method execute
        @async
        
        @param callback {Function} Function called on success.
        
            successFunction([data])
            @param [callback.data] {Object} 
            @param callback.data.results {Array of Entity}
            @param callback.data.query {EntityQuery} The original query
            @param callback.data.XHR {XMLHttpRequest} The raw XMLHttpRequest returned from the server.

        @param errorCallback {Function} Function called on failure.
            
            failureFunction([error])
            @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.
            @param [errorCallback.error.query] The query that caused the error.
            @param [errorCallback.error.XHR] {XMLHttpRequest} The raw XMLHttpRequest returned from the server.

        @return {Promise}
        **/
        
        /**
        Executes this query against the local cache.  This method requires that an EntityManager have been previously specified via the "using" method.
        @example
            // assume em is an entityManager already filled with order entities;
            var query = new EntityQuery("Orders").using(em);
            var orders = query.executeLocally();
        
        Note that calling this method is the same as calling {{#crossLink "EntityManager/executeQueryLocally"}}{{/crossLink}}.
      
        @method executeLocally
        **/

        /**
        Static method tht creates an EntityQuery that will allow 'requerying' an entity or a collection of entities by primary key. This can be useful
        to force a requery of selected entities, or to restrict an existing collection of entities according to some filter.
        @example
            // assuming 'customers' is an array of 'Customer' entities retrieved earlier.
            var customersQuery = EntityQuery.fromEntities(customers);
        The resulting query can, of course, be extended
        @example
            // assuming 'customers' is an array of 'Customer' entities retrieved earlier.
            var customersQuery = EntityQuery.fromEntities(customers)
                .where("Region", FilterQueryOp.NotEquals, null);
        Single entities can requeried as well.
        @example
            // assuming 'customer' is a 'Customer' entity retrieved earlier.
            var customerQuery = EntityQuery.fromEntities(customer);
        will create a query that will return an array containing a single customer entity.
        @method fromEntities
        @static
        @param entities {Entity|Array of Entity} The entities for which we want to create an EntityQuery.
        @return {EntityQuery}
        @chainable
        **/
        ctor.fromEntities = function (entities) {
            assertParam(entities, "entities").isEntity().or().isNonEmptyArray().isEntity().check();
            if (!Array.isArray(entities)) {
                entities = Array.prototype.slice.call(arguments);
            }
            var firstEntity = entities[0];
            var q = new EntityQuery(firstEntity.entityType.defaultResourceName);
            var preds = entities.map(function (entity) {
                return buildPredicate(entity);
            });
            var pred = Predicate.or(preds);
            q = q.where(pred);
            var em = firstEntity.entityAspect.entityManager;
            if (em) {
                q = q.using(em);
            }
            return q;
        };

        /**
        Creates an EntityQuery for the specified {{#crossLink "EntityKey"}}{{/crossLink}}.
        @example
            var empType = metadataStore.getEntityType("Employee");
            var entityKey = new EntityKey(empType, 1);
            var query = EntityQuery.fromEntityKey(entityKey);
        or
        @example
            // 'employee' is a previously queried employee
            var entityKey = employee.entityAspect.getKey();
            var query = EntityQuery.fromEntityKey(entityKey);
        @method fromEntityKey
        @static
        @param entityKey {EntityKey} The {{#crossLink "EntityKey"}}{{/crossLink}} for which a query will be created.
        @return {EntityQuery}
        @chainable
        **/
        ctor.fromEntityKey = function (entityKey) {
            assertParam(entityKey, "entityKey").isInstanceOf(EntityKey).check();
            var q = new EntityQuery(entityKey.entityType.defaultResourceName);
            var pred = buildKeyPredicate(entityKey);
            q = q.where(pred);
            return q;
        };

        /**
        Creates an EntityQuery for the specified entity and {{#crossLink "NavigationProperty"}}{{/crossLink}}.
        @example
            // 'employee' is a previously queried employee
            var ordersNavProp = employee.entityType.getProperty("Orders");
            var query = EntityQuery.fromEntityNavigation(employee, ordersNavProp);
        will return a query for the "Orders" of the specified 'employee'.
        @method fromEntityNavigation
        @static
        @param entity {Entity} The Entity whose navigation property will be queried.
        @param navigationProperty {NavigationProperty} The {{#crossLink "NavigationProperty"}}{{/crossLink}} to be queried.
        @return {EntityQuery}
        @chainable
        **/
        ctor.fromEntityNavigation = function (entity, navigationProperty) {
            assertParam(entity, "entity").isEntity().check();
            assertParam(navigationProperty, "navigationProperty").isInstanceOf(NavigationProperty).check();
            var navProperty = entity.entityType._checkNavProperty(navigationProperty);
            var q = new EntityQuery(navProperty.entityType.defaultResourceName);
            var pred = buildNavigationPredicate(entity, navProperty);
            q = q.where(pred);
            var em = entity.entityAspect.entityManager;
            if (em) {
                q = q.using(em);
            }
            return q;
        };


        // protected methods

        ctor.prototype._clone = function () {
            var copy = new EntityQuery();
            copy.resourceName = this.resourceName;
            copy.entityType = this.entityType;
            copy.wherePredicate = this.wherePredicate;
            copy.orderByClause = this.orderByClause;
            copy.selectClause = this.selectClause;
            copy.skipCount = this.skipCount;
            copy.takeCount = this.takeCount;
            copy.expandClause = this.expandClause;
            // default is to get queryOptions from the entityManager.
            copy.queryOptions = this.queryOptions;
            copy.entityManager = this.entityManager;

            return copy;
        };

        // OData QueryOptions - currently supports filter, orderBy, skip, top and expand.
        //        $filter    - done
        //        $select
        //        $orderBy   - done
        //        $top       - done
        //        $skip      - done
        //        $format
        //        $expand    - done
        //        $inlinecount

        ctor.prototype._toUri = function (metadataStore) {
            // force entityType validation;
            var entityType = this._getEntityType(metadataStore, false);
            if (!entityType) {
                entityType = new EntityType(metadataStore);
            }

            var eq = this;
            var queryOptions = {};
            queryOptions["$filter"] = toFilterString();
            queryOptions["$orderby"] = toOrderByString();
            queryOptions["$skip"] = toSkipString();
            queryOptions["$top"] = toTopString();
            queryOptions["$expand"] = toExpandString();
            queryOptions["$select"] = toSelectString();
            queryOptions["$inlinecount"] = toInlineCountString();
            var qoText = toQueryOptionsString();
            return this.resourceName + qoText;

            // private methods to this func.

            function toFilterString() {
                var clause = eq.wherePredicate;
                if (!clause) return "";
                if (eq.entityType) {
                    clause.validate(eq.entityType);
                }
                return clause.toOdataFragment(entityType);
            }
            
            function toInlineCountString() {
                if (!eq.inlineCountEnabled) return "";
                return eq.inlineCountEnabled ? "allpages" : "none";
            }

            function toOrderByString() {
                var clause = eq.orderByClause;
                if (!clause) return "";
                if (eq.entityType) {
                    clause.validate(eq.entityType);
                }
                return clause.toOdataFragment(entityType);
            }
            
             function toSelectString() {
                var clause = eq.selectClause;
                if (!clause) return "";
                if (eq.entityType) {
                    clause.validate(eq.entityType);
                }
                return clause.toOdataFragment(entityType);
            }
            
            function toExpandString() {
                var clause = eq.expandClause;
                if (!clause) return "";
                return clause.toOdataFragment(entityType);
            }

            function toSkipString() {
                var count = eq.skipCount;
                if (!count) return "";
                return count.toString();
            }

            function toTopString() {
                var count = eq.takeCount;
                if (!count) return "";
                return count.toString();
            }

            function toQueryOptionsString() {
                var qoStrings = [];
                for (var qoName in queryOptions) {
                    var qoValue = queryOptions[qoName];
                    if (qoValue) {
                        qoStrings.push(qoName + "=" + qoValue);
                    }
                }

                if (qoStrings.length > 0) {
                    return "?" + qoStrings.join("&");
                } else {
                    return "";
                }
            }
        };

        ctor.prototype._toFilterFunction = function (entityType) {
            var wherePredicate = this.wherePredicate;
            if (!wherePredicate) return null;
            // may throw an exception
            wherePredicate.validate(entityType);
            return wherePredicate.toFunction(entityType);
        };

        ctor.prototype._toOrderByComparer = function (entityType) {
            var orderByClause = this.orderByClause;
            if (!orderByClause) return null;
            // may throw an exception
            orderByClause.validate(entityType);
            return orderByClause.getComparer();
        };

        // private functions
        
        function normalizeResourceName(resourceName) {
            return resourceName;
//            if (resourceName) {
//                return resourceName.toLowerCase();
//            } else {
//                return undefined;
//            }
        }

        function buildPredicate(entity) {
            var entityType = entity.entityType;
            var predParts = entityType.keyProperties.map(function (kp) {
                return Predicate.create(kp.name, FilterQueryOp.Equals, entity.getProperty(kp.name));
            });
            var pred = Predicate.and(predParts);
            return pred;
        }

        // propertyPaths: can pass in create("A.X,B") or create("A.X desc, B") or create("A.X desc,B", true])
        // isDesc parameter trumps isDesc in propertyName.

        function orderByCore(that, propertyPaths, isDesc) {
            var newClause;
            var eq = that._clone();
            if (!propertyPaths) {
                eq.orderByClause = null;
                return eq;
            }

            newClause = OrderByClause.create(propertyPaths, isDesc);

            if (eq.orderByClause) {
                eq.orderByClause.addClause(newClause);
            } else {
                eq.orderByClause = newClause;
            }
            return eq;
        }
        
        function selectCore(that, propertyPaths) {
            var eq = that._clone();
            if (!propertyPaths) {
                eq.selectClause = null;
                return eq;
            }
            eq.selectClause = new SelectClause(propertyPaths);
            return eq;
        }
        
        function expandCore(that, propertyPaths) {
            var eq = that._clone();
            if (!propertyPaths) {
                eq.expandClause = null;
                return eq;
            }
            eq.expandClause = new ExpandClause(propertyPaths);
            return eq;
        }
        

        function buildKeyPredicate(entityKey) {
            var keyProps = entityKey.entityType.keyProperties;
            var preds = core.arrayZip(keyProps, entityKey.values, function (kp, v) {
                return Predicate.create(kp.name, FilterQueryOp.Equals, v);
            });
            var pred = Predicate.and(preds);
            return pred;
        }

        function buildNavigationPredicate(entity, navigationProperty) {
            if (navigationProperty.isScalar) {
                if (navigationProperty.foreignKeyNames.length === 0) return null;
                var relatedKeyValues = navigationProperty.foreignKeyNames.map(function (fkName) {
                    return entity.getProperty(fkName);
                });
                var entityKey = new EntityKey(navigationProperty.entityType, relatedKeyValues);
                return buildKeyPredicate(entityKey);
            } else {
                var inverseNp = navigationProperty.inverse;
                if (!inverseNp) return null;
                var foreignKeyNames = inverseNp.foreignKeyNames;
                if (foreignKeyNames.length === 0) return null;
                var keyValues = entity.entityAspect.getKey().values;
                var predParts = core.arrayZip(foreignKeyNames, keyValues, function (fkName, kv) {
                    return Predicate.create(fkName, FilterQueryOp.Equals, kv);
                });
                var pred = Predicate.and(predParts);
                return pred;
            }
        }

        return ctor;
    })();

    var QueryFuncs = (function() {
        var obj = {
            toupper:     { fn: function (source) { return source.toUpperCase(); }, dataType: DataType.String },
            tolower:     { fn: function (source) { return source.toLowerCase(); }, dataType: DataType.String },
            substring:   { fn: function (source, pos, length) { return source.substring(pos, length); }, dataType: DataType.String },
            substringof: { fn: function (find, source) { return source.indexOf(find) >= 0;}, dataType: DataType.Boolean },
            length:      { fn: function(source) { return source.length; }, dataType: DataType.Int32 },
            trim:        { fn: function (source) { return source.trim(); }, dataType: DataType.String },
            concat:      { fn: function (s1, s2) { return s1.concat(s2); }, dataType: DataType.String },
            replace:     { fn: function (source, find, replace) { return source.replace(find, replace); }, dataType: DataType.String },
            startswith:  { fn: function (source, find) { return core.stringStartsWith(source, find); }, dataType: DataType.Boolean },
            endswith:    { fn: function (source, find) { return core.stringEndsWith(source, find); }, dataType: DataType.Boolean },
            indexof:     { fn: function (source, find) { return source.indexOf(find); }, dataType: DataType.Int32 },
            round:       { fn: function (source) { return Math.round(source); }, dataType: DataType.Int32 },
            ceiling:     { fn: function (source) { return Math.ceil(source); }, dataType: DataType.Int32 },
            floor:       { fn: function (source) { return Math.floor(source); }, dataType: DataType.Int32 },
            second:      { fn: function (source) { return source.second; }, dataType: DataType.Int32 },
            minute:      { fn: function (source) { return source.minute; }, dataType: DataType.Int32 },
            day:         { fn: function (source) { return source.day; }, dataType: DataType.Int32 },
            month:       { fn: function (source) { return source.month; }, dataType: DataType.Int32 },
            year:        { fn: function (source) { return source.year; }, dataType: DataType.Int32 },
        };
        
        return obj;
    })();
    
    var FnNode = (function() {
        // valid property name identifier
        var RX_IDENTIFIER = /^[a-z_][\w.$]*$/i ;
        // comma delimited expressions ignoring commas inside of quotes.
        var RX_COMMA_DELIM1 = /('[^']*'|[^,]+)/g ;
        var RX_COMMA_DELIM2 = /("[^"]*"|[^,]+)/g ;
        
        var ctor = function(source, tokens) {
            var parts = source.split(":");
            if (parts.length == 1) {
                var value = parts[0].trim();
                this.value = value;
                // value is either a string, a quoted string, a number, a bool value, or a date
                // if a string ( not a quoted string) then this represents a property name.
                var firstChar = value.substr(0,1);
                var quoted = firstChar == "'" || firstChar == '"';
                if (quoted) {
                    var unquoted = value.substr(1, value.length - 2);
                    this.fn = function (entity) { return unquoted; };
                    this.dataType = DataType.String;
                } else {
                    var isIdentifier = RX_IDENTIFIER.test(value);
                    if (isIdentifier) {
                        this.propertyPath = value;
                        this.fn = createPropFunction(value);
                    } else {
                        this.fn = function (entity) { return value; };
                        this.dataType = DataType.fromJsType(typeof value);
                    }
                } 
            } else {
                this.fnName = parts[0].trim().toLowerCase();
                var qf = QueryFuncs[this.fnName];
                this.localFn = qf.fn;
                this.dataType = qf.dataType;
                var that = this;
                this.fn = function(entity) {
                    var resolvedNodes = that.fnNodes.map(function(fnNode) {
                        var argVal = fnNode.fn(entity);
                        return argVal;
                    });
                    var val = that.localFn.apply(null, resolvedNodes);
                    return val;
                };
                var argSource = tokens[parts[1]].trim();
                if (argSource.substr(0, 1) == "(") {
                    argSource = argSource.substr(1, argSource.length - 2);
                }
                var commaMatchStr = source.indexOf("'") >= 0 ? RX_COMMA_DELIM1 : RX_COMMA_DELIM2;
                var args = argSource.match(commaMatchStr);
                this.fnNodes = args.map(function(a) {
                    return new FnNode(a, tokens);
                });
            }
        };

        ctor.create = function(source) {
            var regex = /\([^()]*\)/ ;
            var m;
            var tokens = [];
            var i = 0;
            while (m = regex.exec(source)) {
                var token = m[0];
                tokens.push(token);
                var repl = ":" + i++;
                source = source.replace(token, repl);
            }
            var node = new FnNode(source, tokens);
            return node;
        };

        ctor.prototype.toString = function() {
            if (this.fnName) {
                var args = this.fnNodes.map(function(fnNode) {
                    return fnNode.toString();
                });
                var uri = this.fnName + "(" + args.join(",") + ")";
                return uri;
            } else {
                return this.value;
            }
        };

        ctor.prototype.updateWithEntityType = function(entityType) {
            if (this.propertyPath) {
                if (entityType.isAnonymous) return;
                var prop = entityType.getProperty(this.propertyPath);
                if (!prop) {
                    var msg = core.formatString("Unable to resolve propertyPath.  EntityType: '%1'   PropertyPath: '%2'", entityType.name, this.propertyPath);
                    throw new Error(msg);
                }
                this.dataType = prop.dataType;
            }
        };

        ctor.prototype.toOdataFragment = function (entityType) {
            this.updateWithEntityType(entityType);
            if (this.fnName) {
                var args = this.fnNodes.map(function(fnNode) {
                    return fnNode.toOdataFragment(entityType);
                });                
                var uri = this.fnName + "(" + args.join(",") + ")";
                return uri;
            } else {
                var firstChar = this.value.substr(0, 1);
                if (firstChar === "'" || firstChar === '"') {
                    return this.value;                  
                } else if (this.value == this.propertyPath) {
                    return entityType._clientPropertyPathToServer(this.propertyPath);
                } else {
                    return this.value;
                }
            }
        };

        ctor.prototype.validate = function(entityType) {
            // will throw if not found;
            if (this._isValidated) return;            
            this._isValidated = true;
            if (this.propertyPath) {
                var prop = entityType.getProperty(this.propertyPath, true);
                if (prop.isDataProperty) {
                    this.dataType = prop.dataType;
                } else {
                    this.dataType = prop.entityType;
                }
            } else if (this.fnNodes) {
                this.fnNodes.forEach(function(node) {
                    node.validate(entityType);
                });
            }
        };
        

        return ctor;
    })();
   
    var FilterQueryOp = function () {
        /**
        FilterQueryOp is an 'Enum' containing all of the valid  {{#crossLink "Predicate"}}{{/crossLink}} 
        filter operators for an {{#crossLink "EntityQuery"}}{{/crossLink}}.

        @class FilterQueryOp
        @static
        **/
        var aEnum = new Enum("FilterQueryOp");
        /**
        Aliases: "eq", "=="
        @property Equals {FilterQueryOp}
        @final
        @static
        **/
        aEnum.Equals = aEnum.addSymbol({ operator: "eq", aliases: ["=="] });
        /**
        Aliases: "ne", "!="
        @property NotEquals {FilterQueryOp}
        @final
        @static
        **/
        aEnum.NotEquals = aEnum.addSymbol({ operator: "ne", aliases: ["!="] });
        /**
        Aliases: "gt", ">"
        @property GreaterThan {FilterQueryOp}
        @final
        @static
        **/
        aEnum.GreaterThan = aEnum.addSymbol({ operator: "gt", aliases: [">"] });
        /**
        Aliases: "lt", "<"
        @property LessThan {FilterQueryOp}
        @final
        @static
        **/
        aEnum.LessThan = aEnum.addSymbol({ operator: "lt", aliases: ["<"] });
        /**
        Aliases: "ge", ">="
        @property GreaterThanOrEqual {FilterQueryOp}
        @final
        @static
        **/
        aEnum.GreaterThanOrEqual = aEnum.addSymbol({ operator: "ge", aliases: [">="] });
        /**
        Aliases: "le", "<="
        @property LessThanOrEqual {FilterQueryOp}
        @final
        @static
        **/
        aEnum.LessThanOrEqual = aEnum.addSymbol({ operator: "le", aliases: ["<="] });
        /**
        String operation: Is a string a substring of another string.
        Aliases: "substringof"
        @property Contains {FilterQueryOp}
        @final
        @static
        **/
        aEnum.Contains = aEnum.addSymbol({ operator: "substringof", isFunction: true });
        /**
        @property StartsWith {FilterQueryOp}
        @final
        @static
        **/
        aEnum.StartsWith = aEnum.addSymbol({ operator: "startswith", isFunction: true });
        /**
        @property EndsWith {FilterQueryOp}
        @final
        @static
        **/
        aEnum.EndsWith = aEnum.addSymbol({ operator: "endswith", isFunction: true });
        aEnum.seal();
        aEnum._map = function () {
            var map = {};
            aEnum.getSymbols().forEach(function (s) {
                map[s.name.toLowerCase()] = s;
                map[s.operator.toLowerCase()] = s;
                if (s.aliases) {
                    s.aliases.forEach(function (alias) {
                        map[alias.toLowerCase()] = s;
                    });
                }
            });
            return map;
        } ();
        aEnum.from = function (op) {
            if (aEnum.contains(op)) {
                return op;
            } else {
                return aEnum._map[op.toLowerCase()];
            }
        };
        return aEnum;
    } ();

    var BooleanQueryOp = function () {
        var aEnum = new Enum("BooleanQueryOp");
        aEnum.And = aEnum.addSymbol({ operator: "and", aliases: ["&&"] });
        aEnum.Or = aEnum.addSymbol({ operator: "or", aliases: ["||"] });
        aEnum.Not = aEnum.addSymbol({ operator: "not", aliases: ["~", "!"] });

        aEnum.seal();
        aEnum._map = function () {
            var map = {};
            aEnum.getSymbols().forEach(function (s) {
                map[s.name.toLowerCase()] = s;
                map[s.operator.toLowerCase()] = s;
                if (s.aliases) {
                    s.aliases.forEach(function (alias) {
                        map[alias.toLowerCase()] = s;
                    });
                }
            });
            return map;
        } ();
        aEnum.from = function (op) {
            if (aEnum.contains(op)) {
                return op;
            } else {
                return aEnum._map[op.toLowerCase()];
            }
        };
        return aEnum;
    } ();

    var Predicate = (function () {
        /**  
        Used to define a 'where' predicate for an EntityQuery.  Predicates are immutable, which means that any
        method that would modify a Predicate actually returns a new Predicate. 
        @class Predicate
        **/
        
        /**
        Predicate constructor
        @example
            var p1 = new Predicate("CompanyName", "StartsWith", "B");
            var query = new EntityQuery("Customers").where(p1);
        or 
        @example
            var p2 = new Predicate("Region", FilterQueryOp.Equals, null);
            var query = new EntityQuery("Customers").where(p2);
        @method <ctor> Predicate
        @param property {String} A property name, a nested property name or an expression involving a property name.
        @param operator {FilterQueryOp|String}
        @param value {Object}
        **/
        var ctor = function (propertyOrExpr, operator, value) {
            if (arguments[0].prototype === true) {
                // used to construct prototype
                return this;
            }
            return new SimplePredicate(propertyOrExpr, operator, value);
        };

        /**  
        Returns whether an object is a Predicate
        @example
            var p1 = new Predicate("CompanyName", "StartsWith", "B");
            if (Predicate.isPredicate(p1)) {
                // do something
            }
        @method isPredicate
        @param o {Object}
        @static
        **/
        ctor.isPredicate = function (o) {
            return o instanceof Predicate;
        };

        /**  
        Creates a new 'simple' Predicate.  Note that this method can also take its parameters as an array.
        @example
            var p1 = Predicate.create("Freight", "gt", 100);
        or parameters can be passed as an array.
        @example
            var predArgs = ["Freight", "gt", 100];
            var p1 = Predicate.create(predArgs);
        both of these are the same as 
        @example
            var p1 = new Predicate("Freight", "gt", 100);
        @method create 
        @static
        @param property {String} A property name, a nested property name or an expression involving a property name.
        @param operator {FilterQueryOp|String}
        @param value {Object}
        **/
        ctor.create = function (property, operator, value) {
            if (Array.isArray(property)) {
                return new SimplePredicate(property[0], property[1], property[2]);
            } else {
                return new SimplePredicate(property, operator, value);
            }
        };

        /**  
        Creates a 'composite' Predicate by 'and'ing a set of specified Predicates together.
        @example
            var dt = new Date(88, 9, 12);
            var p1 = Predicate.create("OrderDate", "ne", dt);
            var p2 = Predicate.create("ShipCity", "startsWith", "C");
            var p3 = Predicate.create("Freight", ">", 100);
            var newPred = Predicate.and(p1, p2, p3);
        or
        @example
            var preds = [p1, p2, p3];
            var newPred = Predicate.and(preds);
        @method and
        @param predicates* {multiple Predicates|Array of Predicate}
        @static
        **/
        ctor.and = function (predicates) {
            predicates = argsToPredicates(arguments);
            if (predicates.length === 1) {
                return predicates[0];
            } else {
                return new CompositePredicate("and", predicates);
            }
        };

        /**  
        Creates a 'composite' Predicate by 'or'ing a set of specified Predicates together.
        @example
            var dt = new Date(88, 9, 12);
            var p1 = Predicate.create("OrderDate", "ne", dt);
            var p2 = Predicate.create("ShipCity", "startsWith", "C");
            var p3 = Predicate.create("Freight", ">", 100);
            var newPred = Predicate.or(p1, p2, p3);
        or
        @example
            var preds = [p1, p2, p3];
            var newPred = Predicate.or(preds);
        @method or
        @param predicates* {multiple Predicates|Array of Predicate}
        @static
        **/
        ctor.or = function (predicates) {
            predicates = argsToPredicates(arguments);
            if (predicates.length === 1) {
                return predicates[0];
            } else {
                return new CompositePredicate("or", predicates);
            }
        };

        /**  
        Creates a 'composite' Predicate by 'negating' a specified predicate.
        @example
            var p1 = Predicate.create("Freight", "gt", 100);
            var not_p1 = Predicate.not(p1);
        This can also be accomplished using the 'instance' version of the 'not' method
        @example
            var not_p1 = p1.not();
        Both of which would be the same as
        @example
            var not_p1 = Predicate.create("Freight", "le", 100);
        @method not
        @param predicate {Predicate}
        @static
        **/
        ctor.not = function (predicate) {
            return new CompositePredicate("not", [predicate]);
        };

        /**  
        'And's this Predicate with one or more other Predicates and returns a new 'composite' Predicate
        @example
            var dt = new Date(88, 9, 12);
            var p1 = Predicate.create("OrderDate", "ne", dt);
            var p2 = Predicate.create("ShipCity", "startsWith", "C");
            var p3 = Predicate.create("Freight", ">", 100);
            var newPred = p1.and(p2, p3);
        or
        @example
            var preds = [p2, p3];
            var newPred = p1.and(preds);
        The 'and' method is also used to write "fluent" expressions
        @example
            var p4 = Predicate.create("ShipCity", "startswith", "F")
                .and("Size", "gt", 2000);
        @method and
        @param predicates* {multiple Predicates|Array of Predicate}
        **/
        ctor.prototype.and = function (predicates) {
            predicates = argsToPredicates(arguments);
            predicates.unshift(this);
            return ctor.and(predicates);
        };

        /**  
        'Or's this Predicate with one or more other Predicates and returns a new 'composite' Predicate
        @example
            var dt = new Date(88, 9, 12);
            var p1 = Predicate.create("OrderDate", "ne", dt);
            var p2 = Predicate.create("ShipCity", "startsWith", "C");
            var p3 = Predicate.create("Freight", ">", 100);
            var newPred = p1.and(p2, p3);
        or
        @example
            var preds = [p2, p3];
            var newPred = p1.and(preds);
        The 'or' method is also used to write "fluent" expressions
        @example
            var p4 = Predicate.create("ShipCity", "startswith", "F")
                .or("Size", "gt", 2000);
        @method or
        @param predicates* {multiple Predicates|Array of Predicate}
        **/
        ctor.prototype.or = function (predicates) {
            predicates = argsToPredicates(arguments);
            predicates.unshift(this);
            return ctor.or(predicates);
        };

        /**  
        Returns the 'negated' version of this Predicate
        @example
            var p1 = Predicate.create("Freight", "gt", 100);
            var not_p1 = p1.not();
        This can also be accomplished using the 'static' version of the 'not' method
        @example
            var p1 = Predicate.create("Freight", "gt", 100);
            var not_p1 = Predicate.not(p1);
        which would be the same as
        @example
            var not_p1 = Predicate.create("Freight", "le", 100);
        @method not
        **/
        ctor.prototype.not = function () {
            return new CompositePredicate("not", [this]);
        };

        // methods defined in both subclasses of Predicate

        /**  
        Returns the function that will be used to execute this Predicate against the local cache.
        @method toFunction
        @return {Function}
        **/

        /**  
        Returns a human readable string for this Predicate.
        @method toString
        @return {String}
        **/

        /**  
        Determines whether this Predicate is 'valid' for the specified EntityType; This method will throw an exception
        if invalid.
        @method validate
        @param entityType {EntityType} The entityType to validate against.
        **/

        function argsToPredicates(argsx) {
            if (argsx.length === 1 && Array.isArray(argsx[0])) {
                return argsx[0];
            } else {
                var args = Array.prototype.slice.call(argsx);
                if (Predicate.isPredicate(args[0])) {
                    return args;
                } else {
                    return [Predicate.create(args)];
                }
            }
        }

        return ctor;

    })();

    // Does not need to be exposed.
    var SimplePredicate = (function () {

        var ctor = function (propertyOrExpr, operator, value) {
            assertParam(propertyOrExpr, "propertyOrExpr").isString().check();
            assertParam(operator, "operator").isEnumOf(FilterQueryOp).or().isString().check();
            assertParam(value, "value").isRequired().check();

            this._propertyOrExpr = propertyOrExpr;
            this._fnNode = FnNode.create(propertyOrExpr);
            this._filterQueryOp = FilterQueryOp.from(operator);
            if (!this._filterQueryOp) {
                throw new Error("Unknown query operation: " + operator);
            }
            this._value = value;
        };
        ctor.prototype = new Predicate({ prototype: true });

        ctor.prototype.toOdataFragment = function (entityType) {
            var exprFrag = this._fnNode.toOdataFragment(entityType);
            var val = formatValue(this._value, this._fnNode);
            if (this._filterQueryOp.isFunction) {
                if (this._filterQueryOp == FilterQueryOp.Contains) {
                    return this._filterQueryOp.operator + "(" + val + "," + exprFrag + ") eq true";
                } else {
                    return this._filterQueryOp.operator + "(" + exprFrag + "," + val + ") eq true";
                }
                
            } else {
                return exprFrag + " " + this._filterQueryOp.operator + " " + val;
            }
        };

        ctor.prototype.toFunction = function (entityType) {            
            var predFn = getPredicateFn(entityType, this._filterQueryOp, this._value);
            var exprFn = this._fnNode.fn;
            return function(entity) {
                return predFn(makeComparable(exprFn(entity)));
            };
        };

        ctor.prototype.toString = function () {
            var val = formatValue(this._value, this._fnNode);
            return this._fnNode.toString() + " " + this._filterQueryOp.operator + " " + val;
        };

        ctor.prototype.validate = function (entityType) {
            // throw if not valid
            this._fnNode.validate(entityType);
            this.dataType = this._fnNode.dataType;
        };
        
        // internal functions

        // TODO: still need to handle localQueryComparisonOptions for guids.
        
        function getPredicateFn(entityType, filterQueryOp, value) {
            var lqco = entityType.metadataStore.localQueryComparisonOptions;
            
            // Date do not compare properly but Date.getTime()'s do.
            if (value instanceof Date) {
                value = value.getTime();
            } 
            var predFn;
            switch (filterQueryOp) {
                case FilterQueryOp.Equals:
                    predFn = function(propValue) {
                        if (propValue && typeof propValue === 'string') {
                            return stringEquals(propValue, value, lqco);
                        } else {
                            return propValue == value;
                        }
                    };
                    break;
                case FilterQueryOp.NotEquals:
                    predFn = function (propValue) {
                        if (propValue && typeof propValue === 'string') {
                            return !stringEquals(propValue, value, lqco);
                        } else {
                            return propValue != value;
                        }
                    };
                    break;
                case FilterQueryOp.GreaterThan:
                    predFn = function (propValue) { return propValue > value; };
                    break;
                case FilterQueryOp.GreaterThanOrEqual:
                    predFn = function (propValue) { return propValue >= value; };
                    break;
                case FilterQueryOp.LessThan:
                    predFn = function (propValue) { return propValue < value; };
                    break;
                case FilterQueryOp.LessThanOrEqual:
                    predFn = function (propValue) { return propValue <= value; };
                    break;
                case FilterQueryOp.StartsWith:
                    predFn = function (propValue) { return stringStartsWith(propValue, value, lqco); };
                    break;
                case FilterQueryOp.EndsWith:
                    predFn = function (propValue) { return stringEndsWith(propValue, value, lqco); };
                    break;
                case FilterQueryOp.Contains:
                    predFn = function(propValue) { return stringContains(propValue, value, lqco); };
                    break;
                default:
                    throw new Error("Unknown FilterQueryOp: " + filterQueryOp);
                    
            }
            return predFn;
        }
        
        function stringEquals(a, b, lqco) {
            if (b == null) return false;
            if (typeof b !== 'string') {
                b = b.toString();
            }
            if (lqco.usesSql92CompliantStringComparison) {
                a = (a || "").trim();
                b = (b || "").trim();
            }
            if (!lqco.isCaseSensitive) {
                a = (a || "").toLowerCase();
                b = (b || "").toLowerCase();
            }
            return a == b;
        }
        
        function stringStartsWith(a, b, lqco) {
            
            if (!lqco.isCaseSensitive) {
                a = (a || "").toLowerCase();
                b = (b || "").toLowerCase();
            }
            return core.stringStartsWith(a, b);
        }

        function stringEndsWith(a, b, lqco) {
            if (!lqco.isCaseSensitive) {
                a = (a || "").toLowerCase();
                b = (b || "").toLowerCase();
            }
            return core.stringEndsWith(a, b);
        }
        
        function stringContains(a, b, lqco) {
            if (!lqco.isCaseSensitive) {
                a = (a || "").toLowerCase();
                b = (b || "").toLowerCase();
            }
            return a.indexOf(b) >= 0;
        }

        function formatValue(val, fnNode) {
            if (val == null) {
                return null;
            }
            
            var msg;
            var dataType = fnNode.dataType;
            if (!dataType) {
                // used for toString calls
                if (core.isDate(val)) {
                    dataType = DataType.DateTime;
                } else if (core.isGuid(val)) {
                    dataType = DataType.Guid;
                } else {
                    dataType = DataType.fromJsType(typeof val) || DataType.String;
                }
            }
                       
            if (dataType.isNumeric) {
                if (typeof val === "string") {
                    if (dataType.isInteger) {
                        val = parseInt(val);
                    } else {
                        val = parseFloat(val);
                    }
                }
                return val;
            } else if (dataType === DataType.String) {
                return "'" + val + "'";
            } else if (dataType === DataType.DateTime) {
                try {
                    return "datetime'" + val.toISOString() + "'";
                } catch(e) {
                    msg = core.formatString("'%1' is not a valid dateTime: '%2'", fnNode.toString, val);
                    throw new Error(msg);
                }
            } else if (dataType === DataType.Guid) {
                if (!core.isGuid(val)) {
                    msg = core.formatString("'%1' is not a valid guid: '%2'", fnNode.toString, val);
                    throw new Error(msg);
                }
                return "guid'" + val + "'";
            } else if (dataType === DataType.Boolean) {
                if (typeof val === "string") {
                    return val.trim().toLowerCase() === "true";
                } else {
                    return val;
                }
            } else {
                return val;
            }

        }

        return ctor;

    })();

    // Does not need to be exposed.
    var CompositePredicate = (function () {

        var ctor = function (booleanOperator, predicates) {
            // if debug
            if (!Array.isArray(predicates)) {
                throw new Error("predicates parameter must be an array");
            }
            // end debug
            if ((this.symbol === "not") && (predicates.length !== 1)) {
                throw new Error("Only a single predicate can be passed in with the 'Not' operator");
            }

            this._booleanQueryOp = BooleanQueryOp.from(booleanOperator);
            if (!this._booleanQueryOp) {
                throw new Error("Unknown query operation: " + booleanOperator);
            }
            this._predicates = predicates;
        };
        ctor.prototype = new Predicate({ prototype: true });

        ctor.prototype.toOdataFragment = function (entityType) {
            if (this._predicates.length == 1) {
                return this._booleanQueryOp.operator + " " + "(" + this._predicates[0].toOdataFragment(entityType) + ")";
            } else {
                var result = this._predicates.map(function (p) {
                    return "(" + p.toOdataFragment(entityType) + ")";
                }).join(" " + this._booleanQueryOp.operator + " ");
                return result;
            }
        };

        ctor.prototype.toFunction = function (entityType) {
            return createFunction(entityType, this._booleanQueryOp, this._predicates);
        };

        ctor.prototype.toString = function () {
            if (this._predicates.length == 1) {
                return this._booleanQueryOp.operator + " " + "(" + this._predicates[0] + ")";
            } else {
                var result = this._predicates.map(function (p) {
                    return "(" + p.toString() + ")";
                }).join(" " + this._booleanQueryOp.operator + " ");
                return result;
            }
        };

        ctor.prototype.validate = function (entityType) {
            // will throw if not found;
            if (this.isValidated) return;
            this._predicates.every(function (p) {
                p.validate(entityType);
            });
            this._isValidated = true;
        };

        function createFunction(entityType, booleanQueryOp, predicates) {
            var func, funcs;
            switch (booleanQueryOp) {
                case BooleanQueryOp.Not:
                    func = predicates[0].toFunction(entityType);
                    return function (entity) {
                        return !func(entity);
                    };
                case BooleanQueryOp.And:
                    funcs = predicates.map(function (p) { return p.toFunction(entityType); });
                    return function (entity) {
                        var result = funcs.reduce(function (prev, cur) {
                            return prev && cur(entity);
                        }, true);
                        return result;
                    };
                case BooleanQueryOp.Or:
                    funcs = predicates.map(function (p) { return p.toFunction(entityType); });
                    return function (entity) {
                        var result = funcs.reduce(function (prev, cur) {
                            return prev || cur(entity);
                        }, false);
                        return result;
                    };
                default:
                    throw new Error("Invalid boolean operator:" + booleanQueryOp);
            }
        }

        return ctor;
    })();

    // Not exposed externally for now
    var OrderByClause = (function () {
        /*
        An OrderByClause is a description of the properties and direction that the result 
        of a query should be sorted in.  OrderByClauses are immutable, which means that any
        method that would modify an OrderByClause actually returns a new OrderByClause. 

        For example for an Employee object with properties of 'Company' and 'LastName' the following would be valid expressions:

            var obc = new OrderByClause("Company.CompanyName, LastName") 
                or 
            var obc = new OrderByClause("Company.CompanyName desc, LastName") 
                or 
            var obc = new OrderByClause("Company.CompanyName, LastName", true);
        @class OrderByClause
        */
        
        /*
        @method <ctor> OrderByClause
        @param propertyPaths {String} A ',' delimited string of 'propertyPaths'. Each substring of the 'propertyPaths' 
        parameter should be a valid property name or property path for the EntityType of the query associated with this clause. 
        @param [isDesc=false] {Boolean}
        */
        var ctor = function (propertyPaths, isDesc) {
            if (propertyPaths.prototype === true) {
                // used to construct prototype
                return this;
            }
            return ctor.create(propertyPaths, isDesc);
        };

        /*
        Alternative method of creating an OrderByClause. 
        Example for an Employee object with properties of 'Company' and 'LastName': 

            var obc = OrderByClause.create("Company.CompanyName, LastName") 
                or 
            var obc = OrderByClause.create("Company.CompanyName desc, LastName") 
                or 
            var obc = OrderByClause.create("Company.CompanyName, LastName", true);
        @method create 
        @static
        @param propertyPaths {String} A ',' delimited string of 'propertyPaths'. Each substring of the 'propertyPaths' 
        parameter should be a valid property name or property path for the EntityType of the query associated with this clause. 
        @param [isDesc=false] {Boolean}
        */
        ctor.create = function (propertyPaths, isDesc) {
            if (typeof (propertyPaths) !== 'string') {
                throw new Error("The propertyPaths parameter must be a string.");
            }
            var pathStrings = propertyPaths.split(",");
            if (pathStrings.length > 1) {
                var clauses = pathStrings.map(function (pp) {
                    return new SimpleOrderByClause(pp, isDesc);
                });
                return new CompositeOrderByClause(clauses);
            } else {
                return new SimpleOrderByClause(pathStrings[0], isDesc);
            }
        };

        /*
        Returns a 'composite' OrderByClause by combining other OrderByClauses.
        @method combine
        @static
        @param orderByClauses {Array of OrderByClause}
        */
        ctor.combine = function (orderByClauses) {
            return new CompositeOrderByClause(orderByClauses);
        };

        /*
        Returns whether an object is an OrderByClause.
        @method isOrderByClause
        @static
        @param obj {Object}
        */
        ctor.isOrderByClause = function (obj) {
            return obj instanceof OrderByClause;
        };

        /*
        Returns whether a new OrderByClause with a specified clause add to the end of this one. 
        @method addClause
        @param orderByClause {OrderByClause}
        */
        ctor.prototype.addClause = function (orderByClause) {
            return new CompositeOrderByClause([this, orderByClause]);
        };

        return ctor;
    })();

    // Does not need to be exposed.
    var SimpleOrderByClause = (function () {

        var ctor = function (propertyPath, isDesc) {
            if (!(typeof propertyPath == 'string')) {
                throw new Error("propertyPath is not a string");
            }
            propertyPath = propertyPath.trim();

            var parts = propertyPath.split(' ');
            // parts[0] is the propertyPath; [1] would be whether descending or not.
            if (parts.length > 1 && isDesc !== true && isDesc !== false) {
                isDesc = core.stringStartsWith(parts[1].toLowerCase(), "desc");
                if (!isDesc) {
                    // isDesc is false but check to make sure its intended.
                    var isAsc = core.stringStartsWith(parts[1].toLowerCase(), "asc");
                    if (!isAsc) {
                        throw new Error("the second word in the propertyPath must begin with 'desc' or 'asc'");
                    }
                    
                }
            }
            this.propertyPath = parts[0];
            this.isDesc = isDesc;
        };
        ctor.prototype = new OrderByClause({ prototype: true });

        ctor.prototype.validate = function (entityType) {
            if (!entityType) {
                return;
            } // can't validate yet
            // will throw an exception on bad propertyPath
            this.lastProperty = entityType.getProperty(this.propertyPath, true);
        };

        ctor.prototype.toOdataFragment = function (entityType) {
            return entityType._clientPropertyPathToServer(this.propertyPath) + (this.isDesc ? " desc" : "");
        };

        ctor.prototype.getComparer = function () {
            var propertyPath = this.propertyPath;
            var isDesc = this.isDesc;
            var that = this;
            return function (entity1, entity2) {
                var value1 = getPropertyPathValue(entity1, propertyPath);
                var value2 = getPropertyPathValue(entity2, propertyPath);
                if (that.lastProperty && that.lastProperty.dataType == DataType.String) {
                    if (!that.lastProperty.parentEntityType.metadataStore.localQueryComparisonOptions.isCaseSensitive) {
                        value1 = (value1 || "").toLowerCase();
                        value2 = (value2 || "").toLowerCase();
                    }
                } else {
                    value1 = makeComparable(value1);
                    value2 = makeComparable(value2);
                }
                if (value1 == value2) {
                    return 0;
                } else if (value1 > value2) {
                    return isDesc ? -1 : 1;
                } else {
                    return isDesc ? 1 : -1;
                }
            };
        };


        return ctor;
    })();

    // Does not need to be exposed.
    var CompositeOrderByClause = (function () {
        var ctor = function (orderByClauses) {
            var resultClauses = [];
            orderByClauses.forEach(function (obc) {
                if (obc instanceof CompositeOrderByClause) {
                    resultClauses = resultClauses.concat(obc.orderByClauses);
                } else if (obc instanceof SimpleOrderByClause) {
                    resultClauses.push(obc);
                } else {
                    throw new Error("Invalid argument to CompositeOrderByClause ctor.");
                }
            });
            this._orderByClauses = resultClauses;

        };
        ctor.prototype = new OrderByClause({ prototype: true });


        ctor.prototype.validate = function (entityType) {
            this._orderByClauses.forEach(function (obc) {
                obc.validate(entityType);
            });
        };

        ctor.prototype.toOdataFragment = function (entityType) {
            var strings = this._orderByClauses.map(function (obc) {
                return obc.toOdataFragment(entityType);
            });
            // should return something like CompanyName,Address/City desc
            return strings.join(',');
        };

        ctor.prototype.getComparer = function () {
            var orderByFuncs = this._orderByClauses.map(function (obc) {
                return obc.getComparer();
            });
            return function (entity1, entity2) {
                for (var i = 0; i < orderByFuncs.length; i++) {
                    var result = orderByFuncs[i](entity1, entity2);
                    if (result != 0) {
                        return result;
                    }
                }
                return 0;
            };
        };
        return ctor;
    })();
    
    // Not exposed
    var SelectClause = (function () {
        
        var ctor = function (propertyPaths) {
            assertParam(propertyPaths, "propertyPaths").isString().check();
            this.propertyPaths = propertyPaths;
            this._pathStrings = propertyPaths.split(",").map(function(pp) {
                return pp.trim();
            });
            this._pathNames = this._pathStrings.map(function(pp) {
                return pp.replace(".", "_");
            });
        };

        ctor.prototype.validate = function (entityType) {
            if (!entityType) {
                return;
            } // can't validate yet
            // will throw an exception on bad propertyPath
            this._pathStrings.forEach(function(path) {
                entityType.getProperty(path, true);
            });
        };

        ctor.prototype.toOdataFragment = function(entityType) {
             var frag = this._pathStrings.map(function(pp) {
                 return entityType._clientPropertyPathToServer(pp);
             }).join(",");
             return frag;
        };
        
        ctor.prototype.toFunction = function (entityType) {
            var that = this;
            return function (entity) {
                var result = {};
                that._pathStrings.forEach(function (path, i) {
                    result[that._pathNames[i]] = getPropertyPathValue(entity, path);
                });
                return result;
            };
        };

        return ctor;
    })();
    
     // Not exposed
    var ExpandClause = (function () {
        
        var ctor = function (propertyPaths) {
            this.propertyPaths = propertyPaths;
            this._pathStrings = propertyPaths.split(",").map(function(pp) {
                return pp.trim();
            });
        };
       
//        // TODO:
//        ctor.prototype.validate = function (entityType) {
//            
//        };

        ctor.prototype.toOdataFragment = function(entityType) {
            var frag = this._pathStrings.map(function(pp) {
                return entityType._clientPropertyPathToServer(pp);
            }).join(",");
            return frag;
        };

        return ctor;
    })();
    

    // propertyPath can be either an array of paths or a '.' delimited string.
    
    function createPropFunction(propertyPath) {
        var properties = propertyPath.split('.');
        if (properties.length === 1) {
            return function(entity) {
                return entity.getProperty(propertyPath);
            };
        } else {
            return function(entity) {
                return getPropertyPathValue(entity, properties);
            };
        }
    }

    function getPropertyPathValue(obj, propertyPath) {
        var properties;
        if (Array.isArray(propertyPath)) {
            properties = propertyPath;
        } else {
            properties = propertyPath.split(".");
        }
        if (properties.length === 1) {
            return obj.getProperty(propertyPath);
        } else {
            var nextValue = obj;
            for (var i = 0; i < properties.length; i++) {
                nextValue = nextValue.getProperty(properties[i]);
                // == in next line is deliberate - checks for undefined or null.
                if (nextValue == null) {
                    break;
                }
            }
            return nextValue;
        }
    }

    function makeComparable(value) {
        // dates don't perform equality comparisons properly 
        if (value instanceof Date) {
            return value.getTime();
        } else {
            return value;
        }
    }

    // Fixup --- because EntityAspect does not have access to EntityQuery or EntityMetadata

    EntityAspect.prototype.loadNavigationProperty = function (navigationProperty, callback, errorCallback) {
        var entity = this.entity;
        var navProperty = entity.entityType._checkNavProperty(navigationProperty);
        var query = EntityQuery.fromEntityNavigation(entity, navProperty, callback, errorCallback);
        return entity.entityAspect.entityManager.executeQuery(query, callback, errorCallback);
    };

    // expose
    // do not expose SimplePredicate and CompositePredicate 
    // Note: FnNode only exposed for testing purposes
    return {
        FilterQueryOp: FilterQueryOp,
        Predicate: Predicate,
        EntityQuery: EntityQuery,
        FnNode: FnNode,
        // Not documented - only exposed for testing purposes
        OrderByClause: OrderByClause
    };
});

define('relationArray',["core", "entityAspect", "entityQuery"],
function (core, m_entityAspect, m_entityQuery) {
    

    var relationArrayMixin = {};
    var EntityState = m_entityAspect.EntityState;
    var EntityQuery = m_entityQuery.EntityQuery;

    var Event = core.Event;
    
    /**
    Relation arrays are not actually classes, they are objects that mimic arrays. A relation array is collection of 
    entities associated with a navigation property on a single entity. i.e. customer.orders or order.orderDetails.
    This collection looks like an array in that the basic methods on arrays such as 'push', 'pop', 'shift', 'unshift', 'splice'
    are all provided as well as several special purpose methods. 
    @class ↈ_relationArray_
    **/
    
    /**
    An {{#crossLink "Event"}}{{/crossLink}} that fires whenever the contents of this array changed.  This event
    is fired any time a new entity is attached or added to the EntityManager and happens to belong to this collection.
    Adds that occur as a result of query or import operations are batched so that all of the adds or removes to any individual
    collections are collected into a single notification event for each relation array.
    @example
        // assume order is an order entity attached to an EntityManager.
        orders.arrayChanged.subscribe(
            function (arrayChangedArgs) {
                var addedEntities = arrayChangedArgs.added;
                var removedEntities = arrayChanged.removed;
            });
     @event arrayChanged 
     @param added {Array of Entity} An array of all of the entities added to this collection.
     @param removed {Array of Entity} An array of all of the removed from this collection.
     @readOnly
     **/
    
    relationArrayMixin.push = function () {
        if (this._inProgress) {
            return -1;
        }
       
        var goodAdds = getGoodAdds(this, Array.prototype.slice.call(arguments));
        if (!goodAdds.length) {
            return this.length;
        }
        var result = Array.prototype.push.apply(this, goodAdds);
        processAdds(this, goodAdds);
        return result;
    };

    
    relationArrayMixin.unshift = function () {
        var goodAdds = getGoodAdds(this, Array.prototype.slice.call(arguments));
        if (!goodAdds.length) {
            return this.length;
        }
        
        var result = Array.prototype.unshift.apply(this, goodAdds);
        processAdds(this, Array.prototype.slice.call(goodAdds));
        return result;
    };

    relationArrayMixin.pop = function () {
        var result = Array.prototype.pop.apply(this);
        processRemoves(this, [result]);
        return result;
    };

    relationArrayMixin.shift = function () {
        var result = Array.prototype.shift.apply(this);
        processRemoves(this, [result]);
        return result;
    };

    relationArrayMixin.splice = function () {
        var goodAdds = getGoodAdds(this, Array.prototype.slice.call(arguments, 2));
        var newArgs = Array.prototype.slice.call(arguments, 0, 2).concat(goodAdds);
        
        var result = Array.prototype.splice.apply(this, newArgs);
        processRemoves(this, result);

        if (goodAdds.length) {
            processAdds(this, goodAdds);
        }
        return result;
    };

    /**
    Performs an asynchronous load of all other the entities associated with this relationArray.
    @example
        // assume orders is an empty, as yet unpopulated, relation array of orders
        // associated with a specific customer.
        orders.load().then(...)
    @method load
    @param [callback] {Function} 
    @param [errorCallback] {Function}
    @return {Promise} 
    **/
    relationArrayMixin.load = function (callback, errorCallback) {
        var parent = this.parentEntity;
        var query = EntityQuery.fromEntityNavigation(this.parentEntity, this.navigationProperty);
        var em = parent.entityAspect.entityManager;
        return em.executeQuery(query, callback, errorCallback);
    };

    relationArrayMixin._getEventParent = function() {
        return this.parentEntity.entityAspect;
    };

    relationArrayMixin._getPendingPubs = function() {
        var em = this.parentEntity.entityAspect.entityManager;
        return em && em._pendingPubs;
    };

    function getGoodAdds(relationArray, adds) {
        var goodAdds = checkForDups(relationArray, adds);
        if (!goodAdds.length) {
            return goodAdds;
        }
        var parentEntity = relationArray.parentEntity;
        var entityManager = parentEntity.entityAspect.entityManager;
        // we do not want to attach an entity during loading
        // because these will all be 'attached' at a later step.
        if (entityManager && !entityManager.isLoading) {
            goodAdds.forEach(function (add) {
                if (add.entityAspect.entityState.isDetached()) {
                    relationArray._inProgress = true;
                    try {
                        entityManager.attachEntity(add, EntityState.Added);
                    } finally {
                        relationArray._inProgress = false;
                    }
                }
            });
        }
        return goodAdds;
    }

    function checkForDups(relationArray, adds) {
        // don't allow dups in this array. - also prevents recursion 
        var inverseProp = relationArray.navigationProperty.inverse;
        var goodAdds = adds.filter(function (a) {
            if (relationArray._addsInProcess.indexOf(a) >= 0) {
                return false;
            }
            var inverseValue = a.getProperty(inverseProp.name);
            return inverseValue != relationArray.parentEntity;
        });
        return goodAdds;
    }

    function processAdds(relationArray, adds) {
        var inp = relationArray.navigationProperty.inverse;
        if (inp) {
            var addsInProcess = relationArray._addsInProcess;
            var startIx = addsInProcess.length;
            try {
                adds.forEach(function (childEntity) {
                    addsInProcess.push(childEntity);
                    childEntity.setProperty(inp.name, relationArray.parentEntity);
                });
            } finally {
                addsInProcess.splice(startIx, adds.length);
            };
        }
        
        // this is referencing the name of the method on the relationArray not the name of the event
        publish(relationArray, "arrayChanged", { added: adds });
    }
    
    function publish(publisher, eventName, eventArgs) {
        var pendingPubs = publisher._getPendingPubs();
        if (pendingPubs) {
            if (!publisher._pendingArgs) {
                publisher._pendingArgs = eventArgs;
                pendingPubs.push(function () {
                    publisher[eventName].publish(publisher._pendingArgs);
                    publisher._pendingArgs = null;
                });
            } else {
                combineArgs(publisher._pendingArgs, eventArgs);
            }
        } else {
            publisher[eventName].publish(eventArgs);
        }
    }
    
    function combineArgs(target, source) {
        for (var key in source) {
            if (hasOwnProperty.call(target, key)) {
                var sourceValue = source[key];
                var targetValue = target[key];
                if (targetValue) {
                    if (!Array.isArray(targetValue)) {
                        throw new Error("Cannot combine non array args");
                    }
                    Array.prototype.push.apply(targetValue, sourceValue);
                } else {
                    target[key] = sourceValue;
                }
            }
        }
    }

    function processRemoves(relationArray, removes) {
        var inp = relationArray.navigationProperty.inverse;
        if (inp) {
            removes.forEach(function (childEntity) {
                childEntity.setProperty(inp.name, null);
            });
        }
        // this is referencing the name of the method on the relationArray not the name of the event
        publish(relationArray, "arrayChanged", { removed: removes });
    }


    function makeRelationArray(arr, parentEntity, navigationProperty) {
        arr.parentEntity = parentEntity;
        arr.navigationProperty = navigationProperty;
        arr.arrayChanged = new Event("arrayChanged_entityCollection", arr);
        // array of pushes currently in process on this relation array - used to prevent recursion.
        arr._addsInProcess = [];
        return core.extend(arr, relationArrayMixin);
    }

    return makeRelationArray;

});


define('keyGenerator',["core", "config", "entityMetadata", "entityAspect"],
function (core, a_config, m_entityMetadata, m_entityAspect) {
    
    
    /**
    @module breeze
    **/
    
    var DataType = m_entityMetadata.DataType;
    var EntityKey = m_entityAspect.EntityKey;

    
    /*
    @class KeyGenerator
    */
    var ctor = function () {
        // key is dataProperty.name + || + entityType.name, value is propEntry 
        // propEntry = { entityType, propertyName, keyMap }
        // keyMap has key of the actual value ( as a string) and a value of null or the real id.
        this._tempIdMap = {};

        this.nextNumber = -1;
        this.nextNumberIncrement = -1;
        this.stringPrefix = "K_";
    };

    /*
    Returns a unique 'temporary' id for the specified {{#crossLink "EntityType"}}{{/crossLink}}. 
    Uniqueness is defined for this purpose as being unique within each instance of a KeyGenerator. This is sufficient 
    because each EntityManager will have its own instance of a KeyGenerator and any entities imported into
    the EntityManager with temporary keys will have them regenerated and remapped on import.

        The return value of this method must be of the correct type as determined by the 
    @example
        // Assume em1 is a preexisting EntityManager
        var custType = em1.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        // next line both sets cust1's 'CustomerId' property but also returns the value
        var cid1 = em1.generateTempKeyValue(cust1);
        em1.saveChanges()
            .then( function( data) {
                var sameCust1 = data.results[0];
                // cust1 === sameCust1;
                // but cust1.getProperty("CustomerId") != cid1
                // because the server will have generated a new id 
                // and the client will have been updated with this 
                // new id.
            })
    @method generateTempKeyValue
    @param entityType {EntityType}
    */
    ctor.prototype.generateTempKeyValue = function (entityType) {
        var keyProps = entityType.keyProperties;
        if (keyProps.length > 1) {
            throw new Error("Ids can not be autogenerated for entities with multipart keys");
        }
        var keyProp = keyProps[0];
        var nextId = getNextId(this, keyProp.dataType);
        var propEntry = getPropEntry(this, keyProp, true);
        propEntry.keyMap[nextId.toString()] = null;
        return nextId;
    };

    ctor.prototype.getTempKeys = function () {
        var results = [];
        for (var key in this._tempIdMap) {
            var propEntry = this._tempIdMap[key];
            var entityType = propEntry.entityType;
            // var propName = propEntry.propertyName;
            for (var keyValue in propEntry.keyMap) {
                results.push(new EntityKey(entityType, [keyValue]));
            }
        }
        return results;
    };


    // proto methods below are not part of the KeyGenerator interface.

    ctor.prototype.isTempKey = function (entityKey) {
        var keyProps = entityKey.entityType.keyProperties;
        if (keyProps.length > 1) return false;
        var keyProp = keyProps[0];
        var propEntry = getPropEntry(this, keyProp);
        if (!propEntry) {
            return false;
        }
        return (propEntry.keyMap[entityKey.values[0].toString()] !== undefined);
    };



    function getPropEntry(that, keyProp, createIfMissing) {
        var key = keyProp.name + ".." + keyProp.parentEntityType.name;
        var propEntry = that._tempIdMap[key];
        if (!propEntry) {
            if (createIfMissing) {
                propEntry = { entityType: keyProp.parentEntityType, propertyName: keyProp.name, keyMap: {} };
                that._tempIdMap[key] = propEntry;
            }
        }
        return propEntry;
    }

    function getNextId(that, dataType) {
        if (dataType.isNumeric) {
            return getNextNumber(that);
        }

        if (dataType === DataType.String) {
            return this.stringPrefix + getNextNumber(that).toString();
        }

        if (dataType === DataType.Guid) {
            return core.getUuid();
        }

        if (dataType === DataType.DateTime) {
            return Date.now();
        }

        throw new Error("Cannot use a property with a dataType of: " + dataType.toString() + " for id generation");
    }

    function getNextNumber(that) {
        var result = that.nextNumber;
        that.nextNumber += that.nextNumberIncrement;
        return result;
    }

    a_config.registerType(ctor, "KeyGenerator");

    return ctor;
});

define('entityManager',["core", "config", "entityMetadata", "entityAspect", "entityQuery", "keyGenerator"],
function (core, a_config, m_entityMetadata, m_entityAspect, m_entityQuery, KeyGenerator) {
    

    /**
    @module breeze
    **/
    var Enum = core.Enum;
    var Event = core.Event;
    var assertConfig = core.assertConfig;
    var assertParam = core.assertParam;

    var MetadataStore = m_entityMetadata.MetadataStore;
    var DataService = m_entityMetadata.DataService;
    var EntityType = m_entityMetadata.EntityType;
    var AutoGeneratedKeyType = m_entityMetadata.AutoGeneratedKeyType;
    var DataType = m_entityMetadata.DataType;
    
    
    var EntityAspect = m_entityAspect.EntityAspect;
    var EntityKey = m_entityAspect.EntityKey;
    var EntityState = m_entityAspect.EntityState;
    var EntityAction = m_entityAspect.EntityAction;

    var EntityQuery = m_entityQuery.EntityQuery;

    var Q = core.requireLib("Q", "see https://github.com/kriskowal/q");
    
    // TODO: think about dif between find and get.

    var EntityManager = (function () {
        /**
        Instances of the EntityManager contain and manage collections of entities, either retrieved from a backend datastore or created on the client. 
        @class EntityManager
        **/
        
        /** 
        @example                    
        At its most basic an EntityManager can be constructed with just a service name
        @example                    
            var entityManager = new EntityManager( "api/NorthwindIBModel");
        This is the same as calling it with the following configuration object
        @example                    
            var entityManager = new EntityManager( {serviceName: "api/NorthwindIBModel" });
        Usually however, configuration objects will contain more than just the 'serviceName';
        @example
            var metadataStore = new MetadataStore();
            var entityManager = new EntityManager( {
                serviceName: "api/NorthwindIBModel", 
                metadataStore: metadataStore 
            });
        or
        @example
            return new QueryOptions({ 
                mergeStrategy: obj, 
                fetchStrategy: this.fetchStrategy 
            });
            var queryOptions = new QueryOptions({ 
                mergeStrategy: MergeStrategy.OverwriteChanges, 
                fetchStrategy: FetchStrategy.FromServer 
            });
            var validationOptions = new ValidationOptions({ 
                validateOnAttach: true, 
                validateOnSave: true, 
                validateOnQuery: false
            });
            var entityManager = new EntityManager({ 
                serviceName: "api/NorthwindIBModel", 
                queryOptions: queryOptions, 
                validationOptions: validationOptions 
            });
        @method <ctor> EntityManager
        @param [config] {Object|String} Configuration settings or a service name.
        @param [config.serviceName] {String}
        @param [config.dataService] {DataService} An entire DataService (instead of just the serviceName above).
        @param [config.metadataStore=MetadataStore.defaultInstance] {MetadataStore}
        @param [config.queryOptions=QueryOptions.defaultInstance] {QueryOptions}
        @param [config.saveOptions=SaveOptions.defaultInstance] {SaveOptions}
        @param [config.validationOptions=ValidationOptions.defaultInstance] {ValidationOptions}
        @param [config.keyGeneratorCtor] {Function}
        **/
        var ctor = function (config) {
            
            if (arguments.length > 1) {
                throw new Error("The EntityManager ctor has a single optional argument that is either a 'serviceName' or a configuration object.");
            }
            if (arguments.length === 0) {
                config = { serviceName: "" };
            } else if (typeof config === 'string') {
                config = { serviceName: config };
            }
            
            assertConfig(config)
                .whereParam("serviceName").isOptional().isString()
                .whereParam("dataService").isOptional().isInstanceOf(DataService)
                .whereParam("metadataStore").isInstanceOf(MetadataStore).isOptional().withDefault(new MetadataStore())
                .whereParam("queryOptions").isInstanceOf(QueryOptions).isOptional().withDefault(QueryOptions.defaultInstance)
                .whereParam("saveOptions").isInstanceOf(SaveOptions).isOptional().withDefault(SaveOptions.defaultInstance)
                .whereParam("validationOptions").isInstanceOf(ValidationOptions).isOptional().withDefault(ValidationOptions.defaultInstance)
                .whereParam("keyGeneratorCtor").isFunction().isOptional().withDefault(KeyGenerator)
                .applyAll(this);

            if (config.dataService) {
                this.dataServiceAdapterInstance = a_config.getAdapterInstance("dataService", config.dataService.adapterName);
            } else if (config.serviceName) {
                this.dataServiceAdapterInstance = a_config.getAdapterInstance("dataService");
                this.dataService = new DataService({
                    serviceName: this.serviceName,
                });
            } 

            if (this.dataService) {
                this.serviceName = this.dataService.serviceName;
            }
            this.entityChanged = new Event("entityChanged_entityManager", this);
            this.hasChanges = new Event("hasChanges_entityManager", this, null, function (entityTypes) {
                if (!this._hasChanges) return false;
                if (entityTypes === undefined) return this._hasChanges;
                return this._hasChangesCore(entityTypes);
            });
            
            this.clear();
            
        };
        ctor.prototype._$typeName = "EntityManager";
        

        Event.bubbleEvent(ctor.prototype, null);
        
        /**
        The service name associated with this EntityManager.

        __readOnly__
        @property serviceName {String}
        **/
        
        /**
        The DataService name associated with this EntityManager.

        __readOnly__
        @property dataService {DataService}
        **/

        /**
        The {{#crossLink "MetadataStore"}}{{/crossLink}} associated with this EntityManager. 

         __readOnly__         
        @property metadataStore {MetadataStore}
        **/

        /**
        The {{#crossLink "QueryOptions"}}{{/crossLink}} associated with this EntityManager.

        __readOnly__
        @property queryOptions {QueryOptions}
        **/

        /**
        The {{#crossLink "SaveOptions"}}{{/crossLink}} associated with this EntityManager.

        __readOnly__
        @property saveOptions {SaveOptions}
        **/

        /**
        The {{#crossLink "ValidationOptions"}}{{/crossLink}} associated with this EntityManager.

        __readOnly__
        @property validationOptions {ValidationOptions}
        **/

        /**
        The {{#crossLink "KeyGenerator"}}{{/crossLink}} constructor associated with this EntityManager.

        __readOnly__
        @property keyGeneratorCtor {KeyGenerator constructor}
        **/

        /**
        The "dataService" adapter implementation instance associated with this EntityManager.

        __readOnly__
        @property dataServiceAdapterInstance {an instance of the "dataService" adapter interface}
        **/
       
        // events
        /**
        An {{#crossLink "Event"}}{{/crossLink}} that fires whenever a change to any entity in this EntityManager occurs.
        @example                    
            var em = new EntityManager( {serviceName: "api/NorthwindIBModel" });
            em.entityChanged.subscribe(function(changeArgs) {
                // This code will be executed any time any entity within the entityManager is added, modified, deleted or detached for any reason. 
                var action = changeArgs.entityAction;
                var entity = changeArgs.entity;
                // .. do something to this entity when it is changed.
            });
        });
        
        @event entityChanged 
        @param entityAction {EntityAction} The {{#crossLink "EntityAction"}}{{/crossLink}} that occured. 
        @param entity {Object} The entity that changed.  If this is null, then all entities in the entityManager were affected. 
        @param args {Object} Additional information about this event. This will differ based on the entityAction.
        @readOnly
        **/

        // class methods 

        /**
        Creates a new EntityManager and imports a previously exported result into it.
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities.
            var bundle = em1.exportEntities();
            // can be stored via the web storage api
            window.localStorage.setItem("myEntityManager", bundle);
            // assume the code below occurs in a different session.
            var bundleFromStorage = window.localStorage.getItem("myEntityManager");
            // and imported
            var em2 = EntityManager.importEntities(bundleFromStorage);
            // em2 will now have a complete copy of what was in em1
        @method importEntities
        @static
        @param exportedString {String} The result of a previous 'exportEntities' call.
        @param [config] {Object} A configuration object.
        @param [config.mergeStrategy] {MergeStrategy} A  {{#crossLink "MergeStrategy"}}{{/crossLink}} to use when 
        merging into an existing EntityManager.
        @return {EntityManager} A new EntityManager.
        **/
        ctor.importEntities = function (exportedString, config) {
            var em = new EntityManager();
            em.importEntities(exportedString, config);
            return em;
        };

        // instance methods

        /**
        Exports an entire EntityManager or just selected entities into a serialized string for external storage.
        @example
        This method can be used to take a snapshot of an EntityManager that can be either stored offline or held 
        memory.  This snapshot can be restored or merged into an another EntityManager at some later date. 
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var bundle = em1.exportEntities();
            // can be stored via the web storage api
            window.localStorage.setItem("myEntityManager", bundle);
            // assume the code below occurs in a different session.
            var bundleFromStorage = window.localStorage.getItem("myEntityManager");
            var em2 = new EntityManager({ 
                serviceName: em1.serviceName, 
                metadataStore: em1.metadataStore 
            });
            em2.importEntities(bundleFromStorage);
            // em2 will now have a complete copy of what was in em1
        You can also control exactly which entities are exported. 
        @example
            // assume entitiesToExport is an array of entities to export.
            var bundle = em1.exportEntities(entitiesToExport);
            // assume em2 is another entityManager containing some of the same entities possibly with modifications.
            em2.importEntities(bundle, { mergeStrategy: MergeStrategy.PreserveChanges} );
        @method exportEntities
        @param [entities] {Array of entities} The entities to export; all entities are exported if this is omitted.
        @return {String} A serialized version of the exported data.
        **/
        ctor.prototype.exportEntities = function (entities) {
            var exportBundle = exportEntityGroups(this, entities);
            var json = {
                metadataStore: this.metadataStore.exportMetadata(),
                serviceName: this.serviceName,
                saveOptions: this.saveOptions,
                queryOptions: this.queryOptions,
                validationOptions: this.validationOptions,
                tempKeys: exportBundle.tempKeys,
                entityGroupMap: exportBundle.entityGroupMap
            };
            var result = JSON.stringify(json, null, a_config.stringifyPad);
            return result;
        };

        /**
        Imports a previously exported result into this EntityManager.
        @example
        This method can be used to make a complete copy of any previously created entityManager, even if created
        in a previous session and stored in localStorage. The static version of this method performs a
        very similar process. 
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var bundle = em1.exportEntities();
            // bundle can be stored in window.localStorage or just held in memory.
            var em2 = new EntityManager({ 
                serviceName: em1.serviceName, 
                metadataStore: em1.metadataStore 
            });
            em2.importEntities(bundle);
            // em2 will now have a complete copy of what was in em1
        It can also be used to merge the contents of a previously created EntityManager with an 
        existing EntityManager with control over how the two are merged.
        @example
            var bundle = em1.exportEntities();
            // assume em2 is another entityManager containing some of the same entities possibly with modifications.
            em2.importEntities(bundle, { mergeStrategy: MergeStrategy.PreserveChanges} );
            // em2 will now contain all of the entities from both em1 and em2.  Any em2 entities with previously 
            // made modifications will not have been touched, but all other entities from em1 will have been imported.
        @method importEntities
        @param exportedString {String} The result of a previous 'export' call.
        @param [config] {Object} A configuration object.
            @param [config.mergeStrategy] {MergeStrategy} A  {{#crossLink "MergeStrategy"}}{{/crossLink}} to use when 
            merging into an existing EntityManager.
        @chainable
        **/
        ctor.prototype.importEntities = function (exportedString, config) {
            config = config || {};
            assertConfig(config)
                .whereParam("mergeStrategy").isEnumOf(MergeStrategy).isOptional().withDefault(this.queryOptions.mergeStrategy)
                .applyAll(config);
            var that = this;
            
            var json = JSON.parse(exportedString);
            this.metadataStore.importMetadata(json.metadataStore);
            this.serviceName = json.serviceName;
            this.saveOptions = new SaveOptions(json.saveOptions);
            this.queryOptions = QueryOptions.fromJSON(json.queryOptions);
            this.validationOptions = new ValidationOptions(json.validationOptions);

            var tempKeyMap = {};
            json.tempKeys.forEach(function (k) {
                var oldKey = EntityKey.fromJSON(k, that.metadataStore);
                tempKeyMap[oldKey.toString()] = that.keyGenerator.generateTempKeyValue(oldKey.entityType);
            });
            config.tempKeyMap = tempKeyMap;
            core.wrapExecution(function() {
                that._pendingPubs = [];
            }, function(state) {
                that._pendingPubs.forEach(function(fn) { fn(); });
                that._pendingPubs = null;
            }, function() {
                core.objectForEach(json.entityGroupMap, function(entityTypeName, jsonGroup) {
                    var entityType = that.metadataStore.getEntityType(entityTypeName, true);
                    var targetEntityGroup = findOrCreateEntityGroup(that, entityType);
                    importEntityGroup(targetEntityGroup, jsonGroup, config);
                });
            });
            return this;
        };

        /**
        Clears this EntityManager's cache but keeps all other settings. Note that this 
        method is not as fast as creating a new EntityManager via 'new EntityManager'.
        This is because clear actually detaches all of the entities from the EntityManager.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            em1.clear();
            // em1 is will now contain no entities, but all other setting will be maintained.
        @method clear
        **/
        ctor.prototype.clear = function () {
            core.objectForEach(this._entityGroupMap, function (key, entityGroup) {
                // remove en
                entityGroup._clear();
            });
            this._entityGroupMap = {};
            this._unattachedChildrenMap = new UnattachedChildrenMap();
            this.keyGenerator = new this.keyGeneratorCtor();
            this.entityChanged.publish({ entityAction: EntityAction.Clear });
            if (this._hasChanges) {
                this._hasChanges = false;
                this.hasChanges.publish({ entityManager: this, hasChanges: false });
            }
        };

        /**
        General purpose property set method.  Any of the properties documented below 
        may be set.
        @example
             // assume em1 is a previously created EntityManager
             // where we want to change some of its settings.
             em1.setProperties( {
                serviceName: "api/foo",
                });
        @method setProperties
        @param config {Object}
            @param [config.serviceName] {String}
            @param [config.dataService] {DataService}
            @param [config.queryOptions] {QueryOptions}
            @param [config.saveOptions] {SaveOptions}
            @param [config.validationOptions] {ValidationOptions}
            @param [config.keyGeneratorCtor] {Function}

        **/
        ctor.prototype.setProperties = function (config) {
            assertConfig(config)
                .whereParam("serviceName").isString().isOptional()
                .whereParam("dataService").isInstanceOf(DataService).isOptional()
                .whereParam("queryOptions").isInstanceOf(QueryOptions).isOptional()
                .whereParam("saveOptions").isInstanceOf(SaveOptions).isOptional()
                .whereParam("validationOptions").isInstanceOf(ValidationOptions).isOptional()
                .whereParam("keyGeneratorCtor").isOptional()
             .applyAll(this);
            
            if (config.dataService) {
                this.dataServiceAdapterInstance = getAdapterInstance("dataService", this.dataService.adapterName);
                this.serviceName = this.dataService.serviceName;
            } else if (config.serviceName) {
                this.dataService = new DataService({
                    serviceName: this.serviceName,
                });
                this.serviceName = this.dataService.serviceName;
            }
            
            if (config.keyGeneratorCtor) {
                this.keyGenerator = new this.keyGeneratorCtor();
            }
            
        };

        /**
        Creates an empty copy of this EntityManager
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var em2 = em1.createEmptyCopy();
            // em2 is a new EntityManager with all of em1's settings
            // but no entities.
        @method createEmptyCopy
        @return {EntityManager} A new EntityManager.
        **/
        ctor.prototype.createEmptyCopy = function () {
            var copy = new ctor({
                serviceName: this.serviceName,
                metadataStore: this.metadataStore,
                queryOptions: this.queryOptions,
                adapters: core.extend({}, this.adapters),
                keyGeneratorCtor: this.keyGeneratorCtor
            });
            return copy;
        };

        /**
        Attaches an entity to this EntityManager with an  {{#crossLink "EntityState"}}{{/crossLink}} of 'Added'.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var cust1 = custType.createEntity();
            em1.addEntity(cust1);
        Note that this is the same as using 'attachEntity' with an {{#crossLink "EntityState"}}{{/crossLink}} of 'Added'.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var cust1 = custType.createEntity();
            em1.attachEntity(cust1, EntityState.Added);
        @method addEntity
        @param entity {Entity} The entity to add.
        @return {Entity} The added entity.
        **/
        ctor.prototype.addEntity = function (entity) {
            return this.attachEntity(entity, EntityState.Added);
        };

        /**
        Attaches an entity to this EntityManager with a specified {{#crossLink "EntityState"}}{{/crossLink}}.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var cust1 = custType.createEntity();
            em1.attachEntity(cust1, EntityState.Added);
        @method attachEntity
        @param entity {Entity} The entity to add.
        @param [entityState] {EntityState} The EntityState of the newly attached entity. If omitted this defaults to EntityState.Unchanged.
        @return {Entity} The attached entity.
        **/
        ctor.prototype.attachEntity = function (entity, entityState) {
            core.assertParam(entity, "entity").isRequired().check();
            this.metadataStore._checkEntityType(entity);
            entityState = core.assertParam(entityState, "entityState").isEnumOf(EntityState).isOptional().check(EntityState.Unchanged);

            if (entity.entityType.metadataStore != this.metadataStore) {
                throw new Error("Cannot attach this entity because the EntityType and MetadataStore associated with this entity does not match this EntityManager's MetadataStore.");
            }
            var aspect = new EntityAspect(entity);
            var manager = aspect.entityManager;
            if (manager) {
                if (manager == this) {
                    return entity;
                } else {
                    throw new Error("This entity already belongs to another EntityManager");
                }
            }
            
            var that = this;
            core.using(this, "isLoading", true, function () {
                checkEntityKey(that, entity);
                attachEntityCore(that, entity, entityState);
                attachRelatedEntities(that, entity, entityState);
            });
            if (this.validationOptions.validateOnAttach) {
                entity.entityAspect.validateEntity();
            }
            if (!entityState.isUnchanged()) {
                this._notifyStateChange(entity, true);
            }
            this.entityChanged.publish({ entityAction: EntityAction.Attach, entity: entity });

            return entity;
        };
        
        

        /**
        Detaches an entity from this EntityManager.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            // assume cust1 is a customer Entity previously attached to em1
            em1.detachEntity(cust1);
            // em1 will now no longer contain cust1 and cust1 will have an 
            // entityAspect.entityState of EntityState.Detached
        @method detachEntity
        @param entity {Entity} The entity to detach.
        @return {Boolean} Whether the entity could be detached. This will return false if the entity is already detached or was never attached.
        **/
        ctor.prototype.detachEntity = function (entity) {
            core.assertParam(entity, "entity").isEntity().check();
            var aspect = entity.entityAspect;
            if (!aspect) {
                // no aspect means in couldn't appear in any group
                return false;
            }
            var group = aspect.entityGroup;
            if (!group) {
                // no group === already detached.
                return false;
            }
            if (group.entityManager !== this) {
                throw new Error("This entity does not belong to this EntityManager.");
            }
            group.detachEntity(entity);
            aspect._removeFromRelations();
            this.entityChanged.publish({ entityAction: EntityAction.Detach, entity: entity });
            return true;
        };

        /**
        Fetches the metadata associated with the EntityManager's current 'serviceName'.  This call
        occurs internally before the first query to any service if the metadata hasn't already been
        loaded.
        @example
        Usually you will not actually process the results of a fetchMetadata call directly, but will instead
        ask for the metadata from the EntityManager after the fetchMetadata call returns.
        @example
             var em1 = new EntityManager( "api/NorthwindIBModel");
             em1.fetchMetadata()
                .then(function() {
                    var metadataStore = em1.metadataStore;
                    // do something with the metadata
                }
                .fail(function(exception) {
                    // handle exception here
                };
        @method fetchMetadata
        @async
        @param [callback] {Function} Function called on success.
        
            successFunction([schema])
            @param [callback.schema] {Object} The raw Schema object from metadata provider - Because this schema will differ depending on the metadata provider
            it is usually better to access metadata via the 'metadataStore' property of the EntityManager after this method's Promise or callback completes.
        @param [errorCallback] {Function} Function called on failure.
            
            failureFunction([error])
            @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.
        @return {Promise} Promise 

            promiseData.schema {Object} The raw Schema object from metadata provider - Because this schema will differ depending on the metadata provider
            it is usually better to access metadata via the 'metadataStore' property of the EntityManager instead of using this 'raw' data.            
        **/
        ctor.prototype.fetchMetadata = function (callback, errorCallback) {
            core.assertParam(callback, "callback").isFunction().isOptional().check();
            core.assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();

            var promise = this.metadataStore.fetchMetadata(this.dataService);

            // TODO: WARNING: DO NOT LEAVE THIS CODE IN PRODUCTION.
            // TEST::: see if serialization actually works completely
//            var that = this;
//            promise = promise.then(function () {
//                var stringified = that.metadataStore.exportMetadata();
//                that.metadataStore = new MetadataStore();
//                that.metadataStore.importMetadata(stringified);
//            });

            return promiseWithCallbacks(promise, callback, errorCallback);
        };

        /**
        Executes the specified query.
        @example
        This method can be called using a 'promises' syntax ( recommended)
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders");
             em.executeQuery(query)
               .then( function(data) {
                   var orders = data.results;
                   ... query results processed here
             }).fail( function(err) {
                   ... query failure processed here
             });
        or with callbacks
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders");
             em.executeQuery(query,
                function(data) {
                   var orders = data.results;
                   ... query results processed here
                },
                function(err) {
                   ... query failure processed here
                });
        Either way this method is the same as calling the The {{#crossLink "EntityQuery"}}{{/crossLink}} 'execute' method.
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders").using(em);
             query.execute()
               .then( function(data) {
                   var orders = data.results;
                   ... query results processed here
             }).fail( function(err) {
                   ... query failure processed here
             });
         
        @method executeQuery
        @async
        @param query {EntityQuery|String}  The {{#crossLink "EntityQuery"}}{{/crossLink}} or OData query string to execute.
        @param [callback] {Function} Function called on success.
        
            successFunction([data])
            @param callback.data {Object} 
            @param callback.data.results {Array of Entity}
            @param callback.data.query {EntityQuery} The original query
            @param callback.data.XHR {XMLHttpRequest} The raw XMLHttpRequest returned from the server.

        @param [errorCallback] {Function} Function called on failure.
            
            failureFunction([error])
            @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.
            @param [errorCallback.error.query] The query that caused the error.
            @param [errorCallback.error.XHR] {XMLHttpRequest} The raw XMLHttpRequest returned from the server.

        @return {Promise} Promise

            promiseData.results {Array of Entity}
            promiseData.query {EntityQuery} The original query
            promiseData.XHR {XMLHttpRequest} The raw XMLHttpRequest returned from the server.
        **/
        ctor.prototype.executeQuery = function (query, callback, errorCallback) {
            // TODO: think about creating an executeOdataQuery or executeRawOdataQuery as a seperate method.
            core.assertParam(query, "query").isInstanceOf(EntityQuery).or().isString().check();
            core.assertParam(callback, "callback").isFunction().isOptional().check();
            core.assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();
            var promise;
            if ( (!this.dataService.hasServerMetadata ) || this.metadataStore.hasMetadataFor(this.serviceName)) {
                promise = executeQueryCore(this, query);
            } else {
                var that = this;
                promise = this.fetchMetadata().then(function () {
                    return executeQueryCore(that, query);
                }).fail(function (error) {
                    return Q.reject(error);
                });
            }
            return promiseWithCallbacks(promise, callback, errorCallback);
        };

        /**
        Executes the specified query against this EntityManager's local cache.

        @example
        Because this method is executed immediately there is no need for a promise or a callback
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders");
             var orders = em.executeQueryLocally(query);
        Note that this can also be accomplished using the 'executeQuery' method with
        a FetchStrategy of FromLocalCache and making use of the Promise or callback
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders").using(FetchStrategy.FromLocalCache);
             em.executeQuery(query)
               .then( function(data) {
                   var orders = data.results;
                   ... query results processed here
             }).fail( function(err) {
                   ... query failure processed here
             });
        @method executeQueryLocally
        @param query {EntityQuery}  The {{#crossLink "EntityQuery"}}{{/crossLink}} to execute.
        @return  {Array of Entity}  Array of Entities
        **/
        ctor.prototype.executeQueryLocally = function (query) {
            core.assertParam(query, "query").isInstanceOf(EntityQuery).check();
            var result;
            var metadataStore = this.metadataStore;
            var entityType = query._getEntityType(metadataStore, true);
            // TODO: there may be multiple groups once we go further with inheritence
            var group = findOrCreateEntityGroup(this, entityType);
            // filter then order then skip then take
            var filterFunc = query._toFilterFunction(entityType);
        
            if (filterFunc) {
                var undeletedFilterFunc = function(entity) {
                    return entity && (!entity.entityAspect.entityState.isDeleted()) && filterFunc(entity);
                };
                result = group._entities.filter(undeletedFilterFunc);
            } else {
                result = group._entities.filter(function(entity) {
                    return entity && (!entity.entityAspect.entityState.isDeleted());
                });
            }
            
            var orderByComparer = query._toOrderByComparer(entityType);
            if (orderByComparer) {
                result.sort(orderByComparer);
            }
            var skipCount = query.skipCount;
            if (skipCount) {
                result = result.slice(skipCount);
            }
            var takeCount = query.takeCount;
            if (takeCount) {
                result = result.slice(0, takeCount);
            }

            var selectClause = query.selectClause;
            if (selectClause) {
                var selectFn = selectClause.toFunction();
                result = result.map(function(e) {
                    return selectFn(e);
                });
            }
            return result;
        };

        /**
        Saves either a list of specified entities or all changed entities within this EntityManager. If there are no changes to any of the entities
        specified then there will be no server side call made but a valid 'empty' saveResult will still be returned.
        @example
        Often we will be saving all of the entities within an EntityManager that are either added, modified or deleted
        and we will let the 'saveChanges' call determine which entities these are. 
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            // This could include added, modified and deleted entities.
            em.saveChanges().then(function(saveResult) {
                var savedEntities = saveResult.entities;
                var keyMappings = saveResult.keyMappings;
            }).fail(function (e) {
                // e is any exception that was thrown.
            });
        But we can also control exactly which entities to save and can specify specific SaveOptions
        @example
            // assume entitiesToSave is an array of entities to save.
            var saveOptions = new SaveOptions({ allowConcurrentSaves: true });
            em.saveChanges(entitiesToSave, saveOptions).then(function(saveResult) {
                var savedEntities = saveResult.entities;
                var keyMappings = saveResult.keyMappings;
            }).fail(function (e) {
                // e is any exception that was thrown.
            });
        Callback methods can also be used
        @example
            em.saveChanges(entitiesToSave, null, 
                function(saveResult) {
                    var savedEntities = saveResult.entities;
                    var keyMappings = saveResult.keyMappings;
                }, function (e) {
                    // e is any exception that was thrown.
                }
            );
        @method saveChanges
        @async
        @param [entities] {Array of Entity} The list of entities to save.  All entities with changes 
        within this EntityManager will be saved if this parameter is omitted, null or empty.
        @param [saveOptions] {SaveOptions} {{#crossLink "SaveOptions"}}{{/crossLink}} for the save - will default to
        {{#crossLink "EntityManager/saveOptions"}}{{/crossLink}} if null.
        @param [callback] {Function} Function called on success.
        
            successFunction([saveResult])
            @param [callback.saveResult] {Object} 
            @param [callback.saveResult.entities] {Array of Entity} The saved entities - with any temporary keys converted into 'real' keys.  
            These entities are actually references to entities in the EntityManager cache that have been updated as a result of the
            save.
            @param [callback.saveResult.keyMappings] {Object} Map of OriginalEntityKey, NewEntityKey
            @param [callback.saveResult.XHR] {XMLHttpRequest} The raw XMLHttpRequest returned from the server.

        @param [errorCallback] {Function} Function called on failure.
            
            failureFunction([error])
            @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.
            @param [errorCallback.error.XHR] {XMLHttpRequest} The raw XMLHttpRequest returned from the server.
        @return {Promise} Promise
        **/
        ctor.prototype.saveChanges = function (entities, saveOptions, callback, errorCallback) {
            core.assertParam(entities, "entities").isOptional().isArray().isEntity().check();
            core.assertParam(saveOptions, "saveOptions").isInstanceOf(SaveOptions).isOptional().check();
            core.assertParam(callback, "callback").isFunction().isOptional().check();
            core.assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();
            
            saveOptions = saveOptions || this.saveOptions || SaveOptions.defaultInstance;
            var isFullSave = entities == null;
            var entitiesToSave = getEntitiesToSave(this, entities);
            
            if (entitiesToSave.length == 0) {
                var saveResult =  { entities: [], keyMappings: [] };
                if (callback) callback(saveResult);
                return Q.resolve(saveResult);
            }
            
            if (!saveOptions.allowConcurrentSaves) {
                var anyPendingSaves = entitiesToSave.some(function (entity) {
                    return entity.entityAspect.isBeingSaved;
                });                
                if (anyPendingSaves) {
                    var err = new Error("ConcurrentSaves not allowed - SaveOptions.allowConcurrentSaves is false");
                    if (errorCallback) errorCallback(err);
                    return Q.reject(err);
                }
            }
            
            if (this.validationOptions.validateOnSave) {
                var failedEntities = entitiesToSave.filter(function (entity) {
                    var aspect = entity.entityAspect;
                    var isValid = aspect.entityState.isDeleted() || aspect.validateEntity();
                    return !isValid;
                });
                if (failedEntities.length > 0) {
                    var valError = new Error("Validation error");
                    valError.entitiesWithErrors = failedEntities;
                    if (errorCallback) errorCallback(valError);
                    return Q.reject(valError);
                }
            }
            
            updateConcurrencyProperties(entitiesToSave);

            // TODO: need to check that if we are doing a partial save that all entities whose temp keys 
            // are referenced are also in the partial save group

            var saveBundle = { entities: unwrapEntities(entitiesToSave, this.metadataStore), saveOptions: saveOptions};
            var saveBundleStringified = JSON.stringify(saveBundle);

            var deferred = Q.defer();
            this.dataServiceAdapterInstance.saveChanges(this, saveBundleStringified, deferred.resolve, deferred.reject);
            var that = this;
            return deferred.promise.then(function (rawSaveResult) {
                // HACK: simply to change the 'case' of properties in the saveResult
                // but KeyMapping properties are still ucase. ugh...
                var saveResult = { entities: rawSaveResult.Entities, keyMappings: rawSaveResult.KeyMappings, XHR: rawSaveResult.XHR };
                fixupKeys(that, saveResult.keyMappings);
                var queryContext = { query: null, entityManager: that, mergeStrategy: MergeStrategy.OverwriteChanges, refMap: {} };
                var savedEntities = saveResult.entities.map(function (rawEntity) {
                    return mergeEntity(rawEntity, queryContext, true);
                });
                markIsBeingSaved(entitiesToSave, false);
                // update _hasChanges after save.
                that._hasChanges = isFullSave ? false : that._hasChangesCore();
                if (!that._hasChanges) {
                    that.hasChanges.publish({ entityManager: that, hasChanges: false });
                }
                saveResult.entities = savedEntities;
                if (callback) callback(saveResult);
                return Q.resolve(saveResult);
            }, function (error) {
                markIsBeingSaved(entitiesToSave, false);
                if (errorCallback) errorCallback(error);
                return Q.reject(error);
            });

        };

        // TODO: make this internal - no good reason to expose the EntityGroup to the external api yet.
        ctor.prototype.findEntityGroup = function (entityType) {
            core.assertParam(entityType, "entityType").isInstanceOf(EntityType).check();
            return this._entityGroupMap[entityType.name];
        };

        
        /**
        Attempts to locate an entity within this EntityManager by its key. 
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var employee = em1.getEntityByKey("Employee", 1);
            // employee will either be an entity or null.
        @method getEntityByKey
        @param typeName {String} The entityType name for this key.
        @param keyValues {Object|Array of Object} The values for this key - will usually just be a single value; an array is only needed for multipart keys.
        @return {Entity} An Entity or null;
        **/
        
        /**
        Attempts to locate an entity within this EntityManager by its  {{#crossLink "EntityKey"}}{{/crossLink}}.
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var employeeType = em1.metadataStore.getEntityType("Employee");
            var employeeKey = new EntityKey(employeeType, 1);
            var employee = em1.getEntityByKey(employeeKey);
            // employee will either be an entity or null.
        @method getEntityByKey - overload
        @param entityKey {EntityKey} The  {{#crossLink "EntityKey"}}{{/crossLink}} of the Entity to be located.
        @return {Entity} An Entity or null;
        **/
        ctor.prototype.getEntityByKey = function () {

            var entityKey = createEntityKey(this, arguments).entityKey;

            var group = this.findEntityGroup(entityKey.entityType);
            if (!group) {
                return null;
            }
            return group.findEntityByKey(entityKey);
        };
        
        /**
        Attempts to fetch an entity from the server by its key with
        an option to check the local cache first. 
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var employeeType = em1.metadataStore.getEntityType("Employee");
            var employeeKey = new EntityKey(employeeType, 1);
            em1.fetchEntityByKey(employeeKey).then(function(result) {
                var employee = result.entity;
                var entityKey = result.entityKey;
                var fromCache = result.fromCache;
            });
        @method fetchEntityByKey
        @async
        @param typeName {String} The entityType name for this key.
        @param keyValues {Object|Array of Object} The values for this key - will usually just be a single value; an array is only needed for multipart keys.
        @param checkLocalCacheFirst {Boolean=false} Whether to check this EntityManager first before going to the server. By default, the query will NOT do this.
        @return {Promise} 

            promiseData.entity {Object} The entity returned or null
            promiseData.entityKey {EntityKey} The entityKey of the entity to fetch.
            promiseData.fromCache {Boolean} Whether this entity was fetched from the server or was found in the local cache.
        **/
        
        /**
        Attempts to fetch an entity from the server by its {{#crossLink "EntityKey"}}{{/crossLink}} with
        an option to check the local cache first. 
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var employeeType = em1.metadataStore.getEntityType("Employee");
            var employeeKey = new EntityKey(employeeType, 1);
            em1.fetchEntityByKey(employeeKey).then(function(result) {
                var employee = result.entity;
                var entityKey = result.entityKey;
                var fromCache = result.fromCache;
            });
        @method fetchEntityByKey - overload
        @async
        @param entityKey {EntityKey} The  {{#crossLink "EntityKey"}}{{/crossLink}} of the Entity to be located.
        @param checkLocalCacheFirst {Boolean=false} Whether to check this EntityManager first before going to the server. By default, the query will NOT do this.
        @return {Promise} 
        
            promiseData.entity {Object} The entity returned or null
            promiseData.entityKey {EntityKey} The entityKey of the entity to fetch.
            promiseData.fromCache {Boolean} Whether this entity was fetched from the server or was found in the local cache.
        **/
        ctor.prototype.fetchEntityByKey = function () {
            var tpl = createEntityKey(this, arguments);
            var entityKey = tpl.entityKey;
            var checkLocalCacheFirst = tpl.remainingArgs.length === 0 ? false : !!tpl.remainingArgs[0];
            var entity;
            if (checkLocalCacheFirst) {
                entity = this.getEntityByKey(entityKey);
            } 
            if (entity) {
                return Q.resolve({ entity: entity, entityKey: entityKey, fromCache: true });
            } else {
                return EntityQuery.fromEntityKey(entityKey).using(this).execute().then(function(data) {
                    entity = (data.results.length === 0) ? null : data.results[0];
                    return Q.resolve({ entity: entity, entityKey: entityKey, fromCache: false });
                });
            }
        };
        
        /**
        Attempts to locate an entity within this EntityManager by its  {{#crossLink "EntityKey"}}{{/crossLink}}.
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var employeeType = em1.metadataStore.getEntityType("Employee");
            var employeeKey = new EntityKey(employeeType, 1);
            var employee = em1.findEntityByKey(employeeKey);
            // employee will either be an entity or null.
        @method findEntityByKey
        @deprecated - use getEntityByKey instead
        @param entityKey {EntityKey} The  {{#crossLink "EntityKey"}}{{/crossLink}} of the Entity to be located.
        @return {Entity} An Entity or null;
        **/
        ctor.prototype.findEntityByKey = function (entityKey) {
            return this.getEntityByKey(entityKey);
        };

        /**
        Generates a temporary key for the specified entity.  This is used to insure that newly
        created entities have unique keys and to register that these keys are temporary and
        need to be automatically replaced with 'real' key values once these entities are saved.

        The EntityManager.keyGeneratorCtor property is used internally by this method to actually generate
        the keys - See the  {{#crossLink "~keyGenerator-interface"}}{{/crossLink}} interface description to see
        how a custom key generator can be plugged in.
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var custType = em1.metadataStore.getEntityType("Customer");
            var custumer = custType.createEntity();
            var customerId = em.generateTempKeyValue(custumer);
            // The 'customer' entity 'CustomerID' property is now set to a newly generated unique id value
            // This property will change again after a successful save of the 'customer' entity.

            em1.saveChanges()
                .then( function( data) {
                    var sameCust1 = data.results[0];
                    // cust1 === sameCust1;
                    // but cust1.getProperty("CustomerId") != customerId
                    // because the server will have generated a new id 
                    // and the client will have been updated with this 
                    // new id.
                })

        @method generateTempKeyValue
        @param entity {Entity} The Entity to generate a key for.
        @return {Object} The new key value
        **/
        ctor.prototype.generateTempKeyValue = function (entity) {
            // TODO - check if this entity is attached to this EntityManager.
            core.assertParam(entity, "entity").isEntity().check();
            var entityType = entity.entityType;
            var nextKeyValue = this.keyGenerator.generateTempKeyValue(entityType);
            var keyProp = entityType.keyProperties[0];
            entity.setProperty(keyProp.name, nextKeyValue);
            entity.entityAspect.hasTempKey = true;
            return nextKeyValue;
        };
        
        /**
        Returns whether there are any changed entities of the specified {{#crossLink "EntityType"}}{{/crossLink}}s. A 'changed' Entity has
        has an {{#crossLink "EntityState"}}{{/crossLink}} of either Added, Modified or Deleted.
        @example
        This method can be used to determine if an EntityManager has any changes
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            if ( em1.hasChanges() {
               // do something interesting
            }
        or if it has any changes on to a specific {{#crossLink "EntityType"}}{{/crossLink}}
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var custType = em1.metadataStore.getEntityType("Customer");
            if ( em1.hasChanges(custType) {
               // do something interesting
            }
        or to a collection of {{#crossLink "EntityType"}}{{/crossLink}}s
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var custType = em1.metadataStore.getEntityType("Customer");
            var orderType = em1.metadataStore.getEntityType("Order");
            if ( em1.hasChanges( [custType, orderType]) {
               // do something interesting
            }
        @method hasChanges
        @param [entityTypes] {String|Array of String|EntityType|Array of EntityType} The {{#crossLink "EntityType"}}{{/crossLink}}s for which 'changed' entities will be found.
        If this parameter is omitted, all EntityTypes are searched. String parameters are treated as EntityType names. 
        @return {Boolean} Whether there were any changed entities.
        **/
        //ctor.prototype.hasChanges = function (entityTypes) {
        //    if (!this._hasChanges) return false;
        //    if (entityTypes === undefined) return this._hasChanges;
        //    return this._hasChangesCore(entityTypes);
        //};
        
        /**
        An {{#crossLink "Event"}}{{/crossLink}} that fires whenever an EntityManager transitions to or from having changes. 
        @example                    
            var em = new EntityManager( {serviceName: "api/NorthwindIBModel" });
            em.hasChanges.subscribe(function(args) {
                var hasChanges = args.hasChanges;
                var entityManager = args.entityManager;
            });
        });
      
        @event hasChanges 
        @param entityManager {EntityManager} The EntityManager whose 'hasChanges' status has changed. 
        @param hasChanges {Boolean} Whether or not this EntityManager has changes.
        @readOnly
        **/
        
        
        // backdoor the "really" check for changes.
        ctor.prototype._hasChangesCore = function (entityTypes) {
            entityTypes = checkEntityTypes(this, entityTypes);
            var entityGroups = getEntityGroups(this, entityTypes);
            return entityGroups.some(function (eg) {
                return eg.hasChanges();
            });
        }
        
        /**
        Returns a array of all changed entities of the specified {{#crossLink "EntityType"}}{{/crossLink}}s. A 'changed' Entity has
        has an {{#crossLink "EntityState"}}{{/crossLink}} of either Added, Modified or Deleted.
        @example
        This method can be used to get all of the changed entities within an EntityManager
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var changedEntities = em1.getChanges();
        or you can specify that you only want the changes on a specific {{#crossLink "EntityType"}}{{/crossLink}}
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var custType = em1.metadataStore.getEntityType("Customer");
            var changedCustomers = em1.getChanges(custType);
        or to a collection of {{#crossLink "EntityType"}}{{/crossLink}}s
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var custType = em1.metadataStore.getEntityType("Customer");
            var orderType = em1.metadataStore.getEntityType("Order");
            var changedCustomersAndOrders = em1.getChanges([custType, orderType]);
        @method getChanges
        @param [entityTypes] {String|Array of String|EntityType|Array of EntityType} The {{#crossLink "EntityType"}}{{/crossLink}}s for which 'changed' entities will be found.
        If this parameter is omitted, all EntityTypes are searched. String parameters are treated as EntityType names. 
        @return {Array of Entity} Array of Entities
        **/
        ctor.prototype.getChanges = function (entityTypes) {
            entityTypes = checkEntityTypes(this, entityTypes);
            var entityStates = [EntityState.Added, EntityState.Modified, EntityState.Deleted];
            return this._getEntitiesCore(entityTypes, entityStates);
        };

        /**
        Rejects (reverses the effects) all of the additions, modifications and deletes from this EntityManager.
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities.
            var entities = em1.rejectChanges();
        
        @method rejectChanges
        @return {Array of Entity} The entities whose changes were rejected. These entities will all have EntityStates of 
        either 'Unchanged' or 'Detached'
        **/
        ctor.prototype.rejectChanges = function () {
            if (!this._hasChanges) return [];
            var entityStates = [EntityState.Added, EntityState.Modified, EntityState.Deleted];
            var changes = this._getEntitiesCore(null, entityStates);
            // next line stops individual reject changes from each calling _hasChangesCore
            this._hasChanges = false;
            changes.forEach(function(e) {
                e.entityAspect.rejectChanges();
            });
            this.hasChanges.publish({ entityManager: this, hasChanges: false });
            return changes;
        };
        
        /**
        Returns a array of all entities of the specified {{#crossLink "EntityType"}}{{/crossLink}}s with the specified {{#crossLink "EntityState"}}{{/crossLink}}s. 
        @example
        This method can be used to get all of the entities within an EntityManager
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var entities = em1.getEntities();
        or you can specify that you only want the changes on a specific {{#crossLink "EntityType"}}{{/crossLink}}
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var custType = em1.metadataStore.getEntityType("Customer");
            var customers = em1.getEntities(custType);
        or to a collection of {{#crossLink "EntityType"}}{{/crossLink}}s
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var custType = em1.metadataStore.getEntityType("Customer");
            var orderType = em1.metadataStore.getEntityType("Order");
            var customersAndOrders = em1.getChanges([custType, orderType]);
        You can also ask for entities with a particular {{#crossLink "EntityState"}}{{/crossLink}} or EntityStates.
        @example
            // assume em1 is an EntityManager containing a number of preexisting entities. 
            var custType = em1.metadataStore.getEntityType("Customer");
            var orderType = em1.metadataStore.getEntityType("Order");
            var addedCustomersAndOrders = em1.getEntities([custType, orderType], EntityState.Added);
        @method getEntities
        @param [entityTypes] {String|Array of String|EntityType|Array of EntityType} The {{#crossLink "EntityType"}}{{/crossLink}}s for which entities will be found.
        If this parameter is omitted, all EntityTypes are searched. String parameters are treated as EntityType names. 
        @param [entityState] {EntityState|Array of EntityState} The {{#crossLink "EntityState"}}{{/crossLink}}s for which entities will be found.
        If this parameter is omitted, entities of all EntityStates are returned. 
        @return {Array of Entity} Array of Entities
        **/
        ctor.prototype.getEntities = function (entityTypes, entityStates) {
            entityTypes = checkEntityTypes(this, entityTypes);
            core.assertParam(entityStates, "entityStates").isOptional().isEnumOf(EntityState).or().isNonEmptyArray().isEnumOf(EntityState).check();
            
            if (entityStates) {
                entityStates = validateEntityStates(this, entityStates);
            }
            return this._getEntitiesCore(entityTypes, entityStates);
        };
        
        // takes in entityTypes as either strings or entityTypes or arrays of either
        // and returns either an entityType or an array of entityTypes or throws an error
        function checkEntityTypes(em, entityTypes) {
            core.assertParam(entityTypes, "entityTypes").isString().isOptional().or().isNonEmptyArray().isString()
                .or().isInstanceOf(EntityType).or().isNonEmptyArray().isInstanceOf(EntityType).check();
            if (typeof entityTypes === "string") {
                entityTypes = em.metadataStore.getEntityType(entityTypes, false);
            } else if (Array.isArray(entityTypes) && typeof entityTypes[0] === "string") {
                entityTypes = entityTypes.map(function(etName) {
                    return em.metadataStore.getEntityType(etName, false);
                });
            }
            return entityTypes;
        }

        // protected methods

        ctor.prototype._notifyStateChange = function (entity, needsSave) {
            this.entityChanged.publish({ entityAction: EntityAction.EntityStateChange, entity: entity });

            if (needsSave) {
                if (!this._hasChanges) {
                    this._hasChanges = true;
                    this.hasChanges.publish({ entityManager: this, hasChanges: true });
                }
            } else {
                // called when rejecting a change or merging an unchanged record.
                if (this._hasChanges) {
                    // NOTE: this can be slow with lots of entities in the cache.
                    this._hasChanges = this._hasChangesCore();
                    if (!this._hasChanges) {
                        this.hasChanges.publish({ entityManager: this, hasChanges: false });
                    }
                }
            }
        };

        ctor.prototype._getEntitiesCore = function (entityTypes, entityStates) {
            var entityGroups = getEntityGroups(this, entityTypes);

            // TODO: think about writing a core.mapMany method if we see more of these.
            var selected;
            entityGroups.forEach(function (eg) {
                // eg may be undefined or null
                if (!eg) return;
                var entities = eg.getEntities(entityStates);
                if (!selected) {
                    selected = entities;
                } else {
                    selected.push.apply(selected, entities);
                }
            });
            return selected || [];
        };

        ctor.prototype._addUnattachedChild = function (parentEntityKey, navigationProperty, child) {
            var key = parentEntityKey.toString();
            var children = this._unattachedChildrenMap[key];
            if (!children) {
                children = [];
                this._unattachedChildrenMap[key] = children;
            }
            children.push(child);
        };

        
        ctor.prototype._linkRelatedEntities = function (entity) {
            var em = this;
            var entityAspect = entity.entityAspect;
            // we do not want entityState to change as a result of linkage.
            core.using(em, "isLoading", true, function () {

                var entityType = entity.entityType;
                var navigationProperties = entityType.navigationProperties;
                var unattachedMap = em._unattachedChildrenMap;

                navigationProperties.forEach(function (np) {
                    if (np.isScalar) {
                        var value = entity.getProperty(np.name);
                        // property is already linked up
                        if (value) return;
                    }

                    // first determine if np contains a parent or child
                    // having a parentKey means that this is a child
                    var parentKey = entityAspect.getParentKey(np);
                    if (parentKey) {
                        // check for empty keys - meaning that parent id's are not yet set.
                        if (parentKey._isEmpty()) return;
                        // if a child - look for parent in the em cache
                        var parent = em.findEntityByKey(parentKey);
                        if (parent) {
                            // if found hook it up
                            entity.setProperty(np.name, parent);
                        } else {
                            // else add parent to unresolvedParentMap;
                            unattachedMap.addChild(parentKey, np, entity);
                        }
                    } else {
                        // if a parent - look for unresolved children associated with this entity
                        // and hook them up.
                        var entityKey = entityAspect.getKey();
                        var inverseNp = np.inverse;
                        if (!inverseNp) return;
                        var unattachedChildren = unattachedMap.getChildren(entityKey, inverseNp);
                        if (!unattachedChildren) return;
                        if (np.isScalar) {
                            var onlyChild = unattachedChildren[0];
                            entity.setProperty(np.name, onlyChild);
                            onlyChild.setProperty(inverseNp.name, entity);
                        } else {
                            var currentChildren = entity.getProperty(np.name);
                            unattachedChildren.forEach(function (child) {
                                currentChildren.push(child);
                                child.setProperty(inverseNp.name, entity);
                            });
                        }
                        unattachedMap.removeChildren(entityKey, np);
                    }
                });
            });
        };

        // private fns
        
        function createEntityKey(em, args) {
            if (args[0] instanceof EntityKey) {
                return { entityKey: args[0], remainingArgs: Array.prototype.slice.call(args, 1) };
            } else if (typeof args[0] === 'string' && args.length >= 2) {
                var entityType = em.metadataStore.getEntityType(args[0], false);
                return { entityKey: new EntityKey(entityType, args[1]), remainingArgs: Array.prototype.slice.call(args, 2) };
            } else {
                throw new Error("This method requires as its initial parameters either an EntityKey or an entityType name followed by a value or an array of values.");
            }
        }       
        
        function markIsBeingSaved(entities, flag) {
            entities.forEach(function(entity) {
                entity.entityAspect.isBeingSaved = flag;
            });
        }

        function exportEntityGroups(em, entities) {
            var entityGroupMap;
            if (entities) {
                // group entities by entityType and 
                // create 'groups' that look like entityGroups.
                entityGroupMap = {};
                entities.forEach(function (e) {
                    var group = entityGroupMap[e.entityType.name];
                    if (!group) {
                        group = {};
                        group.entityType = e.entityType;
                        group._entities = [];
                        entityGroupMap[e.entityType.name] = group;
                    }
                    group._entities.push(e);
                });
            } else {
                entityGroupMap = em._entityGroupMap;
            }

            var tempKeys = [];
            var newGroupMap = {};
            core.objectForEach(entityGroupMap, function (entityTypeName, entityGroup) {
                newGroupMap[entityTypeName] = exportEntityGroup(entityGroup, tempKeys);
            });

            return { entityGroupMap: newGroupMap, tempKeys: tempKeys };
        }

        function exportEntityGroup(entityGroup, tempKeys) {
            var resultGroup = {};
            var entityType = entityGroup.entityType;
            var dpNames = entityType.dataProperties.map(core.pluck("name"));
            resultGroup.dataPropertyNames = dpNames;
            resultGroup.entities = entityGroup._entities.map(function (e) {
                var rawEntity = [];
                dpNames.forEach(function (dpName) {
                    rawEntity.push(e.getProperty(dpName));
                });
                var aspect = e.entityAspect;
                var entityState = aspect.entityState;
                var newAspect = {
                    tempNavPropNames: exportTempKeyInfo(aspect, tempKeys),
                    entityState: entityState.name
                };
                if (entityState.isModified() || entityState.isDeleted()) {
                    newAspect.originalValuesMap = aspect.originalValues;
                };
                rawEntity.push(newAspect);
                return rawEntity;
            });
            return resultGroup;
        }

        function exportTempKeyInfo(entityAspect, tempKeys) {
            var entity = entityAspect.entity;
            if (entityAspect.hasTempKey) {
                tempKeys.push(entityAspect.getKey().toJSON());
            }
            // create map for this entity with foreignKeys that are 'temporary'
            // map -> key: tempKey, value: fkPropName
            var tempNavPropNames;
            entity.entityType.navigationProperties.forEach(function (np) {
                if (np.relatedDataProperties) {
                    var relatedValue = entity.getProperty(np.name);
                    if (relatedValue && relatedValue.entityAspect.hasTempKey) {
                        tempNavPropNames = tempNavPropNames || [];
                        tempNavPropNames.push(np.name);
                    }
                }
            });
            return tempNavPropNames;
        }

        function importEntityGroup(entityGroup, jsonGroup, config) {

            var tempKeyMap = config.tempKeyMap;

            var entityType = entityGroup.entityType;
            var shouldOverwrite = config.mergeStrategy === MergeStrategy.OverwriteChanges;
            var targetEntity = null;
            var dpNames = jsonGroup.dataPropertyNames;
            var keyIxs = entityType.keyProperties.map(function (kp) {
                return dpNames.indexOf(kp.name);
            });
            var lastIx = dpNames.length;
            var entityChanged = entityGroup.entityManager.entityChanged;
            jsonGroup.entities.forEach(function (rawEntity) {
                var newAspect = rawEntity[lastIx];
                var keyValues = keyIxs.map(function (ix) { return rawEntity[ix]; });
                var entityKey = new EntityKey(entityType, keyValues);
                var entityState = EntityState.fromName(newAspect.entityState);
                var newTempKeyValue;
                if (entityState.isAdded()) {
                    newTempKeyValue = tempKeyMap[entityKey.toString()];
                    if (newTempKeyValue === undefined) {
                        // merge added records with non temp keys
                        targetEntity = entityGroup.findEntityByKey(entityKey);
                    } else {
                        targetEntity = null;
                    }
                } else {
                    targetEntity = entityGroup.findEntityByKey(entityKey);
                }

                if (targetEntity) {
                    var wasUnchanged = targetEntity.entityAspect.entityState.isUnchanged();
                    if (shouldOverwrite || wasUnchanged) {
                        dpNames.forEach(function (dpName, ix) {
                            targetEntity.setProperty(dpName, rawEntity[ix]);
                        });
                        entityChanged.publish({ entityAction: EntityAction.MergeOnImport, entity: targetEntity });
                        if (wasUnchanged) {
                            if (!entityState.isUnchanged()) {
                                entityGroup.entityManager._notifyStateChange(targetEntity, true);
                            }
                        } else {
                            if (entityState.isUnchanged()) {
                                entityGroup.entityManager._notifyStateChange(targetEntity, false);
                            }
                        }
                    } else {
                        targetEntity = null;
                    }
                } else {
                    targetEntity = entityType._createEntity(true);
                    dpNames.forEach(function (dpName, ix) {
                        targetEntity.setProperty(dpName, rawEntity[ix]);
                    });
                    if (newTempKeyValue !== undefined) {
                        // fixup pk
                        targetEntity.setProperty(entityType.keyProperties[0].name, newTempKeyValue);

                        // fixup foreign keys
                        if (newAspect.tempNavPropNames) {
                            newAspect.tempNavPropNames.forEach(function (npName) {
                                var np = entityType.getNavigationProperty(npName);
                                var fkPropName = np.relatedDataProperties[0].name;
                                var oldFkValue = targetEntity.getProperty(fkPropName);
                                var fk = new EntityKey(np.entityType, [oldFkValue]);
                                var newFkValue = tempKeyMap[fk.toString()];
                                targetEntity.setProperty(fkPropName, newFkValue);
                            });
                        }
                    }
                    targetEntity.entityAspect._postInitialize();
                    targetEntity = entityGroup.attachEntity(targetEntity, entityState);
                    if (entityChanged) {
                        entityChanged.publish({ entityAction: EntityAction.AttachOnImport, entity: targetEntity });
                        if (!entityState.isUnchanged()) {
                            entityGroup.entityManager._notifyStateChange(targetEntity, true);
                        }
                    }
                }

                if (targetEntity) {
                    targetEntity.entityAspect.entityState = entityState;
                    if (entityState.isModified()) {
                        targetEntity.entityAspect.originalValuesMap = newAspect.originalValues;
                    }
                    entityGroup.entityManager._linkRelatedEntities( targetEntity);
                }
            });
        };

        function promiseWithCallbacks(promise, callback, errorCallback) {

            promise = promise.then(function (data) {
                if (callback) callback(data);
                return Q.resolve(data);
            }).fail(function (error) {
                if (errorCallback) errorCallback(error);
                return Q.reject(error);
            });
            return promise;
        }

        function getEntitiesToSave(em, entities) {
            var entitiesToSave;
            if (entities) {
                entitiesToSave = entities.filter(function (e) {
                    if (e.entityAspect.entityManager !== em) {
                        throw new Error("Only entities in this entityManager may be saved");
                    }
                    return !e.entityAspect.entityState.isDetached();
                });
            } else {
                entitiesToSave = em.getChanges();
            }
            return entitiesToSave;
        }

        function fixupKeys(em, keyMappings) {
            keyMappings.forEach(function (km) {
                var entityTypeName = EntityType._getNormalizedTypeName(km.EntityTypeName);
                var group = em._entityGroupMap[entityTypeName];
                group._fixupKey(km.TempValue, km.RealValue);
            });
        }

        function getEntityGroups(em, entityTypes) {
            var groupMap = em._entityGroupMap;
            if (entityTypes) {
                if (entityTypes instanceof EntityType) {
                    return [groupMap[entityTypes.name]];
                } else if (Array.isArray(entityTypes)) {
                    return entityTypes.map(function (et) {
                        if (et instanceof EntityType) {
                            return groupMap[et.name];
                        } else {
                            throw createError();
                        }
                    });
                } else {
                    throw createError();
                }
            } else {
                return core.getOwnPropertyValues(groupMap);
            }

            function createError() {
                return new Error("The EntityManager.getChanges() 'entityTypes' parameter must be either an entityType or an array of entityTypes or null");
            }
        }

        function checkEntityKey(em, entity) {
            var ek = entity.entityAspect.getKey();
            // return properties that are = to defaultValues
            var keyPropsWithDefaultValues = core.arrayZip(entity.entityType.keyProperties, ek.values, function (kp, kv) {
                return (kp.defaultValue === kv) ? kp : null;
            }).filter(function (kp) {
                return kp !== null;
            });
            if (keyPropsWithDefaultValues.length) {
                if (entity.entityType.autoGeneratedKeyType !== AutoGeneratedKeyType.None) {
                    em.generateTempKeyValue(entity);
                } else {
                    // we will allow attaches of entities where only part of the key is set.
                    if (keyPropsWithDefaultValues.length === ek.values.length) {
                        throw new Error("Cannot attach an object to an EntityManager without first setting its key or setting its entityType 'AutoGeneratedKeyType' property to something other than 'None'");
                    }
                }
            }
        }

        function validateEntityStates(em, entityStates) {
            if (!entityStates) return null;
            if (EntityState.contains(entityStates)) {
                entityStates = [entityStates];
            } else if (Array.isArray(entityStates)) {
                entityStates.forEach(function (es) {
                    if (!EntityState.contains(es)) {
                        throw createError();
                    }
                });
            } else {
                throw createError();
            }
            return entityStates;

            function createError() {
                return new Error("The EntityManager.getChanges() 'entityStates' parameter must either be null, an entityState or an array of entityStates");
            }
        }

        function attachEntityCore(em, entity, entityState) {
            var group = findOrCreateEntityGroup(em, entity.entityType);
            group.attachEntity(entity, entityState);
            em._linkRelatedEntities(entity);
        }

        function attachRelatedEntities(em, entity, entityState) {
            var navProps = entity.entityType.navigationProperties;
            navProps.forEach(function (np) {
                var related = entity.getProperty(np.name);
                if (np.isScalar) {
                    if (!related) return;
                    em.attachEntity(related, entityState);
                } else {
                    related.forEach(function (e) {
                        em.attachEntity(e, entityState);
                    });
                }
            });
        }

        

        // returns a promise
        function executeQueryCore(em, query) {
            try {
                var metadataStore = em.metadataStore;
                if (metadataStore.isEmpty() && em.dataService.hasServerMetadata) {
                    throw new Error("cannot execute _executeQueryCore until metadataStore is populated.");
                }
                var queryOptions = query.queryOptions || em.queryOptions || QueryOptions.defaultInstance;
                if (queryOptions.fetchStrategy == FetchStrategy.FromLocalCache) {
                    return Q.fcall(function () {
                        var results = em.executeQueryLocally(query);
                        return { results: results, query: query };
                    });
                }
                var odataQuery = toOdataQueryString(query, metadataStore);
                var queryContext = {
                     query: query, 
                     entityManager: em, 
                     mergeStrategy: queryOptions.mergeStrategy, 
                     refMap: {}, 
                     deferredFns: []
                };
                var deferred = Q.defer();
                var validateOnQuery = em.validationOptions.validateOnQuery;
                var promise = deferred.promise;
                
                em.dataServiceAdapterInstance.executeQuery(em, odataQuery, function (data) {
                    var result = core.wrapExecution(function () {
                        var state = { isLoading: em.isLoading };
                        em.isLoading = true;
                        em._pendingPubs = [];
                        return state;
                    }, function (state) {
                        em.isLoading = state.isLoading;
                        em._pendingPubs.forEach(function(fn) { fn(); });
                        em._pendingPubs = null;
                    }, function () {
                        var rawEntities = data.results;
                        if (!Array.isArray(rawEntities)) {
                            rawEntities = [rawEntities];
                        }
                        var entities = rawEntities.map(function(rawEntity) {
                            // at the top level - mergeEntity will only return entities - at lower levels in the hierarchy 
                            // mergeEntity can return deferred functions.
                            var entity = mergeEntity(rawEntity, queryContext);
                            // anon types and simple types will not have an entityAspect.
                            if (validateOnQuery && entity.entityAspect) {
                                entity.entityAspect.validateEntity();
                            }
                            return entity;
                        });
                        if (queryContext.deferredFns.length > 0) {
                           queryContext.deferredFns.forEach(function(fn) {
                                fn();
                            });
                        }
                        
                        return { results: entities, query: query, XHR: data.XHR, inlineCount: data.inlineCount };
                        
                    });
                    deferred.resolve( result);
                }, function (e) {
                    if (e) {
                        e.query = query;
                    }
                    deferred.reject(e);
                });
                return promise;
            } catch (e) {
                if (e) {
                    e.query = query;
                }
                return Q.reject(e);
            }
        }

        function mergeEntity(rawEntity, queryContext, isSaving, isNestedInAnon) {
            
            var em = queryContext.entityManager;
            var mergeStrategy = queryContext.mergeStrategy;

            // resolveRefEntity will return one of 3 values;  a targetEntity, a null or undefined.
            // null and undefined have different meanings - null means a ref entity that cannot be resolved - usually an odata __deferred value
            // undefined means that this is not a ref entity.
            targetEntity = em.dataServiceAdapterInstance.resolveRefEntity(rawEntity, queryContext);
            if (targetEntity !== undefined) {
                return targetEntity;
            }

            
            var entityType =em.dataServiceAdapterInstance.getEntityType(rawEntity, em.metadataStore);

            if (entityType == null) {
                return processAnonType(rawEntity, queryContext, isSaving);
            }

            rawEntity.entityType = entityType;
            var entityKey = EntityKey._fromRawEntity(rawEntity, entityType);
            var targetEntity = em.findEntityByKey(entityKey);
            if (targetEntity) {
                if (isSaving && targetEntity.entityAspect.entityState.isDeleted()) {
                    em.detachEntity(targetEntity);
                    return targetEntity;
                }
                var targetEntityState = targetEntity.entityAspect.entityState;
                if (mergeStrategy === MergeStrategy.OverwriteChanges
                        || targetEntityState.isUnchanged()) {
                    updateEntity(targetEntity, rawEntity, queryContext);
                    targetEntity.entityAspect.wasLoaded = true;
                    
                    targetEntity.entityAspect.entityState = EntityState.Unchanged;
                    targetEntity.entityAspect.originalValues = {};
                    targetEntity.entityAspect.propertyChanged.publish({ entity: targetEntity, propertyName: null  });
                    var action = isSaving ? EntityAction.MergeOnSave : EntityAction.MergeOnQuery;
                    em.entityChanged.publish({ entityAction: action, entity: targetEntity });
                    // this is needed to handle an overwrite or a modified entity with an unchanged entity 
                    // which might in turn cause _hasChanges to change.
                    if (!targetEntityState.isUnchanged) {
                        em._notifyStateChange(targetEntity, false);
                    }
                } else {
                    // also called by setPropertiesEntity
                    updateCurrentRef(queryContext, targetEntity);
                }

            } else {
                targetEntity = entityType._createEntity(true);
                if (targetEntity.initializeFrom) {
                    // allows any injected post ctor activity to be performed by modelLibrary impl.
                    targetEntity.initializeFrom(rawEntity);
                }
                updateEntity(targetEntity, rawEntity, queryContext);
                targetEntity.entityAspect._postInitialize();
                attachEntityCore(em, targetEntity, EntityState.Unchanged);
                targetEntity.entityAspect.wasLoaded = true;
                em.entityChanged.publish({ entityAction: EntityAction.AttachOnQuery, entity: targetEntity });
            }
            return targetEntity;
        }
        
        // function isSelectQuery(query) {
        //    if (query == null) {
        //        return false;
        //    } else if (typeof query === 'string') {
        //        return query.indexOf("$select") >= 0;
        //    } else {
        //        return !!query.selectClause;
        //    }
        //}
        
        function processAnonType(rawEntity, queryContext, isSaving) {
            var em = queryContext.entityManager;
            var keyFn = em.metadataStore.namingConvention.serverPropertyNameToClient;
            if (typeof rawEntity !== 'object') {
                return rawEntity;
            }
            var result = { };
            core.objectForEach(rawEntity, function(key, value) {
                if (key == "__metadata") {
                    return;
                }
                // EntityKey properties can be produced by EDMX models
                if (key == "EntityKey" && value.$type && core.stringStartsWith(value.$type, "System.Data")) {
                    return;
                }
                var firstChar = key.substr(0, 1);
                if (firstChar == "$") {
                    if (key === "$id") {
                        queryContext.refMap[value] = result;
                    }
                    return;
                } 
                
                var newKey = keyFn(key);
                var refValue;
                // == is deliberate here instead of ===
                if (value == null) {
                    result[newKey] = value;
                } else if (Array.isArray(value)) {
                    result[newKey] = value.map(function(v, ix, arr) {
                        if (v == null) {
                            return v;
                        } else if (v.$type || v.__metadata) {
                            return mergeEntity(v, queryContext, isSaving, true);
                        } else if (v.$ref) {
                            refValue = em.dataServiceAdapterInstance.resolveRefEntity(v, queryContext);
                            if (typeof refValue == "function") {
                                queryContext.deferredFns.push(function () {
                                    arr[ix] = refValue();
                                });
                            }
                            return refValue;
                        } else {
                            return v;
                        }
                    });
                } else {
                    if (value.$type || value.__metadata) {
                        result[newKey] = mergeEntity(value, queryContext, isSaving, true);
                    } else if (value.$ref) {
                        refValue = em.dataServiceAdapterInstance.resolveRefEntity(value, queryContext);
                        if (typeof refValue == "function") {
                            queryContext.deferredFns.push(function () {
                                result[newKey] = refValue();
                            });
                        }
                        result[newKey] = refValue;
                    } else {
                        result[newKey] = value;
                    }
                }
            });
            return result;
        }
        

        function updateEntity(targetEntity, rawEntity, queryContext) {
            updateCurrentRef(queryContext, targetEntity);
            var entityType = targetEntity.entityType;
            var metadataStore = entityType.metadataStore;
            entityType.dataProperties.forEach(function (dp) {
                if (dp.isUnmapped) return;
                var val = rawEntity[dp.nameOnServer];
                if (dp.dataType === DataType.DateTime && val) {
                    if (!core.isDate(val)) {
                        // Does not work - returns time offset from GMT (i think)
                        // val = new Date(val);
                        val = core.dateFromIsoString(val);
                    }
                }
                targetEntity.setProperty(dp.name, val);
            });
            entityType.navigationProperties.forEach(function (np) {
                if (np.isScalar) {
                    mergeRelatedEntity(np, targetEntity, rawEntity, queryContext);
                } else {
                    mergeRelatedEntities(np, targetEntity, rawEntity, queryContext);
                }
            });
        }

        function updateCurrentRef(queryContext, targetEntity) {
            if (queryContext.refId !== undefined) {
                queryContext.refMap[queryContext.refId] = targetEntity;
            }
        }

        function mergeRelatedEntity(navigationProperty, targetEntity, rawEntity, queryContext) {
            var relatedRawEntity = rawEntity[navigationProperty.nameOnServer];
            if (!relatedRawEntity) return;
            var deferred = queryContext.entityManager.dataServiceAdapterInstance.getDeferredValue(relatedRawEntity);
            if (deferred) {
                return;
            }
            var relatedEntity = mergeEntity(relatedRawEntity, queryContext);
            if (typeof relatedEntity === 'function') {
                queryContext.deferredFns.push(function() {
                    relatedEntity = relatedEntity();
                    updateRelatedEntity(relatedEntity, targetEntity, navigationProperty);
                });
            } else {
                updateRelatedEntity(relatedEntity, targetEntity, navigationProperty);
            }
        }
        
        function updateRelatedEntity(relatedEntity, targetEntity, navigationProperty) {
            if (!relatedEntity) return;
            var propName = navigationProperty.name;
            var currentRelatedEntity = targetEntity.getProperty(propName);
            // check if the related entity is already hooked up
            if (currentRelatedEntity != relatedEntity) {
                // if not hook up both directions.
                targetEntity.setProperty(propName, relatedEntity);
                var inverseProperty = navigationProperty.inverse;
                if (!inverseProperty) return;
                if (inverseProperty.isScalar) {
                    relatedEntity.setProperty(inverseProperty.name, targetEntity);
                } else {
                    var collection = relatedEntity.getProperty(inverseProperty.name);
                    collection.push(targetEntity);
                }
            }
        }

        function mergeRelatedEntities(navigationProperty, targetEntity, rawEntity, queryContext) {
            var propName = navigationProperty.name;
            var relatedEntities = targetEntity.getProperty(propName);

            var inverseProperty = navigationProperty.inverse;
            if (!inverseProperty) return;
            var relatedRawEntities = rawEntity[navigationProperty.nameOnServer];

            if (!relatedRawEntities) return;
            var deferred = queryContext.entityManager.dataServiceAdapterInstance.getDeferredValue(relatedRawEntities);
            if (deferred) {
                return;
            }
            if (!Array.isArray(relatedRawEntities)) return;
            relatedEntities.wasLoaded = true;
            relatedRawEntities.forEach(function (relatedRawEntity) {
                var relatedEntity = mergeEntity(relatedRawEntity, queryContext);
                if (typeof relatedEntity === 'function') {
                    queryContext.deferredFns.push(function() {
                        relatedEntity = relatedEntity();
                        updateRelatedEntityInCollection(relatedEntity, relatedEntities, targetEntity, inverseProperty);
                    });
                } else {
                    updateRelatedEntityInCollection(relatedEntity, relatedEntities, targetEntity, inverseProperty);
                }
            });
        };
        
        function updateRelatedEntityInCollection(relatedEntity, relatedEntities, targetEntity, inverseProperty) {
            if (!relatedEntity) return;
            // check if the related entity is already hooked up
            var thisEntity = relatedEntity.getProperty(inverseProperty.name);
            if (thisEntity !== targetEntity) {
                // if not - hook it up.
                relatedEntities.push(relatedEntity);
                relatedEntity.setProperty(inverseProperty.name, targetEntity);
            }
        }

        function updateConcurrencyProperties(entities) {
            var candidates = entities.filter(function (e) {
                e.entityAspect.isBeingSaved = true;
                return e.entityAspect.entityState.isModified()
                    && e.entityType.concurrencyProperties.length > 0;

            });
            if (candidates.length === 0) return;
            candidates.forEach(function (c) {
                c.entityType.concurrencyProperties.forEach(function (cp) {
                    updateConcurrencyProperty(c, cp);
                });
            });
        }

        function updateConcurrencyProperty(entity, property) {
            // check if property has already been updated 
            if (entity.entityAspect.originalValues[property.name]) return;
            var value = entity.getProperty(property.name);
            if (!value) value = property.dataType.defaultValue;
            if (property.dataType.isNumeric) {
                entity.setProperty(property.name, value + 1);
            } else if (property.dataType === DataType.DateTime) {
                // use the current datetime but insure that it
                // is different from previous call.
                var dt = new Date();
                var dt2 = new Date();
                while (dt == dt2) {
                    dt2 = new Date();
                }
                entity.setProperty(property.name, dt2);
            } else if (property.dataType === DataType.Guid) {
                entity.setProperty(property.name, core.getUuid());
            } else if (property.datatype === DataType.Binary) {
                // best guess - that this is a timestamp column and is computed on the server during save 
                // - so no need to set it here.
                return;
            } else {
                // this just leaves DataTypes of Boolean, String and Byte - none of which should be the
                // type for a concurrency column.
                // NOTE: thought about just returning here but would rather be safe for now. 
                throw new Error("Unable to update the value of concurrency property before saving: " + property.name);
            }
        }

        function toOdataQueryString(query, metadataStore) {
            if (!query) {
                throw new Error("query cannot be empty");
            }
            if (typeof query === 'string') {
                return query;
            } else if (query instanceof EntityQuery) {
                return query._toUri(metadataStore);
            } else {
                throw new Error("unable to recognize query parameter as either a string or an EntityQuery");
            }
        }

        function findOrCreateEntityGroup(em, entityType) {
            var group = em._entityGroupMap[entityType.name];
            if (!group) {
                group = new EntityGroup(em, entityType);
                em._entityGroupMap[entityType.name] = group;
            }
            return group;
        }
        
        function unwrapEntities(entities, metadataStore) {
            var rawEntities = entities.map(function(e) {
                var rawEntity = { };
                e.entityType.dataProperties.forEach(function(dp) {
                    rawEntity[dp.nameOnServer] = e.getProperty(dp.name);
                });
                var autoGeneratedKey = null;
                if (e.entityType.autoGeneratedKeyType !== AutoGeneratedKeyType.None) {
                    autoGeneratedKey = {
                        propertyName: e.entityType.keyProperties[0].nameOnServer,
                        autoGeneratedKeyType: e.entityType.autoGeneratedKeyType.name
                    };
                }
                
                var originalValuesOnServer = e.entityType._clientObjectToServer(e.entityAspect.originalValues);
                rawEntity.entityAspect = {
                    entityTypeName: e.entityType.name,
                    entityState: e.entityAspect.entityState.name,
                    originalValuesMap: originalValuesOnServer,
                    autoGeneratedKey: autoGeneratedKey
                };
                return rawEntity;
            });
            return rawEntities;
        }

        function UnattachedChildrenMap() {
            // key is EntityKey.toString(), value is array of { navigationProperty, children }
            this.map = {};
        }

        UnattachedChildrenMap.prototype.addChild = function (parentEntityKey, navigationProperty, child) {
            var tuple = this.getTuple(parentEntityKey, navigationProperty);
            if (!tuple) {
                var tuples = this.map[parentEntityKey.toString()];
                if (!tuples) {
                    tuples = [];
                    this.map[parentEntityKey.toString()] = tuples;
                }
                tuple = { navigationProperty: navigationProperty, children: [] };
                tuples.push(tuple);
            }
            tuple.children.push(child);
        };

        UnattachedChildrenMap.prototype.removeChildren = function (parentEntityKey, navigationProperty) {
            var tuples = this.map[parentEntityKey.toString()];
            if (!tuples) return;
            core.arrayRemoveItem(tuples, function (t) {
                return t.navigationProperty === navigationProperty;
            });
            if (!tuples.length) {
                delete this.map[parentEntityKey.toString()];
            }
        };

        UnattachedChildrenMap.prototype.getChildren = function (parentEntityKey, navigationProperty) {
            var tuple = this.getTuple(parentEntityKey, navigationProperty);
            if (tuple) {
                return tuple.children;
            } else {
                return null;
            }
        };

        UnattachedChildrenMap.prototype.getTuple = function (parentEntityKey, navigationProperty) {
            var tuples = this.map[parentEntityKey.toString()];
            if (!tuples) return null;
            var tuple = core.arrayFirst(tuples, function (t) {
                return t.navigationProperty === navigationProperty;
            });
            return tuple;
        };

        return ctor;
    })();

    var EntityGroup = (function () {

        var __changedFilter = getFilter([EntityState.Added, EntityState.Modified, EntityState.Deleted]);
        
        var ctor = function (entityManager, entityType) {
            this.entityManager = entityManager;
            this.entityType = entityType;
            this._indexMap = {};
            this._entities = [];
            this._emptyIndexes = [];
        };

        ctor.prototype.attachEntity = function (entity, entityState) {
            // entity should already have an aspect.
            var ix;
            var aspect = entity.entityAspect;
            var keyInGroup = aspect.getKey()._keyInGroup;
            ix = this._indexMap[keyInGroup];
            if (ix >= 0) {
                if (this._entities[ix] === entity) {
                    return entity;
                }
                throw new Error("This key is already attached: " + aspect.getKey());
            }

            if (this._emptyIndexes.length === 0) {
                ix = this._entities.push(entity) - 1;
            } else {
                ix = this._emptyIndexes.pop();
                this._entities[ix] = entity;
            }
            this._indexMap[keyInGroup] = ix;
            aspect.entityState = entityState;
            aspect.entityGroup = this;
            aspect.entityManager = this.entityManager;
            return entity;
        };

        ctor.prototype.detachEntity = function (entity) {
            // by this point we have already determined that this entity 
            // belongs to this group.
            var aspect = entity.entityAspect;
            var keyInGroup = aspect.getKey()._keyInGroup;
            var ix = this._indexMap[keyInGroup];
            if (ix === undefined) {
                // shouldn't happen.
                throw new Error("internal error - entity cannot be found in group");
            }
            delete this._indexMap[keyInGroup];
            this._emptyIndexes.push(ix);
            this._entities[ix] = null;
            aspect.entityState = EntityState.Detached;
            aspect.entityGroup = null;
            aspect.entityManager = null;
            return entity;
        };
        


        // returns entity based on an entity key defined either as an array of key values or an EntityKey
        ctor.prototype.findEntityByKey = function (entityKey) {
            var keyInGroup;
            if (entityKey instanceof EntityKey) {
                keyInGroup = entityKey._keyInGroup;
            } else {
                keyInGroup = EntityKey.createKeyString(entityKey);
            }
            var ix = this._indexMap[keyInGroup];
            // can't use just (ix) below because 0 is valid
            return (ix !== undefined) ? this._entities[ix] : null;
        };

        ctor.prototype.hasChanges = function() {
            return this._entities.some(__changedFilter);
        };

        ctor.prototype.getEntities = function (entityStates) {
            var filter = getFilter(entityStates);
            var changes = this._entities.filter(filter);
            return changes;
        };
        
        // do not expose this method. It is doing a special purpose INCOMPLETE fast detach operation
        // just for the entityManager clear method - the entityGroup will be in an inconsistent state
        // after this op, which is ok because it will be thrown away.
        ctor.prototype._clear = function() {
            this._entities.forEach(function(entity) {
                var aspect = entity.entityAspect;
                aspect.entityState = EntityState.Detached;
                aspect.entityGroup = null;
                aspect.entityManager = null;
            });
        };

        ctor.prototype._fixupKey = function (tempValue, realValue) {
            // single part keys appear directly in map
            var ix = this._indexMap[tempValue];
            if (ix === undefined) {
                throw new Error("Internal Error in key fixup - unable to locate entity");
            }
            var entity = this._entities[ix];
            var keyPropName = entity.entityType.keyProperties[0].name;
            // fks on related entities will automatically get updated by this as well
            entity.setProperty(keyPropName, realValue);
            delete entity.entityAspect.hasTempKey;
            delete this._indexMap[tempValue];
            this._indexMap[realValue] = ix;
        };

        ctor.prototype._replaceKey = function(oldKey, newKey) {
            var ix = this._indexMap[oldKey._keyInGroup];
            delete this._indexMap[oldKey._keyInGroup];
            this._indexMap[newKey._keyInGroup] = ix;
        };
        
        function getFilter(entityStates) {
            var filter;
            if (!entityStates) {
                return function (e) {
                    return !!e;
                };
            } else if (entityStates.length === 1) {
                var entityState = entityStates[0];
                return function (e) {
                    if (!e) return false;
                    return e.entityAspect.entityState === entityState;
                };
            } else {
                return function (e) {
                    if (!e) return false;
                    return entityStates.some(function (es) {
                        return e.entityAspect.entityState === es;
                    });
                };
            }
        }

        return ctor;

    })();

    /**
    MergeStrategy is an 'Enum' that determines how entities are merged into an EntityManager.

    @class MergeStrategy
    @static
    **/
    var MergeStrategy = new Enum("MergeStrategy");
    /**
    PreserveChanges is used to stop merging from occuring if the existing entity in an entityManager is already
    in a {{#crossLink "EntityState/Modified"}}{{/crossLink}} state. In this case, the existing entity in the 
    EntityManager is not replaced by the 'merging' entity.

    @property PreserveChanges {MergeStrategy}
    @final
    @static
    **/
    MergeStrategy.PreserveChanges = MergeStrategy.addSymbol();
    /**
    OverwriteChanges is used to allow merging to occur even if the existing entity in an entityManager is already
    in a {{#crossLink "EntityState/Modified"}}{{/crossLink}} state. In this case, the existing entity in the 
    EntityManager is replaced by the 'merging' entity.

    @property OverwriteChanges {MergeStrategy}
    @final
    @static
    **/
    MergeStrategy.OverwriteChanges = MergeStrategy.addSymbol();
    MergeStrategy.seal();

    /**
    FetchStrategy is an 'Enum' that determines how and where entities are retrieved from as a result of a query.

    @class FetchStrategy
    @static
    **/
    var FetchStrategy = new Enum("FetchStrategy");
    /**
    FromServer is used to tell the query to execute the query against a remote data source on the server.
    @property FromServer {MergeStrategy}
    @final
    @static
    **/
    FetchStrategy.FromServer = FetchStrategy.addSymbol();
    /**
    FromLocalCache is used to tell the query to execute the query against a local EntityManager instead of going to a remote server.
    @property FromLocalCache {MergeStrategy}
    @final
    @static
    **/
    FetchStrategy.FromLocalCache = FetchStrategy.addSymbol();
    FetchStrategy.seal();


    var QueryOptions = (function () {
        /**
        A QueryOptions instance is used to specify the 'options' under which a query will occur.

        @class QueryOptions
        **/
        
        /**
        QueryOptions constructor
        @example
            var newQo = new QueryOptions( { mergeStrategy: MergeStrategy.OverwriteChanges });
            // assume em1 is a preexisting EntityManager
            em1.setProperties( { queryOptions: newQo });
        @method <ctor> QueryOptions
        @param [config] {Object}
        @param [config.fetchStrategy=FetchStrategy.FromServer] {FetchStrategy}  
        @param [config.mergeStrategy=MergeStrategy.PreserveChanges] {MergeStrategy}  
        **/
        var ctor = function (config) {
            this.fetchStrategy = FetchStrategy.FromServer;
            this.mergeStrategy = MergeStrategy.PreserveChanges;
            updateWithConfig(this, config);
        };
        
     

        /**
        A {{#crossLink "FetchStrategy"}}{{/crossLink}}
        __readOnly__
        @property fetchStrategy {FetchStrategy}
        **/

        /**
        A {{#crossLink "MergeStrategy"}}{{/crossLink}}
        __readOnly__
        @property mergeStrategy {MergeStrategy}
        **/

        ctor.prototype._$typeName = "QueryOptions";

        /**
        The default value whenever QueryOptions are not specified.
        @property defaultInstance {QueryOptions}
        @static
        **/
        ctor.defaultInstance = new ctor();

        /**
        Returns a copy of this QueryOptions with the specified {{#crossLink "MergeStrategy"}}{{/crossLink}} 
        or {{#crossLink "FetchStrategy"}}{{/crossLink}} applied.
        @example
            var queryOptions = em1.defaultQueryOptions.using(MergeStrategy.PreserveChanges);
        or
        @example
            var queryOptions = em1.defaultQueryOptions.using(FetchStrategy.FromLocalCache);
        or
        @example
            var queryOptions = em1.defaultQueryOptions.using( { mergeStrategy: OverwriteChanges });
        @method using
        @param config {Configuration Object|MergeStrategy|FetchStrategy} The object to apply to create a new QueryOptions.
        @return {QueryOptions}
        @chainable
        **/
        ctor.prototype.using = function(config) {
            var result = new QueryOptions(this);
            if (MergeStrategy.contains(config)) {
                config = { mergeStrategy: config };
            } else if (FetchStrategy.contains(config)) {
                config = { fetchStrategy: config };
            } 
            return updateWithConfig(result, config);
        };
        
        /**
        Makes this instance the default instance.
        @method setAsDefault
        @example
            var newQo = new QueryOptions( { mergeStrategy: MergeStrategy.OverwriteChanges });
            newQo.setAsDefault();
        @chainable
        **/
        ctor.prototype.setAsDefault = function() {
            ctor.defaultInstance = this;
            return this;
        };

        ctor.prototype.toJSON = function () {
            return {
                fetchStrategy: this.fetchStrategy.name,
                mergeStrategy: this.mergeStrategy.name
            };
        };

        ctor.fromJSON = function (json) {
            return new QueryOptions({
                fetchStrategy: FetchStrategy.fromName(json.fetchStrategy),
                mergeStrategy: MergeStrategy.fromName(json.mergeStrategy)
            });
        };
        
        function updateWithConfig( obj, config ) {
            if (config) {
                assertConfig(config)
                    .whereParam("fetchStrategy").isEnumOf(FetchStrategy).isOptional()
                    .whereParam("mergeStrategy").isEnumOf(MergeStrategy).isOptional()
                    .applyAll(obj);
            }
            return obj;
        }
       
        return ctor;
    })();

    var SaveOptions = (function () {
        /**
        A SaveOptions instance is used to specify the 'options' under which a save will occur.

        @class SaveOptions
        **/
        
        /**
        @method <ctor> SaveOptions
        @param config {Object}
        @param [config.allowConcurrentSaves] {Boolean}
        **/
        var ctor = function (config) {
            config = config || {};
            assertConfig(config)
                .whereParam("allowConcurrentSaves").isBoolean().isOptional().withDefault(false)
                .applyAll(this);
                        
        };
        ctor.prototype._$typeName = "SaveOptions";
        
        /**
        Makes this instance the default instance.
        @method setAsDefault
        @chainable
        **/
        ctor.prototype.setAsDefault = function() {
            ctor.defaultInstance = this;
            return this;
        };
        
        /**
        Whether another save can be occuring at the same time as this one - default is false.

        __readOnly__
        @property allowConcurrentSaves {Boolean}
        **/

        /**
        The default value whenever SaveOptions are not specified.
        @property defaultInstance {SaveOptions}
        @static
        **/
        ctor.defaultInstance = new ctor();
        return ctor;
    })();

    var ValidationOptions = (function () {

        /**
        A ValidationOptions instance is used to specify the conditions under which validation will be executed.

        @class ValidationOptions
        **/
        
        /**
        ValidationOptions constructor
        @example
            var newVo = new ValidationOptions( { validateOnSave: false, validateOnAttach: false });
            // assume em1 is a preexisting EntityManager
            em1.setProperties( { validationOptions: newVo });
        @method <ctor> ValidationOptions
        @param [config] {Object}
        @param [config.validateOnAttach=true] {Boolean}
        @param [config.validateOnSave=true] {Boolean}
        @param [config.validateOnQuery=false] {Boolean}
        @param [config.validateOnPropertyChange=true] {Boolean}
        **/
        var ctor = function (config) {
            this.validateOnAttach = true;
            this.validateOnSave = true;
            this.validateOnQuery = false;
            this.validateOnPropertyChange = true;
            updateWithConfig(this, config);
        };

        /**
        Whether entity and property level validation should occur when entities are attached to the EntityManager other than via a query.

        __readOnly__
        @property validateOnAttach {Boolean}
        **/

        /**
        Whether entity and property level validation should occur before entities are saved. A failed validation will force the save to fail early.

        __readOnly__
        @property validateOnSave {Boolean}
        **/

        /**
        Whether entity and property level validation should occur after entities are queried from a remote server.

        __readOnly__
        @property validateOnQuery {Boolean}
        **/

        /**
        Whether property level validation should occur after entities are modified.

        __readOnly__
        @property validateOnPropertyChange {Boolean}
        **/

        ctor.prototype._$typeName = "ValidationOptions";
        
        /**
        Returns a copy of this ValidationOptions with changes to the specified config properties.
        @example
            var validationOptions = new ValidationOptions();
            var newOptions = validationOptions.using( { validateOnQuery: true, validateOnSave: false} );
        @method using
        @param config {Object} The object to apply to create a new QueryOptions.
        @param [config.validateOnAttach] {Boolean}
        @param [config.validateOnSave] {Boolean}
        @param [config.validateOnQuery] {Boolean}
        @param [config.validateOnPropertyChange] {Boolean}
        @return {ValidationOptions}
        @chainable
        **/
        ctor.prototype.using = function(config) {
            var result = new ValidationOptions(this);
            updateWithConfig(result, config);
            return result;
        };

        /**
        Makes this instance the default instance.
        @example
            var validationOptions = new ValidationOptions()
            var newOptions = validationOptions.using( { validateOnQuery: true, validateOnSave: false} );
            var newOptions.setAsDefault();
        @method setAsDefault
        @chainable
        **/
        ctor.prototype.setAsDefault = function() {
            ctor.defaultInstance = this;
            return this;
        };

        /**
        The default value whenever ValidationOptions are not specified.
        @property defaultInstance {ValidationOptions}
        @static
        **/
        ctor.defaultInstance = new ctor();
        
        function updateWithConfig( obj, config ) {
            if (config) {
              assertConfig(config)
                .whereParam("validateOnAttach").isBoolean().isOptional()
                .whereParam("validateOnSave").isBoolean().isOptional()
                .whereParam("validateOnQuery").isBoolean().isOptional()
                .whereParam("validateOnPropertyChange").isBoolean().isOptional()
                .applyAll(obj);
            }
            return obj;
        }
        return ctor;
    })();

    // Extensions to the EntityQuery class - must be done here because some of the types used are not yet avail
    // when the EntityQuery file is processed.

    EntityQuery.prototype.using = function(obj) {
        var eq = this._clone();
        if (obj instanceof EntityManager) {
            eq.entityManager = obj;
        } else if (MergeStrategy.contains(obj) || FetchStrategy.contains(obj)) {
            var queryOptions = this.queryOptions || QueryOptions.defaultInstance;
            eq.queryOptions = queryOptions.using(obj);
        } else {
            throw new Error("EntityQuery.using parameter must be either an EntityManager, a Query Strategy or a FetchStrategy");
        }
        return eq;
    };

    EntityQuery.prototype.execute = function(callback, errorCallback) {
        if (!this.entityManager) {
            throw new Error("An EntityQuery must have its EntityManager property set before calling 'execute'");
        }
        return this.entityManager.executeQuery(this, callback, errorCallback);
    };
    
    EntityQuery.prototype.executeLocally = function() {
        if (!this.entityManager) {
            throw new Error("An EntityQuery must have its EntityManager property set before calling 'executeLocally'");
        }
        return this.entityManager.executeQueryLocally(this);
    };

    // expose

    return {
        EntityManager: EntityManager,
        QueryOptions: QueryOptions,
        SaveOptions: SaveOptions,
        ValidationOptions: ValidationOptions,
        FetchStrategy: FetchStrategy,
        MergeStrategy: MergeStrategy
    };


});





define('breeze',["core", "config", "entityAspect", "entityMetadata", "entityManager", "entityQuery", "validate", "relationArray", "keyGenerator"],
function (core, a_config, m_entityAspect, m_entityMetadata, m_entityManager, m_entityQuery, m_validate, makeRelationArray, KeyGenerator) {
          
    var breeze = {
        version: "0.75.1",
        core: core,
        config: a_config
    };
    core.parent = breeze;

    core.extend(breeze, m_entityAspect);
    core.extend(breeze, m_entityMetadata);
    core.extend(breeze, m_entityManager);
    core.extend(breeze, m_entityQuery);
    core.extend(breeze, m_validate);

    breeze.makeRelationArray = makeRelationArray;
    breeze.KeyGenerator = KeyGenerator;

    // legacy properties 
    core.config = a_config;
    breeze.entityModel = breeze;
    // legacy properties - will not be supported after 3/1/2013
    breeze.entityTracking_backingStore = "backingStore";
    breeze.entityTracking_ko = "ko";
    breeze.entityTracking_backbone = "backbone";
    breeze.remoteAccess_odata = "odata";
    breeze.remoteAccess_webApi = "webApi";
    
    return breeze;
});

// needs JQuery
(function(factory) {
    // Module systems magic dance.

    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define('breeze.ajax.jQuery',["breeze"], factory);
    } else {
        // <script> tag: use the global `breeze` object
        factory(breeze);
    }
}(function(breeze) {
    var core = breeze.core;
    
    var jQuery;
    
    var ctor = function () {
        this.name = "jQuery";
        this.defaultSettings = { };
    };

    ctor.prototype.initialize = function () {
        jQuery = core.requireLib("jQuery", "needed for 'ajax_jQuery' pluggin");
    };

    ctor.prototype.ajax = function (settings) {
        if (!core.isEmpty(this.defaultSettings)) {
            var compositeSettings = core.extend({}, this.defaultSettings);
            core.extend(compositeSettings, settings);
            jQuery.ajax(compositeSettings);
        } else {
            jQuery.ajax(settings);
        }
    };

    
    // last param is true because for now we only have one impl.
    breeze.config.registerAdapter("ajax", ctor);
    
}));

(function(factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define('breeze.dataService.webApi',["breeze"], factory);
    } else {
        // <script> tag: use the global `breeze` object
        factory(breeze);
    }    
}(function(breeze) {
    
    var core = breeze.core;

    var EntityType = breeze.EntityType;

    
    var ajaxImpl;
    
    var ctor = function () {
        this.name = "webApi";
    };

    ctor.prototype.checkForRecomposition = function (interfaceInitializedArgs) {
        if (interfaceInitializedArgs.interfaceName === "ajax" && interfaceInitializedArgs.isDefault) {
            this.initialize();
        }
    };
    
    ctor.prototype.initialize = function () {
        ajaxImpl = breeze.config.getAdapterInstance("ajax");

        if (!ajaxImpl) {
            throw new Error("Unable to initialize ajax for WebApi.");
        }

        // don't cache 'ajax' because we then we would need to ".bind" it, and don't want to because of brower support issues. 
        var ajax = ajaxImpl.ajax;
        if (!ajax) {
            throw new Error("Breeze was unable to find an 'ajax' adapter");
        }
    };

    ctor.prototype.fetchMetadata = function (metadataStore, serviceName, callback, errorCallback) {
        var metadataSvcUrl = getMetadataUrl(serviceName);
        ajaxImpl.ajax({
            url: metadataSvcUrl,
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {
                // jQuery.getJSON(metadataSvcUrl).done(function (data, textStatus, jqXHR) {
                var metadata = JSON.parse(data);
                if (!metadata) {
                    if (errorCallback) errorCallback(new Error("Metadata query failed for: " + metadataSvcUrl));
                    return;
                }
                // setProperties metadataStore    
                // if from Edmx
                var schema = metadata.schema;
                if (!schema) {
                    // if from DbContext 
                    schema = metadata.conceptualModels.schema;
                    if (!schema) {
                        if (errorCallback) errorCallback(new Error("Metadata query failed for " + metadataSvcUrl + "; Unable to locate 'schema' member in metadata"));
                        return;
                    }
                }
                metadataStore._parseODataMetadata(serviceName, schema);
                if (callback) {
                    callback(schema);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                var err = createError(jqXHR);
                err.message = "Metadata query failed for: " + metadataSvcUrl + "; " + (err.message || "");
                if (errorCallback) errorCallback(err);
            }
        });
    };

    ctor.prototype.executeQuery = function (entityManager, odataQuery, collectionCallback, errorCallback) {

        var url = entityManager.serviceName + odataQuery;
        ajaxImpl.ajax({
            url: url,
            dataType: 'json',
            success: function(data, textStatus, XHR) {
                // jQuery.getJSON(url).done(function (data, textStatus, jqXHR) {
                // TODO: check response object here for possible errors.
                try {
                    var inlineCount = XHR.getResponseHeader("X-InlineCount");

                    if (inlineCount) {
                        inlineCount = parseInt(inlineCount, 10);
                    }
                    collectionCallback({ results: data, XHR: XHR, inlineCount: inlineCount });
                } catch(e) {
                    var error = createError(XHR);
                    error.internalError = e;
                    // needed because it doesn't look like jquery calls .fail if an error occurs within the function
                    if (errorCallback) errorCallback(error);
                }
            },
            error: function(XHR, textStatus, errorThrown) {
                if (errorCallback) errorCallback(createError(XHR));
            }
        });
    };

    ctor.prototype.saveChanges = function (entityManager, saveBundleStringified, callback, errorCallback) {
        var url = entityManager.serviceName + "SaveChanges";
        ajaxImpl.ajax({
            url: url,
            type: "POST",
            contentType: "application/json",
            data: saveBundleStringified,
            success: function(data, textStatus, jqXHR) {
                if (data.Error) {
                    // anticipatable errors on server - concurrency...
                    var err = createError(jqXHR);
                    err.message = data.Error;
                    errorCallback(err);
                } else {
                    data.XHR = jqXHR;
                    callback(data);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                if (errorCallback) errorCallback(createError(jqXHR));
            }
        });
    };

    // will return null if anon
    ctor.prototype.getEntityType = function (rawEntity, metadataStore) {
        // TODO: may be able to make this more efficient by caching of the previous value.
        var entityTypeName = EntityType._getNormalizedTypeName(rawEntity["$type"]);
        return entityTypeName && metadataStore.getEntityType(entityTypeName, true);
    };

    //impl.getEntityTypeName = function (rawEntity) {
    //    return EntityType._getNormalizedTypeName(rawEntity["$type"]);
    //};

    ctor.prototype.getDeferredValue = function (rawEntity) {
        // there are no deferred entries in the web api.
        return false;
    };

    ctor.prototype.resolveRefEntity = function (rawEntity, queryContext) {
        var id = rawEntity['$ref'];
        if (id) {
            var entity = queryContext.refMap[id];
            if (entity === undefined) {
                return function () { return queryContext.refMap[id]; };
            } else {
                return entity;
            }
        }

        queryContext.refId = rawEntity['$id'];
    };


    function getMetadataUrl(serviceName) {
        var metadataSvcUrl = serviceName;
        // remove any trailing "/"
        if (core.stringEndsWith(metadataSvcUrl, "/")) {
            metadataSvcUrl = metadataSvcUrl.substr(0, metadataSvcUrl.length - 1);
        }
        // ensure that it ends with /Metadata 
        if (!core.stringEndsWith(metadataSvcUrl, "/Metadata")) {
            metadataSvcUrl = metadataSvcUrl + "/Metadata";
        }
        return metadataSvcUrl;

    };

    function createError(jqXHR) {
        var err = new Error();
        err.XHR = jqXHR;
        err.message = jqXHR.statusText;
        err.responseText = jqXHR.responseText;
        err.status = jqXHR.status;
        err.statusText = jqXHR.statusText;
        if (err.responseText) {
            try {
                var responseObj = JSON.parse(jqXHR.responseText);
                err.detail = responseObj;
                if (responseObj.ExceptionMessage) {
                    err.message = responseObj.ExceptionMessage;
                } else if (responseObj.InnerException) {
                    err.message = responseObj.InnerException.Message;
                } else if (responseObj.Message) {
                    err.message = responseObj.Message;
                } else {
                    err.message = jqXHR.responseText;
                }
            } catch (e) {

            }
        }
        return err;
    }
    
    breeze.config.registerAdapter("dataService", ctor);

}));
(function (factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define('breeze.dataService.odata',["breeze"], factory);
    } else {
        // <script> tag: use the global `breeze` object
        factory(breeze);
    }
}(function(breeze) {
    
    var core = breeze.core;
 
    var EntityType = breeze.EntityType;
    
    var OData;
    
    var ctor = function () {
        this.name = "OData";
    };

    ctor.prototype.initialize = function () {
        OData = core.requireLib("OData", "Needed to support remote OData services");
        OData.jsonHandler.recognizeDates = true;
    };
    
    // will return null if anon
    ctor.prototype.getEntityType = function (rawEntity, metadataStore) {
        // TODO: may be able to make this more efficient by caching of the previous value.
        var entityTypeName = EntityType._getNormalizedTypeName(rawEntity.__metadata.type);
        var entityType = entityTypeName && metadataStore.getEntityType(entityTypeName, true);
        var isFullEntity = entityType && entityType._mappedPropertiesCount === Object.keys(rawEntity).length - 1;
        return isFullEntity ? entityType : null;
    };


    ctor.prototype.executeQuery = function (entityManager, odataQuery, collectionCallback, errorCallback) {
        var url = entityManager.serviceName + odataQuery;
        OData.read(url,
            function (data, response) {
                collectionCallback({ results: data.results, inlineCount: data.__count });
            },
            function (error) {
                if (errorCallback) errorCallback(createError(error));
            }
        );
    };
    
 
    ctor.prototype.getDeferredValue = function (rawEntity) {
        return rawEntity['__deferred'];
    };

    ctor.prototype.resolveRefEntity = function (rawEntity, queryContext) {
        var id = rawEntity['__deferred'];
        if (id) {
            return null;
        } else {
            return undefined;
        }
    };

    ctor.prototype.fetchMetadata = function (metadataStore, serviceName, callback, errorCallback) {
        var metadataSvcUrl = getMetadataUrl(serviceName);
        OData.read(metadataSvcUrl,
            function (data) {
                // data.dataServices.schema is an array of schemas. with properties of 
                // entityContainer[], association[], entityType[], and namespace.
                if (!data || !data.dataServices) {
                    var error = new Error("Metadata query failed for: " + metadataSvcUrl);
                    if (onError) {
                        onError(error);
                    } else {
                        callback(error);
                    }
                }
                var schema = data.dataServices.schema;
                metadataStore._parseODataMetadata(serviceName, schema);
                if (callback) {
                    callback(schema);
                }
            }, function (error) {
                var err = createError(error);
                err.message = "Metadata query failed for: " + metadataSvcUrl + "; " + (err.message || "");
                if (errorCallback) errorCallback(err);
            },
            OData.metadataHandler
        );

    };

    ctor.prototype.saveChanges = function (entityManager, saveBundleStringified, callback, errorCallback) {
        throw new Error("Breeze does not yet support saving thru OData");
    };

    function getMetadataUrl(serviceName) {
        var metadataSvcUrl = serviceName;
        // remove any trailing "/"
        if (core.stringEndsWith(metadataSvcUrl, "/")) {
            metadataSvcUrl = metadataSvcUrl.substr(0, metadataSvcUrl.length - 1);
        }
        // ensure that it ends with /$metadata 
        if (!core.stringEndsWith(metadataSvcUrl, "/$metadata")) {
            metadataSvcUrl = metadataSvcUrl + "/$metadata";
        }
        return metadataSvcUrl;
    };

    function createError(error) {
        var err = new Error();
        var response = error.response;
        err.message = response.statusText;
        err.statusText = response.statusText;
        err.status = response.statusCode;
        // non std
        err.body = response.body;
        err.requestUri = response.requestUri;
        if (response.body) {
            try {
                var responseObj = JSON.parse(response.body);
                err.detail = responseObj;
                err.message = responseObj.error.message.value;
            } catch (e) {

            }
        }
        return err;
    }

    breeze.config.registerAdapter("dataService", ctor);

}));


(function (factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define('breeze.modelLibrary.backingStore',["breeze"], factory);
    } else {
        // <script> tag: use the global `breeze` object
        factory(breeze);
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
            if (p === "_$typeName") continue;
            var val = entity[p];
            if (!core.isFunction(val)) {
                names.push(p);
            }
        }
        return names;
    };

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

        // this method cannot be called while a 'defineProperty' accessor is executing
        // because of IE bug 
        proto.initializeFrom = function(rawEntity) {
            // copy unmapped properties from newly created client entity to the rawEntity.
            var that = this;
            this.entityType.unmappedProperties.forEach(function(prop) {
                var propName = prop.name;
                rawEntity[propName] = that[propName];
            });
            // this._backingStore = rawEntity;
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

    ctor.prototype.startTracking = function (entity, proto) {
        // can't touch the normal property sets within this method - access the backingStore directly instead. 
        proto._pendingSets.process();
        var bs = movePropsToBackingStore(entity);

        // assign default values to the entity
        entity.entityType.getProperties().forEach(function(prop) {
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
                    bs[propName] = breeze.makeRelationArray([], entity, prop);
                }
            } else {
                throw new Error("unknown property: " + propName);
            }
        });
    };


    // private methods

    function movePropDefsToProto(proto) {
        proto.entityType.getProperties().forEach(function(prop) {
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
            instance._backingStore = { };
        }
        proto.entityType.getProperties().forEach(function(prop) {
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
        var getAccessorFn = function(backingStore) {
            return function() {
                if (arguments.length == 0) {
                    return backingStore[propName];
                } else {
                    backingStore[propName] = arguments[0];
                }
            };
        };
        return {
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
    }

    breeze.config.registerAdapter("modelLibrary", ctor);

}));


(function (factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define('breeze.modelLibrary.ko',["breeze"], factory);
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
                        val = breeze.makeRelationArray([], entity, prop);
                        koObj = ko.observableArray(val);
                        // new code to suppress extra breeze notification when 
                        // ko's array methods are called.
                        koObj.subscribe(function(b) {
                            koObj._suppressBreeze = true;
                        }, null, "beforeChange");
                        // code to insure that any been changes notify ko
                        val.arrayChanged.subscribe(function(args) {
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

    breeze.config.registerAdapter("modelLibrary", ctor);
    
}));


(function (factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define('breeze.modelLibrary.backbone',["breeze"], factory);
    } else {
        // <script> tag: use the global `breeze` object
        factory(breeze);
    }
}(function(breeze) {
    
    var core = breeze.core;

    var Backbone;
    var _;
    
    var bbSet, bbGet;

    var ctor = function () {
        this.name = "backbone";
    };
   
    ctor.prototype.initialize = function() {
        Backbone = core.requireLib("Backbone");
        _ = core.requireLib("_;underscore");
        bbSet = Backbone.Model.prototype.set;
        bbGet = Backbone.Model.prototype.get;
    };

    ctor.prototype.createCtor = function(entityType) {
        var defaults = { };
        entityType.dataProperties.forEach(function(dp) {
            defaults[dp.name] = dp.defaultValue;
        });
        var modelCtor = Backbone.Model.extend({
            defaults: defaults,
            initialize: function() {
                var that = this;
                entityType.navigationProperties.forEach(function(np) {
                    if (!np.isScalar) {
                        var val = breeze.makeRelationArray([], that, np);
                        Backbone.Model.prototype.set.call(that, np.name, val);
                    }
                });
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
                prop = this.entityType.getProperty(key);
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

        //// called after any create during a query;
        //proto.initializeFrom = function (rawEntity) {
        //};

    };

    // called when the entityAspect is first created for an entity
    ctor.prototype.startTracking = function(entity, proto) {
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
    };

    breeze.config.registerAdapter("modelLibrary", ctor);

    // private methods

}));


define('breeze.full',["breeze",
        // all these are self registering
        "breeze.ajax.jQuery",
        "breeze.dataService.webApi", "breeze.dataService.odata",
        "breeze.modelLibrary.backingStore", "breeze.modelLibrary.ko", "breeze.modelLibrary.backbone"], 
function(breeze) {


    // set defaults
    breeze.config.initializeAdapterInstances({
        ajax: "jQuery",
        dataService: "webApi"
    });
    
    // don't initialize with ko unless it exists.
    var ko = window.ko;
    if ((!ko) && require) {
        ko = require("ko");
    }
    if (ko) {
        breeze.config.initializeAdapterInstance("modelLibrary", "ko");
    }
        
    return breeze;
});

    var breeze = requirejs('breeze');
    // If two instances are loaded last one sets window.breeze.
    this.window.breeze = breeze;
    return breeze;
}));