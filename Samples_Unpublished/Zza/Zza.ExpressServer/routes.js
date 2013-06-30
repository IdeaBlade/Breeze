var mongodb = require('mongodb');
var fs = require('fs');
var breezeMongo = require('breeze-mongodb');

var host = 'localhost';
var port = 27017;
var dbName = 'zza';
var serverBase = 'Zza.ExpressServer/';
var dbServer = new mongodb.Server(host, port, { auto_reconnect: true});
var db = new mongodb.Db(dbName, dbServer, { strict:true, w: 1});
db.open(function () {/* noop */ });

exports.getMetadata = function(req, res, next) {
    var filename = serverBase + "metadata.json";
    if (!fs.existsSync(filename)) {
        next(new Error("Unable to locate file: " + filename));
    }
    var metadata = fs.readFileSync(filename, 'utf8');
    res.sendfile(filename);
}

exports.get = function (req, res, next) {

    var slug = req.params.slug;
    if (namedQuery[slug]) {
        namedQuery[slug](req, res, next);
    } else {
        var query = new breezeMongo.MongoQuery(req.query);
        query.execute(db, slug, processResults(res, next));
    }
};

exports.getProducts = function(req, res, next) {
    var query = new breezeMongo.MongoQuery(req.query);
    // add your own filters here
    // CASE MATTERS: "products", not "Products"
    query.execute(db, "products", processResults(res, next));
}

// if you don't want to use a Mongo query
function executeQuery(db, collectionName, query, fn) {
    var that = this;
    db.collection(collectionName, {strict: true} , function (err, collection) {
        if (err) {
            err = { statusCode: 404, message: "Unable to locate: " + collectionName, error: err };
            fn(err, null);
            return;
        }

        var src = collection.find(query.filter || {}, query.select || {}, query.options || {});
        src.toArray(function (err, results) {
            results == results || [];
            if (query.resultEntityType) {
                results.forEach(function(r) { r.$type = query.resultEntityType} )
            }
            fn(err, results || []);
        });

    });

};

/* Named queries */
var namedQuery = {};

namedQuery.lookups = function(req, res, next) {
    var lookups = {};
    var queryCountDown = 0;
    var done = processResults(res, next);

    getAll('orderStatuses','OrderStatus');
    getAll('products','Product');
    getAll('productOptions','ProductOption');
    getAll('productSizes','ProductSize');

    function getAll(collectionName, entityType) {
        db.collection(collectionName, {strict: true} , function (err, collection) {
            if (err) {
                err = { statusCode: 404, message: "Unable to locate: " + collectionName, error: err };
                done(err, null);
                return;
            }
            queryCountDown += 1;
            src = collection.find().toArray(function (err, results) {
                queryCountDown -= 1;
                if (err) {
                    done(err,null);
                    return;
                }
                //Todo: explain why we add $type
                results.forEach(function(r) {r.$type = entityType});
                lookups[collectionName]=results;

                if (queryCountDown === 0) {
                    done(null, lookups);
                }
            });
        });
    }

};

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

/*** Save Changes ***/

exports.saveChanges = function(req, res, next) {
    var saveHandler = new breezeMongo.MongoSaveHandler(db, req.body, processResults(res, next));
    saveHandler.beforeSaveEntity = beforeSaveEntity;
    saveHandler.beforeSaveEntities = beforeSaveEntities;
    saveHandler.save();
};

function beforeSaveEntity(entity) {
    /* logic here */
    return true;
}

function beforeSaveEntities(callback) {
    /* logic here */
    callback();
}


