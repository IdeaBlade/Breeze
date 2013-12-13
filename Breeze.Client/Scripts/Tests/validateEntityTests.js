(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    

    var Enum = core.Enum;
    var Event = core.Event;

    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityKey = breeze.EntityKey;
    var EntityState = breeze.EntityState;
    var Validator = breeze.Validator;
    var ValidationError = breeze.ValidationError;


    var newEm = testFns.newEm;
    var wellKnownData = testFns.wellKnownData;
    

    module("validate entity", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });

    /*********************************************************
    * Can call getValidationErrors('someProperty) when have entity errors
    * Defect #2552 Null reference exception in getValidationErrors
    * MOVE THIS TEST TO BREEZE's OWN TESTS
    *********************************************************/
    test("can call getValidationErrors('someProperty) when have entity errors", 2, function () {
        var em = newEm();

        var cust = em.createEntity('Customer', {
            CustomerID: breeze.core.getUuid()
        }, breeze.EntityState.Unchanged);

        // We need a validator to make a ValidationError
        // but it could be anything and we won't bother to register it
        var fakeValidator = new Validator(
            "fakeValidator",
            function () { return false; },
            { message: "You are always wrong!" }
        );


        // create a fake error
        var fakeError = new breeze.ValidationError(
            fakeValidator,                // the marker validator
            {},                           // validation context
            "You were wrong this time!"   // error message
        );

        // add the fake error
        cust.entityAspect.addValidationError(fakeError);

        // Act & Assert
        var property = undefined;
        try {

            var errs = cust.entityAspect.getValidationErrors(property);
            ok(errs.length > 0, "should get the entity error when ask for ALL errs");

            property = 'someProperty';
            errs = cust.entityAspect.getValidationErrors(property);
            ok(errs.length === 0, "should get the entity error when ask for errs OF A PROPERTY");

        } catch (e) {
            ok(false, "getValidationErrors(" + property + "} returned exception: " + e);
        }

    });


    test("customize validation display name", function () {
        var em = newEm();
        var newMs = MetadataStore.importMetadata(em.metadataStore.exportMetadata());
        em = newEm(newMs);
        var custType = em.metadataStore.getEntityType("Customer");
        var dp = custType.getProperty("companyName");
        dp.displayName = "xxx Company name xxx";
        var cust1 = custType.createEntity();
        em.attachEntity(cust1);
        var s = "long value long value";
        s = s + s + s + s + s + s + s + s + s + s + s + s;
        cust1.setProperty("companyName", s);
        errors = cust1.entityAspect.getValidationErrors();
        ok(errors[0].errorMessage.indexOf("xxx Company name xxx") != -1, "should have a custom error message");

    });

    
    test("Remove a rule", 2, function () {

        var em = newEm();

        var alwaysWrong = new Validator(
            "alwaysWrong",
            function () { return false; },
            { message: "You are always wrong!" }
        );

        var custType = em.metadataStore.getEntityType("Customer");
        var custValidators = custType.validators;

        // add alwaysWrong to the entity (not to a property)
        custValidators.push(alwaysWrong);

        var cust = custType.createEntity({ companyName: "Presumed Guilty" });

        // Attach triggers entity validation by default
        em.attachEntity(cust);

        var errs = cust.entityAspect.getValidationErrors();
        ok(errs.length !== 0, "should have 1 error" );

        // remove validation rule
        custValidators.splice(custValidators.indexOf(alwaysWrong), 1);

        // Clear out the "alwaysWrong" error
        // Must do manually because that rule is now gone
        // and, therefore, can't cleanup after itself
        var valKey = ValidationError.getKey(alwaysWrong);
        cust.entityAspect.removeValidationError(valKey);

        cust.entityAspect.validateEntity(); // re-validate

        errs = cust.entityAspect.getValidationErrors();
        ok(errs.length === 0, "should have no errors");
    });
    
    test("Attached employee validation errors raised when properties set to bad values", function () {

        var em = newEm();  // new empty EntityManager
        var empType = em.metadataStore.getEntityType("Employee");

        var employee = empType.createEntity(); // created but not attached
        employee.setProperty(testFns.employeeKeyName, wellKnownData.dummyEmployeeID);
        employee.setProperty("firstName", "John");
        employee.setProperty("lastName", "Doe");

        // enter the cache as 'Unchanged'
        em.attachEntity(employee);

        // Start monitoring validation error changes
        employee.entityAspect
            .validationErrorsChanged.subscribe(assertValidationErrorsChangedRaised);

        employee.setProperty("lastName", null); // 1. LastName is required

        employee.setProperty("birthDate", new Date()); // ok date

        employee.setProperty("birthDate",null); // ok. no problem; it's nullable

        employee.setProperty("birthDate","today"); // 2. Nice try! Wrong data type

        employee.setProperty(testFns.employeeKeyName, null); // 3. Id is the pk; automatically required

        employee.setProperty("lastName",          // 4. adds "too long", 5. removes "required", 
            "IamTheGreatestAndDontYouForgetIt");

        employee.entityAspect.rejectChanges(); // (6, 7, 8) remove ID, Date, LastName errs 

        expect(8); // asserts about validation errors

    });

    function assertValidationErrorsChangedRaised(errorsChangedArgs) {

        var addedMessages = errorsChangedArgs.added.map(function (a) {
            return a.errorMessage;
        });
        var addedCount = addedMessages.length;
        if (addedCount > 0) {
            ok(true, "added error: " + addedMessages.join(", "));
        }

        var removedMessages = errorsChangedArgs.removed.map(function (r) {
            return r.errorMessage;
        });
        var removedCount = removedMessages.length;
        if (removedCount > 0) {
            ok(true, "removed error: " + removedMessages.join(", "));
        }
    }

    test("numeric validators - disallow string", function () {
        var ms = MetadataStore.importMetadata(testFns.metadataStore.exportMetadata());
        var em = newEm(ms);
        var empType = em.metadataStore.getEntityType("Employee");
        var extnProp = empType.getDataProperty("extension");
        var emp = empType.createEntity();
        var vo = em.validationOptions.using({ validateOnAttach: false });
        em.setProperties({ validationOptions: vo });
        em.attachEntity(emp);
        extnProp.validators.push(Validator.number());
        emp.setProperty("extension", "456");
        var valErrors = emp.entityAspect.getValidationErrors();
        ok(valErrors.length === 1);
        ok(valErrors[0].errorMessage.indexOf("number"));
    });
    
    test("numeric validators - allow string", function () {
        var ms = MetadataStore.importMetadata(testFns.metadataStore.exportMetadata());
        var em = newEm(ms);
        var empType = em.metadataStore.getEntityType("Employee");
        var extnProp = empType.getDataProperty("extension");
        var emp = empType.createEntity();
        var vo = em.validationOptions.using({ validateOnAttach: false });
        em.setProperties({ validationOptions: vo });
        em.attachEntity(emp);
        extnProp.validators.push(Validator.number( { allowString: true}));
        emp.setProperty("extension", "456");
        var valErrors = emp.entityAspect.getValidationErrors();
        ok(valErrors.length === 0);
        emp.setProperty("extension", "x456");
        valErrors = emp.entityAspect.getValidationErrors();
        ok(valErrors.length === 1);
        ok(valErrors[0].errorMessage.indexOf("number"));
    });

    test("validate props", function () {
        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        em.attachEntity(cust1);
        var s = "long value long value";
        s = s + s + s + s + s + s + s + s + s + s + s + s;
        cust1.setProperty("companyName", s);
        ok(cust1.entityAspect.getValidationErrors().length === 1);
        var valErrors = cust1.entityAspect.getValidationErrors();
        var errMessage = valErrors[0].errorMessage;
        ok(errMessage.indexOf("companyName") >= 0, errMessage);
        cust1.setProperty("companyName", "much shorter");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "should be no validation errors now");
        cust1.setProperty("companyName", "");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 1, "should be no validation errors now");
    });

    test("validate props - bad data types", function () {
        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        em.attachEntity(cust1);
        var valErrorsChanged;
        cust1.entityAspect.validationErrorsChanged.subscribe(function (args) {
            ok(args.entity === cust1,"args.entity property should be set");
            valErrorsChanged = args;
        });
        
        cust1.setProperty("companyName", 222);
        // no longer a bug with DataType.parseString addition
        //ok(valErrorsChanged.added[0].property.name === "companyName");

        cust1.setProperty("rowVersion", "asdf");
        ok(valErrorsChanged.added[0].property.name === "rowVersion");
        cust1.setProperty("rowVersion", 3);
        ok(valErrorsChanged.removed[0].property.name === "rowVersion");

    });

    test("validationErrorsChanged event", function () {
        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        em.attachEntity(cust1);
        var lastNotification, emNotification;
        var notificationCount = 0;
        var emNotificationCount = 0;
        cust1.entityAspect.validationErrorsChanged.subscribe(function (args) {
            lastNotification = args;
            notificationCount++;
        });
        em.validationErrorsChanged.subscribe(function (args) {
            emLastNotification = args;
            emNotificationCount++;
        });
        var s = "long value long value";
        s = s + s + s + s + s + s + s + s + s + s + s + s;
        cust1.setProperty("companyName", s);
        ok(lastNotification.added, "last notification should have been 'added'");
        ok(lastNotification === emLastNotification, "both lastNotifications should be the same");
        ok(lastNotification.added[0].property.name === "companyName", "companyName should have been added"); // maxLength
        ok(lastNotification.removed[0].property.name === "companyName", "companyName should have been removed"); // required
        ok(notificationCount === 1, "should have been 1 notification");
        cust1.setProperty("companyName", "much shorter");
        ok(lastNotification === emLastNotification, "both lastNotifications should be the same");
        ok(lastNotification.removed, "last notification should have been 'removed'");
        ok(lastNotification.removed[0].property.name === "companyName");
        ok(notificationCount === 2, "should have been 2 notifications");
        cust1.setProperty("companyName", "");
        ok(lastNotification === emLastNotification, "both lastNotifications should be the same");
        ok(lastNotification.added, "last notification should have been 'added'");
        ok(lastNotification.added[0].property.name === "companyName");
        ok(notificationCount === 3, "should have been 3 notifications");
    });
    
    test("validationErrorsChanged event suppressed", function () {
        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        em.attachEntity(cust1);
        var lastNotification;
        var notificationCount = 0;
        Event.enable("validationErrorsChanged", em, false);
        cust1.entityAspect.validationErrorsChanged.subscribe(function (args) {
            lastNotification = args;
            notificationCount++;
        });
        var s = "long value long value";
        s = s + s + s + s + s + s + s + s + s + s + s + s;
        cust1.setProperty("companyName", s);
        cust1.setProperty("companyName", "much shorter");
        cust1.setProperty("companyName", "");
        ok(cust1.entityAspect.hasValidationErrors, "should still have val errors");
        ok(notificationCount === 0, "should have been no notifications");
    });

    test("get validationError for a property", function () {
        var em = newEm();
        var custType = em.metadataStore.getEntityType("Customer");
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
        cust1.setProperty("companyName", s);
        ok(cust1.entityAspect.hasValidationErrors, "should have val errors");
        var errors = cust1.entityAspect.getValidationErrors("companyName");
        ok(errors.length === 1);
        errors = cust1.entityAspect.getValidationErrors("foo");
        ok(errors.length === 0);
        errors = cust1.entityAspect.getValidationErrors(custType.getProperty("companyName"));
        ok(errors.length === 1);
    });

    test("custom property validation", function () {
        var ms = MetadataStore.importMetadata(testFns.metadataStore.exportMetadata());
        var em = newEm(ms);
        var custType = ms.getEntityType("Customer");
        var prop = custType.getProperty("country");

        var valFn = function (v) {
            if (v == null) return true;
            return (core.stringStartsWith(v, "US"));
        };
        var countryValidator = new Validator("countryIsUS", valFn, { displayName: "Country", messageTemplate: "'%displayName%' must start with 'US'" });
        prop.validators.push(countryValidator);
        var cust1 = custType.createEntity();
        cust1.setProperty("country", "GER");
        em.attachEntity(cust1);
        ok(cust1.entityAspect.hasValidationErrors, "should have val errors");
        var valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 2, "length should be 2");
        cust1.setProperty("country", "US");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 1, "length should be 1");
        cust1.setProperty("country", null);
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 1, "length should be 1");
        cust1.entityAspect.validateProperty("country");
        ok(valErrors.length === 1, "length should be 1");
    });

    test("custom entity validation", function () {
        var ms = MetadataStore.importMetadata(testFns.metadataStore.exportMetadata());
        var em = newEm(ms);
        var custType = ms.getEntityType("Customer");

        var zipCodeValidator = createZipCodeValidatorFactory()();
        custType.validators.push(zipCodeValidator);

        var cust1 = custType.createEntity();
        cust1.setProperty("companyName", "Test1Co");
        cust1.setProperty("country", "GER");
        em.attachEntity(cust1);
        var valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "length should be 0");
        cust1.setProperty("country", "USA");
        ok(!cust1.entityAspect.hasValidationErrors, "should NOT have val errors");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "length should be 0");
        var isOk = cust1.entityAspect.validateEntity();
        ok(!isOk, "validateEntity should have returned false");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 1, "length should be 1");
        ok(cust1.entityAspect.hasValidationErrors, "should have val errors");
    });
    
    test("custom entity validation - register validator", function () {
        var ms = MetadataStore.importMetadata(testFns.metadataStore.exportMetadata());
        var em = newEm(ms);
        var custType = ms.getEntityType("Customer");

        var zipCodeValidatorFactory = createZipCodeValidatorFactory();
        var zipCodeValidator = zipCodeValidatorFactory();
        custType.validators.push(zipCodeValidator);

        var msSerialized = em.metadataStore.exportMetadata();

        Validator.register(zipCodeValidator);
        var newMetadata = MetadataStore.importMetadata(msSerialized);
        var em2 = newEm(newMetadata);
        var custType2 = newMetadata.getEntityType("Customer");
        var cust1 = custType2.createEntity();
        cust1.setProperty("companyName", "Test1Co");
        cust1.setProperty("country", "GER");
        em2.attachEntity(cust1);
        ok(!cust1.entityAspect.hasValidationErrors, "should not have val errors");
        var valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "length should be 0");
        cust1.setProperty("country", "USA");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(!cust1.entityAspect.hasValidationErrors, "should not have val errors 2");
        ok(valErrors.length === 0, "length should be 0");
        var isOk = cust1.entityAspect.validateEntity();
        ok(!isOk, "validateEntity should have returned false");
        ok(cust1.entityAspect.hasValidationErrors, "should now have val errors");
        valErrors = cust1.entityAspect.getValidationErrors();
        ok(valErrors.length === 1, "length should be 0");
    });
    

    
    test("custom property numeric range validation", function () {
        var ms = MetadataStore.importMetadata(testFns.metadataStore.exportMetadata());
        var em = newEm(ms);
        var orderType = ms.getEntityType("Order");
        var freightProperty = orderType.getProperty("freight");

        var numericRangeValidatorFactory = createNumericRangeValidatorFactory();

        freightProperty.validators.push(numericRangeValidatorFactory({ min: 100, max: 500 }));
        var order1 = orderType.createEntity();
        order1.setProperty(testFns.orderKeyName, wellKnownData.dummyOrderID);
        em.attachEntity(order1);
        var valErrors = order1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "length should be 0"); // nulls do not cause failure
        order1.setProperty("freight", 0);
        valErrors = order1.entityAspect.getValidationErrors();
        ok(valErrors.length === 1, "length should be 1");
        ok(order1.entityAspect.hasValidationErrors, "should now have val errors");
        var ix = valErrors[0].errorMessage.indexOf("between the values of 100 and 500");
        order1.setProperty("freight", 200);
        valErrors = order1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "length should be 0");
        ok(!order1.entityAspect.hasValidationErrors, "should not have val errors");
        
    });
    
    test("custom property numeric range validation - register validatorFactory", function () {
        var ms = MetadataStore.importMetadata(testFns.metadataStore.exportMetadata());
        var em = newEm(ms);
        var orderType = ms.getEntityType("Order");
        var freightProperty = orderType.getProperty("freight");

        var numericRangeValidatorFactory = createNumericRangeValidatorFactory();
        freightProperty.validators.push(numericRangeValidatorFactory({ min: 100, max: 500 }));

        var serializedEm = em.exportEntities();
        Validator.registerFactory(numericRangeValidatorFactory, "numericRange");
        
        var em2 = EntityManager.importEntities(serializedEm);
        var orderType2 = em2.metadataStore.getEntityType("Order");
        var order1 = orderType2.createEntity();
        order1.setProperty(testFns.orderKeyName, wellKnownData.dummyOrderID);
        em2.attachEntity(order1);
        var valErrors = order1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "length should be 0"); // nulls do not cause failure
        order1.setProperty("freight", 0);
        valErrors = order1.entityAspect.getValidationErrors();
        ok(valErrors.length === 1, "length should be 1");
        var ix = valErrors[0].errorMessage.indexOf("between the values of 100 and 500");
        order1.setProperty("freight", 200);
        valErrors = order1.entityAspect.getValidationErrors();
        ok(valErrors.length === 0, "length should be 0");

    });
    
    function createZipCodeValidatorFactory() {
        return function () {
            // v in this case will be a Customer entity
            var valFn = function (v) {
                // This validator only validates US Zip Codes.
                if (v.getProperty("country") === "USA") {
                    var postalCode = v.getProperty("postalCode");
                    return isValidZipCode(postalCode);
                }
                return true;
            };
            var zipCodeValidator = new Validator("zipCodeValidator", valFn,
                { messageTemplate: "For the US, this is not a valid PostalCode" });
            return zipCodeValidator;
        };
    }

    function createNumericRangeValidatorFactory() {
        var validatorFactory = function (context) {
            var valFn = function (v, ctx) {
                if (v == null) return true;
                if (typeof (v) !== "number") return false;
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
        return validatorFactory;
    }
    
    function isValidZipCode(value) {
        var re = /^\d{5}([\-]\d{4})?$/;
        return (re.test(value));
    }
        
})(breezeTestFns);