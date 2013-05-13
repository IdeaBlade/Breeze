var express = require('express');
var app = express();
var routes = require('./routes');


app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

app.get('/breeze/Products', routes.getProducts);
app.get('/breeze/:slug', routes.get);

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