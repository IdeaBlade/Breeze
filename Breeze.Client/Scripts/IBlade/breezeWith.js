
define(["breeze",
    // all these are self registering
        "breeze.ajax.jQuery",
        "breeze.remoteAccess.webApi", "breeze.remoteAccess.odata",
        "breeze.entityTracking.backingStore", "breeze.entityTracking.ko", "breeze.entityTracking.backbone"], 
function(breeze) {

    // set defaults
    breeze.core.config.initializeInterfaces({
        ajax: "jQuery",
        entityTracking: "ko",
        remoteAccess: "webApi"
    });
    return breeze;
});
