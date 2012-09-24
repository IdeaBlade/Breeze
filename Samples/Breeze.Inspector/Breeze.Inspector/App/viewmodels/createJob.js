define(function(require) {
    var shell = require('viewmodels/shell'),
        addInspectionDialog = require('viewmodels/addInspection');

    return {
        states: [],
        addInspection: function() {
            addInspectionDialog.show().then(function(selection) {
                //add to job
            });
        },
        activate: function() {
            shell.title("[new]");
            shell.subtitle1('Inspector ' + shell.inspector().Name());
            shell.addCommand('save', function() {
                alert('not implemented');
            });
            shell.addCommand('cancel', function() {
                alert('not implemented');
            });
        }
    };
});