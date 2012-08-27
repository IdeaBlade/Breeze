define(["coreFns", "enum", "event", "assertParam"],
function (core, Enum, Event, m_assertParam) {
    
    /**
    Utility types and functions of generally global applicability.
    @module core
    @main core
    **/
    core.Enum = Enum;
    core.Event = Event;
    core.extend(core, m_assertParam);
    core.config = {};
    core.config.functionRegistry = {};
    core.config.typeRegistry = { };

    // this is needed for reflection purposes when deserializing an object that needs a ctor.
    core.config.registerFunction = function (fn, fnName) {
        core.assertParam(fn, "fn").isFunction().check();
        core.assertParam(fnName, "fnName").isString().check();
        fn.prototype._$fnName = fnName;
        core.config.functionRegistry[fnName] = fn;
    };
    
  
    core.config.registerType = function (ctor, typeName) {
        core.assertParam(ctor, "ctor").isFunction().check();
        core.assertParam(typeName, "typeName").isString().check();
        ctor.prototype._$typeName = typeName;
        core.config.typeRegistry[typeName] = ctor;
    };

    core.config.stringifyPad = "  ";

    // core.config.remoteAccessImplementation
    // core.config.trackingImplementation
    return core;
});
