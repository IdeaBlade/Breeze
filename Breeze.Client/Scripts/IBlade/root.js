
define(["core", "entityModel"],
function (core, entityModel) {
    var root = {
        version: "0.64.4",
        core: core,
        entityModel: entityModel
    };
    core.parent = root;
    return root;
});
