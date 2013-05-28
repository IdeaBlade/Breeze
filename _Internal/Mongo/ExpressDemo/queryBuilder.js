var odataParser = require("./odataParser");
// var uuidHelpers = require("./uuidHelpers");
var mongodb = require('mongodb');
var ObjectId = require('mongodb').ObjectID;


var boolOpMap = {
    eq: { jsOp: "==="},
    gt: { mongoOp: "$gt",  jsOp: ">" },
    ge: { mongoOp: "$gte", jsOp: ">=" },
    lt: { mongoOp: "$lt",  jsOp: "<" },
    le: { mongoOp: "$lte", jsOp: "<=" },
    ne: { mongoOp: "$ne",  jsOp: "!=" }
}

exports.toMongoQuery= function(urlQuery) {
    var section;
    section = urlQuery.$filter;
    var pieces = {
        query: {},
        select: {},
        options: {}
    };

    if (section) {
        var filterTree = parse(section, "filterExpr");
        pieces.query = toQueryExpr(filterTree);
    }
    section = urlQuery.$select;
    if (section) {
        var selectItems = parse(section, "selectExpr");
        pieces.select = toSelectExpr(selectItems);
    }

    section = urlQuery.$orderby;
    if (section) {
        var orderbyItems = parse(section, "orderbyExpr");
        sortClause = toOrderbyExpr(orderbyItems);
        extend(pieces.options, sortClause)
    }

    section = urlQuery.$top;
    if (section) {
        extend(pieces.options, { limit: parseInt(section, 10)});
    }

    section = urlQuery.$skip;
    if (section) {
        extend(pieces.options, { skip: parseInt(section, 10)});
    }

    section = urlQuery.$inlinecount;
    pieces.inlineCount = !!(section && section !== "none");

    return pieces;

}

function parse(text, sectionName) {
    try {
        return odataParser.parse(text, sectionName);
    } catch(e) {
        var err = new Error("Unable to parse " + sectionName + ": " + text);
        err.statusCode = 400;
        err.innerError = e;
        throw err;
    }
}

function toOrderbyExpr(orderbyItems) {
    // "sort": [['field1','asc'], ['field2','desc']]

    var sortItems = orderbyItems.map(function(s) {
        var sPath = s.path.replace("/",".");
        return [sPath,  s.isAsc ? "asc" : "desc"];
    }) ;
    return { sort: sortItems };
}

function toSelectExpr(selectItems) {
    var result = {};
    selectItems.forEach(function(s) {
        var sPath = s.replace("/",".");
        result[sPath] = 1;
    }) ;
    return result;
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
    var q = {};

    if (p1.type === "member") {
        // handles nested paths. '/' -> "."
        var p1Value = p1.value.replace("/",".");

        var p2Value;
        if (startsWith(p2.type, "lit_")) {
            if (p2.type === "lit_string") {
                p2Value = parseLitString(p2.value);
            } else {
                p2Value = p2.value;
            }
            if (op === "eq") {
                q[p1Value] = p2Value;
                return q;
            } else {
                var mop = boolOpMap[op].mongoOp;
                var crit = {};
                crit[mop] = p2Value;
                q[p1Value] = crit;
                return q;
            }
        } else if (p2.type === "member") {
            var jop = boolOpMap[op].jsOp;
            var p2Value = p2.value.replace("/",".");
            q["$where"] = "function() { return this." + p1Value + " " + jop + " this." + p2Value + "}";
            return q;
        }
    } else if (p2.type === "lit_boolean") {
        var q = toQueryExpr(p1);
        if (p2.value === true) {
            return q;
        } else {
            return applyNot(q);
        }
    }
    throw new Error("Not yet implemented: Boolean operation: " + op + " p1: " + stringify(p1) + " p2: " + stringify(p2));
}



function makeUnaryFilter(op, p1) {

    var q1 = toQueryExpr(p1);

    if (op === "not ") {
        return applyNot(q1);
    }
    throw new Error("Not yet implemented: Unary operation: " + op + " p1: " + stringify(p1));
}

function applyNot(q1) {
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

function makeFn2Filter(fnName, p1, p2) {
    var q = {};
    if (p1.type === "member") {
        // TODO: need to handle nested paths. '/' -> "."
        var key = p1.value;
        if (startsWith(p2.type, "lit_")) {
            if (fnName === "startswith") {
                q[key] =  new RegExp("^" +p2.value, 'i' ) ;
            }   else if (fnName === "endswith") {
                q[key] =  new RegExp( p2.value + "$", 'i');
            }
        } else if (p2.type === "member") {
            if (fnName === "startswith") {
                q["$where"] =  "function() { return (new RegExp('^' + this." + p2.value + ",'i')).test(this." +  p1.value + "); }";
            }   else if (fnName === "endswith") {
                q["$where"] =  "function() { return (new RegExp(this." + p2.value + " + '$','i')).test(this." +  p1.value + "); }";
            }
        }
    } else if (fnName === "substringof") {
        if (p1.type === "lit_string" && p2.type === "member") {
            q[p2.value] = new RegExp(p1.value, "i");
        }
    }

    if (!isEmpty(q)) {
        return q;
    }
    throw new Error("Not yet implemented: Function: " + fnName + " p1: " + stringify(p1) + " p2: " + stringify(p2));
}

function makeAndOrFilter(op, p1, p2) {

    var q1 = toQueryExpr(p1);
    var q2 = toQueryExpr(p2);
    var q;
    if (op === "and") {
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

function parseLitString(s) {
    if (/^[0-9a-fA-F]{24}$/.test(s)) {
        return new ObjectId(s);
    } else {
        return s;
    }
}

function stringify(node) {
    return JSON.stringify(node);
}

function isEmpty(obj) {

    // null and undefined are empty
    if (obj == null) return true;
    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length && obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    for (var key in obj) {
        if (hasOwnProperty.call(obj, key))    return false;
    }

    return true;
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