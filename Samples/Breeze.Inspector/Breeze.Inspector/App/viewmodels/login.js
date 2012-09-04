define(function(require) {
    var data = require('services/dataservice'),
        shell = require('viewmodels/shell');

    var vm = {
        inspectors: ko.observableArray([]),
        activate: function() {
            shell.title("Breeze Inspector - Login");
            shell.status('');
        },
        selectInspector: function(inspector) {
            shell.inspector(inspector);
            shell.navigate('joblist');
        }
    };

    data.getInspectors().then(function(response) {
        response.results.forEach(function(item) {
            vm.inspectors.push(item);
        });
    });

    return vm;
});