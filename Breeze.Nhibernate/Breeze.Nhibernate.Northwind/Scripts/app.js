
var app = {};

app.dataservice = function () {

    //breeze.NamingConvention.camelCase.setAsDefault();

    var manager = new breeze.EntityManager('api/breeze');
    var metadataStore = manager.metadataStore;

    return {
        getAllCustomers: getAllCustomers,
        saveChanges: saveChanges
    };


    function getAllCustomers() {
        var query = breeze.EntityQuery.from("Customers");
        return query.using(manager).execute().fail(queryFailed);
    }

    function queryFailed(error) {
        console.warn('Query failed: ' + error.message);
    }

    function saveChanges() {
        return manager.saveChanges()
            .then(saveSucceeded)
            .fail(saveFailed);

        function saveSucceeded(saveResult) {
            console.info('Saved ' + saveResult.entities.length + ' entities');
        }

        function saveFailed(error) {
            console.warn('Save failed: ' + error.message);
        }

    }
}();

app.viewModel = function () {
    var count = ko.observable(0);
    var customers = ko.observableArray([]);

    var vm = {
        count: count,
        customers: customers,
        load: load
    }

    return vm;

    function load() {
        app.dataservice.getAllCustomers().then(bind);
    }

    function bind(data) {
        console.info('Binding customers');
        vm.count(data.results.length);
        vm.customers(data.results);

        var p = vm.customers();
        var x = 2;
    }

}();

ko.applyBindings(app.viewModel);
app.viewModel.load();
