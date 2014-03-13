/**
  @module breeze
  **/

var DataType = (function () {
  
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

    var constants = {
        stringPrefix: "K_",
        nextNumber: -1,
        nextNumberIncrement: -1
    };

    var getNextString = function () {
        return constants.stringPrefix + getNextNumber().toString();
    };

    var getNextNumber = function () {
        var result = constants.nextNumber;
        constants.nextNumber += constants.nextNumberIncrement;
        return result;
    };

    var getNextGuid = function () {
        return __getUuid();
    };

    var getNextDateTime = function () {
        return new Date();
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
        var val;
        if (sourceTypeName === "string") {
            var src = source.trim();
            if (src === "") return null;
            val = new Date(Date.parse(src));
            return __isDate(val) ? val : source;
        } else if (sourceTypeName === "number") {
            val = new Date(source);
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
        return val == null ? null : "'" + val.replace(/'/g,"''") + "'";
    };

    var fmtInt = function (val) {
        return val == null ? null : ((typeof val === "string") ? parseInt(val, 10) : val);
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
    DataType.String = DataType.addSymbol({
        defaultValue: "",
        parse: coerceToString,
        fmtOData: fmtString,
        getNext: getNextString
    });
    /**
    @property Int64 {DataType}
    @final
    @static
    **/
    DataType.Int64 = DataType.addSymbol({
        defaultValue: 0, isNumeric: true, isInteger: true, quoteJsonOData: true,
        parse: coerceToInt,
        fmtOData: makeFloatFmt("L"),
        getNext: getNextNumber
    });
    /**
    @property Int32 {DataType}
    @final
    @static
    **/
    DataType.Int32 = DataType.addSymbol({
        defaultValue: 0, isNumeric: true, isInteger: true,
        parse: coerceToInt,
        fmtOData: fmtInt,
        getNext: getNextNumber
    });
    /**
    @property Int16 {DataType}
    @final
    @static
    **/
    DataType.Int16 = DataType.addSymbol({
        defaultValue: 0, isNumeric: true, isInteger: true,
        parse: coerceToInt,
        fmtOData: fmtInt,
        getNext: getNextNumber
    });
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
    DataType.Decimal = DataType.addSymbol({
        defaultValue: 0, isNumeric: true, quoteJsonOData: true, isFloat: true,
        parse: coerceToFloat,
        fmtOData: makeFloatFmt("m"),
        getNext: getNextNumber
    });
    /**
    @property Double {DataType}
    @final
    @static
    **/
    DataType.Double = DataType.addSymbol({
        defaultValue: 0, isNumeric: true, isFloat: true,
        parse: coerceToFloat,
        fmtOData: makeFloatFmt("d"),
        getNext: getNextNumber
    });
    /**
    @property Single {DataType}
    @final
    @static
    **/
    DataType.Single = DataType.addSymbol({
        defaultValue: 0, isNumeric: true, isFloat: true,
        parse: coerceToFloat,
        fmtOData: makeFloatFmt("f"),
        getNext: getNextNumber
    });
    /**
    @property DateTime {DataType}
    @final
    @static
    **/
    DataType.DateTime = DataType.addSymbol({
        defaultValue: new Date(1900, 0, 1), isDate: true,
        parse: coerceToDate,
        fmtOData: fmtDateTime,
        getNext: getNextDateTime
    });
    
    /**
    @property DateTimeOffset {DataType}
    @final
    @static
    **/
    DataType.DateTimeOffset = DataType.addSymbol({
        defaultValue: new Date(1900, 0, 1), isDate: true,
        parse: coerceToDate,
        fmtOData: fmtDateTimeOffset,
        getNext: getNextDateTime
    });
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
    DataType.Guid = DataType.addSymbol({
        defaultValue: "00000000-0000-0000-0000-000000000000",
        fmtOData: fmtGuid,
        getNext: getNextGuid
    });
  
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
            } else if (parts.length === 2) {
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
                // the >3 below is a hack to insure that if we are inferring datatypes that 
                // very short strings that are valid but unlikely ISO encoded Time's are treated as strings instead.
                else if (__isDuration(val) && val.length > 3) return DataType.Time;
                return DataType.String;
            case "boolean":
                return DataType.Boolean;
            case "number":
                return DataType.Int32;
        }
        return DataType.Undefined;
    };
   
    var _localTimeRegex = /.\d{3}$/;

    DataType.parseTimeFromServer = function (source) {
        if (typeof source === 'string') {
            return source;
        }
        // ODATA v3 format
        if (source && source.__edmType === 'Edm.Time') {
            var seconds = Math.floor(source.ms / 1000);
            return 'PT' + seconds + 'S';
        }
        return source;
    }

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

    DataType.parseRawValue = function(val, dataType) {
        // undefined values will be the default for most unmapped properties EXCEPT when they are set
        // in a jsonResultsAdapter ( an unusual use case).
        if (val === undefined) return undefined;
        if (dataType.isDate && val) {
            if (!__isDate(val)) {
                val = DataType.parseDateFromServer(val);
            }
        } else if (dataType === DataType.Binary) {
            if (val && val.$value !== undefined) {
                val = val.$value; // this will be a byte[] encoded as a string
            }
        } else if (dataType === DataType.Time) {
            val = DataType.parseTimeFromServer(val);
        }
        return val;
    }

    DataType.constants = constants;

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
    }

    return DataType;

})();

breeze.DataType = DataType;

