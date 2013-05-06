// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    // Classes we'll need from the Breeze namespaces
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var Qop = breeze.FilterQueryOp;

    // query and failure helpers
    var verifyQuery = testFns.verifyQuery;
    var queryForOne = testFns.queryForOne;
    var handleFail = testFns.handleFail;

    // Target the Todos service
    var serviceName = testFns.todosServiceName;
    var newEm = testFns.newEmFactory(serviceName);

    module("basicTodoTests", testFns.getModuleOptions(newEm));

    /*********************************************************
    * Get all todos - condensed
    *********************************************************/

    test("get all todos (condensed)", 1, function () {

        var query = new EntityQuery("Todos");

        verifyQuery(newEm, query, "all todos query");
    });

    /*********************************************************
    * Get all todos - raw version
    *********************************************************/

    test("get all todos (raw)", 1, function () {

        var query = new EntityQuery("Todos");

        var em = new EntityManager(serviceName);

        stop(); // going async ... tell testrunner to wait
        em.executeQuery(query)
            .then(function (data) {
                var count = data.results.length;
                ok(count > 0, "all todos query succeeded; count = " + count);
            })
            .fail(handleFail)
            .fin(start); // resume testrunner
    });

    /*********************************************************
    * Get all active (not archived) todos 
    *********************************************************/

    test("get all active (not archived) todos", 2, function () {

        var query = new EntityQuery("Todos")
            .where("IsArchived", Qop.Equals, false)
            .orderBy("CreatedAt");

        verifyQuery(newEm, query, "active todos query",
            assertGotOnlyActiveTodos);
    });

    function assertGotOnlyActiveTodos(data) {

        var todos = data.results;

        try {
            todos.forEach(function (todo) {
                if (todo.IsArchived()) {
                    throw "At least one archived todo: " + todo.Description();
                }
            });
        } catch (ex) {
            ok(false, ex);
            return;
        }

        ok(true, "all todos are active (not archived)");
    };

    /*********************************************************
    * Get only open and unarchived todos
    * Demonstrates use of predicate for a compound filter 
    *********************************************************/

    test("get only open and active todos", 2, function () {

        var p1 = new breeze.Predicate("IsArchived", Qop.Equals, false);
        var p2 = breeze.Predicate("IsDone", "==", false);
        var predicate = p1.and(p2);

        var query = new EntityQuery("Todos")
            .where(predicate);

        verifyQuery(newEm, query, "open and active todos query",
            assertGotOnlyOpenAndActiveTodos);
    });

    function assertGotOnlyOpenAndActiveTodos(data) {

        var todos = data.results;

        try {
            todos.forEach(function (todo) {
                if (todo.IsArchived() || todo.IsDone()) {
                    throw "At least one done or archived todo: " + todo.Description();
                }
            });
        } catch (ex) {
            ok(false, ex);
            return;
        }

        ok(true, "all todos are open (not done) and active (not archived)");
    };
    /*********************************************************
    * Get all todos, ordered by creation date
    * Imitates "dataservice.getAllTodos" in Todo App
    *********************************************************/
    test("get all todos, ordered by creation date", 2, function () {

        var manager = newEm();

        var query = new breeze.EntityQuery
            .from("Todos")
            .orderBy("CreatedAt");

        stop(); // stop the testrunner and wait...
        manager.executeQuery(query)

            .then(assertGotAllTodosSortedByCreatedAt)
            .fail(handleFail)
            .fin(start);
    });

    function assertGotAllTodosSortedByCreatedAt(data) {
        var results = data.results;
        ok(results.length, "got todos");
        testFns.assertIsSorted(results, "CreatedAt");
    }

    /*********************************************************
    * get first Todo in the database (uses "take")
    *********************************************************/

    test("get first Todo in the db using 'take(1)'", 1, function () {

        var firstQuery = new EntityQuery("Todos").take(1);

        stop(); // going async ... tell the testrunner to wait

        queryForOne(newEm, firstQuery, "get first Todo")
            .fin(start); // testrunner resumes
    });

    /*********************************************************
    * get by id
    *********************************************************/

    test("get by Id", 3, function () {

        // We don't have a well-known Id to query for 
        // because we're always re-building the database
        // so let's get the first Todo we find and use its Id 
        // for our get-by-id test.

        var firstId, firstTodo,
            firstQuery = new EntityQuery("Todos").take(1);

        var em = newEm();

        stop(); // going async ... 

        // Query for the first Todo in the database
        queryForOne(em, firstQuery, "get first Todo")

        // We're back; use the first Todo's Id to query for a Todo-by-Id
        .then(function (data) {
            firstTodo = data.first;
            firstId = firstTodo.Id();
            var queryById = new EntityQuery("Todos")
                .where("Id", "==", firstId);
            return em.executeQuery(queryById);
        })

        // back from the server ...
        // confirm that Todo-by-id is same as the first Todo
        .then(function (data) {
            equal(data.results.length, 1, "got one Todo with id = " + firstId);
            var todoById = data.results[0];
            equal(todoById, firstTodo, "is same as first Todo");
        })

        .fail(handleFail)
        .fin(start); // testrunner resumes
    });

    /*********************************************************
    * freshly queried entity is in unmodified state 
    *********************************************************/

    test("freshly queried entity is in unchanged state", 2, function () {

        // get the first TodoItem in the db
        var query = new EntityQuery("Todos").take(1);

        verifyQuery(newEm, query, "'first Todo' query",

            function (data) {
                var first = data.first;
                var entityAspect = first.entityAspect;
                var entityState = entityAspect.entityState;
                ok(entityState.isUnchanged(),
                    "queried todo should be in 'unchanged' state; is " + entityState);
            });
    });

    /*********************************************************
    * a queried entity's state becomes "modified" after setting property
    *********************************************************/

    test("queried entity in modified state after property set", 3, function () {

        // get the first TodoItem in the db
        var query = new EntityQuery("Todos").take(1);

        verifyQuery(newEm, query, "'first Todo' query",

        function (data) {
            var first = data.first;
            var entityAspect = first.entityAspect;
            var entityState = entityAspect.entityState;
            ok(entityState.isUnchanged(),
                "queried todo should be in 'unchanged' state; is " + entityState);

            first.Description("A new description");

            entityState = entityAspect.entityState;
            ok(entityState.isModified(),
                "updated todo should be in 'modified' state; is " + entityState);

        });
    });

    /*********************************************************
    * new Todo is detached 
    *********************************************************/

    test("new Todo is detached", 1, function () {

        var newTodo = createTodo("Learn Breeze");

        ok(newTodo.entityAspect.entityState.isDetached(),
            "new Todo is in 'detached' state");

    });

    /*********************************************************
    * new Todo in cache is in added state 
    *********************************************************/

    test("new Todo in cache is in added state", 2, function () {

        var newTodo = createTodo("Learn Breeze");

        var em = newEm();  // new empty EntityManager

        em.addEntity(newTodo);

        ok(newTodo.entityAspect.entityState.isAdded(),
            "new Todo added to cache is in 'added' state");

        // get the first (and only) entity in cache
        var todoInCache = em.getEntities()[0];

        equal(todoInCache, newTodo,
            "Todo in cache is the one we created");

    });

    /*********************************************************
    * new Todo leaves cache and becomes detached after deletion
    *********************************************************/

    test("new Todo leaves cache and becomes detached after deletion", 3, function () {

        var newTodo = createTodo("A bad mistake");

        var em = newEm();  // new empty EntityManager

        em.addEntity(newTodo);

        ok(newTodo.entityAspect.entityState.isAdded(),
                "new Todo added to cache is in 'added' state");

        newTodo.entityAspect.setDeleted();

        ok(newTodo.entityAspect.entityState.isDetached(),
                "new Todo added to cache is 'detached'");

        equal(em.getEntities().length, 0, "no entities in cache");

    });

    /*********************************************************
    * can get changes from cache
    *********************************************************/
    test("get changes from cache", 3, function () {

        var em = newEm();
        var query = new EntityQuery("Todos");

        verifyQuery(em, query, "'all Todos' query",

            function (data) {

                var first = em.getEntities()[0];
                first.Description("Changed this one");

                // now add two new todos to the cache
                em.addEntity(createTodo("Ima Nu"));
                em.addEntity(createTodo("Suez He"));

                var changes = em.getChanges(), count = changes.length;

                equal(count, 3, "em.getChanges should return 3 Todos");

                // overload of getEntities filters for added entities of all types.
                var added = em.getEntities(null, breeze.EntityState.Added);
                count = added.length;
                equal(count, 2, "2 of the changed entities should be added.");

            }
        );

    });

    /*********************************************************
    * entityAspect.rejectChanges reverts an entity's changes 
    *********************************************************/

    test("rejectChanges reverts pending changes", 5, function () {

        var em = newEm();

        // get three Todos from the db
        var query = new EntityQuery("Todos").take(2);

        verifyQuery(em, query, "'first two Todos' query",

        function (data) {

            var results = data.results, rcount = results.length;
            if (rcount !== 2) {
                throw "expected to get 2 Todos; got " + rcount;
            };

            var modified = results[0];
            var origDescription = modified.Description();
            modified.Description("munged this one");

            var deleted = results[1];
            deleted.Description("doomed");
            deleted.entityAspect.setDeleted();

            var added = createTodo("added");
            em.addEntity(added);

            var changes = em.getChanges();
            equal(changes.length, 3, "exactly 3 changed Todos in cache");

            em.rejectChanges(); // revert all changes

            ok(!em.hasChanges(), "# of changes in cache is " + em.getChanges().length);

            var todosInCache = em.getEntities();
            equal(todosInCache.length, 2, "exactly 2 Todos in cache (added is gone)");

            var desc = modified.Description();
            equal(desc, origDescription, "'modified' is now unchanged");

        });
    });

    /*********************************************************
    * after deleting a queried entity, it remains in cache as "deleted" 
    * won't be removed from cache until saved.
    *********************************************************/

    test("after deleting a queried entity, it remains in cache as 'deleted'", 3, function () {

        // get the first TodoItem in the db
        var query = new EntityQuery("Todos").take(1);

        var em = newEm();

        verifyQuery(em, query, "'first Todo' query",

        function (data) {
            var first = data.first;

            first.entityAspect.setDeleted();

            ok(first.entityAspect.entityState.isDeleted(),
            "deleted Todo is in 'deleted' state");

            // get the first (and only) entity in cache
            var todoInCache = em.getEntities()[0];
            equal(todoInCache, first,
            "Todo in cache is the one we deleted");

        });
    });


    /*********************************************************
    * change to Todo property raises KO property changed
    * for an entity in each entityState
    *********************************************************/

    test("change to Todo property raises KO property changed", function () {

        // test pattern:
        // 1) create Todo in the desired state
        // 2) subscribe to a change in some property
        // 3) make a change to that property
        // 4) KO listener should assert true

        var em = newEm(), testTodo, testCount = 0;

        testTodo = createTodo("detached new Todo");
        koChangeNotificationTest(testTodo, testCount);
        testCount += 1;

        testTodo = createTodo("added new Todo", testCount);
        em.addEntity(testTodo);
        koChangeNotificationTest(testTodo);
        testCount += 1;

        // rather than query we'll fake it by
        // attaching a new Todo, rather than adding it so
        // it appears to be a pre-exising Todo as when queried
        testTodo = createTodo("unchanged Todo");
        testTodo.Id(testFns.getNextIntId());
        em.attachEntity(testTodo);
        koChangeNotificationTest(testTodo);
        testCount += 1;

        // fake deleted in a similar way
        testTodo = createTodo("deleted Todo");
        testTodo.Id(testFns.getNextIntId());
        em.attachEntity(testTodo);
        testTodo.entityAspect.setDeleted();
        koChangeNotificationTest(testTodo);
        testCount += 1;

        ok(em.hasChanges, "should have pending unsaved changes");
        var changes = em.getChanges();
        equal(changes.length, 3, "three of them: an Add, a Delete, and an Update");

        // total number of asserts should equal 
        // number of subscriptions + 
        // the "hasChanges" and "getChanges" asserts.
        expect(testCount + 2);
    });

    function koChangeNotificationTest(testTodo) {
        // notification should happen fast enough to not need async test structure
        var entitystate = testTodo.entityAspect.entityState.toString();
        testTodo.IsDone.subscribe(
            function () {
                ok(true,
                    entitystate + " Todo named \"" + testTodo.Description() +
                    "\" called 'IsDone' KO subscription.");
            }
        );
        testTodo.IsDone(!testTodo.IsDone()); // trigger notification
    }

    /*********************************************************
    * Knockout property subscriptions added to each property individually
    *********************************************************/
    test("KO property change notifications raised", 1, function () {

        var newTodo = createTodo("test me");

        // Tricky: store notifications on the recorder
        recordKoPropertyChanged.notifications = [];

        // subscribe to each property individually
        // all you get from event is the newValue
        // capture that and propertyName manually
        // Whew! This is work!
        newTodo.Id.subscribe(
            function (newValue) { recordKoPropertyChanged(newValue, "Id"); });
        newTodo.Description.subscribe(
            function (newValue) { recordKoPropertyChanged(newValue, "Description"); });
        newTodo.IsDone.subscribe(
            function (newValue) { recordKoPropertyChanged(newValue, "IsDone"); });
        newTodo.IsArchived.subscribe(
            function (newValue) { recordKoPropertyChanged(newValue, "IsArchived"); });

        // 1. ko pc raised even when not it cache
        newTodo.IsDone(true);

        var em = newEm();  // new empty EntityManager

        // 2. ko pc raised because addEntity sets the temporary Id
        em.addEntity(newTodo);

        // 3. ko pc raised because Description changed
        newTodo.Description("hit me");

        // pc ko NOT raised because IsArchived set with same value
        newTodo.IsArchived(newTodo.IsArchived());

        assertGotKoExpectedPropertyChangedEvents();
    });

    function recordKoPropertyChanged(newValue, propertyName) {
        recordKoPropertyChanged.notifications.push(
            { newValue: newValue, propertyName: propertyName });
    }

    function assertGotKoExpectedPropertyChangedEvents() {

        var notices = recordKoPropertyChanged.notifications
            .map(function (args) {
                return "[" + args.propertyName +
                    " - new: " + args.newValue + "]";
            });

        var count = notices.length;
        equal(count, 3,
            "Expected 3 KO notices and got " + count + "; messages were " +
                notices.join(", "));
    }

    /*********************************************************
    * Breeze propertyChanged raised when any property changes
    *********************************************************/
    test("Breeze propertyChanged raised when any property changes", 1, function () {

        var newTodo = createTodo("test me");

        var notifications = [];

        // subscribe to the entity ONCE; raise if ANY property changes
        // changeArgs has propertyName, oldValue, and newValue
        newTodo.entityAspect
            .propertyChanged.subscribe(function (changeArgs) {
                notifications.push(changeArgs); ;
            });

        // 1. pc raised even when not in cache
        newTodo.IsDone(true);

        var em = newEm();  // new empty EntityManager

        // 2. pc raised because addEntity sets the temporary Id
        em.addEntity(newTodo);

        // 3. pc raised because Description changed
        newTodo.Description("hit me");

        // pc NOT raised because IsArchived set with same value
        newTodo.IsArchived(newTodo.IsArchived());

        assertGotExpectedBreezePropertyChangedEvents(notifications);
    });

    function assertGotExpectedBreezePropertyChangedEvents(notifications) {

        var notices = notifications.map(function (changeArgs) {
            return "[" + changeArgs.propertyName +
                " - old: " + changeArgs.oldValue +
                ", new: " + changeArgs.newValue + "]";
        });

        var count = notices.length;
        equal(count, 3,
            "Expected 3 Breeze notices and got " + count + "; messages were " +
                notices.join(", "));

    }

    /*********************************************************
    * Todo validation errors raised when properties set to bad values
    *********************************************************/
    test("Todo validation errors raised when properties set to bad values", function () {
        
        var em = newEm();  // new empty EntityManager
        var todo = createTodo("test me");
        
        // enter the cache as 'Unchanged'
        em.attachEntity(todo); 
        
        // Start monitoring validation error changes
        todo.entityAspect
            .validationErrorsChanged.subscribe(assertValidationErrorsChangedRaised);

        todo.Description(null); // 1. description is required

        todo.IsDone(true); // ok. no problem

        todo.IsDone("true"); // still ok with coercion
        
        todo.IsDone("xxx"); // 2. Wrong data type

        todo.Id(null); // 3. Id is the pk; automatically required

        todo.Description( // 4. removes "required" error; 5. adds "too long"
            "Endeavor to eschew sesquipedalian phrases");

        todo.Description( // 6. ok; previous error removed
            "Keep it simple");

        todo.entityAspect.rejectChanges(); // (7,8) reverses Id & IsDone errors 
        
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

    /*********************************************************
    * Export changes to local storage and re-import them
    *********************************************************/
    test("Export changes to local storage and re-import", 5, function () {

        var em = newEm();

        // add a new Todo to the cache
        var newTodo = em.addEntity(createTodo("Export/import safely #1"));
        // add some more
        em.addEntity(createTodo("Export/import safely #2"));
        em.addEntity(createTodo("Export/import safely #3"));

        var changes = em.getChanges();
        var changesExport = em.exportEntities(changes);

        ok(window.localStorage, "this browser supports local storage");

        var stashName = "stash_newTodos";
        window.localStorage.setItem(stashName, changesExport);

        em.clear();
        ok(em.getEntities().length === 0,
            "em should be empty after clearing it");

        var changesImport = window.localStorage.getItem(stashName);
        em.importEntities(changesImport);

        var entitiesInCache = em.getEntities();
        var restoreCount = entitiesInCache.length;
        equal(restoreCount, 3, "restored 3 new Todos from file");

        var restoredTodo = entitiesInCache[0];
        var restoredState = restoredTodo.entityAspect.entityState;

        ok(restoredState.isAdded(),
             "State of restored first Todo ({0}) is {1}".format(
                 restoredTodo.Description(), restoredState));

        ok(newTodo !== restoredState,
            "Restored Todo is not the same object as the original Todo");
    });
        

    /*********************************************************
    * HELPERS
    *********************************************************/

    function createTodo(name) {
        var newTodo = getTodoType().createEntity({
            Description: name || "New Todo",
            CreatedAt: new Date()
        });
        return newTodo;
    }

    function getTodoType(entityManager) { // em is optional
        return getMetadataStore(entityManager)
            .getEntityType("TodoItem");
    }

    function getMetadataStore(em) { // em is optional
        if (em) { return em.metadataStore; }
        // no em? no problem. We also stashed the store elsewhere
        return newEm.options.metadataStore;
    }
})(docCode.testFns);