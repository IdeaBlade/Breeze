// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming

define(["testFns"], function (testFns) {

    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/

    var breeze = testFns.breeze;

    var core = breeze.core;
    var entityModel = breeze.entityModel;

    // Configure for Knockout binding and Web API persistence services
    // testFns does this for the test suite; you must do it in your app
    core.config.trackingImplementation = entityModel.entityTracking_ko;
    core.config.remoteAccessImplementation = entityModel.remoteAccess_webApi;

    // Classes we'll need from the breeze namespaces
    var EntityManager = entityModel.EntityManager;
    var EntityQuery = entityModel.EntityQuery;
    var Qop = entityModel.FilterQueryOp;

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

        var p1 = new entityModel.Predicate("IsArchived", Qop.Equals, false);
        var p2 = entityModel.Predicate("IsDone", "==", false);
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

        var query = new entityModel.EntityQuery
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
    * entityAspect.rejectChanges reverts changes
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

            /*** REVERT ***/
            // em.rejectChanges(); // in a future version

            changes.forEach(function (o) {
                // shouldn't have to remove the added entity; will fix breeze
                if (o.entityAspect.entityState.isAdded()) {
                    em.detachEntity(o);
                } else {
                    o.entityAspect.rejectChanges();
                };
            });

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
    * new Todo is detached 
    *********************************************************/

    test("new Todo is detached", 1, function () {

        var newTodo = createTodo("Learn breeze");

        ok(newTodo.entityAspect.entityState.isDetached(),
            "new Todo is in 'detached' state");

    });

    function createTodo(name) {

        var todoTypeInfo = getMetadataStore().getEntityType("TodoItem");

        var newTodo = todoTypeInfo.createEntity();
        newTodo.Description(name || "New Todo");
        newTodo.CreatedAt(new Date());

        return newTodo;
    }

    function getMetadataStore(em) {
        if (em) { return em.metadataStore; }
        // no em? no problem. We also stashed the store elsewhere
        return newEm.options.metadataStore;
    }

    /*********************************************************
    * new Todo in cache is in added state 
    *********************************************************/

    test("new Todo in cache is in added state", 2, function () {

        var newTodo = createTodo("Learn breeze");

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
    * new Todo becomes detached after deletion
    * [In DevForce ... but not in breeze. Is this intentional?]
    *********************************************************/

    //    test("new Todo becomes detached after deletion", 3, function () {

    //        var newTodo = createTodo("A bad mistake");

    //        var em = newEm();  // new empty EntityManager

    //        em.addEntity(newTodo);

    //        ok(newTodo.entityAspect.entityState.isAdded(),
    //            "new Todo added to cache is in 'added' state");

    //        newTodo.entityAspect.setDeleted();

    //        ok(newTodo.entityAspect.entityState.isDetached(),
    //            "new Todo added to cache is 'detached'");  
    //        
    //        equal(em.getEntities().length, 0, "no entities in cache");

    //    });

    /*********************************************************
    * breeze: after delete, a new Todo stays in cache as 'deleted'
    * [in breeze ... but not in DevForce  Is this intentional?]
    *********************************************************/

    test("deleting a new Todo keeps in cache as 'deleted'", 3, function () {

        var newTodo = createTodo("A bad mistake");

        var em = newEm();  // new empty EntityManager

        em.addEntity(newTodo);

        ok(newTodo.entityAspect.entityState.isAdded(),
            "new Todo added to cache is in 'added' state");

        newTodo.entityAspect.setDeleted();

        ok(newTodo.entityAspect.entityState.isDeleted(),
            "new Todo added to cache is 'deleted'");

        // get the first (and only) entity in cache
        var todoInCache = em.getEntities()[0];
        equal(todoInCache, newTodo,
            "Todo in cache is the one we deleted");

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
        em.attachEntity(testTodo);
        koChangeNotificationTest(testTodo);
        testCount += 1;

        // fake deleted in a similar way
        testTodo = createTodo("deleted Todo");
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
            function (newValue) { recordKoPropertyChanged(newValue, "Id");});
        newTodo.Description.subscribe(
            function (newValue) { recordKoPropertyChanged(newValue, "Description");});
        newTodo.IsDone.subscribe(
            function (newValue) { recordKoPropertyChanged(newValue, "IsDone");});
        newTodo.IsArchived.subscribe(
            function (newValue) { recordKoPropertyChanged(newValue, "IsArchived");});

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
            {newValue: newValue, propertyName: propertyName});
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
    * breeze propertyChanged raised when any property changes
    *********************************************************/
    test("breeze propertyChanged raised when any property changes", 1, function () {

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
            "Expected 3 breeze notices and got " + count + "; messages were " +
                notices.join(", "));

    }

    /*********************************************************
    * validation error raised when set Id to null (Id is required)
    *********************************************************/
    test("validation error when set Id null", 2, function () {

        var newTodo = createTodo("test me");

        newTodo.entityAspect
            .validationErrorsChanged.subscribe(assertIdValidationErrorAdded);

        // validate automatically only when in cache
        var em = newEm();  // new empty EntityManager
        em.addEntity(newTodo);

        newTodo.Description(null); // ok. no rule
        newTodo.Id(null); // error: Id is the pk; automatically required

    });

    function assertIdValidationErrorAdded(errorsChangedArgs) {
        var errorMessage = "none";
        var addedCount = errorsChangedArgs.added.length;

        if (addedCount > 0) {
            errorMessage = errorsChangedArgs.added[0].errorMessage;
        }

        ok(addedCount,
            "expected one error, got  " + addedCount);

        ok(errorMessage.indexOf("'Id' is required") !== -1,
            "first error is: " + errorMessage);
    }
});