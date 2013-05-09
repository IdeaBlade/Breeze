var PEG = require("pegjs");
var fs = require("fs");

//log("reading file...");
var filename = "odata.pegjs1";
if (!fs.existsSync(filename)) {
    throw new Error("Unable to locate file: " + filename);
}
var pegdef = fs.readFileSync(filename, 'utf8');
var t0;
var parser;
try {
    parser = PEG.buildParser(pegdef);
} catch (e) {
    throw e
}

t0 = tryParse("$filter='xxx'");

t0 = tryParse("$filter=Name/foo")

t0 = tryParse("$filter=Name eq 'John'");

t0 = tryParse("$filter=Qty eq 6443");

t0 = tryParse("$filter=Name/foo eq 'John'");

t0 = tryParse("$filter=(Name eq 'John') and LastName lt 'Doe'");

t0 = tryParse("$filter=(DoubleValue mod 2) eq 10");

t0 = tryParse("$filter=substringof('text', StringValue) eq true");

t0 = tryParse("$filter=not length(StringValue) eq 1");

function tryParse(s) {
    try {
        return parser.parse(s);
    } catch (e)  {
        throw e
    }
}