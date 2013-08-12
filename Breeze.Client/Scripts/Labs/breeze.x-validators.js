// Validators that will be added to Breeze soon
(function() {
    'use strict';

    var Validator = breeze.Validator;
    var ctor = Validator; // make it easier to import into breeze later

    /**
    Returns a regular expression validator; the expression must be specified
    @example
        // Add validator to a property. Assume em is a preexisting EntityManager.
        var custType = em.metadataStore.getEntityType("Customer");
        var regionProperty = custType.getProperty("Region");
        // Validates that the value of Customer.Region is 2 char uppercase alpha.
        regionProperty.validators.push(Validator.regExp( {expression: '^[A-Z]{2}$'} );
    @method regExp
    @static
    @param context {Object} 
    @param context.expression {String} String form of the regular expression to apply
    @return {Validator} A new Validator
    **/
    ctor.regExp = function(context) {

        function valFn(v, ctx) {
            // do not invalidate if empty; use a separate required test
            if (v == null || v === '') return true;
            if (typeof (v) !== 'string') return false;
            try {
                var re = new RegExp(ctx.expression);
            } catch (e) {
                throw new Error('Missing or invalid expression parameter to regExp validator');
            }

            return re.test(v);
        };
        return new ctor('regExp', valFn, context);
    };
    
    // TODO: relocate default message set when incorporating in breeze.Validator
    Validator.messageTemplates.regExp =
        "The %displayName% '%value%' does not match '%expression%'.";
    /**
    Returns the email address validator
    @example
        // Assume em is a preexisting EntityManager.
        var personType = em.metadataStore.getEntityType("Person");
        var emailProperty = custType.getProperty("email");
        // Validates that the value of the Person.email property is an email address.
        emailProperty.validators.push(Validator.email());
    @method email
    @static
    @param context {Object} 
    @return {Validator} A new Validator
    **/
    ctor.email = function(context) {
        return makeRegExpValidator(
            'email',
            /^([a-z_\.-]+)@([\da-z.-]+)\.([a-z\.]{2,6})$/,
            "The %displayName% '%value%' is not a valid email address.");
    };
    
    var reUrlProtocolRequired = /^(https?|ftp):\/\/(((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|([a-zA-Z][\-a-zA-Z0-9]*)|((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/;
    /**
    Returns the URL validator
    This validator requires the protocol and uses the RegExp from here:
    https://github.com/srkirkland/DataAnnotationsExtensions/blob/master/DataAnnotationsExtensions/UrlAttribute.cs
    @example
        // Assume em is a preexisting EntityManager.
        var personType = em.metadataStore.getEntityType("Person");
        var websiteProperty = custType.getProperty("website");
        // Validates that the value of the Person.website property is a URL.
        websiteProperty.validators.push(Validator.url());
    @method url
    @static
    @param context {Object} 
    @return {Validator} A new Validator
    **/
    ctor.url = function(context) {
        return makeRegExpValidator(
         'url',
          reUrlProtocolRequired,  
        ///^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
        "The %displayName% '%value%' is not a valid url.");
    };
    

    /* register these validators */
    Validator.registerFactory(ctor.regExp, 'regExp');
    Validator.register(ctor.email());
    Validator.register(ctor.url());

    // TODO: ensure makeRegExpValidator is not registered as a validator
    //       when incorporated in breeze.Validator
    
    /**
    Creates a regular expression validator with a fixed expression.
    @example
        // Make a zipcode validator
        function zipValidator = Validator.makeRegExpValidator(
            "zipVal,  
            /^\d{5}([\-]\d{4})?$/,  
            "The %displayName% '%value%' is not a valid U.S. zipcode");
        // Register it.
        Validator.register(zipValidator);
        // Add it to a data property. Assume em is a preexisting EntityManager.
        var custType = em.metadataStore.getEntityType("Customer");
        var zipProperty = custType.getProperty("PostalCode");
        zipProperty.validators.push(zipValidator);
    @method makeRegExpValidator
    @static
    @param validatorName {String} name of this validator
    @param expression {String | RegExp} regular expression to apply
    @param defaultMessage {String} default message for failed validations
    @param [context] {Object} default context
    @return {Validator} A new Validator
    **/
    ctor.makeRegExpValidator = makeRegExpValidator;
    
    function makeRegExpValidator(validatorName, expression, defaultMessage, context) {
        if (defaultMessage) {
            ctor.messageTemplates[validatorName] = defaultMessage;
        }
        var re = (typeof (expression) === 'string') ? new RegExp(expression) : expression;
        var valFn = function(v, ctx) {
            // do not invalidate if empty; use a separate required test
            if (v == null || v === '') return true;
            if (typeof(v) !== 'string') return false;
            return re.test(v);
        };
        return new ctor(validatorName, valFn, context);
    };
    
})();