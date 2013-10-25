(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    

    var Enum = core.Enum;
    var assertParam = core.assertParam;

    var EntityState = breeze.EntityState;

    module("param", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });


    test("assertParam not ok", function () {
        var x = {};
        var Customer = function () {

        };
        Customer._$typeName = "_Customer_";

        x.p1 = { foo: "bar" };
        x.p7 = [3, 4, 5];
        isNotOk(assertParam(x.p1, "p1").isString());
        isNotOk(assertParam(x.p1, "p1").isNumber());
        isNotOk(assertParam(x.p1, "p1").isBoolean());
        isNotOk(assertParam(x.p1, "p1").isFunction());
        isNotOk(assertParam(x.p1, "p1").isEnumOf(EntityState));
        isNotOk(assertParam(x.p1, "p1").isEnumOf(EntityState).isOptional());
        isNotOk(assertParam(x.p1, "p1").isOptional().isEnumOf(EntityState));
        isNotOk(assertParam(x.p1, "p1").hasProperty("foox"));
        isNotOk(assertParam(x.p1, "p1").hasProperty("foox").isOptional());
        isNotOk(assertParam(x.p1, "p1").isArray().isString());
        isNotOk(assertParam(x.p1, "p1").isString().isArray());
        isNotOk(assertParam(x.p7, "p7").isArray().isString());
        isNotOk(assertParam(x.p7, "p7").isString().isArray());
        isNotOk(assertParam(x.p1, "p1").isArray().isEnumOf(EntityState));
        isNotOk(assertParam(x.p1, "p1").isEnumOf(EntityState).isArray());
        isNotOk(assertParam(x.p7, "p7").isArray().isEnumOf(EntityState));
        isNotOk(assertParam(x.p7, "p7").isEnumOf(EntityState).isArray());
        isNotOk(assertParam(x.p7, "p7").isNonEmptyArray().isInstanceOf(Customer, "Customer"));
        isNotOk(assertParam(x.p7, "p7").isInstanceOf(Customer, "Customer").isArray());
        isNotOk(assertParam(x.p7, "p7").isOptional().isNonEmptyArray().isInstanceOf(Customer, "Customer"));
        isNotOk(assertParam(x.p7, "p7").isOptional().isEnumOf(EntityState).or().isNonEmptyArray().isEnumOf(EntityState));

        isNotOk(assertParam(x.p2, "p2").isString());
        isNotOk(assertParam(x.p2, "p2").isNumber());
        isNotOk(assertParam(x.p2, "p2").isBoolean());
        isNotOk(assertParam(x.p2, "p2").isFunction());
        isNotOk(assertParam(x.p2, "p2").isEnumOf(EntityState));
        isNotOk(assertParam(x.p2, "p1").isArray().isString());
        isNotOk(assertParam(x.p2, "p2").isString().isArray());
        isNotOk(assertParam(x.p2, "p2").isArray().isEnumOf(EntityState));
        isNotOk(assertParam(x.p2, "p2").isEnumOf(EntityState).isArray());

    });

    test("assertParam ok", function () {
        var Customer = function () {

        };
        Customer._$typeName = "_Customer_";
        var x = {};
        x.p1 = "asdfasfd";
        x.p2 = 234;
        x.p3 = true;
        x.p4 = function () { };
        x.p5 = { foo: "bar" };
        x.p6 = EntityState.Modified;
        x.p7 = ["asdfas", " asdfasdf"];
        x.p8 = [EntityState.Modified, EntityState.Added];
        x.p9 = new Customer();
        x.p10 = [new Customer(), new Customer()];
        isOk(assertParam(x.p1, "p1").isString());
        isOk(assertParam(x.p1, "p1").isFunction().or().isString());
        isOk(assertParam(x.p1, "p1").isOptional().isFunction().or().isString());
        isOk(assertParam(x.p1, "p1").isOptional().isString().or().isEnumOf(EntityState));
        isOk(assertParam(x.p1, "p1").isRequired());
        isOk(assertParam(x.p2, "p2").isNumber());
        isOk(assertParam(x.p3, "p3").isBoolean());
        isOk(assertParam(x.p4, "p4").isFunction());
        isOk(assertParam(x.p5, "p5").hasProperty("foo"));
        isOk(assertParam(x.p6, "p6").isEnumOf(EntityState));
        isOk(assertParam(x.p7, "p7").isArray().isString());
        isOk(assertParam(x.p7, "p7").isString().isArray());
        isOk(assertParam(x.p8, "p8").isArray().isEnumOf(EntityState));
        isOk(assertParam(x.p8, "p8").isEnumOf(EntityState).isArray());
        isOk(assertParam(x.p9, "p9").isInstanceOf(Customer, "Customer"));
        isOk(assertParam(x.p10, "p10").isNonEmptyArray().isInstanceOf(Customer, "Customer"));
        isOk(assertParam(x.p10, "p10").isInstanceOf(Customer, "Customer").isArray());

        isOk(assertParam(x.p0, "p0").isString().isOptional());
        isOk(assertParam(x.p0, "p0").isNumber().isOptional());
        isOk(assertParam(x.p0, "p0").isBoolean().isOptional());
        isOk(assertParam(x.p0, "p0").isFunction().isOptional());
        isOk(assertParam(x.p0, "p0").hasProperty("bar").isOptional());
        isOk(assertParam(x.p0, "p0").isEnumOf(EntityState).isOptional());
        isOk(assertParam(x.p0, "p0").isOptional().isEnumOf(EntityState));
        isOk(assertParam(x.p0, "p0").isArray().isEnumOf(EntityState).isOptional());
        isOk(assertParam(x.p0, "p0").isEnumOf(EntityState).isArray().isOptional());
        isOk(assertParam(x.p0, "p0").isInstanceOf(Customer, "Customer").isOptional());
        isOk(assertParam(x.p0, "p0").isArray().isInstanceOf(Customer, "Customer").isOptional());
        isOk(assertParam(x.p0, "p0").isInstanceOf(Customer, "Customer").isArray().isOptional());

    });

    function isOk(param) {
        try {
            var msg = param.getMessage();
            param.check();
            ok(true, msg);
        } catch (e) {
            ok(false, e);
        }
    }

    function isNotOk(param, expectedSubstr) {
        try {
            param.check();
            ok(false, "should not get here");
        } catch (e) {
            if (expectedSubstr) {
                ok(e.message.indexOf(expectedSubstr) >= 0, "Expected: " + expectedSubstr + " but got " + e.message);
            } else {
                ok(true, e.message);
            }
        }
    }
    
})(breezeTestFns);