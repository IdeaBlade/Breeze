var odataParser = require("./odataParser");

var boolOpMap = {
    gt: "$gt",
    ge: "$gte",
    lt: "$lt",
    le: "$lte",
    ne: "$ne"
}

exports.toMongoQuery= function(urlQuery) {

    var filter = urlQuery.$filter;
    if (!filter) return null;
    var parsedFilter = odataParser.parse(filter, "baseExpr");
    var q = parseNode(parsedFilter);
    return q;
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

function makeStartsWith(p1, p2) {
    var q1 = parseNode(p1);
    var q2 = parseNode(p2);

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