var mongodb = require('mongodb');
var fs = require('fs');
var queryBuilder = require("./queryBuilder");
var queryExecutor = require("./queryExecutor");
var saveBuilder = require("./saveBuilder");

var host = 'localhost';
var port = 27017;
var dbName = 'NorthwindIB';
var dbServer = new mongodb.Server(host, port, { auto_reconnect: true});
var db = new mongodb.Db(dbName, dbServer, { strict:true, w: 1});
db.open(function () {

});

exports.getMetadata = function(req, res, next) {
    var filename = "metadata.json";
    if (!fs.existsSync(filename)) {
        next(new Error("Unable to locate file: " + filename));
    }
    var metadata = fs.readFileSync(filename, 'utf8');
    res.sendfile(filename);
}

exports.saveChanges = function(req, res, next) {
    saveBuilder.saveChanges(db, req, processResults(res, next));
}

exports.get = function (req, res, next) {
    var collectionName = req.params.slug;
    var query = queryBuilder.toMongoQuery(req.query);
    queryExecutor.executeQuery(db, collectionName, query, processResults(res, next))
};

exports.getProducts = function(req, res, next) {
    var query = queryBuilder.toMongoQuery(req.query);
    // add addit own filters here
    queryExecutor.executeQuery(db, "Products", query, processResults(res, next));
}

function processResults(res, next) {

    return function(err, results) {
        if (err) {
            next(err);
        } else {
            res.setHeader("Content-Type:", "application/json");
            res.send(results);
        }
    }
}


