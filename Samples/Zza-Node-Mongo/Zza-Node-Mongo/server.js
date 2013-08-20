var fs = require("fs");
var express = require('express');
var routes = require('./routes');

var app = express();
var appDir =  __dirname+'/../zza';
var expressAppdir =  __dirname+'/public';

app.configure(function(){
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.compress());
    app.use('/', express.static(expressAppdir)); // look for overrides on express server 1st
    app.use('/', express.static(appDir));        // then look in regular zza
    app.use(express.bodyParser());
   // app.use(express.methodOverride());  // for full REST ... if we need it
    app.use(app.router);
});

// only in development
app.configure('development', function(){
    app.use(logErrors);
});

app.configure(function(){
    //app.use(express.errorHandler()); // use our error handler instead of Express module
    app.use(errorHandler);
});

    /* '/breeze/zza' API routes */
app.configure(function() {
    app.get('/breeze/zza/Metadata', routes.getMetadata);
    app.post('/breeze/zza/SaveChanges', routes.saveChanges);
    app.get('/breeze/zza/Products', routes.getProducts); // demo specialized route
    app.get('/breeze/zza/:slug', routes.get); // must be last API route
});

app.listen(3000);
console.log('__dirname = ' + __dirname +
            '\nexpressAppdir = ' + expressAppdir +
            '\nappDir = ' + appDir);

console.log('\nListening on port 3000');

/* Our fall through error logger and errorHandler  */

function logErrors(err, req, res, next) {
    var status = err.statusCode || 500;
    console.error(status + ' ' + (err.message ? err.message : err));
    if(err.stack) { console.error(err.stack); }
    next(err);
}

function errorHandler(err, req, res, next) {
    var status = err.statusCode || 500;
    if (err.message) {
        res.send(status, err.message);
    } else {
        res.send(status, err);
    }
}


