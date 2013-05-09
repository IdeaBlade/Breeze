/**
  @module breeze
  **/

var DataType = function () {
  
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
        // default
    };

    var coerceToString = function (source, sourceTypeName) {
        return (source == null) ? source : source.toString();
    };

    var coerceToInt = function (source, sourceTypeName) {
        if (sourceTypeName === "string") {
            var src = source.trim();
            if (src === "") return null;
            var val = parseInt(src, 10);
            return isNaN(val) ? source : val;
        } else if (sourceTypeName === "number") {
            return Math.round(source);
        }
        // do we want to coerce floats -> ints
        return source;
    };

    var coerceToFloat = function (source, sourceTypeName) {
        if (sourceTypeName === "string") {
            var src = source.trim();
            if (src === "") return null;
            var val = parseFloat(src);
            return isNaN(val) ? source : val;
        }
        return source;
    };

    var coerceToDate = function (source, sourceTypeName) {
        if (sourceTypeName === "string") {
            var src = source.trim();
            if (src === "") return null;
            var val = new Date(Date.parse(src));
            return __isDate(val) ? val : source;
        } else if (sourceTypeName === "number") {
            var val = new Date(source);
            return __isDate(val) ? val : source;
        }
        return source;
    };

    var coerceToBool = function (source, sourceTypeName) {
        if (sourceTypeName === "string") {
            var src = source.trim().toLowerCase();
            if (src === "false" || src ==="") {
                return false;
            } else if (src === "true") {
                return true;
            } else {
                return source;
            }
        } 
        return source;
    };

    var fmtString = function (val) {
        return val == null ? null : "'" + val + "'";
    };

    var fmtInt = function (val) {
        return val == null ? null : ((typeof val === "string") ? parseInt(val) : val);
    };

    var makeFloatFmt = function (fmtSuffix) {
        return function(val) {
            if (val == null) return null;
            if (typeof val === "string") {
                val = parseFloat(val);
            }
            return val + fmtSuffix;
        };
    };

    var fmtDateTime = function (val) {
        if (val == null) return null;
        try {
            return "datetime'" + val.toISOString() + "'";
        } catch (e) {
            throwError("'%1' is not a valid dateTime", val);
        }
    };

    var fmtDateTimeOffset = function (val) {
        if (val == null) return null;
        try {
            return "datetimeoffset'" + val.toISOString() + "'";
        } catch (e) {
            throwError("'%1' is not a valid dateTime", val);
        }
    };

    var fmtTime = function (val) {
        if (val == null) return null;
        if (!__isDuration(val)) {
            throwError("'%1' is not a valid ISO 8601 duration", val);
        }
        return "time'" + val + "'";
    };

    var fmtGuid = function (val) {
        if (val == null) return null;
        if (!__isGuid(val)) {
            throwError("'%1' is not a valid guid", val);
        }
        return "guid'" + val + "'";
    };

    var fmtBoolean = function (val) {
        if (val == null) return null;
        if (typeof val === "string") {
            return val.trim().toLowerCase() === "true";
        } else {
            return !!val;
        }
    };
    
    var fmtBinary = function (val) {
        if (val == null) return val;
        return "binary'" + val + "'";
    };

    var fmtUndefined = function (val) {
        return val;
    };

    function throwError(msg, val) {
        msg = __formatString(msg, val);
        throw new Error(msg);
    }
    
    var DataType = new Enum("DataType", dataTypeMethods);
    
    
    /**
    @property String {DataType}
    @final
    @static
    **/
    DataType.String = DataType.addSymbol({ defaultValue: "", parse: coerceToString, fmtOData: fmtString });
    /**
    @property Int64 {DataType}
    @final
    @static
    **/
    DataType.Int64 = DataType.addSymbol({ defaultValue: 0, isNumeric: true, isInteger: true, parse: coerceToInt, fmtOData: fmtInt, quoteJsonOData: true });
    /**
    @property Int32 {DataType}
    @final
    @static
    **/
    DataType.Int32 = DataType.addSymbol({ defaultValue: 0, isNumeric: true, isInteger: true, parse: coerceToInt, fmtOData: fmtInt });
    /**
    @property Int16 {DataType}
    @final
    @static
    **/
    DataType.Int16 = DataType.addSymbol({ defaultValue: 0, isNumeric: true, isInteger: true, parse: coerceToInt, fmtOData: fmtInt });
    /**
    @property Byte {DataType}
    @final
    @static
    **/
    DataType.Byte = DataType.addSymbol({ defaultValue: 0, isNumeric: true, isInteger: true, parse: coerceToInt, fmtOData: fmtInt });
    /**
    @property Decimal {DataType}
    @final
    @static
    **/
    DataType.Decimal = DataType.addSymbol({ defaultValue: 0, isNumeric: true, parse: coerceToFloat, fmtOData: makeFloatFmt("m"), quoteJsonOData: true });
    /**
    @property Double {DataType}
    @final
    @static
    **/
    DataType.Double = DataType.addSymbol({ defaultValue: 0, isNumeric: true, parse: coerceToFloat, fmtOData: makeFloatFmt("d") });
    /**
    @property Single {DataType}
    @final
    @static
    **/
    DataType.Single = DataType.addSymbol({ defaultValue: 0, isNumeric: true, parse: coerceToFloat, fmtOData: makeFloatFmt("f") });
    /**
    @property DateTime {DataType}
    @final
    @static
    **/
    DataType.DateTime = DataType.addSymbol({ defaultValue: new Date(1900, 0, 1), isDate: true, parse: coerceToDate, fmtOData: fmtDateTime });
    
    /**
    @property DateTimeOffset {DataType}
    @final
    @static
    **/
    DataType.DateTimeOffset = DataType.addSymbol({ defaultValue: new Date(1900, 0, 1), isDate: true, parse: coerceToDate, fmtOData: fmtDateTimeOffset });
    /**
    @property Time {DataType}
    @final
    @static
    **/
    DataType.Time = DataType.addSymbol({ defaultValue: "PT0S", fmtOData: fmtTime });
    /**
    @property Boolean {DataType}
    @final
    @static
    **/
    DataType.Boolean = DataType.addSymbol({ defaultValue: false, parse: coerceToBool, fmtOData: fmtBoolean });
    /**
    @property Guid {DataType}
    @final
    @static
    **/
    DataType.Guid = DataType.addSymbol({ defaultValue: "00000000-0000-0000-0000-000000000000", fmtOData: fmtGuid });
  
    /**
    @property Binary {DataType}
    @final
    @static
    **/
    DataType.Binary = DataType.addSymbol({ defaultValue: null, fmtOData: fmtBinary });
    /**
    @property Undefined {DataType}
    @final
    @static
    **/
    DataType.Undefined = DataType.addSymbol({ defaultValue: undefined , fmtOData: fmtUndefined});
    DataType.seal();

    /**
    Returns the DataType for a specified EDM type name.
    @method fromEdmDataType
    @static
    @param typeName {String}
    @return {DataType} A DataType.
    **/
    DataType.fromEdmDataType = function (typeName) {
        var dt = null;
        var parts = typeName.split(".");
        if (parts.length > 1) {
            var simpleName = parts[1];
            if (simpleName === "image") {
                // hack
                dt = DataType.Byte;
            } else if (parts.length == 2) {
                dt = DataType.fromName(simpleName) || DataType.Undefined;
            } else {
                // enum
                // dt = DataType.Int32;
                dt = DataType.String;
            }
        }

        return dt;
    };

    DataType.fromValue = function(val) {
        if (__isDate(val)) return DataType.DateTime;
        switch (typeof val) {
            case "string":
                if (__isGuid(val)) return DataType.Guid;
                else if (__isDuration(val)) return DataType.Time;
                return DataType.String;
            case "boolean":
                return DataType.Boolean;
            case "number":
                return DataType.Int32;
        }
        return DataType.Undefined;
    };
   
    var _localTimeRegex = /.\d{3}$/;

    DataType.parseDateAsUTC = function (source) {
        if (typeof source === 'string') {
            // convert to UTC string if no time zone specifier.
            var isLocalTime = _localTimeRegex.test(source);
            source = isLocalTime ? source + 'Z' : source;
        }
        source = new Date(Date.parse(source));
        return source;
    };

    // NOT YET NEEDED --------------------------------------------------
    // var _utcOffsetMs = (new Date()).getTimezoneOffset() * 60000;
    
    //DataType.parseDateAsLocal = function (source) {
    //    var dt = DataType.parseDatesAsUTC(source);
    //    if (__isDate(dt)) {
    //        dt = new Date(dt.getTime() + _utcOffsetMs);
    //    }
    //    return dt;
    //};
    // -----------------------------------------------------------------

    DataType.parseDateFromServer = DataType.parseDateAsUTC;

    DataType.getSymbols().forEach(function (sym) {
        sym.validatorCtor = getValidatorCtor(sym);
    });

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
            case DataType.DateTimeOffset:
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
            case DataType.Time:
                return Validator.duration;
            case DataType.Undefined:
                return Validator.none;
        }
    };

    return DataType;

}();

breeze.DataType = DataType;

