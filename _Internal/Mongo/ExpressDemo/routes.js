var mongodb = require('mongodb');
var odataParser = require("./odataParser");

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
    var query = makeQuery(req);
    getCollection(res, collectionName, query);
};

exports.getProducts = function(req, res) {
    var query = makeQuery(req);
    getCollection(res, "Products", query);
}

var boolOpMap = {
    gt: "$gt",
    ge: "$gte",
    lt: "$lt",
    le: "$lte",
    ne: "$ne"
}

function makeQuery(req) {
    var filter = req.query.$filter;
    if (!filter) return null;
    var parsedFilter = odataParser.parse(filter, "baseExpr");
    var q = parseNode(parsedFilter);
    return q;
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

function parseNode(node) {
    if (node.type === "op_bool") {
        return makeBoolFilter(node.op, node.p1, node.p2);
    } else if (node.type === "op_andOr") {
        return makeAndOrFilter(node.op, node.p1, node.p2);
    } else {
        return null;
    }
}

function makeBoolFilter(op, p1, p2) {
    var result = {};
    if (p1.type === "member") {
        // TODO: need to handle nested paths. '/' -> "."
        var key = p1.value;
        if (startsWith(p2.type, "lit_")) {
            var value = p2.value;
            if (op === "eq") {
                result[key] = value;
            } else {
                var mop = boolOpMap[op];
                var crit = {};
                crit[mop] = value;
                result[key] = crit;
            }
            return result;
        }
    }
}

function makeAndOrFilter(op, p1, p2) {
    var result = {};
    var q1 = parseNode(p1);
    var q2 = parseNode(p2);
    var q;
    if (op==="and") {
        q = extend(q1, q2);
    } else {
        q = { "$or": [q1, q2] }
    }
    return q;
}

function startsWith(str, prefix) {
    // returns false for empty strings too
    if ((!str) || !prefix) return false;
    return str.indexOf(prefix, 0) === 0;
}

function extend(target, source) {
    if (!source) return target;
    for (var name in source) {
        if (source.hasOwnProperty(name)) {
            target[name] = source[name];
        }
    }
    return target;
}