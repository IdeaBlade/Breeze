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

    var moduleOptions = testFns.getModuleOptions(newEm);

    /*** SAVES ***/

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
    test("can save and requery a bankaccountTPH", saveRequeryBankAccount("TPH"));
    test("can save and requery a bankaccountTPT", saveRequeryBankAccount("TPT"));
    test("can save and requery a bankaccountTPC", saveRequeryBankAccount("TPC"));
    
    function saveRequeryBankAccount(flavor) {
        return function () {
            expect(1);

            var typeName = 'BankAccount' + flavor;       
            var em = newEm(); 
            debugger;
            var account = em.createEntity(typeName, makeBankAccountInits({ Number: "112-221" }));

            stop(); // going async ... 
            em.saveChanges().then(saveSuccess).fail(handleFail).fin(start);
            
            function saveSuccess(saveResult) {
                // re-query into clean em to confirm it really did get saved
                em.clear();
                return em.fetchEntityByKey(account.entityAspect.key).then(requerySuccess);
            }
            function requerySuccess(data) {
                var refetchedAccount = data.first;
                equal(refetchedAccount.Number(), account.Number(),
                        "refetched the saved {0} with number {1}"
                            .format(typeName, account.Number()));
            }
        };
    }

});