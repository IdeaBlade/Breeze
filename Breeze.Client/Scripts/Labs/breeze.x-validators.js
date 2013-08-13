// Validators that will be added to Breeze soon
// See http://msdn.microsoft.com/en-us/library/system.componentmodel.dataannotations.aspx
(function() {
    'use strict';

    var Validator = breeze.Validator;
    var ctor = Validator; // make it easier to import into breeze later

    // TODO: relocate default messages when incorporating in breeze.Validator
    Validator.messageTemplates.creditCard =
        "The %displayName% is not a valid credit card number";
    Validator.messageTemplates.emailAddress =
        "The %displayName% '%value%' is not a valid email address";
    Validator.messageTemplates.phone =
        "The %displayName% '%value%' is not a valid phone number";
    Validator.messageTemplates.regularExpression =
        "The %displayName% '%value%' does not match '%expression%'";
    Validator.messageTemplates.url =
        "The %displayName% '%value%' is not a valid url"

    /**
    Returns a credit card number validator
    Performs a luhn algorithm checksum test for plausability
    catches simple mistakes; only service knows for sure
    @example
        // Assume em is a preexisting EntityManager.
        var personType = em.metadataStore.getEntityType("Person");
        var creditCardProperty = personType.getProperty("creditCard");
        // Validates that the value of the Person.creditCard property is credit card.
        creditCardProperty.validators.push(Validator.creditCard());
    @method creditCard
    @static
    @return {Validator} A new Validator
    **/
    ctor.creditCard = function() {
        function valFn(v) {
            if (v == null || v === '') return true;
            if (typeof (v) !== 'string') return false;
            v = v.replace(/(\-|\s)/g, ""); // remove dashes and spaces
            if (!v || /\D/.test(v)) return false; // all digits, not empty
            return luhn(v);
        };
        return new ctor('creditCard', valFn);
    };

    // http://rosettacode.org/wiki/Luhn_test_of_credit_card_numbers#JavaScript
    function luhn(a, b, c, d, e) {
        for (d = +a[b = a.length - 1], e = 0; b--;)
            c = +a[b], d += ++e % 2 ? 2 * c % 10 + (c > 4) : c;
        return !(d % 10);
    };
    
    /**
    Returns a regular expression validator; the expression must be specified
    @example
        // Add validator to a property. Assume em is a preexisting EntityManager.
        var customerType = em.metadataStore.getEntityType("Customer");
        var regionProperty = customerType.getProperty("Region");
        // Validates that the value of Customer.Region is 2 char uppercase alpha.
        regionProperty.validators.push(Validator.regularExpression( {expression: '^[A-Z]{2}$'} );
    @method regularExpression
    @static
    @param context {Object} 
    @param context.expression {String} String form of the regular expression to apply
    @return {Validator} A new Validator
    **/
    ctor.regularExpression = function(context) {

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
        return new ctor('regularExpression', valFn, context);
    };

    /**
    Returns the email address validator
    @example
        // Assume em is a preexisting EntityManager.
        var personType = em.metadataStore.getEntityType("Person");
        var emailProperty = personType.getProperty("email");
        // Validates that the value of the Person.email property is an email address.
        emailProperty.validators.push(Validator.emailAddress());
    @method emailAddress
    @static
    @return {Validator} A new Validator
    **/
    ctor.emailAddress = function() {
        // See https://github.com/srkirkland/DataAnnotationsExtensions/blob/master/DataAnnotationsExtensions/EmailAttribute.cs
        var reEmailAddress = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/;
        return makeRegExpValidator('emailAddress',reEmailAddress);
    };

    /**
    Returns the phone validator
    Provides basic assertions on the format and will help to eliminate most nonsense input
    Matches:
      International dialing prefix: {{}, +, 0, 0000} (with or without a trailing break character, if not '+': [-/. ])
        > ((\+)|(0(\d+)?[-/.\s]))
      Country code: {{}, 1, ..., 999} (with or without a trailing break character: [-/. ])
        > [1-9]\d{,2}[-/.\s]?
      Area code: {(0), ..., (000000), 0, ..., 000000} (with or without a trailing break character: [-/. ])
        > ((\(\d{1,6}\)|\d{1,6})[-/.\s]?)?
      Local: {0, ...}+ (with or without a trailing break character: [-/. ])
        > (\d+[-/.\s]?)+\d+
    @example
        // Assume em is a preexisting EntityManager.
        var customerType = em.metadataStore.getEntityType("Customer");
        var phoneProperty = customerType.getProperty("phone");
        // Validates that the value of the Customer.phone property is phone.
        phoneProperty.validators.push(Validator.phone());
    @method phone
    @static
    @return {Validator} A new Validator
    **/
    ctor.phone = function() {
        // See https://github.com/srkirkland/DataAnnotationsExtensions/blob/master/DataAnnotationsExtensions/Expressions.cs
        var rePhone = /^((\+|(0(\d+)?[-/.\s]?))[1-9]\d{0,2}[-/.\s]?)?((\(\d{1,6}\)|\d{1,6})[-/.\s]?)?(\d+[-/.\s]?)+\d+$/;
        return makeRegExpValidator('phone',rePhone);
    };

    /**
    Returns the URL (protocol required) validator
    @example
        // Assume em is a preexisting EntityManager.
        var personType = em.metadataStore.getEntityType("Person");
        var websiteProperty = personType.getProperty("website");
        // Validates that the value of the Person.website property is a URL.
        websiteProperty.validators.push(Validator.url());
    @method url
    @static
    @return {Validator} A new Validator
    **/
    ctor.url = function() {
        //See https://github.com/srkirkland/DataAnnotationsExtensions/blob/master/DataAnnotationsExtensions/UrlAttribute.cs
        var reUrlProtocolRequired = /^(https?|ftp):\/\/(((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|([a-zA-Z][\-a-zA-Z0-9]*)|((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-fA-F]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/;
        return makeRegExpValidator('url', reUrlProtocolRequired);
    };    

    /* register these validators */
    Validator.registerFactory(ctor.regularExpression, 'regularExpression');
    Validator.register(ctor.creditCard());
    Validator.register(ctor.emailAddress());
    Validator.register(ctor.phone());
    Validator.register(ctor.url());

    // TODO: ensure makeRegExpValidator is not registered as a validator
    //       when incorporated in breeze.Validator
    
    /**
    Creates a regular expression validator with a fixed expression.
    Many of the stock validators are built with this factory method.
    Their expressions are often derived from 
    https://github.com/srkirkland/DataAnnotationsExtensions/blob/master/DataAnnotationsExtensions
    You can try many of them at http://dataannotationsextensions.org/
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
    
    function makeRegExpValidator(validatorName, expression, defaultMessage) {
        if (defaultMessage) {
            ctor.messageTemplates[validatorName] = defaultMessage;
        }
        var re = (typeof (expression) === 'string') ? new RegExp(expression) : expression;
        var valFn = function(v) {
            // do not invalidate if empty; use a separate required test
            if (v == null || v === '') return true;
            if (typeof(v) !== 'string') return false;
            return re.test(v);
        };
        return new ctor(validatorName, valFn);
    };
    
})();