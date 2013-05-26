var mongodb = require('mongodb');
var fs = require('fs');
var queryBuilder = require("./queryBuilder");

var host = 'localhost';
var port = 27017;
var dbName = 'NorthwindIB';
var dbServer = new mongodb.Server(host, port, { auto_reconnect: true});
var db = new mongodb.Db(dbName, dbServer, { strict:true, w: 1});
db.open(function () {

});

exports.getMetadata = function(req, res) {
    var filename = "metadata.json";
    if (!fs.existsSync(filename)) {
        throw new Error("Unable to locate file: " + filename);
    }
    var metadata = fs.readFileSync(filename, 'utf8');
    res.sendfile(filename);
}

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
    db.collection(collectionName, {strict: true} , function (err, collection) {
        if (err) {
            res.send(400, "Unable to locate: " + collectionName);
            return;
        }
        var src;
        res.setHeader("Content-Type:", "application/json");
        if (query.inlineCount) {
            collection.count(query.query, function(err, count) {
                src = collection.find(query.query, query.select, query.options);
                src.toArray(function (err, items) {
                    var results =  { Results: items || [], InlineCount: count };
                    res.send(results);
                });
            });
        } else {
            src = collection.find(query.query, query.select, query.options);
            src.toArray(function (err, items) {
                res.send(items || []);
            });
        }
    });

}

