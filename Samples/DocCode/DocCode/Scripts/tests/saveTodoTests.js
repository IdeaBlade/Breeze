/**********************************************
 * Prototype for the typical test modules
 **********************************************/

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
    var Qop = breeze.FilterQueryOp;

    var queryForOne = testFns.queryForOne;
    var runQuery = testFns.runQuery;
    var handleFail = testFns.handleFail;

    // Name of each type's query endpoint in the persistence service
    var todos = testFns.todoQueryName;

    // Target the Todos service
    var serviceName = testFns.todosServiceName;
    var newEm = testFns.newEmFactory(serviceName);
    var moduleOptions = testFns.getModuleOptions(newEm);

    // reset Todos db after each test because we're messing it up
    moduleOptions.teardown = testFns.teardown_todosReset;

    module("saveTodoTests", moduleOptions);

    /*********************************************************
    * can save and requery a new Todo
    *********************************************************/
    test("can save and requery a new Todo", 2, function () {

        var todoDescription = "Save todo in Breeze";
        var newTodo = createTodo(todoDescription);

        var em = newEm();       // new empty EntityManager
        em.addEntity(newTodo); // add to the cache

        stop(); // going async ... tell the testrunner to wait

        em.saveChanges() // save and wait ...

        .then(function (saveResult) { // back from save

            var id = newTodo.Id(); // permanent id is now known

            em.clear(); // clear the EntityManager

            // re-query from database to confirm it really did get saved
            var requery = makeQueryForId(id);
            return queryForOne(em, requery, "refetch saved Todo w/ id = " + id);
        })

        .then(function (data) { // back from re-query
            var refetchedTodo = data.first;
            equal(refetchedTodo.Description(), todoDescription,
                "refetched the saved new Todo");
        })

        .fail(handleFail)
        .fin(start);
    });

    /*********************************************************
    * updates id and state after saving a new Todo
    *********************************************************/
    test("updates id and state after saving a new Todo", 5, function () {

        var newTodo = createTodo("Learn to save in breeze");

        var em1 = newEm();      // new empty EntityManager
        em1.addEntity(newTodo); // add to the cache

        var tempId = newTodo.Id(); // temporary now; we'll see it change

        stop(); // going async ... tell the testrunner to wait

        em1.saveChanges() // save and wait ...

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
            var requery = makeQueryForId(savedId);
            var em2 = newEm(); // query with a new, empty EntityManager

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
    test("can save add,update, and delete in one batch", 8, function () {

        var em = newEm();      // new empty EntityManager
        var newTodo, updateTodo, deleteTodo;

        // add a Todo
        newTodo = createTodo("Learn to save in breeze");
        em.addEntity(newTodo); // add to the cache

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

        .fail(handleFail)
        .fin(start);
    });

    /*********************************************************
    * helpers
    *********************************************************/

    function makeQueryForId(id) {
        return new EntityQuery("Todos").where("Id", Qop.Equals, id);
    }

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
});