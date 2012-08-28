requirejs.config({
    // well-known paths to selected scripts
    paths:{
        'breeze':'lib/breeze.debug', // debug version of breeze
        'text':'lib/text'// html loader plugin; see http://requirejs.org/docs/api.html#text
    }
});

define(['text', 'breeze'], function() {
    require(['services/dataservice', 'viewmodels/shell'], function(data, shell) {
        data.ready().then(function() { shell.initialize(); });
    });
});