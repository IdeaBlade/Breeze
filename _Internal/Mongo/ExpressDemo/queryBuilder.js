var odataParser = require("./odataParser");

var boolOpMap = {
    eq: { jsOp: "==="},
    gt: { mondoOp: "$gt",  jsOp: ">" },
    ge: { mondoOp: "$gte", jsOp: ">=" },
    lt: { mondoOp: "$lt",  jsOp: "<" },
    le: { mondoOp: "$lte", jsOp: "<=" },
    ne: { mondoOp: "$ne",  jsOp: "!=" }
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
        var filterTree = odataParser.parse(section, "filterExpr");
        pieces.query = toQueryExpr(filterTree);
    }
    section = urlQuery.$select;
    if (section) {
        var selectItems = odataParser.parse(section, "selectExpr");
        pieces.select = toSelectExpr(selectItems);
    }

    section = urlQuery.$orderby;
    if (section) {
        var orderbyItems = odataParser.parse(section, "orderbyExpr");
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

    return pieces;

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
        if (startsWith(p2.type, "lit_")) {

            var p2Value = p2.value;
            if (op === "eq") {
                q[p1Value] = p2Value;
                return q;
            } else {
                var mop = boolOpMap[op].mondoOp;
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

function stringify(node) {
    return JSON.stringify(node);
    /* var nt = node.type;
    var result = nt + " { ";
    if (startsWith(node.type, "lit")) {
        result += "value: " + node.value.toString();
    } elseif (startsWith(nt, "fn") {
        result += "name: " + node.name;
    } elseif (startsWith(nt, "op_"))
        result += "node"
    result += "}";
    */
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

function extend(target, source) {
    if (!source) return target;
    for (var name in source) {
        if (source.hasOwnProperty(name)) {
            target[name] = source[name];
        }
    }
    return target;
}