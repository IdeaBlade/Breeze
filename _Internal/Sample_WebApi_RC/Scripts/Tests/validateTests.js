require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var root = testFns.root;
    var core = root.core;
    var entityModel = root.entityModel;
    
    var Enum = core.Enum;
    var assertParam = core.assertParam;

    var Validator = entityModel.Validator;
    var ValidationOptions = entityModel.ValidationOptions;

    module("validate", {
        setup: function () {

        },
        teardown: function () {

        }
    });

    test("validation options", function() {
        var vo = new ValidationOptions();
        ok(vo.validateOnQuery == false);
        ok(vo.validateOnSave == true);
        vo = vo.using({ validateOnQuery: true, validateOnSave: false });
        ok(vo.validateOnQuery == true);
        ok(vo.validateOnSave == false);
        vo.setAsDefault();
        ok(ValidationOptions.defaultInstance.validateOnQuery == true, "now default voq == true");
        ok(ValidationOptions.defaultInstance.validateOnSave == false);
        // reset;
        vo = new ValidationOptions().setAsDefault();
        ok(ValidationOptions.defaultInstance.validateOnQuery == false,"reset");
        ok(ValidationOptions.defaultInstance.validateOnSave == true, "reset");
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
            return "Custom message: " + args.validatorName + " value:" + args.value +
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

    return testFns;
});