var PEG = require("pegjs");
var fs = require("fs");
var parser
var shouldGenerateParser = false;

if (shouldGenerateParser) {
    console.log("reading file...");
    var filename = "odataParser.peg";
    if (!fs.existsSync(filename)) {
        throw new Error("Unable to locate file: " + filename);
    }
    var pegdef = fs.readFileSync(filename, 'utf8');

    console.log("reading file completed");

    var t0;
    var parser;
    try {
        parser = PEG.buildParser(pegdef);
    } catch (e) {
        console.log(e.message);
        throw e;
    }
} else {
    parser = require("./odataParser")
}
t0 = tryParse("$filter='xxx'");

t0 = tryParse("$filter=Name/foo")

parseAndCompare("$filter","$filter=Name eq 'John'",
    { type: "op_bool", op: "eq",
        p1: { type: "member", value: "Name" },
        p2: { type: "lit_string", value: "John"}
    });


parseAndCompare("$filter","$filter=Qty eq 6443",
    { type: "op_bool", op: "eq",
        p1: { type: "member", value: "Qty"},
        p2: { type: "lit_number", value: 6443}
    });

parseAndCompare("$filter","$filter=Name/foo eq 'John'",
    { type: "op_bool", op: "eq",
        p1: { type: "member", value: "Name/foo" },
        p2: { type: "lit_string", value: "John"}
    });

parseAndCompare("$filter","$filter=Name eq 'John' and LastName lt 'Doe'",
    { type: "op_andOr", op: "and",
        p1: { type: "op_bool", op: "eq",
            p1: { type: "member", value: "Name"},
            p2: { type: "lit_string", value: "John" }
        },
        p2: { type: "op_bool", op: "lt",
            p1: { type: "member", value: "LastName"},
            p2: { type: "lit_string", value: "Doe"}
        }
    } );

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

 t0=tryParse("$filter=not length(StringValue) eq 1");

t0 = tryParse("$filter=toupper(StringValue) ne 'text'");

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

function parseAndCompare(nodeName, expr, expectedResult) {
    var r = tryParse(expr);
    if (r == null) return;
    if (nodeName) r = r[nodeName];
    compare(expr, r, expectedResult);
}

function tryParse(s) {
    try {
        return parser.parse(s);
    } catch (e)  {
        console.log("error parsing: " + s + "   error -> " + e.message)
        return null;
    }
}

function compare(title, o1, o2) {
    try {
        compareCore(o1, o2);
        console.log("Ok: "  + title);
    } catch (e) {
        console.log("Err: " + title + " --error:" + e.message);
        return true;
    }
}

function compareCore(o1, o2, prevKey) {
    try {
        prevKey = prevKey || "";
        var t = typeof(o1);
        var ok = false;
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

