define(function(require) {
    var data = require('services/dataservice'),
        shell = require('viewmodels/shell'),
        InspectionViewModel = require('viewmodels/inspection');

    var vm = {
        jobs:ko.observableArray([]),
        activate:function() {
            shell.title(shell.inspector().Name());
            shell.status("Loading jobs...");
            data.getJobsFor(shell.inspector().Id()).then(function(response) {
                vm.jobs(response.results);
                shell.status(vm.jobs().length + " jobs found.");
            });
        },
        navigateTo:function(inspection) {
            shell.navigate("inspection", new InspectionViewModel(inspection));
        }
    };

    return vm;
});