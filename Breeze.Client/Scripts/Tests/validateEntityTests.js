require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var root = testFns.root;
    var core = root.core;
    var entityModel = root.entityModel;

    var Enum = core.Enum;

    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    var EntityQuery = entityModel.EntityQuery;
    var EntityKey = entityModel.EntityKey;
    var EntityState = entityModel.EntityState;
    var Validator = entityModel.Validator;


    var metadataStore = new MetadataStore();
    var newEm = function (ms) {
        if (ms) {
            return new EntityManager({ serviceName: testFns.ServiceName, metadataStore: ms });
        } else {
            return new EntityManager({ serviceName: testFns.ServiceName, metadataStore: metadataStore });
        }
    };

    module("validate entity", {
        setup: function () {
            if (!metadataStore.isEmpty()) return;
            stop();
            var em = newEm();
            em.fetchMetadata(function (rawMetadata) {
                var isEmptyMetadata = metadataStore.isEmpty();
                ok(!isEmptyMetadata);
                start();
            });
        },
        teardown: function () {

        }
    });

    test("validate props", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        em.attachEntity(cust1);
        var s = "long value long value";
        s = s + s + s + s + s + s + s + s + s + s + s + s;
        cust1.setProperty("CompanyName", s);
        ok(cust1.entityAspect.getValidationErrors().length === 1);
        var valErrors = cust1.entityAspect.getValidationErrors();
        var errMessage = valErrors[0].errorMessage;
        ok(errMessage.indexOf("CompanyName") >= 0, errMessage);
        cust1.setProperty("CompanyName", "much shorter");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "should be no validation errors now");
        cust1.setProperty("CompanyName", "");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 1, "should be no validation errors now");
    });

    test("validate props - bad data types", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        em.attachEntity(cust1);
        var valErrorsChanged;
        cust1.entityAspect.validationErrorsChanged.subscribe(function (args) {
            ok(args.entity === cust1,"args.entity property should be set");
            valErrorsChanged = args;
        });
        cust1.setProperty("CompanyName", 222);
        ok(valErrorsChanged.added[0].property.name === "CompanyName");

        cust1.setProperty("RowVersion", 3.2);
        ok(valErrorsChanged.added[0].property.name === "RowVersion");
        cust1.setProperty("RowVersion", 3);
        ok(valErrorsChanged.removed[0].property.name === "RowVersion");

        cust1.setProperty("RowVersion", "33");
        ok(valErrorsChanged.added[0].property.name === "RowVersion");
        valErrorsChanged = null;
        cust1.setProperty("RowVersion", "33");
        ok(valErrorsChanged === null);


    });

    test("validationErrorsChanged event", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        em.attachEntity(cust1);
        var lastNotification;
        var notificationCount = 0;
        cust1.entityAspect.validationErrorsChanged.subscribe(function (args) {
            lastNotification = args;
            notificationCount++;
        });
        var s = "long value long value";
        s = s + s + s + s + s + s + s + s + s + s + s + s;
        cust1.setProperty("CompanyName", s);
        ok(lastNotification.added, "last notification should have been 'added'");
        ok(lastNotification.added[0].property.name === "CompanyName");
        ok(lastNotification.removed[0].property.name === "CompanyName");
        ok(notificationCount === 1, "should have been 1 notification");
        cust1.setProperty("CompanyName", "much shorter");
        ok(lastNotification.removed, "last notification should have been 'removed'");
        ok(lastNotification.removed[0].property.name === "CompanyName");
        ok(notificationCount === 2, "should have been 2 notifications");
        cust1.setProperty("CompanyName", "");
        ok(lastNotification.added, "last notification should have been 'added'");
        ok(lastNotification.added[0].property.name === "CompanyName");
        ok(notificationCount === 3, "should have been 3 notifications");
    });

    test("get validationError for a property", function () {
        var em = newEm();
        var custType = metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        em.attachEntity(cust1);
        var lastNotification;
        var notificationCount = 0;
        cust1.entityAspect.validationErrorsChanged.subscribe(function (args) {
            lastNotification = args;
            notificationCount++;
        });
        var s = "long value long value";
        s = s + s + s + s + s + s + s + s + s + s + s + s;
        cust1.setProperty("CompanyName", s);
        var errors = cust1.entityAspect.getValidationErrors("CompanyName");
        ok(errors.length === 1);
        errors = cust1.entityAspect.getValidationErrors("foo");
        ok(errors.length === 0);
        errors = cust1.entityAspect.getValidationErrors(custType.getProperty("CompanyName"));
        ok(errors.length === 1);
    });

    test("custom property validation", function () {
        var ms = MetadataStore.import(metadataStore.export());
        var em = newEm(ms);
        var custType = ms.getEntityType("Customer");
        var prop = custType.getProperty("Country");

        var valFn = function (v) {
            if (v == null) return true;
            return (core.stringStartsWith(v, "US"));
        };
        var countryValidator = new Validator("countryIsUS", valFn, { displayName: "Country", messageTemplate: "'%displayName%' must start with 'US'" });
        prop.validators.push(countryValidator);
        var cust1 = custType.createEntity();
        cust1.setProperty("Country", "GER");
        em.attachEntity(cust1);
        var valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 2, "length should be 2");
        cust1.setProperty("Country", "US");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 1, "length should be 1");
    });

    test("custom entity validation", function () {
        var ms = MetadataStore.import(metadataStore.export());
        var em = newEm(ms);
        var custType = ms.getEntityType("Customer");
           
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
        custType.validators.push(zipCodeValidator);

        var cust1 = custType.createEntity();
        cust1.setProperty("CompanyName", "Test1Co");
        cust1.setProperty("Country", "GER");
        em.attachEntity(cust1);
        var valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "length should be 0");
        cust1.setProperty("Country", "USA");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "length should be 0");
        var isOk = cust1.entityAspect.validateEntity();
        ok(!isOk, "validateEntity should have returned false");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 1, "length should be 0");
    });
    
    test("custom property numeric range validation", function () {
        var ms = MetadataStore.import(metadataStore.export());
        var em = newEm(ms);
        var orderType = ms.getEntityType("Order");
        var freightProperty = orderType.getProperty("Freight");
        
        var numericRangeValidator = function(context) {
            var valFn = function(v, ctx) {
                if (v == null) return true;
                if (typeof(v) !== "number") return false;
                if (ctx.min != null && v < ctx.min) return false;
                if (ctx.max != null && v > ctx.max) return false;
                return true;
            };
            return new Validator("numericRange", valFn, {
                messageTemplate: "'%displayName%' must be an integer between the values of %min% and %max%",
                min: context.min,
                max: context.max
            });
        };

        freightProperty.validators.push(numericRangeValidator({ min: 100, max: 500 }));
        var order1 = orderType.createEntity();

        em.attachEntity(order1);
        var valErrors = order1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "length should be 0"); // nulls do not cause failure
        order1.setProperty("Freight", 0);
        valErrors = order1.entityAspect.getValidationErrors();
        ok(valErrors.length === 1, "length should be 1");
        var ix = valErrors[0].errorMessage.indexOf("between the values of 100 and 500");
        order1.setProperty("Freight", 200);
        valErrors = order1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "length should be 0");
        
    });

    
    function isValidZipCode(value) {
        var re = /^\d{5}([\-]\d{4})?$/;
        return (re.test(value));
    }
        
    return testFns;
});