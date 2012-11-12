
define(["breeze",
        // all these are self registering
        "breeze.ajax.jQuery",
        "breeze.dataService.webApi", "breeze.dataService.odata",
        "breeze.modelLibrary.backingStore", "breeze.modelLibrary.ko", "breeze.modelLibrary.backbone"], 
function(breeze) {

    // set defaults
    breeze.core.config.initializeAdapterInstances({
        ajax: "jQuery",
        modelLibrary: "ko",
        dataService: "webApi"
    });
    return breeze;
});
