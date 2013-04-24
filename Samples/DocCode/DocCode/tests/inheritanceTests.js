// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming

define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var breeze = testFns.breeze;
    var extend = breeze.core.extend;
    var EntityQuery = breeze.EntityQuery;

    var waitForTestPromises = testFns.waitForTestPromises;
    var handleFail = testFns.handleFail;
    var reportRejectedPromises = testFns.reportRejectedPromises;

    // Target the Inheritance service
    var serviceName = testFns.inheritanceServiceName;
    var newEm = testFns.newEmFactory(serviceName);

    // EntityType root names
    var bankRoot = "BankAccount";
    var cardRoot = "CreditCard";
    var baseRoot = "BillingDetail";

    // EntityType name = rootname + inheritanceType
    var inheritanceTypes = ["TPH", "TPT", "TPC"];

    var moduleOptions = testFns.getModuleOptions(newEm);

    /************************** QUERIES *************************/

    module("inheritanceTests - queries", moduleOptions);

    /*********************************************************
    * can query all from each inherited type
    *********************************************************/
    asyncTest("can query all BankAccounts", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanQueryAll(bankRoot + t, 3);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can query all CreditCards", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanQueryAll(cardRoot + t, 4);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can query all base BillingDetails", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanQueryAll(baseRoot + t, 7);
        });
        waitForTestPromises(promises);
    });

    function assertCanQueryAll(typeName, expectedCount) {
        var em = newEm();
        var resourceName = typeName + 's';

        return EntityQuery.from(resourceName)
            .using(em).execute().then(querySuccess);

        function querySuccess(data) {
            var len = data.results.length;
            equal(len, expectedCount,
                "Should fetch {0} from '{1}'.".format(len, resourceName));
        }
    }

    /*********************************************************
    * can filter each inherited type and flavor
    *********************************************************/
    var predicate = new breeze.Predicate('Owner', 'contains', 'a');
    predicate.description = "where 'Owner' contains an 'a'";

    asyncTest("can filter base class property, 'Owner', in BankAccount", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanFilter(predicate, bankRoot + t, 2);
        });
        waitForTestPromises(promises);
    });

    function assertCanFilter(predictate, typeName, expectedCount) {
        var em = newEm();
        var resourceName = typeName + 's';

        return EntityQuery.from(resourceName)
            .where(predicate).using(em).execute().then(querySuccess);

        function querySuccess(data) {
            var len = data.results.length;
            equal(len, expectedCount,
                "Should fetch {0} from '{1}' {2}.".format(len, resourceName, predicate.description));
        }
    }
    /************************** SAVES *************************/

    // reset inheritance db after each save module test because we're messing it up
    var saveModuleOptions = {
        setup: moduleOptions.setup,
        teardown: testFns.teardown_inheritanceReset
    };

    module("inheritanceTests - saves", saveModuleOptions);

    var createdAt = new Date(2013, 1, 1);
    
    var makeBankAccountInits = function (changes) {
        var defaultBankAccount = {
            CreatedAt: createdAt,
            Owner: "Richie Rich",
            Number: "321-123",
            BankName: "Bank of Breeze",
            Swift: "BOFBRZEX",
            AccountTypeId: 1
        };
        return extend(extend({}, defaultBankAccount), changes || {});
    };
    var makeCreditCardInits = function (changes) {
        var defaultCard = {
            CreatedAt: createdAt,
            Owner: "Owen Toomuch",
            Number: "424-4242-424",
            ExpiryMonth: "03",
            ExpiryYear: "2016",
            AccountTypeId: 4
        };
        return extend(extend({}, defaultCard), changes || {});
    };
    /*********************************************************
    * can save and requery a new bankaccount
    *********************************************************/
    asyncTest("can save and requery a BankAccount", 3, function () {
        var inits = makeBankAccountInits({ Number: "112-221" });
        var promises = inheritanceTypes.map(function (t) {
            return saveAndRequeryBillingDetailClass(bankRoot + t, inits);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can save and requery a CreditCard", 3, function () {
        var inits = makeCreditCardInits({ Number: "555-55-5555" });
        var promises = inheritanceTypes.map(function (t) {
            return saveAndRequeryBillingDetailClass(cardRoot + t, inits);
        });
        waitForTestPromises(promises);
    });

    function saveAndRequeryBillingDetailClass(typeName, inits) {
        var em = newEm();
        try {
            var detail = em.createEntity(typeName, inits);
        } catch (ex) {
            ok(false, "Threw exception creating a '{0}': '{1}'."
                .format(typeName, ex.message));
            return Q(true); // caught it; keep going
        }      
        return em.saveChanges().then(saveSuccess);

        function saveSuccess(saveResult) {
            if (!saveResult.savedEntities) {
                ok(false, "Didn't save");
                return false;
            }
            // re-query into clean em to confirm BillingDetail really did get saved
            em.clear();
            return em.fetchEntityByKey(detail.entityAspect.key).then(requerySuccess);
        }

        function requerySuccess(data) {
            var refetched = data.entity;
            // all BillingDetail classes have the 'Number' property
            equal(refetched.Number(), detail.Number(),
                    "refetched the saved {0} with number {1}"
                        .format(typeName, detail.Number()));
        }
    }

});