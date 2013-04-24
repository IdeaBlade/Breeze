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
        var protoBankAccount = {
            CreatedAt: createdAt,
            Owner: "Joe Blow",
            Number: "321-123",
            BankName: "Bank of Breeze",
            Swift: "BOFBRZEX",
            AccountTypeId: 1
        };
        return extend(extend({}, protoBankAccount), changes);
    };

    /*********************************************************
    * can save and requery a new bankaccount
    *********************************************************/
    test("can save and requery a BankAccountTPH", saveRequeryBankAccount("TPH"));
    test("can save and requery a BankAccountTPT", saveRequeryBankAccount("TPT"));
    test("can save and requery a BankAccountTPC", saveRequeryBankAccount("TPC"));
    
    function saveRequeryBankAccount(flavor) {
        return function () {
            expect(1);

            var typeName = bankRoot[flavor];       
            var em = newEm(); 

            var account = em.createEntity(typeName, makeBankAccountInits({ Number: "112-221" }));

            stop(); // going async ... 
            em.saveChanges().then(saveSuccess).fail(handleFail).fin(start);
            
            function saveSuccess(saveResult) {
                // re-query into clean em to confirm it really did get saved
                em.clear();
                return em.fetchEntityByKey(account.entityAspect.key).then(requerySuccess);
            }
            function requerySuccess(data) {
                var refetchedAccount = data.entity;
                equal(refetchedAccount.Number(), account.Number(),
                        "refetched the saved {0} with number {1}"
                            .format(typeName, account.Number()));
            }
        };
    }

});