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
    app.use(express.errorHandler());
    //app.use(logErrors);    // See below
    //app.use(errorHandler); // See below
});

/* data routes */
app.configure(function() {
    app.get('/breeze/zza/Metadata', routes.getMetadata);
    app.get('/breeze/zza/Products', routes.getProducts);
    app.post('/breeze/zza/SaveChanges', routes.saveChanges);
    app.get('/breeze/zza/:slug', routes.get);
});

app.listen(3000);
console.log('Listening on port 3000, \n__dirname = ' + __dirname +
    '\nexpressAppdir = ' + expressAppdir +
    '\nappDir = ' + appDir);

/* Our errorHandler if we don't like the express handler */
/*
function errorHandler(err, req, res, next) {
    var status = err.statusCode || 500;
    if (err.message) {
        res.send(status, err.message);
    } else {
        res.send(status, err);
    }
}

function logErrors(err, req, res, next) {
    console.error(err.stack);
    next(err);
}
 */