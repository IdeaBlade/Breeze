var fs = require("fs");
var express = require('express');
var app = express();
var routes = require('./routes');

app.use(express.bodyParser());

app.use(app.router);
app.use(logErrors);
app.use(errorHandler);


app.get('/', function(req,res) {
    res.sendfile('index.html');
});
app.get('/breeze/zza/Metadata', routes.getMetadata);
app.get('/breeze/zza/Products', routes.getProducts);
app.post('/breeze/zza/SaveChanges', routes.saveChanges);

app.get('/breeze/zza/:slug', routes.get);

app.listen(3000);
console.log('Listening on port 3000');


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