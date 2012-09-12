define(function(require) {
    var data = require('services/dataservice'),
        shell = require('viewmodels/shell'),
        InspectionViewModel = require('viewmodels/inspection');

    var vm = {
        jobs: ko.observableArray([]),
        activate: function() {
            shell.title("Job Locations");
            shell.status("Loading jobs...");
            data.getJobsFor(shell.inspector().Id()).then(processJobQueryResults);
        },
        navigateTo: function(inspection) {
            shell.navigate("inspection", new InspectionViewModel(inspection));
        }
    };

    function processJobQueryResults(data) {
        vm.jobs(data.results);
        shell.status(vm.jobs().length + " jobs found.");
    }

    return vm;
});