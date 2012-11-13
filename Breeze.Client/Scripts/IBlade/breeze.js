define(["core", "entityModel"],
function (core, entityModel) {
    var breeze = {
        version: "0.70.1",
        core: core,
        entityModel: entityModel
    };
    core.parent = breeze;
    
    return breeze;
});
