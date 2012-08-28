define(function(require) {
    var data = require('services/dataservice'),
        shell = require('viewmodels/shell'),
        inspectionViewModel = require('viewmodels/inspection');

    var vm = {
        jobs: ko.observableArray([]),
        activate: function() {
            shell.title("Job Locations");
        },
        navigateTo: function(inspection) {
            shell.navigate("inspection", new inspectionViewModel(inspection));
        }
    };

    shell.status("Loading jobs...");
    data.getJobsFor(shell.inspector().Id()).then(processJobQueryResults);

    function processJobQueryResults(data) {
        shell.status(data.results.length + " jobs found.");

        vm.jobs([]);
        data.results.forEach(function(item) {
            vm.jobs.push(item);
        });
    }

    return vm;
});