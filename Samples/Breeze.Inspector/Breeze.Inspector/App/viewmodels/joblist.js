define(function(require) {
    var data = require('services/dataservice'),
        shell = require('viewmodels/shell'),
        InspectionViewModel = require('viewmodels/inspection');

    var vm = {
        jobs: ko.observableArray([]),
        activate: function() {
            shell.title(shell.inspector().Name());
            shell.subtitle1("");
            shell.subtitle2("");
            data.getJobsFor(shell.inspector().Id()).then(function(response) {
                vm.jobs(response.results);
                var locations = vm.jobs().length;
                shell.subtitle1(locations.toString() + (locations > 1 ? " locations" : " location"));
            });
        },
        navigateTo: function(inspection) {
            shell.navigate("inspection", new InspectionViewModel(inspection));
        }
    };

    return vm;
});