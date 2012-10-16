
define(["coreFns"], function (core) {
    "use strict";
    
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

})