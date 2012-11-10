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

    var coreConfig = { };
    core.config = coreConfig;
    coreConfig.functionRegistry = { };
    coreConfig.typeRegistry = { };
    coreConfig.objectRegistry = {};
    coreConfig._interfaceRegistry = {
        ajax: {}, 
        entityTracking: {},
        remoteAccess: {},
    };
    
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
    The implementation currently in use for all ajax requests
    @example
        var name = entityModel.ajaxImplementation.name;
    You can either extend the current implementation or replace it entirely.
    
    @example
        var myAjaxImplementation = ...
        core.config.setProperties( {
            ajaxImplementation: myAjaxImplementation;
        });
    
    @property ajaxImplementation {ajax-interface}
    **/

    /**
    @method setProperties
    @param config {Object}
        @param [config.remoteAccessImplementation] { implementation of remoteAccess-interface }
        @param [config.trackingImplementation] { implementation of entityTracking-interface }
        @param [config.ajaxImplementation] {implementation of ajax-interface }
    **/
    coreConfig.setProperties = function (config) {
        assertConfig(config)
            .whereParam("remoteAccessImplementation").isOptional()
            .whereParam("trackingImplementation").isOptional()
            .whereParam("ajaxImplementation").isOptional()
            .applyAll(coreConfig);
        if (config.remoteAccessImplementation) {
            coreConfig.initializeInterface("remoteAccess", config.remoteAccessImplementation);
        }
        if (config.trackingImplementation) {
            // note the name change
            coreConfig.initializeInterface("entityTracking", config.trackingImplementation);
        }
        if (config.ajaxImplementation) {
            coreConfig.initializeInterface("ajax", config.ajaxImplementation);
        }
    };
    
    coreConfig.registerInterface = function (interfaceName, implementation, shouldInitialize) {
        assertParam(implementation, "implementation").hasProperty("name");
        var kv = findByName(coreConfig._interfaceRegistry, interfaceName);
        if (!kv) {
            throw new Error("Unknown interface name: " + interfaceName);
        }
        kv.value[implementation.name.toLowerCase()] = implementation;
        if (shouldInitialize === true) {
            implementation.initialize();
            coreConfig[kv.key + "Implementation"] = implementation;
        }
    };

    coreConfig.initializeInterfaces = function(config) {
        assertConfig(config)
            .whereParam("remoteAccess").isOptional()
            .whereParam("entityTracking").isOptional()
            .whereParam("ajax").isOptional();
        core.objectForEach(config, coreConfig.initializeInterface);
        
    };

    coreConfig.initializeInterface = function (interfaceName, implementationName) {
        assertParam(implementationName, "implementationName").isNonEmptyString();
        var kv = findByName(coreConfig._interfaceRegistry, interfaceName);
        if (!kv) {
            throw new Error("Unknown interface name: " + interfaceName);
        }

        var implementation = kv.value[implementationName.toLowerCase()];
        if (!implementation) {
            throw new Error("Unregistered implementation.  Interface: " + interfaceName + " ImplementationName: " + implementationName);
        }

        implementation.initialize();
        coreConfig[interfaceName + "Implementation"] = implementation;
    };

    coreConfig.getInterfaceImplementation = function (interfaceName, implementationName) {
        var kv = findByName(coreConfig._interfaceRegistry, interfaceName);
        if (!kv) {
            throw new Error("Unknown interface name: " + interfaceName);
        }
        if (implementationName) {
            return kv.value[implementationName.toLowerCase()];
        } else {
            return coreConfig[kv.key + "Implementation"];
        }
    };

   
    // this is needed for reflection purposes when deserializing an object that needs a fn or ctor
    // used to register validators.
    coreConfig.registerFunction = function (fn, fnName) {
        core.assertParam(fn, "fn").isFunction().check();
        core.assertParam(fnName, "fnName").isString().check();
        fn.prototype._$fnName = fnName;
        coreConfig.functionRegistry[fnName] = fn;
    };

    coreConfig.registerObject = function(obj, objName) {
        core.assertParam(obj, "obj").isObject().check();
        core.assertParam(objName, "objName").isString().check();

        coreConfig.objectRegistry[objName] = obj;
    };
  
    coreConfig.registerType = function (ctor, typeName) {
        core.assertParam(ctor, "ctor").isFunction().check();
        core.assertParam(typeName, "typeName").isString().check();
        ctor.prototype._$typeName = typeName;
        coreConfig.typeRegistry[typeName] = ctor;
    };

    function findByName(source, propertyName) {
        var lcName = propertyName.toLowerCase();
        // source may be null
        return core.objectFirst(source || {}, function (k, v) {
            return k.toLowerCase() === lcName;
        });
    }
    
    coreConfig.stringifyPad = "  ";

    

    return core;
});
