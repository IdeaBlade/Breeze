// ReSharper disable UnusedParameter
// ReSharper disable InconsistentNaming
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    // Classes we'll need from the breeze namespaces
    var EntityQuery = breeze.EntityQuery;

    var queryForOne = testFns.queryForOne;
    var runQuery = testFns.runQuery;
    var handleFail = testFns.handleFail;
    var handleSaveFailed = testFns.handleSaveFailed;

    /*********************************************************
    * Todo Saves
    *********************************************************/
    
    // Target the Todos service
    var todosServiceName = testFns.todosServiceName;
    var newTodosEm = testFns.newEmFactory(todosServiceName);
    var moduleOptions = testFns.getModuleOptions(newTodosEm);

    // reset Todos db after each test because we're messing it up
    moduleOptions.teardown = testFns.teardown_todosReset;

    module("saveTodosTests", moduleOptions);

    /*********************************************************
    * can save and requery a new Todo
    *********************************************************/
    test("can save and requery a new Todo", 2, function () {

        var em = newTodosEm();       // new empty EntityManager

        var description = "Save todo in Breeze";
        var newTodo = em.createEntity('TodoItem',{ Description: description });

        stop(); // going async ... tell the testrunner to wait

        em.saveChanges() // save and wait ...
        
        .fail(handleSaveFailed)
        .then(function (saveResult) { // back from save

            var id = newTodo.Id(); // permanent id is now known

            em.clear(); // clear the EntityManager

            // re-query from database to confirm it really did get saved
            var requery = new EntityQuery("Todos").where("Id", "eq", id);
            return queryForOne(em, requery, "refetch saved Todo w/ id = " + id);
        })

        .then(function (data) { // back from re-query
            var refetchedTodo = data.first;
            equal(refetchedTodo.Description(), description,
                "refetched the saved new Todo");
        })

        .fail(handleFail)
        .fin(start);
    });

    /*********************************************************
    * updates id and state after saving a new Todo
    *********************************************************/
    test("updates id and state after saving a new Todo", 5, function () {
        
        var em1 = newTodosEm();       // new empty EntityManager

        var description = "Learn to save in breeze";
        var newTodo = em1.createEntity('TodoItem',{ Description: description });

        var tempId = newTodo.Id(); // temporary now; we'll see it change

        stop(); // going async ... tell the testrunner to wait

        em1.saveChanges() // save and wait ...
        
        .fail(handleSaveFailed)
        .then(function (saveResult) { // back from save

            // confirm state transitioned from 'added' to 'unchanged'
            var todoEntityState = newTodo.entityAspect.entityState;
            ok(todoEntityState.isUnchanged,
                "newTodo entity state should be unchanged; is " + todoEntityState);

            // confirm temporary id was replaced by permanent id in the cached Todo itself
            var savedId = newTodo.Id();
            ok(savedId !== tempId,
                "new Todo id changed from " + tempId + " to " + savedId);

            // re-query from database to confirm it really did get saved
            var requery = new EntityQuery("Todos").where("Id", "==", savedId);
            var em2 = newTodosEm(); // query with a new, empty EntityManager

            return queryForOne(em2, requery,  // query and wait ...
                "refetch saved Todo w/ id = " + savedId);
        })

        .then(function (data) { // back from query

            var requeryTodo = data.first;

            // of course it has the same Id 
            equal(requeryTodo.Id(), newTodo.Id(),
                "'requeryTodo.Id' in em2 equals 'newTodo.Id' from em1");

            ok(requeryTodo !== newTodo,
                "'requeryTodo' is not the same as 'newTodo' because they are in separate caches.");
        })

        .fail(handleFail)
        .fin(start);
    });

    /*********************************************************
    * can save add,update, and delete in one batch
    *********************************************************/
    test("can save add, update, and delete in one batch", 8, function () {

        var em = newTodosEm();      // new empty EntityManager
        var newTodo, updateTodo, deleteTodo;

        newTodo = em.createEntity('TodoItem',{ Description: "Learn to save in breeze" });

        // get two Todos to modify and delete
        var twoQuery = new EntityQuery("Todos").take(2);

        stop(); // going async ... tell the testrunner to wait
        runQuery(em, twoQuery, "get two Todos", 2) // query and wait

        .then(function (data) { // back from query
            updateTodo = data.results[0];
            updateTodo.Description("updated todo");

            deleteTodo = data.results[1];
            deleteTodo.entityAspect.setDeleted();

            equal(em.getChanges().length, 3, "ready to save three Todos");
            return em.saveChanges(); // save and wait
        })

        .then(function (saveResult) { // back from save

            equal(saveResult.entities.length, 3, "saved three Todos");

            // confirm state transitions
            var newTodoState = newTodo.entityAspect.entityState;
            var updateTodoState = updateTodo.entityAspect.entityState;
            var deleteTodoState = deleteTodo.entityAspect.entityState;

            ok(newTodoState.isUnchanged(),
                "post-save newTodo entity state should be unchanged; is " + newTodoState);
            ok(updateTodoState.isUnchanged(),
                "post-save updateTodo entity state should be unchanged; is " + updateTodoState);
            ok(deleteTodoState.isDetached(),
                "post-save deleteTodo entity state should be detached; is " + deleteTodoState);

            var entitiesInCache = em.getEntities();
            equal(entitiesInCache.length, 2,
                "exactly two of the three are in cache");

            for (var i = 0, len = entitiesInCache.length; i < len; i++) {
                var entity = entitiesInCache[i];
                if (entity === deleteTodo) {
                    throw "deleted Todo is in cache after save";
                }
            };
            ok(true, "deleted Todo is not in cache");
        })

        .fail(handleSaveFailed)
        .fin(start);
    });
    /*********************************************************
    * hasChangesChanged event raised after rejectChanges
    *********************************************************/
    test("hasChangesChanged event raised after rejectChanges", 4, function () {
        var em = newTodosEm();
        var hasChangesChangedRaised=[];
        em.hasChangesChanged.subscribe(
            function(eventArgs) {
                hasChangesChangedRaised.push(eventArgs.hasChanges);
            }
        );

        // add a Todo (and ignore it)
        em.createEntity('TodoItem',{ Description: "Learn to save in breeze" });

        em.rejectChanges();

        equal(hasChangesChangedRaised.length, 2,
         "hasChangesChanged should have been raised twice");
        ok(hasChangesChangedRaised[0] === true,
         "first hasChangesChanged is true after create");
        ok(hasChangesChangedRaised[1] === false,
         "second hasChangesChanged is false after rejectChanges");
        ok(!em.hasChanges(),
         "manager should not have pending changes after rejectChanges");
    });

    /*********************************************************
    * hasChangesChanged event raised after saveChanges
    *********************************************************/
    test("hasChangesChanged event raised after saveChanges", 4, function () {
        var em = newTodosEm();    
        var hasChangesChangedRaised = [];
        em.hasChangesChanged.subscribe(
            function(eventArgs) {
                hasChangesChangedRaised.push(eventArgs.hasChanges);
            }
        );

        // add a Todo (and forget about it)
        em.createEntity('TodoItem',{ Description: "Learn to save in breeze" });

        stop();
        em.saveChanges()
           .then ( function() {
               equal(hasChangesChangedRaised.length, 2,
                "hasChangesChanged should have been raised twice");
               ok(hasChangesChangedRaised[0]===true,
                "first hasChangesChanged is true after create");
               ok(hasChangesChangedRaised[1]===false,
                "second hasChangesChanged is false after save");
               ok(!em.hasChanges(),
                "manager should not have pending changes after save");
            })
           .fail(handleSaveFailed)
           .fin(start);
    });
    
    /*********************************************************
    * can save entity with an unmapped property
    * The unmapped property is sent to the server where it is unknown to the Todo class
    * but the server safely ignores it.
    *********************************************************/
    test("can save TodoItem defined with an unmapped property", 4, function () {
        var store = cloneTodosMetadataStore();

        var TodoItemCtor = function () {
            this.foo = "Foo"; // unmapped properties
            this.bar = "Bar";
        };

        store.registerEntityTypeCtor('TodoItem', TodoItemCtor);

        var todoType = store.getEntityType('TodoItem');
        var fooProp = todoType.getProperty('foo');
        var barProp = todoType.getProperty('bar');

        // Breeze identified the properties as "unmapped"
        ok(fooProp.isUnmapped,"'foo' should an unmapped property");
        ok(barProp.isUnmapped, "'bar' should an unmapped property");
        
        // EntityManager using the extended metadata
        var em = new breeze.EntityManager({
            serviceName: todosServiceName,
            metadataStore: store
        });

        var todo = em.createEntity('TodoItem', {Description:"Save 'foo'"});

        equal(todo.foo(), "Foo", "unmapped 'foo' property returns expected value");
        
        stop();
        em.saveChanges().then(saveSuccess).fail(saveError).fin(start);
        
        function saveSuccess(saveResult) {
            ok(true, "saved TodoItem which has an unmapped 'foo' property.");
        }
        function saveError(error) {
            var message = error.message;
            ok(false, "Save failed: " + message);
        }

    });

    // Test Helpers
    function cloneTodosMetadataStore() {
        var metaExport = newTodosEm.options.metadataStore.exportMetadata();
        return new breeze.MetadataStore().importMetadata(metaExport);
    }
})(docCode.testFns);