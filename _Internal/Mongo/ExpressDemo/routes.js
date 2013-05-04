var mongodb = require('mongodb');

var host = 'localhost';
var port = 27017;
var dbName = 'NorthwindIB';
var dbServer = new mongodb.Server(host, port);
var db = new mongodb.Db(dbName, dbServer, {auto_reconnect: true, safe:true});
db.open(function () {

});

exports.get = function (req, res) {
    // res.setHeader('Content-Length', body.length);
    db.collection('Products', function (err, collection) {
        collection.find().toArray(function (err, items) {
            res.setHeader("Content-Type:", "application/json");
            res.send(items);
        });
    });
};