define(function(require) {
    var shell = require('viewmodels/shell'),
        addInspectionDialog = require('viewmodels/addInspection'),
        data = require('services/dataservice');

    var ctor = function() {
        this.job = ko.observable(data.createJob(shell.inspector()));
        this.states = [];
    };

    ctor.prototype.addInspection = function() {
        var that = this;
        addInspectionDialog.show().then(function(selection) {
            that.job().Inspections().push(selection);
        });
    };

    ctor.prototype.activate = function() {
        var that = this;

        shell.title("[new]");
        shell.subtitle1('Inspector ' + shell.inspector().Name());

        shell.addCommand('save', function() {
            alert('not implemented');
        });
        shell.addCommand('cancel', function() {
            alert('not implemented');
        });
    };

    return ctor;
});