// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming

define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var breeze = testFns.breeze;
    var extend = breeze.core.extend;

    // Classes we'll need from the breeze namespaces
    var EntityQuery = breeze.EntityQuery;
    var handleFail = testFns.handleFail;

    // Target the Inheritance service
    var serviceName = testFns.inheritanceServiceName;
    var newEm = testFns.newEmFactory(serviceName);

    var bankTypeName = {
        TPH: 'BankAccountTPH',
        TPT: 'BankAccountTPT',
        TPC: 'BankAccountTPC'
    };
    var cardTypeName = {
        TPH: 'CreditCardTPH',
        TPT: 'CreditCardTPT',
        TPC: 'CreditCardTPC'
    };
    var billingDetailTypeName = {
        TPH: 'BillingDetailTPH',
        TPT: 'BillingDetailTPT',
        TPC: 'BillingDetailTPC'
    };

    var moduleOptions = testFns.getModuleOptions(newEm);

    /************************** QUERIES *************************/

    module("inheritanceTests - queries", moduleOptions);


    /*********************************************************
    * can query all from each inherited type and flavor
    *********************************************************/
    test("can query all BankAccountTPHs", queryAllBankAccounts("TPH"));
    test("can query all BankAccountTPTs", queryAllBankAccounts("TPT"));
    test("can query all BankAccountTPCs", queryAllBankAccounts("TPC"));

    function queryAllBankAccounts(flavor) {
        return function () {
            expect(1);  assertCanQueryAll(bankTypeName[flavor], 3);
        };
    }

    test("can query all CreditCardTPHs", queryAllCreditCards("TPH"));
    test("can query all CreditCardTPTs", queryAllCreditCards("TPT"));
    test("can query all CreditCardTPCs", queryAllCreditCards("TPC"));
    function queryAllCreditCards(flavor) {
        return function () {
            expect(1); assertCanQueryAll(cardTypeName[flavor], 4);
        };
    }

    test("can query all base BillingDetailTPHs", queryAllBillingDetails("TPH"));
    test("can query all base BillingDetailTPTs", queryAllBillingDetails("TPT"));
    test("can query all base BillingDetailTPCs", queryAllBillingDetails("TPC"));
    function queryAllBillingDetails(flavor) {
        return function () {
            expect(1); assertCanQueryAll(billingDetailTypeName[flavor], 7);
        };
    }

    function assertCanQueryAll(typeName, expectedCount) {
        var resourceName = typeName + 's';
        var em = newEm();
        stop(); // going async ... 
        EntityQuery.from(resourceName).using(em).execute()
            .then(querySuccess).fail(handleFail).fin(start);

        function querySuccess(data) {
            var len = data.results.length;
            equal(len, expectedCount, 
                "Should fetch {0} from '{1}'.".format(len, resourceName));
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

            var typeName = bankTypeName[flavor];       
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