
define(["core", "validate"],
function (core, m_validate) {
    /**
    @module entityModel
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
    @property String {symbol}
    @final
    @static
    **/
    DataType.String = DataType.addSymbol({ defaultValue: "" });
    /**
    @property Int64 {symbol}
    @final
    @static
    **/
    DataType.Int64 = DataType.addSymbol({ defaultValue: 0, isNumeric: true });
    /**
    @property Int32 {symbol}
    @final
    @static
    **/
    DataType.Int32 = DataType.addSymbol({ defaultValue: 0, isNumeric: true });
    /**
    @property Int16 {symbol}
    @final
    @static
    **/
    DataType.Int16 = DataType.addSymbol({ defaultValue: 0, isNumeric: true });
    /**
    @property Decimal {symbol}
    @final
    @static
    **/
    DataType.Decimal = DataType.addSymbol({ defaultValue: 0, isNumeric: true });
    /**
    @property Double {symbol}
    @final
    @static
    **/
    DataType.Double = DataType.addSymbol({ defaultValue: 0, isNumeric: true });
    /**
    @property Single {symbol}
    @final
    @static
    **/
    DataType.Single = DataType.addSymbol({ defaultValue: 0, isNumeric: true });
    /**
    @property DateTime {symbol}
    @final
    @static
    **/
    DataType.DateTime = DataType.addSymbol({ defaultValue: Date.now() });
    /**
    @property Boolean {symbol}
    @final
    @static
    **/
    DataType.Boolean = DataType.addSymbol({ defaultValue: false });
    /**
    @property Guid {symbol}
    @final
    @static
    **/
    DataType.Guid = DataType.addSymbol({ defaultValue: "00000000-0000-0000-0000-000000000000" });
    /**
    @property Byte {symbol}
    @final
    @static
    **/
    DataType.Byte = DataType.addSymbol({ defaultValue: 0 });
    /**
    @property Binary {symbol}
    @final
    @static
    **/
    DataType.Binary = DataType.addSymbol({ defaultValue: null });
    /**
    @property Undefined {symbol}
    @final
    @static
    **/
    DataType.Undefined = DataType.addSymbol({ defaultValue: undefined });
    DataType.seal();
    DataType.getSymbols().forEach(function (sym) {
        sym.validatorCtor = getValidatorCtor(sym);
    });

    /**
    Returns the DataType for a specified type name.
    @method toDataType
    @static
    @param typeName {String}
    @return A DataType enum value.
    **/
    DataType.toDataType = function (typeName) {
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

