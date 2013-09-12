var mongodb = require('mongodb');
var fs = require('fs');
var breezeMongo = require('breeze-mongodb');
var metadata;

var host = 'localhost';
var port = 27017;
var dbName = 'zza';
var serverBase = 'Zza.ExpressServer/';
var dbServer = new mongodb.Server(host, port, { auto_reconnect: true});
var db = new mongodb.Db(dbName, dbServer, {
    strict:true,
    w: 1,
    safe: true
});
db.open(function () {/* noop */ });

exports.getMetadata = function(req, res, next) {
    if (!metadata){ getMetadataFromScriptFile();  }
    res.send(metadata);

    function getMetadataFromScriptFile(){
        var filename = serverBase + "public/app/metadata.js";
        if (!fs.existsSync(filename)) {
            next(new Error("Unable to locate metadata file: " + filename));
        }
        var metadataSrc = fs.readFileSync(filename, 'utf8');

        // Depend upon metadata.js in expected form:
        //   begins "var zza=zza||{};zza.metadata=" ...then \n ... then { ... and
        //   ends with "};"
        metadata = metadataSrc.substring(
            metadataSrc.indexOf('\n{')-1, // start with '{' following a newline
            metadataSrc.lastIndexOf('}')+1); // end with last '}'
    }
}

exports.get = function (req, res, next) {

    var slug = req.params.slug;
    var slugLc = slug.toLowerCase(); // we only use lower case for named queries
    if (namedQuery[slugLc]) {
        namedQuery[slugLc](req, res, next);
    } else {
        var err = {statusCode: 404, message: "Unable to locate query for " + slug};
        next(err) ;
        return;
    }
};

exports.getProducts = function(req, res, next) {
    var query = new breezeMongo.MongoQuery(req.query);
    // add your own filters here
    // Case of collection name matters, e.g. "Product", not "product"
    query.execute(db, "Product", processResults(res, next));
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
var namedQuery = {
    // always all lower case!
    customers: makeVanillaCollectionQuery('Customer'),
    orders: makeVanillaCollectionQuery('Order'),
    orderstatuses: makeVanillaCollectionQuery('OrderStatus'),
    products: makeVanillaCollectionQuery('Product'),
    productoptions: makeVanillaCollectionQuery('ProductOption'),
    productsizes: makeVanillaCollectionQuery('ProductSize'),

    lookups: lookups
};

function makeVanillaCollectionQuery(collectionName) {
    return function(req, res, next) {
        var query = new breezeMongo.MongoQuery(req.query);
        query.execute(db,collectionName, processResults(res, next));
    } ;
}

function lookups(req, res, next) {
    var lookups = {};
    var queryCountDown = 0;
    var done = processResults(res, next);

    getAll('OrderStatus','OrderStatus');
    getAll('Product','Product');
    getAll('ProductOption','ProductOption');
    getAll('ProductSize','ProductSize');

    function getAll(collectionName, entityType) {
        queryCountDown += 1;
        db.collection(collectionName, {strict: true} , function (err, collection) {
            if (err) {
                err = { statusCode: 404, message: "Unable to locate: " + collectionName, error: err };
                done(err, null);
                return;
            }
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
}

function processResults(res, next) {

    return function(err, results) {
        if (err) {
            next(err);
        } else {
            // Prevent browser from caching results of API data requests
            // Todo: Is this always the right policy? Never right? Or only for certain resources?
            res.setHeader('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
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


