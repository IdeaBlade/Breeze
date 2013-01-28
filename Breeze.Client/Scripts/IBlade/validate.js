define(["core", "config", "dataType"],
function (core, a_config, DataType) {
    "use strict";
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
                    return context.property.displayName || context.propertyName || context.property.name;
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
        var proto = ctor.prototype;


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
        proto.validate = function (value, additionalContext) {
            var currentContext;
            if (additionalContext) {
                currentContext = core.extend(Object.create(this.context), additionalContext);
            } else {
                currentContext = this.context;
            }
            this.currentContext = currentContext;
            if (!this.valFn(value, currentContext)) {
                currentContext.value = value;
                return new ValidationError(this, currentContext, this.getMessage());
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
        proto.getMessage = function () {
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

        proto.toJSON = function () {
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
        Register a validator so that any deserialized metadata can reference it. 
        @method register
        @param validator {Validator} Validator to register.
        **/
        ctor.register = function(validator) {
            a_config.registerFunction(function () { return validator; }, "Validator." + validator.name);
        };

        /**
        Register a validator factory so that any deserialized metadata can reference it. 
        @method registerFactory
        @param validatorFactory {Function} A function that optionally takes a context property and returns a Validator instance.
        **/
        ctor.registerFactory = function(validatorFn, name) {
            a_config.registerFunction(validatorFn, "Validator." + name);
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
            duration: "'%displayName%' must be a ISO8601 duration string, such as 'P3H24M60S'",
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
        Returns a standard string length Validator; both minimum and maximum lengths must be specified.
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
        Returns a Guid data type Validator.
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
       Returns a ISO 8601 duration string  Validator.
       @example
           // Assume em1 is a preexisting EntityManager.
           var eventType = em1.metadataStore.getEntityType("Event");
           var elapsedTimeProperty - eventType.getProperty("ElapsedTime");
           // Validates that the value of the ElapsedTime property on Customer is a duration.
           elapsedTimeProperty.validators.push(Validator.duration());
       @method duration
       @static
       @return {Validator} A new Validator
       **/
        ctor.duration = function() {
            var valFn = function(v) {
                if (v == null) return true;
                return core.isDuration(v);
            };
            return new ctor("duration", valFn);
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
            if (key === "fromJSON" || key === "register" || key === "registerFactory")  {
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
            context = context || {};
            this.context = context;
            this.property = context.property;
            if (this.property) {
                this.propertyName = context.propertyName || context.property.name;
            }
            this.errorMessage = errorMessage;
            this.key = ValidationError.getKey(validator, this.propertyName);
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
        The property name associated with this ValidationError. This will be a "property path" for any properties of a complex object.

        __readOnly__
        @property propertyName {String}
        **/
        
        /**
        The error message associated with the ValidationError.

        __readOnly__
        @property errorMessage {string}
        **/

        ctor.getKey = function (validator, propertyPath) {
            return (propertyPath || "") + ":" + validator.name;
        };

        return ctor;
    }();
    
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


    return {
        Validator: Validator,
        ValidationError: ValidationError
    };
});
