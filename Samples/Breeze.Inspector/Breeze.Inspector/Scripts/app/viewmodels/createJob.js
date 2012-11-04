define(function(require) {
    var shell = require('viewmodels/shell'),
        addInspectionDialog = require('viewmodels/addInspection'),
        data = require('services/dataservice'),
        states = require('services/states'),
        ValidationHelper = require('services/validationHelper');

    var ctor = function() {
        this.job = ko.observable(data.createJob(shell.inspector()));
        this.states = states;
        this.validation = new ValidationHelper(this.job().Location());
    };

    ctor.prototype.addInspection = function() {
        var that = this;

        addInspectionDialog.show(this.job()).then(function(selection) {
            var inspection = data.createInspection(selection);
            that.job().Inspections.push(inspection);
        });
    };

    ctor.prototype.activate = function() {
        var that = this;

        shell.title("[new]");
        shell.subtitle1('Inspector ' + shell.inspector().Name());

        that.job().Location().Street1.subscribe(function(value) {
            if (!value || value.length == 0) {
                shell.title('[new]');
            } else {
                shell.title(value);
            }
        });

        shell.addCommand('save', function() {
            data.saveJob(that.job());
        }, this.validation.isValid);

        shell.addCommand('cancel', function() {
            shell.goBack();
        });
    };

    return ctor;
});