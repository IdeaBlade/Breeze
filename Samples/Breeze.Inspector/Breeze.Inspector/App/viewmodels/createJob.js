define(function(require) {
    var shell = require('viewmodels/shell'),
        addInspectionDialog = require('viewmodels/addInspection'),
        data = require('services/dataservice');

    var ctor = function() {
        this.job = ko.observable(data.createJob(shell.inspector()));
        this.states = [];
    };

    ctor.prototype.addInspection = function() {
        console.log("test");
        var that = this;
        addInspectionDialog.show().then(function(selection) {
            var inspection = data.createInspection(selection);
            that.job().Inspections().push(inspection);
            console.log(that.job().Inspections());
        });
        return true;
    };

    ctor.prototype.activate = function() {
        var that = this;

        shell.title("[new]");
        shell.subtitle1('Inspector ' + shell.inspector().Name());

        that.job().Location().Street1.subscribe(function(value) {
            shell.title(value);
        });

        shell.addCommand('save', function() {
            alert('not implemented');
        });
        shell.addCommand('cancel', function() {
            alert('not implemented');
        });
    };

    return ctor;
});