/// <reference path="..\breeze.debug.js" />

(function (root) {
        var ko = root.ko,
            breeze = root.breeze,
            logger = root.app.logger;

    // service name is route to the Web API controller
    var serviceName = 'breeze/BreezeSample';

    // manager is the service gateway and cache holder
    var manager = new breeze.EntityManager(serviceName);

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

    //#region private functions

    // get Todos asynchronously
    // returning a promise to wait for     
    function getTodos() {

        logger.info("querying Todos");

        var query = breeze.EntityQuery.from("Todos");

        if (!vm.includeDone()) {
            query = query.where("IsDone", "==", false);
        }

        return manager
            .executeQuery(query)
            .then(querySucceeded)
            .fail(queryFailed);

        // reload vm.todos with the results 
        function querySucceeded(data) {
            logger.success("queried Todos");
            vm.todos(data.results);
            vm.show(true); // show the view
        }
    };

    function queryFailed(error) {
        logger.error("Query failed: " + error.message);
    }

    function saveChanges() {
        return manager.saveChanges()
            .then(function () { logger.success("changes saved"); })
            .fail(saveFailed);
    }

    function saveFailed(error) {
        logger.error("Save failed: " + error.message);
    }
    //#endregion

}(window));