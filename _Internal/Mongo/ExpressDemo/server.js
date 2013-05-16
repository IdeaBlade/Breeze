var express = require('express');
var app = express();
var routes = require('./routes');
var fs = require("fs");


app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

var testCaseDir = "c:/GitHub/Breeze/Breeze.Client/"


app.get('/', function(req,res) {
    res.sendfile(testCaseDir + 'index.html');
});
app.get('/breeze/NorthwindIBModel/Metadata', routes.getMetadata);
app.get('/breeze/NorthwindIBModel/Products', routes.getProducts);

app.get('/breeze/NorthwindIBModel/:slug', routes.get);
// alt other files
app.get(/^(.+)$/, function(req, res) {
    res.sendfile(testCaseDir + req.params[0]);
});

app.listen(3000);
console.log('Listening on port 3000');

function clientErrorHandler(err, req, res, next) {
    if (req.xhr) {
        res.send(500, { error: 'Something blew up!' });
    } else {
        next(err);
    }
}

function logErrors(err, req, res, next) {
    console.error(err.stack);
    next(err);
}

function errorHandler(err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
}