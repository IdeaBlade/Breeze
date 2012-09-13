
define(["core", "entityModel"],
function (core, entityModel) {
    var root = {
        version: "0.53",
        core: core,
        entityModel: entityModel
    };
    core.parent = root;
    return root;
});
