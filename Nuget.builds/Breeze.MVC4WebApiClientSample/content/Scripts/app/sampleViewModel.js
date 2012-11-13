/// <reference path="..\breeze.debug.js" />

(function (exports) {
    var breeze = exports.breeze,
        ko = exports.ko,
        logger = exports.app.logger;

    // define Breeze namespaces
    var entityModel = breeze.entityModel;

    // service name is route to the Web API controller
    var serviceName = 'api/BreezeSample';

    // manager is the service gateway and cache holder
    var manager = new entityModel.EntityManager(serviceName);

    // define the viewmodel
    var vm = {
        todos: ko.observableArray(),
        includeDone: ko.observable(false),
        save: saveChanges,
        show: ko.observable(false)
    };

    // start fetching Todos
    getTodos();

    // re-query when "includeDone" checkbox changes
    vm.includeDone.subscribe(getTodos);

    // bind view to the viewmodel
    ko.applyBindings(vm);

    /* Private functions */

    // get Todos asynchronously
    // returning a promise to wait for     
    function getTodos() {

        logger.info("querying Todos");

        var query = entityModel.EntityQuery.from("Todos");

        if (!vm.includeDone()) {
            query = query.where("IsDone", "==", false);
        }

        return manager
            .executeQuery(query)
            .then(querySucceeded)
            .fail(queryFailed);

        // clear observable array and load the results 
        function querySucceeded(data) {
            logger.success("queried Todos");
            vm.todos.removeAll();
            var todos = data.results;
            todos.forEach(function (todo) {
                vm.todos.push(todo);
            });
            vm.show(true); // show the view
        }
    };

    function saveChanges() {
        return manager.saveChanges()
            .then(function () { logger.success("changes saved"); })
            .fail(saveFailed);
    }

    function queryFailed(error) {
        logger.error("Query failed: " + error.message);
    }

    function saveFailed(error) {
        logger.error("Save failed: " + error.message);
    }

}(window));