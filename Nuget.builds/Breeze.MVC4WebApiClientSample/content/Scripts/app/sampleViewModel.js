/// <reference path="..\breeze.debug.js" />

(function (root) {
    var breeze = root.breeze;

    // define Breeze namespaces
    var core = breeze.core,
        entityModel = breeze.entityModel;

    // configure Breeze for Knockout and Web API 
    core.config.setProperties({
        trackingImplementation: entityModel.entityTracking_ko,
        remoteAccessImplementation: entityModel.remoteAccess_webApi
    });

    // service name is route to the Web API controller
    var serviceName = 'api/BreezeSample';

    // manager is the service gateway and cache holder
    var manager = new entityModel.EntityManager(serviceName);

    // get the logger
    var logger = root.app.logger;

    // define the viewmodel
    var vm = {
        items: ko.observableArray([]),
        includeDone: ko.observable(false),
        save: saveChanges,
        hide: ko.observable(true)
    };

    // start fetching items
    getSampleItems();

    // re-query when "includeDone" checkbox changes
    vm.includeDone.subscribe(getSampleItems);

    // bind view to the viewmodel
    ko.applyBindings(vm);

    /* Private functions */

    // get sample items asynchronously
    // returning a promise to wait for     
    function getSampleItems() {

        logger.info("querying sample items");

        var query = entityModel.EntityQuery.from("Samples");

        if (!vm.includeDone()) {
            query = query.where("IsDone", "==", false);
        }

        return manager
            .executeQuery(query)
            .then(processResults)
            .fail(queryFailed);
    };

    // clear observable array and load the results 
    function processResults(data) {
        logger.success("queried sample items");
        vm.items.removeAll();
        var items = data.results;
        items.forEach(function (item) {
            vm.items.push(item);
        });
        vm.hide(false); // unhide the view
    }

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
