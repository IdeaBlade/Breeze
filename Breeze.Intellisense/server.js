
var http = require('http');
var fs = require('fs');
var HandleBars = require('handlebars');
var moduleMap = {};

process.argv.forEach(function (val, index, array) {
  log("arguments - " +  index + ": '" + val + "'");
});

console.time("Execution time");

// argv returns just "node" when run from the desktop;
var shouldRunInWebPage = false; // process.argv[0] !== "node";

if (shouldRunInWebPage) {
    log("running in web page");
    runInServer();
} else {
    log("running on desktop");
    runOnDesktop();
}

function runOnDesktop() {
    readWrite(function (output) {
        console.timeEnd("Execution time");
    });
}

function runInServer() {
    http.createServer(function (req, res) {

        res.writeHead(200, { 'Content-Type': 'text/html' });
        inprocess = false;
        if (!inprocess) {
            inprocess = true;
            readWrite(function (output) {
                res.end("done");
                console.timeEnd("Execution time");
                // res.end(output);
            });
        }

    }).listen(process.env.PORT || 8080);
}


function readWrite(callback) {
    log("reading file...");
    var filename = "..\\apidocs\\data.json";
    if (!fs.existsSync(filename)) {
        throw new Error("Unable to locate file: " + fileName);
    }
    var data = fs.readFileSync(filename, 'utf8');
    log("parsing JSON...")
    var rawApi = JSON.parse(data);
    log("processing rawApi...");
    var api = processRawApi(rawApi);
    log("formatting with template...");
    var output = outputUsingTemplate(api);
    fs.writeFileSync("breeze.intellisense.js", output, "utf8");
    fs.writeFileSync("..\\Breeze.Client\\Scripts\\breeze.intellisense.js", output, "utf8");
    log("done");
    // console.log(output);
    callback(api);
    
}



function processRawApi(rawApi) {
    var api = {};
    // var moduleMap = {};
    var modules = [];
    api.modules = modules;
    api.generatedAt = new Date();
    modules.undefinedModules = [];
    modules.undefinedClasses = [];
    objectForEach(rawApi.classes, function (k, v) {
        var moduleName = v.module;
        var module = moduleMap[moduleName];
        if (!module) {
            module = {
                name: moduleName,
                classMap: {},
                classes: []
            }
            moduleMap[moduleName] = module;
            modules.push(module);
        }
        var classeMap = module.classMap;
        var className = v.name;
        var aClass = {
            name: className,
            description: formatMultiline(v.description),
            static: v.static,
            properties: [],
            classProperties: [],
            methods: [],
            classMethods: [],
            events: []
        };
        // skip these
        reservedChar = "ↈ";
        if (className.substr(0,1) !== reservedChar) {
            module.classMap[className] = aClass;
            module.classes.push(aClass);
        }
       

    });
    objectForEach(rawApi.classitems, function (k, v) {
        var module = moduleMap[v.module];
        if (!module) {
            modules.undefinedModules.push(v);
        } else {
            aClass = module.classMap[v.class];
            if (!aClass) {
                modules.undefinedClasses.push(v);
            } else {
                processClass(aClass, v);
            }
        }

    });
    
    return api;
}

function processClass(aClass, rawItem) {
    if (rawItem.itemtype === "property") {
        var prop = processProperty(rawItem);
        if (prop.isStatic) {
            aClass.classProperties.push(prop);
        } else {
            aClass.properties.push(prop);
        }
    } else if (rawItem.itemtype === "method") {
        var method = processMethod(rawItem);
        if (method.isCtor) {
            aClass.ctor = method;            
        } else if (method.isStatic) {
            aClass.classMethods.push(method);
        } else {
            aClass.methods.push(method);
        }
    } else if (rawItem.itemType === "event") {
        var event = processEvent(rawItem);
        aClass.events.push(event);
    } else {
        
    }
}

function processMethod(rawMethod) {
    
    var method = {
        name: rawMethod.name,
        type: rawMethod.type,
        description: formatMultiline(rawMethod.description),
        isStatic: rawMethod.static
    };
    
    method.isCtor = rawMethod.name.indexOf("<ctor>") >= 0;
    var params = rawMethod.params;
    if (params) {
        params.forEach(function (p) {
            p.optional = p.optional = "true" ? "true" : "false";
            p.description = formatSingleLine(p.description);
            processTypeOn(p);
        });
        method.params = params;
    }
    var returnInfo= rawMethod["return"];
    if (returnInfo) {
        returnInfo.description = formatSingleLine(returnInfo.description);
        processTypeOn(returnInfo);

    }
    method["return"] = returnInfo;
    return method;
}

function processProperty(rawProp) {
     var property = {
        name: rawProp.name,
        type: rawProp.type,
        description: formatSingleLine(rawProp.description),
        isStatic: rawProp.static
    };
    processTypeOn(property);
    return property;
}

function processTypeOn(parentObject) {
    var rawType = parentObject.type;
    if (!rawType) return parentObject;
    rawType = rawType.trim();
    if (rawType.indexOf("|")>=0) {
        parentObject.type == rawType;
        return parentObject;
    }
    var elementType = rawType.replace("Array of", "");
    if (elementType.length != rawType.length) {
        parentObject.type = "Array";
        parentObject.elementType = elementType.trim();
        qualifyTypeOn(parentObject, "elementType");
    } else {
        parentObject.type = rawType;
        qualifyTypeOn(parentObject);
    }
    return parentObject;
}

function qualifyTypeOn(parentObj, propertyName) {
    propertyName = propertyName || 'type';
    var type = parentObj[propertyName];
    for (var moduleName in moduleMap) {
        if (hasOwnProperty.call(moduleMap, moduleName)) {
            var module = moduleMap[moduleName];
            var classMap = module.classMap;
            if (classMap[type]) {
                type = "breeze." + moduleName + "." + type;
                parentObj[propertyName] = type;
                return parentObj;
            } 
        }
    }
    return parentObj;
}

function outputUsingTemplate(api) {
    var filename = "intellisense.template.txt";
    var template = fs.readFileSync(filename, "utf8");
    // var output = mustache.render(template, api);
    var cTemplate = HandleBars.compile(template);
    var output = cTemplate(api);
    return output;
}

function formatMultiline(text) {
    if (!text) return null;
    return {
        lines: cleanString(text).split("\n")
    }
}

function formatSingleLine(text) {
    return text ? cleanString(text).split("\n").join(' ') : null
}

function cleanString(text) {
    var newText = removeExcess(text);
    var regex1 = /\{\{#crossLink/g;
    var regex2 = /\}\}\{\{\/crossLink\}\}/g;
    var newText = newText.replace(/\"/g, "'");
    var newText = newText.replace(regex1, "");
    newText = newText.replace(regex2, "");
    return newText;
}

function removeExcess(text) {
    // remove text after first "\n\n"
    var ix = text.indexOf('\n\n');
    if (ix != -1) {
        text = text.substr(0, ix);
    }
    return text;
}

function log(msg) {
    console.log(msg);
}

// iterate over object
function objectForEach(obj, kvFn) {
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) {
            kvFn(key, obj[key]);
        }
    }
}