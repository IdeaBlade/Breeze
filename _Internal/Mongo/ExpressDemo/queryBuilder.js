var odataParser = require("./odataParser");

var boolOpMap = {
    gt: "$gt",
    ge: "$gte",
    lt: "$lt",
    le: "$lte",
    ne: "$ne"
}

exports.toMongoQuery= function(urlQuery) {
    var section;
    section = urlQuery.$filter;
    var pieces = {
        query: {}
    };

    if (section) {
        var filterTree = odataParser.parse(section, "filterExpr");
        pieces.query = toQueryExpr(filterTree);
    }
    section = urlQuery.$select;
    if (section) {
        var selectTree = odataParser.parse(section, "selectExpr");
        pieces.select = toSelectExpr(selectTree);
    }

    return pieces;

}

function toQueryExpr(node) {
    if (node.type === "op_bool") {
        return makeBoolFilter(node.op, node.p1, node.p2);
    } else if (node.type === "op_andOr") {
        return makeAndOrFilter(node.op, node.p1, node.p2);
    } else if (node.type === "fn_2") {
        return makeFn2Filter(node.name, node.p1, node.p2);
    } else if (node.type === "op_unary") {
        return makeUnaryFilter(node.op, node.p1);
    } else {
        throw new Error("Unable to parse node: " + node.type)
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
                return result;
            } else {
                var mop = boolOpMap[op];
                var crit = {};
                crit[mop] = value;
                result[key] = crit;
                return result;
            }
        }
    }
    throw new Error("Not yet implemented: Boolean operation: " + op + " p1: " + p1.type + " p2: " + p2.type);
}

function makeUnaryFilter(op, p1) {

    var q1 = parseNode(p1);

    if (op === "not ") {
        // because of the #@$#1 way mongo defines $not - i.e. can't apply it at the top level of an expr
        // and / or code gets ugly.
        // rules are:
        // not { a: 1}             -> { a: { $ne: 1 }}
        // not { a: { $gt: 1 }}    -> { a: { $not: { $gt: 1}}}
        // not { a: 1, b: 2 }      -> { $or: { a: { $ne: 1 }, b: { $ne 2 }}}
        // not { $or { a:1, b: 2 } -> { a: { $ne: 1 }, b: { $ne 2 }  // THIS ONE NOT YET COMPLETE
        var results = [];
        for (var k in q1) {
            if (k === "$or") {
                break; // haven't handled this case yet so just get out
            }
            var result = {};
            var v = q1[k];
            if ( v!=null && typeof(v) === "object") {
                result[k] = { $not: v };
            } else {
                result[k] = { "$ne": v };
            }
            results.push(result);
        }
        if (results.length === 1) {
            return results[0];
        } else {
            return { "$or": results };
        }
    }
    throw new Error("Not yet implemented: Unary operation: " + op + " p1: " + p1.type);
}

function makeFn2Filter(fnName, p1, p2) {
    if (p1.type === "member") {
        // TODO: need to handle nested paths. '/' -> "."
        var key = p1.value;
        if (startsWith(p2.type, "lit_")) {
            result = {};
            if (fnName === "startswith") {
                result[key] =  new RegExp("^" +p2.value ) ;
                return result;
            }   else if (fnName === "endswith") {
                result[key] =  new RegExp( p2.value + "$");
                return result;
            }
        }
    }

    throw new Error("Not yet implemented: Function: " + fnName + " p1: " + p1.type + " p2: " + p2.type);
}

function makeAndOrFilter(op, p1, p2) {

    var q1 = parseNode(p1);
    var q2 = parseNode(p2);
    var q;
    if (op === "and") {
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