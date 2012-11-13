define(["core", "entityModel"],
function (core, entityModel) {
    var root = {
        version: "0.70.1",
        core: core,
        entityModel: entityModel
    };
    core.parent = root;
    
    return root;
});
