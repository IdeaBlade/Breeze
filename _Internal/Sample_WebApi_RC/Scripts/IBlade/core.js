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
    core.config = { };
    core.config.functionRegistry = { };
    core.config.typeRegistry = { };
    
    var assertParam = core.assertParam;
    var assertConfig = core.assertConfig;
      
    /**
    A singleton object that is the repository of all entityModel specific configuration options.
       
        core.config.setProperties( {
            trackingImplemenation: entityModel.entityTracking_ko,
            remoteAccessImplementation: entityModel.remoteAccess_webApi
        });
        
    @class config
    **/
    
    /**        
    The implementation currently in use for tracking entities
    @example
        var name = entityModel.trackingImplementation.name;
    There are currently two implementations of this interface.
    @example
        // For knockout.js
        core.config.setProperties( {
            trackingImplementation: entityModel.entityTracking_ko 
        });
    or
    @example
        // Generic js implementation of observability
        core.config.setProperties( {
            trackingImplementation: entityModel.entityTracking_backingStore
        });
        
    @property trackingImplementation {~entityTracking-interface}
    **/

    /**        
    The implementation currently in use for communicating with a remote server and service.
    @example
        var name = entityModel.remoteAccessImplementation.name;
    There are currently two implementations of this interface.
    Either an implementation of the remoteAccess interface that supports ASP.NET Web Api services.
    @example
        core.config.setProperties( {
            remoteAccessImplementation: entityModel.remoteAccess_webApi
        });
    or an implementation of the remoteAccess interface that supports OData services.
    @example
        core.config.setProperties( {
            remoteAccessImplementation: entityModel.remoteAccess_odata
        });    
    @property remoteAccessImplementation {~remoteAccess-interface}
    **/
    
    /**
    @method setProperties
    @param config {Object}
        @param [config.remoteAccessImplementation] { implementation of ~remoteAccess-interface }
        @param [config.trackingImplementation] { implementation of ~entityTracking-interface }
    **/
    core.config.setProperties = function (config) {
        assertConfig(config)
            .whereParam("remoteAccessImplementation").isOptional()
            .whereParam("trackingImplementation").isOptional()
            .applyAll(core.config);
    };
    
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

    return core;
});
