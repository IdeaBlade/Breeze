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
    * can filter each inherited type on a base class property
    *********************************************************/
    var predicate = new breeze.Predicate('Owner', 'contains', 'a');
    predicate.description = "where 'Owner' contains an 'a'";

    asyncTest("can filter 'Owner' in BankAccount", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanFilter(predicate, bankRoot + t, 2);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can filter 'Owner' in CreditCard", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanFilter(predicate, cardRoot + t, 4);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can filter 'Owner' in base class BillingDetail", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanFilter(predicate, baseRoot + t, 6);
        });
        waitForTestPromises(promises);
    });

    function assertCanFilter(predicate, typeName, expectedCount) {
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

    /*********************************************************
    * can filter each derived type on its own property
    *********************************************************/

    asyncTest("can filter on 'BankName' in BankAccount", 3, function () {
        var predicate = new breeze.Predicate('BankName', 'contains', 'Fun');
        predicate.description = "where 'BankName' contains 'Fun'";

        var promises = inheritanceTypes.map(function (t) {
            return assertCanFilter(predicate, bankRoot + t, 1);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can filter on 'ExpiryMonth/Year' in CreditCard", 3, function () {
        var predicate = new breeze.Predicate('ExpiryMonth', 'eq', '04');
        predicate = predicate.and('ExpiryYear', 'eq', '2014')
        predicate.description = "where 'ExpiryMonth/Year' equals '04/2014'";

        var promises = inheritanceTypes.map(function (t) {
            return assertCanFilter(predicate, cardRoot + t, 1);
        });
        waitForTestPromises(promises);
    })

    /*********************************************************
    * can select across inheritance class boundary
    *********************************************************/

    asyncTest("can select {'Id', 'Owner', 'BankName'} in BankAccount", 6, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanProjectOnBankAccount(t, 1);
        });
        waitForTestPromises(promises);

        function assertCanProjectOnBankAccount(inheritanceType, expectedCount) {
            var em = newEm();
            var typeName = bankRoot + inheritanceType;
            var resourceName = typeName + 's';

            return EntityQuery.from(resourceName)
                .select('Id, Owner, BankName')
                .using(em).execute().then(querySuccess);

            function querySuccess(data) {
                var first = data.results[0];
                if (!first) {
                    ok(false, "Select query returned no results")
                    return;
                }

                var propertyCount = 0;
                for (var _ in first){propertyCount++;}
                equal(propertyCount, 3, "Should return a " + typeName + " projection with 3 properties");

                ok(first.Id && first.Owner && first.BankName,
                    "First {0} should fill the expected properties: {Id:{1}, Owner:'{2}', BankName:'{3}'}"
                   .format(typeName, first.Id, first.Owner, first.BankName));
            }
        }
    });


    asyncTest("can select {'Id', 'Owner', 'ExpiryYear'} in CreditCard", 6, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanProjectOnCardAccount(t, 1);
        });
        waitForTestPromises(promises);

        function assertCanProjectOnCardAccount(inheritanceType, expectedCount) {
            var em = newEm();
            var typeName = cardRoot + inheritanceType;
            var resourceName = typeName + 's';

            return EntityQuery.from(resourceName)
                .select('Id, Owner, ExpiryYear')
                .using(em).execute().then(querySuccess);

            function querySuccess(data) {
                var first = data.results[0];
                if (!first) {
                    ok(false, "Select query returned no results")
                    return;
                }

                var propertyCount = 0;
                for (var _ in first) { propertyCount++; }
                equal(propertyCount, 3, "Should return a " + typeName + " projection with 3 properties");

                ok(first.Id && first.Owner && first.ExpiryYear,
                    "First {0} should fill the expected properties: {Id:{1}, Owner:'{2}', ExpiryYear:'{3}'}"
                   .format(typeName, first.Id, first.Owner, first.ExpiryYear));
            }
        }
    });
    /*********************************************************
     * can page (take/skip)
     * This test succeeds when we know how many items are in test data
     *********************************************************/
    asyncTest("can page BankAccounts", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanSkipTake(bankRoot + t, 1, 2);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can page CreditCards", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanSkipTake(cardRoot + t, 2, 2);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can page base BillingDetails", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanSkipTake(baseRoot + t, 4, 3);
        });
        waitForTestPromises(promises);
    });

    function assertCanSkipTake(typeName, skip, take) {
        var em = newEm();
        var resourceName = typeName + 's';

        return EntityQuery.from(resourceName)
            .skip(skip).take(take)
            .using(em).execute().then(querySuccess);

        function querySuccess(data) {
            var len = data.results.length;
            equal(len, take,
                "Should have {0} from '{1}' after taking {0} and skipping {2}."
                .format(take, resourceName, skip));
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

    var _id = 1000;
    /*********************************************************
    * can save and requery a new bankaccount
    *********************************************************/
    asyncTest("can save and requery a BankAccount", 3, function () {
        var inits = makeBankAccountInits({ Number: "112-221" });
        var promises = inheritanceTypes.map(function (t) {
            if (t === "TPC") {
                _id = _id + 1;
                inits.Id = _id;
            }
            return saveAndRequeryBillingDetailClass(bankRoot + t, inits);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can save and requery a CreditCard", 3, function () {
        var inits = makeCreditCardInits({ Number: "555-55-5555" });
        var promises = inheritanceTypes.map(function (t) {
            if (t === "TPC") {
                _id = _id + 1;
                inits.Id = _id;
            }
            return saveAndRequeryBillingDetailClass(cardRoot + t, inits);
        });
        waitForTestPromises(promises);
    });

    function saveAndRequeryBillingDetailClass(typeName, inits) {
        var em = newEm();
        addToMetadata(em.metadataStore);
        try {
            var detail = em.createEntity(typeName, inits);
        } catch (ex) {
            ok(false, "Threw exception creating a '{0}': '{1}'."
                .format(typeName, ex.message));
            return Q(true); // caught it; keep going
        }      
        return em.saveChanges().then(saveSuccess);

        function saveSuccess(saveResult) {
            if (!saveResult.entities) {
                ok(false, "Didn't save");
                return false;
            }
            // re-query into clean em to confirm BillingDetail really did get saved
            em.clear();
            return em.fetchEntityByKey(detail.entityAspect.getKey()).then(requerySuccess);
        }

        function requerySuccess(data) {
            var refetched = data.entity;
            // all BillingDetail classes have the 'Number' property
            equal(refetched.Number(), detail.Number(),
                    "refetched the saved {0} with number {1}"
                        .format(typeName, detail.Number()));
        }
    }
    
    function addToMetadata(metadataStore) {

        inheritanceTypes.map(function (t) {
            var typeName = bankRoot + t;
            metadataStore.setEntityTypeForResourceName(typeName + 's', typeName);
        });
        inheritanceTypes.map(function (t) {
            var typeName = cardRoot + t;
            metadataStore.setEntityTypeForResourceName(typeName + 's', typeName);
        });
    }


});