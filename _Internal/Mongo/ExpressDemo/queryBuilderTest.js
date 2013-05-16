var queryBuilder = require("./queryBuilder");

var x;

console.log("starting queryBuilderTests");
// OrderBy expressions

parseAndCompare("$orderby","LastName",
    { "sort": [["LastName", "asc"]] }
);

parseAndCompare("$orderby","LastName, FirstName desc",
    { sort: [["LastName", "asc"], ["FirstName", "desc"]] }
);

parseAndCompare("$orderby", "LastName asc, FirstName ,  Name/Foo    desc",
    { sort: [
        ["LastName", "asc"],
        ["FirstName", "asc"],
        ["Name.Foo", "desc"]
    ]}
);

/*
// Select expressions
parseAndCompare("$select", "$select=LastName", ["LastName"]);

parseAndCompare("$select", "$select= LastName ,FirstName, Name/Foo , Name/Foo/Bar",
   ["LastName", "FirstName", "Name/Foo", "Name/Foo/Bar"]);

// Filter expressions

*/

parseAndCompare("$filter","Name eq 'John'",
    { Name: "John" }
);


parseAndCompare("$filter","Qty eq 6443",
    { Qty: 6443 }
);

parseAndCompare("$filter","Name/foo eq 'John'",
    { "Name.foo": 'John' }
);

parseAndCompare("$filter","Name eq 'John' and LastName lt 'Doe'",
    { Name: "John", LastName: { $lt: "Doe" }}
);

parseAndCompare("$filter","LastName eq FirstName",
    { $where: "function() { return this.LastName === this.FirstName}" }
);

parseAndCompare("$filter", "startswith(StringValue,'foo') eq true",
    { StringValue: /^foo/ }
);

parseAndCompare("$filter", "not startswith(StringValue,'foo') eq true",
    { StringValue: { $not: /^foo/ }}
);

parseAndCompare("$filter", "startswith(StringValue,'foo') eq false",
    { StringValue: { $not: /^foo/ }}
);
/*
parseAndCompare("$filter","$filter=(DoubleValue mod 2) eq 10",
    { type: "op_bool", op: "eq",
        p1: { type: "op_math", op: "mod",
            p1: { type: "member", value: "DoubleValue" },
            p2: { type: "lit_number", value: 2}
        },
        p2: { type: "lit_number", value: 10 }
    } );


parseAndCompare("$filter","$filter=substringof('text', StringValue) ne true",
    { type: "op_bool", op: "ne",
        p1: { type: "fn_2", name: "substringof",
            p1: { type: "lit_string", value: "text"  },
            p2: { type: "member", value: "StringValue"}
        },
        p2: { type: "lit_boolean", value: true }
    });

x =tryParse("$filter=not length(StringValue) eq 1");

x = tryParse("$filter=toupper(StringValue) ne 'text'");

parseAndCompare("$filter","$filter=DoubleValue div 2 eq 3",
    { type: "op_bool", op: "eq",
        p1: { type: "op_math", op: "div" ,
            p1: { type: "member", value: "DoubleValue"},
            p2: { type: "lit_number", value: 2 }
        },
        p2: { type: "lit_number", value: 3 }
    });

parseAndCompare("$filter","$filter=(StringValue ne 'text') or IntValue gt 2",
    { type: "op_andOr", op: "or",
        p1: { type: "op_bool", op: "ne",
            p1: { type: "member", value: "StringValue"},
            p2: { type: "lit_string", value: "text"}
        } ,
        p2: { type: "op_bool", op: "gt",
            p1: { type: "member", value: "IntValue"},
            p2: { type: "lit_number", value: 2}
        }
    } );

parseAndCompare("$filter","$filter=(not StringValue ne 'text') or IntValue gt 2",
    { type: "op_andOr", op: "or",
        p1: { type: "op_unary", op: "not ",
            p1: { type: "op_bool", op: "ne",
                p1: { type: "member", value: "StringValue"},
                p2: { type: "lit_string", value: "text"}
            }
        },
        p2: { type: "op_bool", op: "gt",
            p1: { type: "member", value: "IntValue"},
            p2: { type: "lit_number", value: 2}
        }
    } );

parseAndCompare("$filter", "$filter=(startswith(tolower(StringValue),'foo') eq true and endswith(tolower(StringValue),'1') eq false)",
    { type: "op_andOr", op: "and",
        p1: { type: "op_bool", op: "eq",
            p1: { type: "fn_2", name: "startswith",
                p1: { type: "fn_1", name: "tolower",
                    p1: { type: "member", value: "StringValue"}
                },
                p2: { type: "lit_string", value: "foo"}
            },
            p2: { type: "lit_boolean", value: true}
        },
        p2: { type: "op_bool", op: "eq",
            p1: { type: "fn_2", name: "endswith" ,
                p1: { type: "fn_1", name: "tolower",
                    p1: { type: "member", value: "StringValue"}
                },
                p2: { type: "lit_string", value: "1"}
            },
            p2: { type: "lit_boolean", value: false}
        }
    }   );

parseAndCompare("$filter","$filter=DateValue eq datetime'2012-05-06T16:11:00Z'",
    { type: "op_bool", op: "eq",
        p1: { type: "member", value: "DateValue"},
        p2: { type: "lit_dateTime", value: new Date('2012-05-06T16:11:00Z') }
    });


parseAndCompare("$filter", "$filter=StringValue eq '''single quotes'' within the text'",
    { type: "op_bool", op: "eq",
        p1: { type: "member", value: "StringValue" },
        p2: { type: "lit_string", value: "'single quotes' within the text"}
    });

parseAndCompare("$filter","$filter=StringValue eq 'Group1 and Group2'",
    { type: "op_bool", op: "eq",
        p1: { type: "member", value: "StringValue"},
        p2: { type: "lit_string", value: "Group1 and Group2" }
    } );

parseAndCompare("$filter","$filter=StringValue ne 'Group1 not Group2'",
    { type: "op_bool", op: "ne",
        p1: { type: "member", value: "StringValue"},
        p2: { type: "lit_string", value: "Group1 not Group2" }
    } );

*/

function parseAndCompare(nodeName, expr, expectedResult) {
    var urlQuery = {};
    urlQuery[nodeName] = expr;
    var r = queryBuilder.toMongoQuery(urlQuery);
    var res;
    if (nodeName==="$orderby") {
        res = r.options;
    } else if (nodeName === "$filter") {
        res = r.query;
    }
    if (res == null) {
        throw new Error("Unable to recognize: " + nodeName);
    }
    compare(expr, res, expectedResult);
}


function compare(title, o1, o2) {
    try {
        compareCore(o1, o2);
        console.log("Ok: "  + title);
    } catch (e) {
        console.log("Err: " + title + " --error:" + e.message);
        console.log("Actual:   " + JSON.stringify(o1));
        console.log("Expected: " + JSON.stringify(o2));
        return true;
    }
}

function compareCore(o1, o2, prevKey) {
    try {
        var ok = false;
        if (o1 === undefined || o2 === undefined) {
            ok = o1 === undefined && o2 === undefined;
        } else {
            prevKey = prevKey || "";
            var t = typeof(o1);
            if (o1 == null || t === "string" || t === "number" || t==="boolean") {
                ok = o1 === o2;
            } else if ( o1 instanceof Date ) {
                ok =  o1.getTime() === o2.getTime()
            } else {
                for (var k in o1) {
                    var v1 = o1[k];
                    var v2 = o2[k];
                    var r = undefined;
                    var key = prevKey + ":" + k;
                    compareCore(v1, v2, key);

                }
                ok = true;
            }
        }

        if (!ok) {
            throw new Error("error comparing key: " + prevKey);
        }
    } catch (e) {
        if (e.message.indexOf("key:")>=0) {
            throw e;
        } else {
            throw new Error("error comparing key: " + prevKey);
        }
    }

}

