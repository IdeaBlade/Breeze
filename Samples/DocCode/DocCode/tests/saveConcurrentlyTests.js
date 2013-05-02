// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
   // Classes we'll need from the breeze namespaces
    var EntityQuery = breeze.EntityQuery;
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
    * concurrent save throws exceptions by default
    *********************************************************/
    test("Concurrent save throws exceptions by default", 2, function () {
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
    test("Concurrent save w/ 'allowConcurrentSaves' saves a new entity twice",
        4, function () {
        var em = newEm();
        var description = "DeleteMe";
        em.createEntity('TodoItem', { Description: description });
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
         .fin(afterAll); // resume tests after both promises

        function saveSucceeded(saveResult) {
            equal(saveSuccessCount +=1, 1,
                "One of the saves should succeed");
        }

        // second save then fails during key fixup
        function saveFailed(error) {
            equal(saveSuccessCount += 1, 2,
                "Second save should fail on the client");
            
            var expected = /key fixup.*unable to locate/i;
            ok(expected.test(error.message),
               "2nd save of same entity fails on client " +
               "only because of id fixup error: '{0}'"
               .format(error.message));
        }

        function afterAll() {
            EntityQuery.from('Todos')
                .where('Description', 'eq', description)
                .using(em).execute()
                .then(afterAllQuerySucceeded)
                .fail(handleFail)
                .fin(start);
        }
        function afterAllQuerySucceeded(data) {
            equal(data.results.length, 2,
                "In fact the single new Todo was saved twice; " +
                "should find 2 Todos in the database with its '" +
                description + "' description."
            );
        }
    });

    /*********************************************************
    * concurrent save with separate managers is ok
    * as if two different users saved concurrently
    *********************************************************/
    test("Concurrent save with separate managers is ok", 5, function () {
        var em1 = newEm();
        var em2 = newEm();

        // add a new Todo to each manager
        var todo1 = em1.createEntity('TodoItem', { Description: "DeleteMe 1" });
        var todo2 = em2.createEntity('TodoItem', { Description: "DeleteMe 2" });

        stop(); // going async ... tell the testrunner to wait

        var save1 = em1.saveChanges()
            .then(firstSaveSucceeded)
            .fail(handleFail); // shouldn't fail

        var save2 = em2.saveChanges()
            .then(secondSaveSucceeded)
            .fail(handleFail); // shouldn't fail

        Q.all([save1, save2])
         .then(bothSucceeded)
         .fail(handleFail) // unexpected
         .fin(start); // resume tests after both promises

        function firstSaveSucceeded(saveResult) {
            ok(true, "1st save of the entity in em1 should succeed");
            return saveResult;
        }
        function secondSaveSucceeded(saveResult) {
            ok(true, "2nd save of the entity in em2 should succeed");
            return saveResult;
        }
        function bothSucceeded(promises) {
            ok(!em1.hasChanges(), "em1 should have no more pending changes");
            ok(!em2.hasChanges(), "em2 should have no more pending changes");
            notEqual(todo1.entityAspect.entityManager,
                     todo2.entityAspect.entityManager,
                     "the newly saved todos are in different manager");
        }
    });
    
    /*=========== SaveQueuing Module ===================*/
    module("saveConcurrentlyTests - SaveQueuing", moduleOptions);
    
    /*********************************************************
    * second save w/ savequeuing does not resave
    *********************************************************/
    test("Second save w/ savequeuing does not resave", 2, function () {
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
    test("Two [add+save] events are in two separate saves", 6, function () {
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

            equal(em.getChanges().length, 2, "two pending changes while first save is in flight")

            Q.all([save1, save2])
             .then(bothSucceeded)
             .fail(handleFail) // unexpected
             .fin(start); // resume tests after both promises

            function firstSaveSucceeded(saveResult) {
                var savedCount = saveResult.entities.length;
                equal(savedCount, 1,
                        "1st save should save a single Todo");
                equal(saveResult.entities[0].Description(), todo1.Description(),
                        "1st save should be 'todo1'");
                return saveResult;
            }

            function secondSaveSucceeded(saveResult) {
                var savedCount = saveResult.entities.length;
                equal(savedCount, 1,
                        "2nd save should save a single Todo");
                equal(saveResult.entities[0].Description(), todo2.Description(),
                        "2nd save should be 'todo2'");
                return saveResult;
            }
            function bothSucceeded (promises) {
                ok(!em.hasChanges(), "should have no more pending changes");
            }

        });

    /*********************************************************
    * Queued saves may be joined but will not double-save
    * in which case the 3rd save is an empty save
    *********************************************************/
    test("Queued saves may be joined but will not double-save", 6, function () {
            var em = newEm();
            em.enableSaveQueuing(true); // <-- 

            stop(); // going async ... tell the testrunner to wait
            var todo1 = em.createEntity('TodoItem', { Description: "DeleteMe 1" });
            var save1 = em.saveChanges();

            var todo2 = em.createEntity('TodoItem', { Description: "DeleteMe 2" });
            var save2 = em.saveChanges();

            var todo3 = em.createEntity('TodoItem', { Description: "DeleteMe 3" });
            var save3 = em.saveChanges();

            equal(em.getChanges().length, 3, "three pending changes while first save is in flight")

            Q.all([save1, save2, save3])
             .then(allSucceeded)
             .fail(handleFail) // unexpected
             .fin(start); // resume tests after both promises

            function firstSaveSucceeded(saveResult) {
                var savedCount = saveResult.entities.length;
                equal(savedCount, 1,
                        "1st save should save a single Todo");
                equal(saveResult.entities[0].Description(), todo1.Description(),
                        "1st save should be 'todo1'");
                return saveResult;
            }

            function secondSaveSucceeded(saveResult) {
                var savedCount = saveResult.entities.length;
                equal(savedCount, 1,
                        "2nd save should save a single Todo");
                equal(saveResult.entities[0].Description(), todo2.Description(),
                        "2nd save should be 'todo2'");
                return saveResult;
            }
            function allSucceeded(promises) {
                var savedCounts = promises.map(function (p) { return p.entities.length });
                var totalSaved = savedCounts.reduce(function (p, c) { return p + c; });

                equal(totalSaved, 3, "should have saved 3 todos");
                ok(savedCounts[0] === 1 && promises[0].entities[0] === todo1,
                    "1st non-queued save should have saved only todo1")
                
                ok(savedCounts[1] == 1 || savedCounts[1] == 2,
                    "the 2nd queued save should have saved 1 or 2 todos; saved " +
                    savedCounts[1]);

                var expected3 = savedCounts[1] == 1 ? 1 : 0
                equal(savedCounts[2], expected3,
                    "the 3rd queued save should have saved " +
                    expected3);

                ok(!em.hasChanges(), "should have no more pending changes");
            }

        });

    /*********************************************************
    * Failure in a middle save aborts the rest
    *********************************************************/
    test("Failure in a middle save aborts the rest", 8, function () {
            var em = newEm();
            em.enableSaveQueuing(true); // <-- 

            stop(); // going async ... tell the testrunner to wait
            var todo1 = em.createEntity('TodoItem', { Description: "DeleteMe 1" });
            var save1 = em.saveChanges()
                .then(firstSaveSucceeded)
                .fail(handleFail);

            // fake a change to non-existent entity
            // save should fail
            var todo2 = em.createEntity('TodoItem', {
                Id: 100000, // not a real id
                Description: "DeleteMe 2"
            }, breeze.EntityState.Modified);
                      
            var save2 = em.saveChanges()
                .then(secondSaveSucceeded)
                .fail(secondSaveFailed);

            var todo3 = em.createEntity('TodoItem', { Description: "DeleteMe 3" });
            var save3 = em.saveChanges()
                .then(thirdSaveSucceeded)
                .fail(thirdSaveFailed)

            equal(em.getChanges().length, 3, "three pending changes while first save is in flight")

            Q.all([save1, save2, save3])
             .then(allSucceeded)
             .fin(allOver); // resume tests after both promises

            function firstSaveSucceeded(saveResult) {
                var savedCount = saveResult.entities.length;
                equal(savedCount, 1,
                        "1st save should save a single Todo");
                equal(saveResult.entities[0].Description(), todo1.Description(),
                        "1st save should be 'todo1'");
                return saveResult;
            }

            function secondSaveSucceeded(saveResult) {
                ok(false, "the 2nd save should have failed")
            }
            function secondSaveFailed(error) {
                ok(true,
                   "the 2nd save should have failed, the error was '{0}'"
                   .format(error.message));
            }
            function thirdSaveSucceeded(saveResult) {
                ok(false, "the 3rd save should have been aborted")
            }
            function thirdSaveFailed(error) {
                var expected = /queued save failed/i;
                ok(expected.test(error.message),
                   "the 3rd save should have aborted with "+
                   "queued save termination error: '{0}'"
                   .format(error.message));
            }
            function allSucceeded(promises) {
                ok( typeof promises[1] === 'undefined' &&
                    typeof promises[1] === 'undefined',
                    "the 2nd and 3rd promise should be undefined because " +
                    "failed saves were caught and errors not re-thrown")
            }
            function allOver() {
                equal(todo1.entityAspect.entityState.name, "Unchanged",
                    "'todo1' was saved and is in the 'Unchanged' state.")
                equal(em.getChanges().length, 2,
                    "latter two entities should still have pending changes");
                start();
            }
        });

    /*********************************************************
    * Failure in first save aborts the rest
    *********************************************************/
    test("Failure in first save aborts the rest", 6, function () {
        var em = newEm();
        em.enableSaveQueuing(true); // <-- 

        stop(); // going async ... tell the testrunner to wait

        // fake a change to non-existent entity
        // save should fail
        var todo1 = em.createEntity('TodoItem', {
            Id: 100000, // not a real id
            Description: "DeleteMe 1"
        }, breeze.EntityState.Modified);

        var save1 = em.saveChanges()
            .then(firstSaveSucceeded)
            .fail(firstSaveFailed);

        var todo2 = em.createEntity('TodoItem', { Description: "DeleteMe 2" });
        var save2 = em.saveChanges()
            .then(laterSaveSucceeded)
            .fail(laterSaveFailed);

        var todo3 = em.createEntity('TodoItem', { Description: "DeleteMe 3" });
        var save3 = em.saveChanges()
            .then(laterSaveSucceeded)
            .fail(laterSaveFailed)

        equal(em.getChanges().length, 3, "three pending changes while first save is in flight")

        Q.all([save1, save2, save3])
         .then(allSucceeded)
         .fin(allOver); // resume tests after both promises

        function firstSaveSucceeded(saveResult) {
            ok(false, "the 1st save should have failed")
        }
        function firstSaveFailed(error) {
            ok(true,
               "the 1st save should have failed, the error was '{0}'"
               .format(error.message));
        }
        function laterSaveSucceeded(saveResult) {
            ok(false, "any save after the 1st should have been aborted")
        }
        function laterSaveFailed(error) {
            var expected = /queued save failed/i;
            ok(expected.test(error.message),
               "any save after the 1st should have aborted with " +
               "queued save termination error: '{0}'"
               .format(error.message));
        }

        function allSucceeded(promises) {
            ok(promises.reduce(
                function (p, c) { return p && typeof c === 'undefined'; },
                true),
                "all promises should be undefined because " +
                "failed saves were caught and errors not re-thrown")
        }
        function allOver() {
            equal(em.getChanges().length, 3,
                "all three entities should still have pending changes");
            start();
        }
    });

    /*********************************************************
    * helpers
    *********************************************************/

})(docCode.testFns);