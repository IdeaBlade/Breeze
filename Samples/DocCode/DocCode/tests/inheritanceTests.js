// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
// ReSharper disable AssignedValueIsNeverUsed
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
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

    var moduleOptions = testFns.getModuleOptions(newEm, addToMetadata);

    /************************** QUERIES *************************/

    module("inheritanceTests - queries", moduleOptions);
    /*********************************************************
    * can query the simple Vehicles model
    *********************************************************/

    asyncTest("can query all Buses (concrete)", 1, function () {
        var em = newEm();
        var resourceName = 'Buses';
        return EntityQuery.from(resourceName)
            .using(em).execute().then(querySuccess).fail(handleFail).fin(start);

        function querySuccess(data) {
            var len = data.results.length;
            equal(len, 1, "should fetch {0} from '{1}'.".format(len, resourceName));
        }
    });
    
    asyncTest("can query all Cars (concrete)", 2, function () {
        var em = newEm();
        var resourceName = 'Cars';
        return EntityQuery.from(resourceName).orderBy('Speed')
            .using(em).execute().then(querySuccess).fail(handleFail).fin(start);

        function querySuccess(data) {
            var len = data.results.length;
            equal(len, 2, "should fetch {0} from '{1}': {2}."
                    .format(len, resourceName,
                        data.results.map(function (v) { return v.Name(); }).join(", "))
            );

            // confirm that the ascending Speed 'orderBy' worked as well
            assertSortedByAscendingSpeed(resourceName, data.results);
        }
    });

    function assertSortedByAscendingSpeed(resourceName, results) {
        var isOrdered = true, testSpeed = 0;
        for (var i = 0, len = results.length; i < len; i++) {
            var speed = results[i].Speed();
            if (testSpeed <= speed) {
                testSpeed = speed;
            } else {
                isOrdered = false; break;
            }
        };
        ok(isOrdered, resourceName + " results should be in ascending 'Speed' order.");
    }
    
    asyncTest("can query all Vehicles (abstract)", 2, function () {
        var em = newEm();
        var resourceName = 'Vehicles';
        return EntityQuery.from(resourceName).orderBy('Speed')
            .using(em).execute().then(querySuccess).fail(handleFail).fin(start);

        function querySuccess(data) {
            var len = data.results.length;
            equal(len, 3, "should fetch {0} from '{1}': {2}."
                    .format(len, resourceName,
                        data.results.map(function (v) { return v.Name(); }).join(", "))
            );
            
            // confirm that the ascending Speed 'orderBy' worked as well
            assertSortedByAscendingSpeed(resourceName, data.results);
        }
    });

    /*********************************************************
    * can query all from each BillingType inherited type
    *********************************************************/
    asyncTest("can query all BankAccounts", 6, function () {
        var promises = inheritanceTypes.map(function (t) {
            // TPH test data always has 4 more than the others
            var expectedCount = /TPH/.test(t) ? 7 : 3;
            return assertCanQueryAll(bankRoot + t, expectedCount);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can query all CreditCards", 6, function () {
        var promises = inheritanceTypes.map(function (t) {
            // TPH test data always has 4 more than the others
            var expectedCount = /TPH/.test(t) ? 8 : 4;
            return assertCanQueryAll(cardRoot + t, expectedCount);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can query all base BillingDetails", 6, function () {
        var promises = inheritanceTypes.map(function (t) {
            // TPH test data always has 8 more than the others
            var expectedCount = /TPH/.test(t) ? 15 : 7;
            return assertCanQueryAll(baseRoot + t, expectedCount);
        });
        waitForTestPromises(promises);
    });

    function assertCanQueryAll(typeName, expectedCount) {
        var em = newEm();
        var resourceName = typeName + 's';

        return EntityQuery.from(resourceName).orderBy("Owner")
            .using(em).execute().then(querySuccess);

        function querySuccess(data) {
            var results = data.results, len = results.length;
            equal(len, expectedCount,
                "should fetch {0} from '{1}'.".format(len, resourceName));
          
            // confirm that the ascending Owner 'orderBy' worked as well
            var isOrdered = true, testOwner = "";
            for (var i = 0; i < len; i++) {
                var owner = results[i].Owner().toLowerCase();
                if (testOwner <= owner) {
                    testOwner = owner;
                } else {
                    isOrdered = false; break;
                }
            };
            ok(isOrdered, resourceName+" results should be in ascending 'Owner' order.");
        }
    }

    /*********************************************************
    * can filter each inherited type on a base class property
    *********************************************************/
    var ownerPredicate = new breeze.Predicate('Owner', 'contains', 'a');
    ownerPredicate.description = "where 'Owner' contains an 'a'";

    asyncTest("can filter 'Owner' in BankAccount", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            // TPH test data always has 2 more than the others
            var expectedCount = /TPH/.test(t) ? 4 : 2;
            return assertCanFilter(ownerPredicate, bankRoot + t, expectedCount);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can filter 'Owner' in CreditCard", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanFilter(ownerPredicate, cardRoot + t, 4);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can filter 'Owner' in base class BillingDetail", 3, function () {
        var promises = inheritanceTypes.map(function (t) {
            // TPH test data always has 2 more than the others
            var expectedCount = /TPH/.test(t) ? 8 : 6;
            return assertCanFilter(ownerPredicate, baseRoot + t, expectedCount);
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

    asyncTest("can filter on 'ExpiryMonth/Year' in CreditCard", 3, function() {
        var predicate = new breeze.Predicate('ExpiryMonth', 'eq', '04');
        predicate = predicate.and('ExpiryYear', 'eq', '2014');
        predicate.description = "where 'ExpiryMonth/Year' equals '04/2014'";

        var promises = inheritanceTypes.map(function(t) {
            return assertCanFilter(predicate, cardRoot + t, 1);
        });
        waitForTestPromises(promises);
    });

    /*********************************************************
    * can project across inheritance class boundary
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
                    ok(false, "Select query returned no results");
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
                    ok(false, "Select query returned no results");
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
            .orderBy("Id")
            .using(em).execute().then(querySuccess);

        function querySuccess(data) {
            var len = data.results.length;
            equal(len, take,
                "Should have {0} from '{1}' after taking {0} and skipping {2}."
                .format(take, resourceName, skip));
        }
    }

    /*********************************************************
    * can query derived types locally
    * NOTE: Must first register resourceNames for derived types
    *       See 'addToMetadata' below
    *********************************************************/
    asyncTest("can query in cache for BankAccount and CreditCard", 6, function () {

        var promises = inheritanceTypes.map(function (t) {
            return assertQueryLocally(t, 1);
        });
        waitForTestPromises(promises);

        function assertQueryLocally(inheritanceType) {
            var em = newEm();
            var bankType = bankRoot + inheritanceType;
            var cardType = cardRoot + inheritanceType;

            // Prime the cache with all BillingDetails
            return EntityQuery.from(baseRoot + inheritanceType + 's')
                .using(em).execute().then(querySuccess);

            function querySuccess(data) {

                var account = EntityQuery.from(bankType + 's')
                              .where('BankName', 'contains', 'Fun')
                              .using(em).executeLocally()[0];

                var card = EntityQuery.from(cardType + 's')
                              .where('ExpiryYear', 'eq', '2015')
                              .using(em).executeLocally()[0];
                
                if (account) {
                    ok(true, "Found {0} in cache: {1}: '{2}' for '{3}'."
                    .format(bankType, account.Id(), account.BankName(), account.Owner()));
                } else {
                    ok(false, "Did not find expected {0} in cache".format(bankType));
                }

                if (card) {
                    ok(true, "Found {0} in cache: {1}: for '{2}' expiring '{3}'."
                    .format(cardType, card.Id(), card.Owner(), card.ExpiryYear()));
                } else {
                    ok(false, "Did not find expected {0} in cache".format(cardType));
                }
                   
            }
        }

    });
    /*********************************************************
    * can do polymorphic query in cache
    * NOTE: Must first register resourceNames for derived types
    *       See 'addToMetadata' below
    *********************************************************/
    asyncTest("can do polymorphic query in cache", 9, function () {

        var promises = inheritanceTypes.map(function (t) {
            return assertPolymorphicQueryLocally(t, 1);
        });
        waitForTestPromises(promises);

        function assertPolymorphicQueryLocally(inheritanceType) {
            var em = newEm();
            var bankType = bankRoot + inheritanceType;
            var cardType = cardRoot + inheritanceType;
            var baseType = baseRoot + inheritanceType;

            // Prime the cache with all BillingDetails
            return EntityQuery.from(baseRoot + inheritanceType + 's')
                .using(em).execute().then(querySuccess);

            function querySuccess(data) {

                var bases = EntityQuery.from(baseType + 's')
                              .where('Owner', 'contains', 'a')
                              .using(em).executeLocally();

                var len = bases.length;
                ok(len, "Should have {0}s in cache with 'Owner' containing 'a'; found {1}."
                    .format(baseType, len));

                var accounts = bases.filter(function (entity) { return entity.entityType.shortName === bankType; });
                len = accounts.length;
                ok(len, "Should have {0}s among the {1}s in cache with 'Owner' containing 'a'; found {2}."
                    .format(bankType, baseType, len));

                var cards = bases.filter(function (entity) { return entity.entityType.shortName === cardType; });
                len = cards.length;
                ok(len, "Should have {0}s among the {1}s in cache with 'Owner' containing 'a'; found {2}."
                    .format(cardType, baseType, len));

            }
        }

    });
    /*********************************************************
     * can navigate to pre-loaded AccountTypes
     * First fetches AccountTypes into cache
     * Then gets one each of every flavor of BankAccount and CreditCard
     * and asserts that can navigate from it to an AccountType in cache
     *********************************************************/
    asyncTest("can navigate to pre-loaded AccountTypes", 12, function () {
        var em = newEm();

        // pre-load AccountTypes
        EntityQuery.from('AccountTypes')
            .using(em).execute()
            .then(navigateTests).fail(handleFail).fin(start);

        // Fetch a BankAccount and CreditCard of each flavor
        // then prove can navigate to related AccountType
        function navigateTests() {

            var bankPromises = inheritanceTypes.map(function(t) {
                return EntityQuery.from(bankRoot + t + 's').take(1)
                    .using(em).execute().then(NavToAccountType).fail(handleFail);
            });

            var cardPromises = inheritanceTypes.map(function(t) {
                return EntityQuery.from(cardRoot + t + 's').take(1)
                    .using(em).execute().then(NavToAccountType).fail(handleFail);
            });

            // wait for all to be resolved
            return Q.allSettled(bankPromises.concat(cardPromises))
                    .then(reportRejectedPromises);
        }
    });

    // Assert can navigate to the related AccountType
    function NavToAccountType(data) {
        var entity = data.results[0];
        var type = data.query.entityType.shortName;

        if (!entity) {
            ok(false, "a query failed to return a single " + type);

        } else if (typeof entity.AccountType !== 'function') {
            ok(false, type + " doesn't have an AccountType KO property");

        } else {
            verifyThatRelatedAccountTypeIsInCache(entity);
            var accountType = entity.AccountType();
            if (accountType) {
                ok(true, "{0} loaded an AccountType named {1}"
                    .format(type, accountType.Name()));
            } else {
                ok(false, type + " failed to load or associate with its AccountType.");

            }
        }
    }

    function verifyThatRelatedAccountTypeIsInCache(entity) {
        var type = entity.entityType.shortName;
        var manager = entity.entityAspect.entityManager;
        var accountType = manager.getEntityByKey("AccountType", entity.AccountTypeId());
        ok(accountType, "{0}'s AccountType, '{1}', is actually in cache."
            .format(type, accountType.Name()));
    }
    
    /*********************************************************
    * can navigate to AccountType when eagerly loaded with expand
    * Tests one each of every flavor of BankAccount and CreditCard
    *********************************************************/
    asyncTest("can navigate to AccountType eagerly loaded with expand", 12, function () {

        // Fetch a BankAccount and CreditCard of each flavor using expand
        // then prove can navigate to related AccountType

        var bankPromises = inheritanceTypes.map(function(t) {
            var em = newEm();
            return EntityQuery.from(bankRoot + t + 's').take(1)
                .expand('AccountType')
                .using(em).execute().then(NavToAccountType).fail(handleFail);
        });

        var cardPromises = inheritanceTypes.map(function(t) {
            var em = newEm();
            return EntityQuery.from(cardRoot + t + 's').take(1)
                .expand('AccountType')
                .using(em).execute().then(NavToAccountType).fail(handleFail);
        });

        // wait for all to be resolved
        return Q.allSettled(bankPromises.concat(cardPromises))
                .then(reportRejectedPromises).fin(start);

    });
    /*********************************************************
    * can navigate to AccountType when loaded on-demand
    * Tests one each of every flavor of BankAccount and CreditCard
    *********************************************************/
    asyncTest("can navigate to AccountType loaded on-demand", 12, function ()  {

        // Fetch a BankAccount and CreditCard of each flavor
        // then load the AccountType property and
        // then prove can navigate to related AccountType
        var bankPromises = inheritanceTypes.map(function(t) {
            var em = newEm();
            return EntityQuery.from(bankRoot + t + 's').take(1)
                .using(em).execute().then(NavToAccountTypeOnDemand).fail(handleFail);
        });

        var cardPromises = inheritanceTypes.map(function(t) {
            var em = newEm();
            return EntityQuery.from(cardRoot + t + 's').take(1)
                .using(em).execute().then(NavToAccountTypeOnDemand).fail(handleFail);
        });

        // wait for all to be resolved
        return Q.allSettled(bankPromises.concat(cardPromises))
                .then(reportRejectedPromises).fin(start);


        // Assert can load the related AccountType on-demand
        function NavToAccountTypeOnDemand(data) {
            var entity = data.results[0];
            var type = data.query.entityType.shortName;

            if (!entity) {
                ok(false, "a query failed to return a single " + type);
                return false;
            }

            if (typeof entity.AccountType !== 'function') {
                ok(false, type + " doesn't have an AccountType KO property");
                return false;
            } 
            
            return entity.entityAspect.loadNavigationProperty("AccountType")
                    .then(function () {
                        verifyThatRelatedAccountTypeIsInCache(entity);
                        var accountType = entity.AccountType();
                        if (accountType) {
                            ok(true, "{0} loaded an AccountType named {1}"
                                .format(type, accountType.Name()));
                        } else {
                            ok(false, type + " failed to load or associate with its AccountType.");
                        }
                    });
        }

    });
    /*********************************************************
     * can load inherited types with expand on Status query
     * Only available for TPH and TPT (not TPC)
     *********************************************************/
    asyncTest("can load inherited types with expand on Status query", 4, function () {
        var em = newEm();

        EntityQuery.from('AccountTypes')
            .using(em).execute()
            .then(navigateTests).fail(handleFail).fin(start);

        // Fetch a BankAccount and CreditCard of each flavor
        // then prove can navigate to related AccountType
        function navigateTests() {

            var tphPromise = EntityQuery.from('StatusTPHs').expand("BillingDetails")
                .where("Name", "eq", "Closed")
                .using(em).execute().then(NavFromStatus).fail(handleFail);

            var tptPromise = EntityQuery.from('StatusTPTs').expand("BillingDetails")
                .where("Name", "eq", "Closed")
                .using(em).execute().then(NavFromStatus).fail(handleFail);

            // wait for all to be resolved
            return Q.allSettled([tphPromise, tptPromise])
                    .then(reportRejectedPromises);
        }
    });
    // Assert can navigate from Status to the related BillingDetails
    function NavFromStatus(data) {
        var status = data.results[0];
        var type = data.query.entityType.shortName;

        if (!status) {
            ok(false, "a query failed to return a single " + type);

        } else if (typeof status.BillingDetails !== 'function') {
            ok(false, type + " doesn't have a 'BillingDetails' KO property");

        } else {
            assertBillingDetailsAreInCache(status);
            var details = status.BillingDetails();
            var len = details.length;
            ok(len, "should have loaded BillingDetails for {0}:{1}; 'BillingDetails' property returned {2} of them."
                    .format(type, status.Name(), len));
        }
    }
    function assertBillingDetailsAreInCache(entity) {
        var manager = entity.entityAspect.entityManager;
        var typeName = entity.entityType.shortName;
        var inheritanceType = typeName.substring(typeName.length - 3);
        
        var accounts = manager.getEntities(['BankAccount' + inheritanceType]);
        var cards = manager.getEntities(['CreditCard' + inheritanceType]);
        
        var accountsLen = accounts.length;
        var cardsLen = cards.length;
        ok(accountsLen && cardsLen,
            "should have BillingDetails; [BankAccounts {0}, CreditCards {1}].".
                format(accountsLen, cardsLen));
    }
    /*********************************************************
    * can navigate to Deposits when eager loaded with expand
    *********************************************************/
    asyncTest("can navigate to BankAccount Deposits eagerly loaded with expand", 3, function () {

        // Fetch a BankAccount and CreditCard of each flavor using expand
        // then prove can navigate to related AccountType

        var bankPromises = inheritanceTypes.map(function (t) {
            var em = newEm();
            return EntityQuery.from(bankRoot + t + 's').take(1)
                .expand('Deposits')
                .using(em).execute().then(NavToDeposits).fail(handleFail);
        });

        waitForTestPromises(bankPromises);
    });
    

    // Assert can navigate to the related BankAccount Deposits
    function NavToDeposits(data) {
        var account = data.results[0];
        var type = data.query.entityType.shortName;

        if (!account) {
            ok(false, "a query failed to return a single " + type);

        } else if (typeof account.Deposits !== 'function') {
            ok(false, type + " doesn't have a 'Deposits' KO property");

        } else {
            var deposits = account.Deposits();
            var len = deposits.length;
            ok(len, "should have loaded deposits for {0}:{1}; 'Deposits' property returned {2} of them."
                    .format(type, account.Id(), len));
        }
    }

    /*********************************************************
     * can retrieve entities of self-referencing abstract base class
     *********************************************************/
    asyncTest("can retrieve entities of self-referencing base (concrete class query)", 1, function () {
        var em = newEm();
        var resourceName = 'SoftProjects';
        return EntityQuery.from(resourceName)
            .using(em).execute().then(querySuccess).fail(handleFail).fin(start);

        function querySuccess(data) {
            var len = data.results.length;
            equal(len, 2, "should fetch {0} from '{1}'.".format(len, resourceName));
        }
    });
    asyncTest("can retrieve entities of self-referencing base (abstract class query)", 1, function () {
        var em = newEm();
        var resourceName = 'Projects';
        return EntityQuery.from(resourceName)
            .using(em).execute().then(querySuccess).fail(handleFail).fin(start);

        function querySuccess(data) {
            var len = data.results.length;
            equal(len, 3, "should fetch {0} from '{1}'.".format(len, resourceName));
        }
    });
    /************************** SAVES *************************/

    // reset inheritance db after each save module test because we're messing it up
    var saveModuleOptions = {
        setup: moduleOptions.setup,
        teardown: testFns.teardown_inheritanceReset
    };

    module("inheritanceTests - saves", saveModuleOptions);

    var createdAt = new Date(2013, 1, 1);
    var idSeed = 10000; // for TPC inheritance; start way out there.
    
    /*********************************************************
    * can add, save, and requery new derived types
    *********************************************************/
    asyncTest("can add, save, and requery a BankAccount", 3, function () {
        var inits = makeBankAccountInits({ Number: "112-221" });
        var promises = inheritanceTypes.map(function (t) {
            return saveAndRequery(bankRoot + t, inits);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can add, save, and requery a CreditCard", 3, function () {
        var inits = makeCreditCardInits({ Number: "555-55-5555" });
        var promises = inheritanceTypes.map(function (t) {
            return saveAndRequery(cardRoot + t, inits);
        });
        waitForTestPromises(promises);
    });

    function saveAndRequery(typeName, inits) {
        var em = newEm();
        var detail;
        try {
            ensureIdForTPC(typeName, inits);
            detail = em.createEntity(typeName, inits);
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
            var key = detail.entityAspect.getKey();
            return em.fetchEntityByKey(key).then(requerySuccess);
        }

        function requerySuccess(data) {
            var refetched = data.entity;
            // all BillingDetail classes have the 'Number' property
            equal(refetched.Number(), detail.Number(),
                    "refetched the saved {0} with number {1}"
                        .format(typeName, detail.Number()));
        }
    }  

    /*********************************************************
    * can update a base class property and derived property of each inherited type
    *********************************************************/

    asyncTest("can update the 'Owner' & 'BankName' of a BankAccount", 9, function () {
        var testHelper = {
            updater: function (account) { account.BankName("Test"); },
            tester: function (account) { return account.BankName() === "Test"; }
        };
        
        var promises = inheritanceTypes.map(function (t) {
            return assertCanUpdate(bankRoot + t, testHelper);
        });
        waitForTestPromises(promises);
    });

    asyncTest("can update the 'Owner'& 'ExpiryYear' of a CreditCard", 9, function () {
        var testHelper = {
            updater: function (card) { card.ExpiryYear("Test"); },
            tester: function (card) { return card.ExpiryYear() === "Test"; }
        };
        var promises = inheritanceTypes.map(function (t) {
            return assertCanUpdate(cardRoot + t, testHelper);
        });
        waitForTestPromises(promises);
    });
    
    function assertCanUpdate(typeName, testHelper) {
        var em = newEm();
        var targetEntity;
        var testOwner = "Test Owner";

        return EntityQuery.from(typeName + 's').take(1)
            .using(em).execute().then(querySuccess);

        function querySuccess(data) {
            targetEntity = data.results[0];
            
            var propertyChanges = 0;
            targetEntity.entityAspect.propertyChanged.subscribe(function (args) {
                propertyChanges += 1;
            });
            targetEntity.Owner(testOwner);
            testHelper.updater(targetEntity);

            equal(propertyChanges, 2,
                "should have triggered two propertyChanges on the " + typeName);
            
            return em.saveChanges().then(saveSuccess).fail(handleFail);
        }

        function saveSuccess(saveResult) {
            var savedEntity = (saveResult.entities.length === 1) && saveResult.entities[0];
            ok(savedEntity === targetEntity &&
                targetEntity.Owner() === testOwner,
                "should have saved the updated 'Owner' on the " + typeName);
            ok(testHelper.tester(targetEntity), 'should have saved the updated property on the ' + typeName);

        }
    }

    /*********************************************************
    * can delete each inherited type
    *********************************************************/

    asyncTest("can delete a BankAccount", 9, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanDelete(bankRoot + t, "Deposits");
        });
        waitForTestPromises(promises);
    });

    asyncTest("can delete a CreditCard", 9, function () {
        var promises = inheritanceTypes.map(function (t) {
            return assertCanDelete(cardRoot + t);
        });
        waitForTestPromises(promises);
    });

    function assertCanDelete(typeName, expandPropName) {
        var em = newEm();
        var targetEntity;
        var key;

        var q = EntityQuery.from(typeName + 's').take(1);
        if (expandPropName) {
            q = q.expand(expandPropName);
        }
        return q.using(em).execute().then(querySuccess);

        function querySuccess(data) {
            targetEntity = data.results[0];

            if (expandPropName) {
                var dependentEntities = targetEntity.getProperty(expandPropName);
                // dependentEntities is a 'live' collection - so we need to clone it before iterating over it.
                dependentEntities.slice(0).forEach(function (de) {
                    de.entityAspect.setDeleted();
                });
            }
            // can't delete the parent until we get rid of the children
            // because the children will no longer be available from the parent once the parent is deleted.
            targetEntity.entityAspect.setDeleted();

            key = targetEntity.entityAspect.getKey();
            return em.saveChanges().then(saveSuccess).fail(handleFail);
        }

        function saveSuccess(saveResult) {
            var savedEntities = saveResult.entities;

            ok(savedEntities.indexOf(targetEntity) >= 0,
                "should have a deleted " + typeName + " in the save result");
            ok(savedEntities.every(function (entity) {
                return entity.entityAspect.entityState.isDetached();
            }), "all deleted entities should now be 'Detached'");

            return em.fetchEntityByKey(key).then(requerySuccess);
        }

        function requerySuccess(data) {
            var refetched = data.entity;
            ok(!refetched, "requery of the deleted {0} with key '{1}' should return null because no longer in the db."
            .format(typeName, JSON.stringify(key.values)));
        }
    }
    

    /************************** Changes/Validation *************************/

    module("inheritanceTests - change & validation", moduleOptions);

    /*********************************************************
    * Server model base class validation rule propagated to derived type
    *********************************************************/
    test("base class 'Owner' required validation applies to derived types", 6, function () {
        var em = newEm();
        inheritanceTypes.map(function (t) {
            var inits = makeBankAccountInits({ Owner: "" }); // invalid
            return assertOwnerIsRequired(em, bankRoot + t, inits);
        });
        inheritanceTypes.map(function (t) {
            var inits = makeCreditCardInits({ Owner: "" });
            return assertOwnerIsRequired(em, cardRoot + t, inits);
        });

        function assertOwnerIsRequired(manager, typeName, inits) {
            ensureIdForTPC(typeName, inits);
            var entity = em.createEntity(typeName, inits);

            var valErrors = entity.entityAspect.getValidationErrors();

            var ownerRequiredError = valErrors.filter(function (err) {
                return err.propertyName === "Owner" && err.validator.name === "required";
            })[0];

            ok(ownerRequiredError, "should have 'Owner required' error for the " + typeName);
        }
    });
    
    test("base class 'Owner' max length validation applies to derived types", 6, function () {
        var em = newEm();
        var testOwner = "A way way way way way way way way way too long owner name";
        inheritanceTypes.map(function (t) {
            var inits = makeBankAccountInits({ Owner: testOwner }); // invalid
            return assertOwnerTooLong(em, bankRoot + t, inits);
        });
        inheritanceTypes.map(function (t) {
            var inits = makeCreditCardInits({ Owner: testOwner });
            return assertOwnerTooLong(em, cardRoot + t, inits);
        });

        function assertOwnerTooLong(manager, typeName, inits) {
            ensureIdForTPC(typeName, inits);
            var entity = em.createEntity(typeName, inits);

            var valErrors = entity.entityAspect.getValidationErrors();

            var ownerTooLongError = valErrors.filter(function (err) {
                return err.propertyName === "Owner" && err.validator.name === "maxLength";
            })[0];

            ok(ownerTooLongError, "should have 'Owner' max length error for the " + typeName);
        }
    });
    /************************** TEST HELPERS *************************/
    function addToMetadata(metadataStore) {

        // Registering resource names for each derived type
        // because these resource names are not in metadata
        // because there are no corresponding DbSets in the DbContext
        // and that's how Breeze generates resource names

        inheritanceTypes.map(function (t) {
            var typeName = bankRoot + t;
            metadataStore.setEntityTypeForResourceName(typeName + 's', typeName);
        });
        inheritanceTypes.map(function (t) {
            var typeName = cardRoot + t;
            metadataStore.setEntityTypeForResourceName(typeName + 's', typeName);
        });       
    }
    
    // A new TPC entity must have a client-assigned 'Id'
    function ensureIdForTPC(typeName, inits) {
        var isTPC = typeName.indexOf("TPC") > -1;
        if (isTPC && !inits.Id) {
            inits.Id = idSeed++;
        }
        return inits;
    }
    function makeBankAccountInits(changes) {
        var defaultBankAccount = {
            CreatedAt: createdAt,
            Owner: "Richie Rich",
            Number: "321-123",
            BankName: "Bank of Breeze",
            Swift: "BOFBRZEX",
            AccountTypeId: 1,
            StatusId:1
        };
        return extend(extend({}, defaultBankAccount), changes || {});
    };
    
    function makeCreditCardInits(changes) {
        var defaultCard = {
            CreatedAt: createdAt,
            Owner: "Owen Toomuch",
            Number: "424-4242-424",
            ExpiryMonth: "03",
            ExpiryYear: "2016",
            AccountTypeId: 4,
            StatusId: 1
        };
        return extend(extend({}, defaultCard), changes || {});
    };

})(docCode.testFns);