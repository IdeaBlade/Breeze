var mongodb = require('mongodb');
var ObjectId = require('mongodb').ObjectID;

var odataParser = require("./odataParser");

exports.MongoQuery = MongoQuery;

var boolOpMap = {
    eq: { jsOp: "==="},
    gt: { mongoOp: "$gt",  jsOp: ">" },
    ge: { mongoOp: "$gte", jsOp: ">=" },
    lt: { mongoOp: "$lt",  jsOp: "<" },
    le: { mongoOp: "$lte", jsOp: "<=" },
    ne: { mongoOp: "$ne",  jsOp: "!=" }
}

var wherePrefix = "function() { return ";
var whereSuffix = "; }";

function MongoQuery(reqQuery) {
    this.filter = {};
    this.select= {};
    this.options= {};
    this._parseUrl(reqQuery);
}

MongoQuery.prototype._parseUrl = function(reqQuery) {
    var section;

    section = reqQuery.$filter;
    if (section) {
        var filterTree = parse(section, "filterExpr");
        var context = {
            translateMember: function(memberPath) {
                return memberPath.replace("/", ".");
            }
        };

        this.filter = toQueryExpr(filterTree, context);
    }

    section = reqQuery.$select;
    if (section) {
        var selectItems = parse(section, "selectExpr");
        this.select = toSelectExpr(selectItems);
    }

    section = reqQuery.$expand;
    if (section) {
        throw new Error("Breeze's Mongo library does not YET support 'expand'");
    }

    section = reqQuery.$orderby;
    if (section) {
        var orderbyItems = parse(section, "orderbyExpr");
        sortClause = toOrderbyExpr(orderbyItems);
        extend(this.options, sortClause)
    }

    section = reqQuery.$top;
    // not ok to ignore top: 0
    if (section !== undefined) {
        extend(this.options, { limit: parseInt(section, 10)});
    }

    section = reqQuery.$skip;
    // ok to ignore skip: 0
    if (section) {
        extend(this.options, { skip: parseInt(section, 10)});
    }

    section = reqQuery.$inlinecount;
    this.inlineCount = !!(section && section !== "none");

}

MongoQuery.prototype.execute = function(db, collectionName, fn) {
    var that = this;
    db.collection(collectionName, {strict: true} , function (err, collection) {
        if (err) {
            err = { statusCode: 404, message: "Unable to locate: " + collectionName, error: err };
            fn(err, null);
            return;
        }
        var src;

        // Note special handling for 'options.limit' = 0 as a real limit.

        if (that.inlineCount) {
            collection.count(that.filter, function(err, count) {
                // Mongo doesn't handle limit = 0 as a real limit.
                if (that.options && that.options.limit === 0) {
                    var resultsWith =  { Results: [], InlineCount: count };
                    fn(null, resultsWith);
                    return;
                }
                src = collection.find(that.filter, that.select, that.options);
                src.toArray(function (err, results) {
                    results = processResults(results, that.resultEntityType);
                    var resultsWith =  { Results: results, InlineCount: count };
                    fn(null, resultsWith);
                });
            });
        } else {
            // Mongo doesn't handle limit = 0 as a real limit.
            if (that.options && that.options.limit === 0) {
                fn(err, []);
                return;
            }
            src = collection.find(that.filter, that.select, that.options);
            src.toArray(function (err, results) {
                results = processResults(results, that.resultEntityType);
                fn(null, results);
            });
        }
    });
};


function processResults(results, resultEntityType) {
    results == results || [];
    if (resultEntityType) {
        results.forEach(function(r) { r.$type = resultEntityType} )
    }
    return results;
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

function toQueryExpr(node, context) {
    if (node.type === "op_bool") {
        return makeBoolFilter(node, context);
    } else if (node.type === "op_andOr") {
        return makeAndOrFilter(node, context);
    } else if (node.type === "fn_2") {
        return makeFn2Filter(node, context);
    } else if (node.type === "op_unary") {
        return makeUnaryFilter(node, context);
    } else if (node.type === "op_anyAll") {
        return makeAnyAllFilter(node, context);
    } else {
        throw new Error("Unable to parse node: " + node.type)
    }
}

function makeBoolFilter(node, context) {
    var q = {};
    var op = node.op;
    var p1 = node.p1;
    var p2 = node.p2;
    if (p1.type === "member") {
        // handles nested paths. '/' -> "."
        var p1Value = context.translateMember(p1.value);

        var p2Value;
        if (startsWith(p2.type, "lit_")) {
            if (p2.type === "lit_string") {
                p2Value = parseLitString(p2.value);
            } else {
                p2Value = p2.value;
            }
            if (op === "eq") {
                q[p1Value] = p2Value;
            } else {
                var mop = boolOpMap[op].mongoOp;
                var crit = {};
                crit[mop] = p2Value;
                q[p1Value] = crit;
            }
            return q;
        } else if (p2.type === "member") {
            var jop = boolOpMap[op].jsOp;
            var p2Value = context.translateMember(p2.value);
            var fn =  "this." + p1Value + " " + jop + " this." + p2Value ;
            return addWhereClause(q, fn);
        }
    } else if (p2.type === "lit_boolean") {
        var q = toQueryExpr(p1, context);
        if (p2.value === true) {
            return q;
        } else {
            return applyNot(q);
        }
    }
    throw new Error("Not yet implemented: Boolean operation: " + op + " p1: " + stringify(p1) + " p2: " + stringify(p2));
}

function makeUnaryFilter(node, context) {
    var op = node.op;
    var p1 = node.p1;
    var q1 = toQueryExpr(p1, context);

    if (op === "not ") {
        return applyNot(q1);
    }
    throw new Error("Not yet implemented: Unary operation: " + op + " p1: " + stringify(p1));
}


function makeFn2Filter(node, context) {
    var fnName = node.name;
    var p1 = node.p1;
    var p2 = node.p2;
    var q = {};
    if (p2.type === "member") {
        var p2Value = context.translateMember(p2.value);
    }
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
            var fn;
            if (fnName === "startswith") {
                fn =  "(new RegExp('^' + this." + p2Value + ",'i')).test(this." +  p1.value + ")";
                addWhereClause(q, fn);
            }   else if (fnName === "endswith") {
                fn =  "(new RegExp(this." + p2Value + " + '$','i')).test(this." +  p1.value + ")";
                addWhereClause(q, fn);
            }
        }
    } else if (fnName === "substringof") {
        if (p1.type === "lit_string" && p2.type === "member") {
            q[p2Value] = new RegExp(p1.value, "i");
        }
    }

    if (!isEmpty(q)) {
        return q;
    }
    throw new Error("Not yet implemented: Function: " + fnName + " p1: " + stringify(p1) + " p2: " + stringify(p2));
}

function makeAndOrFilter(node, context) {

    var q1 = toQueryExpr(node.p1, context);
    var q2 = toQueryExpr(node.p2, context);
    var q;
    if (node.op === "and") {
        // q = extendQuery(q1, q2);
        q = { "$and": [q1, q2] };
    } else {
        q = { "$or": [q1, q2] };
    }
    return q;
}

function makeAnyAllFilter(node, context) {
    var lambda = node.lambda;
    var newContext = {
        translateMember: function(memberPath) {
            return context.translateMember(memberPath.replace(lambda + "/", ""));
        }
    }
    return (node.op === "any") ? makeAnyFilter(node, newContext) : makeAllFilter(node, newContext);
}

function makeAnyFilter(node, context) {
    var subq = toQueryExpr(node.subquery, context);
    var q = {};
    q[node.member] = { "$elemMatch" : subq } ;
    return q;
}

function makeAllFilter(node) {
    var y = node;
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
            // haven't handled this case yet so just get out
            throw new Error("Not yet implemented: $not with $or operation: " + stringify(q1) );
            // break;
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

function addWhereClause(q, whereClause) {
    whereClause = "(" + whereClause + ")";
    var whereFn = wherePrefix + whereClause + whereSuffix;
    q.$where = whereFn;
    return q;
}


function extendQuery(target, source) {
    if (!source) return target;
    for (var name in source) {
        if (source.hasOwnProperty(name)) {
            var targetClause = target[name];
            if (targetClause) {
                if (name === "$where") {
                    target[name] = mergeWhereClauses(targetClause, source[name]);
                } else if (typeof(targetClause) === 'object') {
                    extendQuery(targetClause, source[name]);
                } else {
                    var crit = {};
                    var crit = { }
                }
            } else {
                target[name] = source[name];
            }
        }
    }
    return target;
}


function mergeWhereClauses(targetFn, sourceFn) {
    var targetClause = whereFnToWhereClause(targetFn);
    var sourceClause = whereFnToWhereClause(sourceFn);
    var whereFn = wherePrefix + targetClause + " && " + sourceClause + whereSuffix;
    return whereFn;
}

function whereFnToWhereClause(whereFn) {
    return whereFn.substring(wherePrefix.length, whereFn.length-whereSuffix.length);
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
            var targetVal = target[name];
            if (targetVal && typeof targetVal === 'object') {
                extend(targetVal, source[name]);
            } else {
                target[name] = source[name];
            }
        }
    }
    return target;
}