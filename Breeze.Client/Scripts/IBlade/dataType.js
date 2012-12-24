
define(["core"],
function (core) {
    /**
    @module breeze
    **/

    var Enum = core.Enum;
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

    var coerceToString = function(source, sourceTypeName) {
        return source.toString();
    };

    var coerceToInt = function (source, sourceTypeName) {
        if (sourceTypeName === "string") {
            var val = parseInt(source, 10);
            return isNaN(val) ? source : val;
        }
        // do we want to coerce floats -> ints
        return source;
    };

    var coerceToFloat = function (source, sourceTypeName) {
        if (sourceTypeName === "string") {
            var val = parseFloat(source);
            return isNaN(val) ? source : val;
        }
        return source;
    };

    var coerceToDate = function (source, sourceTypeName) {
        if (sourceTypeName === "string" || sourceTypeName === "number") {
            var val = Date(source);
            return core.isDate(val) ? val : source;
        }
        return source;
    };

    var coerceToBool = function (source, sourceTypeName) {
        if (sourceTypeName === "string" || sourceTypeName === "number") {
            return !!source;
        } 
        return source;
    };

    var DataType = new Enum("DataType", dataTypeMethods);
    
    /**
    @property String {DataType}
    @final
    @static
    **/
    DataType.String = DataType.addSymbol({ defaultValue: "", parse: coerceToString });
    /**
    @property Int64 {DataType}
    @final
    @static
    **/
    DataType.Int64 = DataType.addSymbol({ defaultValue: 0, isNumeric: true, isInteger: true, parse: coerceToInt });
    /**
    @property Int32 {DataType}
    @final
    @static
    **/
    DataType.Int32 = DataType.addSymbol({ defaultValue: 0, isNumeric: true, isInteger: true, parse: coerceToInt });
    /**
    @property Int16 {DataType}
    @final
    @static
    **/
    DataType.Int16 = DataType.addSymbol({ defaultValue: 0, isNumeric: true, isInteger: true, parse: coerceToInt });
    /**
    @property Decimal {DataType}
    @final
    @static
    **/
    DataType.Decimal = DataType.addSymbol({ defaultValue: 0, isNumeric: true, parse: coerceToFloat });
    /**
    @property Double {DataType}
    @final
    @static
    **/
    DataType.Double = DataType.addSymbol({ defaultValue: 0, isNumeric: true, parse: coerceToFloat });
    /**
    @property Single {DataType}
    @final
    @static
    **/
    DataType.Single = DataType.addSymbol({ defaultValue: 0, isNumeric: true, parse: coerceToFloat });
    /**
    @property DateTime {DataType}
    @final
    @static
    **/
    DataType.DateTime = DataType.addSymbol({ defaultValue: new Date(1900, 0, 1), parse: coerceToDate });
    /**
    @property Boolean {DataType}
    @final
    @static
    **/
    DataType.Boolean = DataType.addSymbol({ defaultValue: false, parse: coerceToBool });
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



    return DataType;

});

