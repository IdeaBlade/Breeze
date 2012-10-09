(function (root) {
    var app = root.app;
    var dataservice = app.dataservice;

    var vm = {
        hide: false,
        people: ko.observableArray([]),
        save: dataservice.saveChanges,
        loadDevices: dataservice.loadDevices,
        reset: reset
    };

    getAllPersons();
    app.peopleViewModel = vm;
  
    function getAllPersons() {
        dataservice.getAllPersons(vm.people);
    }
    
    function reset() {
        dataservice.reset(getAllPersons);
    }
    
}(window));