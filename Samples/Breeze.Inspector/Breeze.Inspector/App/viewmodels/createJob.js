define(function(require) {
    var shell = require('viewmodels/shell'),
        addInspectionDialog = require('viewmodels/addInspection'),
        data = require('services/dataservice'),
        states = require('services/states');

    var ctor = function() {
        this.job = ko.observable(data.createJob(shell.inspector()));
        this.states = states;
    };

    ctor.prototype.addInspection = function() {
        var that = this;
        
        //TODO: filter inspection list based on existing inspections
        addInspectionDialog.show().then(function(selection) {
            var inspection = data.createInspection(selection);
            that.job().Inspections.push(inspection);
        });
    };

    ctor.prototype.activate = function() {
        var that = this;

        shell.title("[new]");
        shell.subtitle1('Inspector ' + shell.inspector().Name());

        that.job().Location().Street1.subscribe(function(value) {
            if(!value || value.length == 0) {
                shell.title('[new]');
            } else {
                shell.title(value);
            }
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