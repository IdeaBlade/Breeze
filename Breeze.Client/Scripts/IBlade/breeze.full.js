
define(["breeze",
        // all these are self registering
        "breeze.ajax.jQuery",
        "breeze.dataService.webApi", "breeze.dataService.odata",
        "breeze.modelLibrary.backingStore", "breeze.modelLibrary.ko", "breeze.modelLibrary.backbone"], 
function(breeze) {


    // set defaults
    breeze.core.config.initializeAdapterInstances({
        ajax: "jQuery",
        dataService: "webApi"
    });
    
    // don't initialize with ko unless it exists.
    var ko = window.ko;
    if ((!ko) && require) {
        ko = require("ko");
    }
    if (ko) {
        breeze.core.config.initializeAdapterInstance("modelLibrary", "ko");
    }
        
    return breeze;
});
