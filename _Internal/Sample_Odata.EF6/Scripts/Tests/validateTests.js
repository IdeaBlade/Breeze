(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    
    var Enum = core.Enum;
    var assertParam = core.assertParam;

    var Validator = breeze.Validator;
    var ValidationOptions = breeze.ValidationOptions;

    module("validate", {
        setup: function () {

        },
        teardown: function () {

        }
    });

    test("validation options", function() {
        var vo = ValidationOptions.defaultInstance;
        var origVo = vo.using({});
        ok(vo.validateOnQuery == false);
        ok(vo.validateOnSave == true);
        vo = vo.using({ validateOnQuery: true, validateOnSave: false });
        ok(vo.validateOnQuery == true);
        ok(vo.validateOnSave == false);
        vo.setAsDefault();
        ok(ValidationOptions.defaultInstance.validateOnQuery == true, "now default voq == true");
        ok(ValidationOptions.defaultInstance.validateOnSave == false);
        origVo.setAsDefault();
    });

    test("string validation - custom messages", function () {
        var v0 = Validator.maxLength({ maxLength: 5, displayName: "City" });
        var r0 = v0.validate("asdf");
        ok(r0 === null);
        var r0a = v0.validate("adasdfasdf");
        var err = r0a.errorMessage;
        ok(err.indexOf("City") >= 0 && err.indexOf("5") >= 0, v0.getMessage());

        var v1 = Validator.maxLength({ maxLength: 5, message: "City > 5" });
        var r1 = v1.validate("2342343242");
        ok(r1.errorMessage === "City > 5", v1.getMessage());

        var v2 = Validator.maxLength({
            maxLength: 5,
            messageTemplate: "Invalid %displayName%: '%value%' is longer than %maxLength% chars",
            displayName: "City"
        });
        var r2 = v2.validate("Try this value");
        err = r2.errorMessage;
        ok(err.indexOf("Invalid") >= 0 && err.indexOf("Try this value") >= 0 && err.indexOf("5") >= 0, v2.getMessage());

        var v3 = Validator.maxLength({ maxLength: 5 });
        var r3 = v3.validate("2342342");
        ok(r3.errorMessage.indexOf("Value") >= 0, v3.getMessage());

        var customMessageFn = function (args) {
            return "Custom message: " + args.name + " value:" + args.value +
                    " messageTemplate: " + args.messageTemplate +
                    " displayName: " + args.displayName;
        };
        var v4 = Validator.maxLength({ maxLength: 5, message: customMessageFn, displayName: "Foo" });
        var r4 = v4.validate("123456");
        err = r4.errorMessage;
        ok(err.indexOf("Foo") >= 0 && err.indexOf("123456") >= 0);

    });

    test("required validation", function () {
        var v0 = Validator.required();
        var r0 = v0.validate("asdf");
        ok(r0 === null);
        var r0a = v0.validate("");
        ok(r0a.errorMessage.indexOf("required"), v0.getMessage());
        var data = {};
        var r0b = v0.validate(data.notThere);
        ok(r0b.errorMessage.indexOf("required") >= 0, v0.getMessage());

    });

    test("required validation", function () {
        var v0 = Validator.required();
        var r0 = v0.validate("asdf");
        ok(r0 === null);
        var r0a = v0.validate("");
        ok(r0a.errorMessage.indexOf("required"), v0.getMessage());
        var data = {};
        var r0b = v0.validate(data.notThere);
        ok(r0b.errorMessage.indexOf("required") >= 0, v0.getMessage());

    });


    test("required validation allow empty strings", function () {
        var v0 = Validator.required({ allowEmptyStrings: true });
        var r0 = v0.validate("asdf");
        ok(r0 === null);
        var r0a = v0.validate("");
        ok(r0 === null);
        var data = {};
        var r0b = v0.validate(data.notThere);
        ok(r0b.errorMessage.indexOf("required") >= 0, v0.getMessage());

    });

    test("replace required validation", function () {
        var oldVal = Validator.required;
        try {
            Validator.required = function (context) {
                var valFn = function (v, ctx) {
                    return v != null;
                }
                return new Validator("required", valFn, context);
            };
            Validator.registerFactory(Validator.required, "required");
            var v0 = Validator.required();
            var r0 = v0.validate("asdf");
            ok(r0 === null);
            var r0a = v0.validate("");
            ok(r0 === null);
            var data = {};
            var r0b = v0.validate(data.notThere);
            ok(r0b.errorMessage.indexOf("required") >= 0, v0.getMessage());
        } finally {
            Validator.required = oldVal;
            Validator.registerFactory(Validator.required, "required");
        }

    });


    test("stringLength validation", function () {
        var v0 = Validator.stringLength({ minLength: 2, maxLength: 7 });
        var r0 = v0.validate("asdf");
        ok(r0 === null);
        ok(v0.validate("1234567") === null);

        ok(v0.validate(null) === null);
        ok(v0.validate("a"), v0.getMessage());
        r0 = v0.validate("a");
        ok(r0.errorMessage === v0.getMessage(), v0.getMessage());

        var v1 = Validator.stringLength({ minLength: 2, maxLength: 7, messageTemplate: "%value% is invalid. Must be between %minLength% AND %maxLength% chars" });
        var r1 = v1.validate("12345678");
        var err = r1.errorMessage;
        ok(err.indexOf("12345678") >= 0 && err.indexOf("between 2 AND 7") >= 0, v1.getMessage());

    });
    
    test("date validation", function () {
        var v0 = Validator.date();
        var r = v0.validate("asdf");
        ok(r != null, r.errorMessage);
        r= v0.validate("1234567");
        ok(r != null, r.errorMessage);
        ok(v0.validate(null) === null);
        r = v0.validate(new Date(2001, 9, 11));
        ok(r == null, "should be null");
    });
 

    test("creditCard validation", function() {
        var v0 = Validator.creditCard();
        valFail(v0, "asdf");
        valFail(v0, "4388576020733634");
        
        valGood(v0, null);
        valGood(v0, "4388576020733633");
    });
    
    test("emailAddress validation", function() {
        var v0 = Validator.emailAddress();
        valFail(v0, "asdf");
        valFail(v0, "1234567");
        valFail(v0, "john.doe@abc"); // missing '.com'
        
        valGood(v0, null);
        valGood(v0, "john.doe@abc.com");
    });

    test("phone validation", function() {
        var v0 = Validator.phone();
        valFail(v0, "asdf");
        valFail(v0, "Pennsylvania 6500");
        valFail(v0, "5");
        
        valGood(v0, null);
        valGood(v0, "(510) 686-8275");
        valGood(v0, "01 510 686-8275");
        valGood(v0, "+1 510 686-8275");
        
        // these pass too. You might not expect that
        valGood(v0, "51");
        valGood(v0, "1234567");
        valGood(v0, "123456789012345678901234567890");
    });

    test("regularExpression validation for a US State abbreviation", function() {
        var v0 = Validator.regularExpression({ expression: '^[A-Z]{2}$' });
        valFail(v0, "asdf");
        valFail(v0, "1234567");
        valFail(v0, "ca");
        valFail(v0, "C1");

        valGood(v0, null);
        valGood(v0, "CA");
    });
    
    test("url validation", function() {
        var v0 = Validator.url();
        valFail(v0, "asdf");
        valFail(v0, "1234567");
        valFail(v0, "traband.contoso.com"); // missing protocol

        // This passes but shouldn't (won't in .NET). 
        // A JS/.NET regex diff? Need to fix
        valGood(v0, "http://traband"); // SHOULD make this test fail
        
        valGood(v0, null);
        valGood(v0, "http://traband.contoso.com");
        valGood(v0, "https://traband.contoso.com");
        valGood(v0, "ftp://traband.contoso.com");
        valGood(v0, "http://traband.contoso.commiepinko");
    });
    
    // from CCJS
    test("makeRegExpValidator creates a twitter validator", function() {
        var v0 = Validator.makeRegExpValidator(
           'twitter', /^@([a-zA-Z]+)([a-zA-Z0-9_]+)$/,
           "Invalid Twitter User Name: '%value%'");
        
        valFail(v0, "asdf");
        valFail(v0, "1234567");
        valFail(v0, "@1234567");
        valFail(v0, "a@b1234567");
        valFail(v0, "@J");
        
        valGood(v0, null);
        valGood(v0, "@jaytraband");
        valGood(v0, "@Jay_Traband22");
        valGood(v0, "@b1234567");
    });
    
    // from the example in the code
    test("makeRegExpValidator creates a zip validator", function() {
        var v0 = Validator.makeRegExpValidator(
           'zipVal', /^\d{5}([\-]\d{4})?$/,
           "The %displayName% '%value%' is not a valid U.S. zipcode");

        valFail(v0, "asdf");
        valFail(v0, "1234567");

        valGood(v0, null);
        valGood(v0, "94801");
        valGood(v0, "94801-1234");
    });
    
    function valFail(validator, arg) {
        var r = validator.validate(arg);
        if (arg === undefined) arg = 'undefined';
        if (r == null) {
            ok(false, '\'' + arg + '\' should be invalid but got no error');
        } else {
            ok(true, '\'' + arg + '\' should be (and is) invalid; msg is ' + r.errorMessage);
        }
    }
    function valGood(validator, arg) {
        var r = validator.validate(arg);
        if (arg === undefined) arg = 'undefined';
        if (r == null) {
            ok(true, '\'' + arg + '\' should be (and is) valid');
        } else {
            ok(false, '\'' + arg + '\' should be valid but isn\'t; msg is ' + r.errorMessage);
        }
    }
})(breezeTestFns);