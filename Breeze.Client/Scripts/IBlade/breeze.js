define(["core", "entityModel"],
function (core, entityModel) {
    var root = {
        version: "0.66.1",
        core: core,
        entityModel: entityModel
    };
    core.parent = root;
    
    return root;
});
