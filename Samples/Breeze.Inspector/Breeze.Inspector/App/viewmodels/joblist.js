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
        shell.status(data.results.length + " jobs found.");

        vm.jobs([]);
        data.results.forEach(function(item) {
            vm.jobs.push(item);
        });
    }

    return vm;
});