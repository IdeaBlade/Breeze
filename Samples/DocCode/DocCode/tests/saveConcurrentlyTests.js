// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming

define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var breeze = testFns.breeze;

    // Classes we'll need from the breeze namespaces
    var EntityQuery = breeze.EntityQuery;

    var queryForOne = testFns.queryForOne;
    var runQuery = testFns.runQuery;
    var handleFail = testFns.handleFail;

    // Name of each type's query endpoint in the persistence service

    // Target the Todos service
    var serviceName = testFns.todosServiceName;
    var newEm = testFns.newEmFactory(serviceName);
    var moduleOptions = testFns.getModuleOptions(newEm);

    // reset Todos db after each test because we're messing it up
    moduleOptions.teardown = testFns.teardown_todosReset;

    /*********************************************************
    * Module demonstrates behavior of EntityManager
    * when its saveChanges method is called again 
    * before the prior call has returned.
    * These are not tests of conflicting saves by different users
    *********************************************************/
    module("saveConcurrentlyTests", moduleOptions);

    /*********************************************************
    * double save throws exceptions by default
    *********************************************************/
    test("double save throws exceptions by default", 2, function() {
        var em = newEm();
        // add new Todo (not interest in the item)
        em.createEntity('TodoItem', { Description: "DeleteMe" });

        stop(); // going async ... tell the testrunner to wait

        var save1 = em.saveChanges()
            .then(firstSaveSucceeded)
            .fail(handleFail); // shouldn't fail

        var save2 = em.saveChanges()
            .then(secondSaveSucceeded)
            .fail(secondSaveFailed);

        Q.all([save1, save2])
         .fail(handleFail) // unexpected
         .fin(start); // resume tests after both promises

        function firstSaveSucceeded(saveResult) {
            ok(true, "1st save of the entity should succeed");
        }
        function secondSaveSucceeded(saveResult) {
            ok(false, "second save should not succeed");
        }
        function secondSaveFailed(error) {
            var expected = /concurrent[\s]*saves not allowed/i;
            ok(expected.test(error.message),     
               "should reject second save; error was '{0}'"
               .format(error.message));
        }
    });
    /*********************************************************
    * second save w/ 'allowConcurrentSaves' 
    * saves a new entity twice!
    * That is terrible! 
    * DON'T USE THIS FEATURE UNLESS YOU KNOW WHY
    *********************************************************/
    test("second save w/ 'allowConcurrentSaves' saves new entity twice",
        3, function () {
        var em = newEm();
        em.createEntity('TodoItem', { Description: "DeleteMe" });
        var saveSuccessCount = 0;
            
        var saveOptions =
            new breeze.SaveOptions({ allowConcurrentSaves: true }); // BAD IDEA
               
        stop(); // going async ... tell the testrunner to wait

        var save1 = em.saveChanges(null, saveOptions)
            .then(saveSucceeded)
            .fail(saveFailed); 

        var save2 = em.saveChanges(null, saveOptions)
            .then(saveSucceeded)
            .fail(saveFailed); 

        Q.all([save1, save2])
         .fail(handleFail) // unexpected
         .fin(start); // resume tests after both promises

        function saveSucceeded(saveResult) {
            equal(saveSuccessCount +=1, 1,
                "one of the saves should succeed");
        }

        // second save then fails during key fixup
        function saveFailed(error) {
            equal(saveSuccessCount += 1, 2,
                "second save should fail");

            var expected = /key fixup[\w\W]*unable to locate/i;
            ok(expected.test(error.message),
               "2nd save of same entity; " +
               "fails only because of id fixup error: '{0}'"
               .format(error.message));
        }

    });
 
    
    /*=========== SAVEQUEUING ===================*/
    module("saveConcurrentlyTests - savequeuing", moduleOptions);
    
    /*********************************************************
    * second save w/ savequeuing does not resave
    *********************************************************/
    test("second save w/ savequeuing does not resave",
        2, function () {
            var em = newEm();
            em.enableSaveQueuing(true); // <-- 
            
            em.createEntity('TodoItem', { Description: "DeleteMe" });
            var saveSuccessCount = 0;
            
            stop(); // going async ... tell the testrunner to wait

            var save1 = em.saveChanges()
                .then(saveSucceeded)
                .fail(handleFail);

            var save2 = em.saveChanges()
                .then(saveSucceeded)
                .fail(handleFail);

            Q.all([save1, save2])
             .fail(handleFail) // unexpected
             .fin(start); // resume tests after both promises

            function saveSucceeded(saveResult) {
                saveSuccessCount += 1;
                var savedCount = saveResult.entities.length;
                if (saveSuccessCount === 1) {
                    equal(savedCount, 1,
                        "one of the saves should save the newTodo");
                } else {
                    equal(savedCount, 0,
                        "should not have saved a second time");
                }
            }

        });
    
    /*********************************************************
    * Two [add+save] events are in two separate saves
    * The saves are in order
    *********************************************************/
    test("Two [add+save] events are in two separate saves",
        6, function () {
            var em = newEm();
            em.enableSaveQueuing(true); // <-- 

            var todo1 = em.createEntity('TodoItem', { Description: "DeleteMe 1" });

            stop(); // going async ... tell the testrunner to wait

            var save1 = em.saveChanges()
                .then(firstSaveSucceeded)
                .fail(handleFail);
            
            var todo2 = em.createEntity('TodoItem', { Description: "DeleteMe 2" });

            var save2 = em.saveChanges()
                .then(secondSaveSucceeded)
                .fail(handleFail);

            equal(em.getChanges().length, 2, "two pending changes while first saves in flight")

            Q.all([save1, save2])
             .then(bothSucceeded)
             .fail(handleFail) // unexpected
             .fin(start); // resume tests after both promises

            function firstSaveSucceeded(saveResult) {
                var savedCount = saveResult.entities.length;
                equal(savedCount, 1,
                        "first save should save a single Todo");
                equal(saveResult.entities[0].Description(), todo1.Description(),
                        "first save should be 'todo1'");
                return saveResult;
            }

            function secondSaveSucceeded(saveResult) {
                var savedCount = saveResult.entities.length;
                equal(savedCount, 1,
                        "second save should save a single Todo");
                equal(saveResult.entities[0].Description(), todo2.Description(),
                        "second save should be 'todo2'");
                return saveResult;
            }
            function bothSucceeded (promises) {
                ok(!em.hasChanges(), "should have no more pending changes");
            }

        });
    /*********************************************************
    * helpers
    *********************************************************/

});