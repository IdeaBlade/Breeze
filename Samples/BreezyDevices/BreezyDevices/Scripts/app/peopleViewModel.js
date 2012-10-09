(function (root) {
    var app = root.app;
    var dataservice = app.dataservice;

    var vm = {
        people: ko.observableArray([]),
        save: dataservice.saveChanges,
        loadDevices: dataservice.loadDevices,
        reset: reset,
        hide: ko.observable(true)
    };

    getAllPersons()
        // reveal view when query succeeds
        .then(function () { vm.hide(false); });
    
    app.peopleViewModel = vm;
  
    function getAllPersons() {
        return dataservice.getAllPersons(vm.people);
    }
    
    function reset() {
        dataservice.reset(getAllPersons);
    }
    
}(window));