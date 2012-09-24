define(function(require) {
    var shell = require('viewmodels/shell');

    return {
        states:[],
        addInspection: function() {
            
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