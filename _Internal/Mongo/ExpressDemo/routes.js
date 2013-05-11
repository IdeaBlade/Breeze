var mongodb = require('mongodb');
var queryBuilder = require("./queryBuilder");

var host = 'localhost';
var port = 27017;
var dbName = 'NorthwindIB';
var dbServer = new mongodb.Server(host, port);
var db = new mongodb.Db(dbName, dbServer, {auto_reconnect: true, safe:true});
db.open(function () {

});

exports.get = function (req, res) {
    // res.setHeader('Content-Length', body.length);
    var collectionName = req.params.slug;
    var query = queryBuilder.toMongoQuery(req.query);
    getCollection(res, collectionName, query);
};

exports.getProducts = function(req, res) {
    var query = queryBuilder.toMongoQuery(req.query);
    getCollection(res, "Products", query);
}

function getCollection(res, collectionName, query) {
    db.collection(collectionName, function (err, collection) {
        if (err) {
            res.send(400, "Unable to locate: " + collectionName);
            return;
        }
        collection.find(query).toArray(function (err, items) {
            res.setHeader("Content-Type:", "application/json");
            res.send(items);
        });
    });

}

