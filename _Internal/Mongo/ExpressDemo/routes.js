var mongodb = require('mongodb');
var fs = require('fs');
var breezeMongo = require('breeze-mongodb');

//var MongoQuery = breezeMongo.MongoQuery;
//var saveChanges = breezeMongo.saveChanges;

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

exports.get = function (req, res, next) {
    var query = new breezeMongo.MongoQuery(req.query);
    var collectionName = req.params.slug;
    query.execute(db, collectionName, processResults(res, next));
};

exports.getProducts = function(req, res, next) {
    var query = new breezeMongo.MongoQuery(req.query);
    // add your own filters here
    query.execute(db, "Products", processResults(res, next));
}

exports.saveChanges = function(req, res, next) {
    breezeMongo.saveChanges(db, req.body, processResults(res, next));
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


