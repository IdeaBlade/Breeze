
define(["core", "entityModel"],
function (core, entityModel) {
    var root = {
        version: "0.57",
        core: core,
        entityModel: entityModel
    };
    core.parent = root;
    return root;
});
