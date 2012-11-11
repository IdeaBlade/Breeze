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
    coreConfig.objectRegistry = { };
    coreConfig._interfaceRegistry = {
        ajax: { },
        entityTracking: { },
        remoteAccess: { },
    };

    coreConfig._dependencyMap = {
        ajax: [],
        entityTracking: [],
        remoteAccess: []
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
    
    coreConfig.registerInterface = function (interfaceName, implementationCtor, shouldInitialize) {
        assertParam(implementationCtor, "implementationCtor").isFunction();
        // this impl will be thrown away after the name is retrieved.
        var impl = new implementationCtor();
        var implName = impl.name;
        if (!implName) {
            throw new Error("Unable to locate a 'name' property on the constructor passed into the 'registerInterface' call.");
        }
        var kv = getInterfaceKeyValue(interfaceName);
        kv.value[implName.toLowerCase()] = implementationCtor;

        if (shouldInitialize === true) {
            initializeInterfaceCore(interfaceName, implementationCtor);
        }
    };

    coreConfig.initializeInterfaces = function(config) {
        assertConfig(config)
            .whereParam("remoteAccess").isOptional()
            .whereParam("entityTracking").isOptional()
            .whereParam("ajax").isOptional();
        return core.objectMapToArray(config, coreConfig.initializeInterface);
        
    };

    coreConfig.initializeInterface = function (interfaceName, implementationName) {
        assertParam(interfaceName, "interfaceName").isNonEmptyString();
        assertParam(implementationName, "implementationName").isNonEmptyString();
        var kv = getInterfaceKeyValue(interfaceName);
        var implementationCtor = kv.value[implementationName.toLowerCase()];
        if (!implementationCtor) {
            throw new Error("Unregistered implementation.  Interface: " + interfaceName + " ImplementationName: " + implementationName);
        }

        return initializeInterfaceCore(interfaceName, implementationCtor);
    };
    
    coreConfig.getInterfaceCtor = function (interfaceName, implementationName) {
        var kv = getInterfaceKeyValue(interfaceName);
        if (implementationName) {
            return kv.value[implementationName.toLowerCase()];
        } else {
            return coreConfig[getImplName(kv.key)]._$ctor;
        }
    };

    core.config.getCurrentImplementation = function(interfaceName) {
        var kv = getInterfaceKeyValue(interfaceName);
        return coreConfig[getImplName(kv.key)];
    };
    
    function initializeInterfaceCore(interfaceName, implementationCtor) {
        var implementation = new implementationCtor();
        implementation._$ctor = implementationCtor;
        implementation.initialize();
        var depIfaces = implementation.dependencies;
        // register deps
        if (depIfaces) {
            depIfaces.forEach(function (ifaceName) {
                coreConfig._dependencyMap[ifaceName].push({ interfaceName: interfaceName, implementationName: implementation.name.toLowerCase() });
            });
        }
        // reinitialize if necessary
        coreConfig._dependencyMap[interfaceName].forEach(function (dep) {
            var currentImpl = getCurrentImplementation(dep.interfaceName);
            if (currentImpl.name === dep.implementationName) {
                // reinitialize ( recompose) if currentImpl is dependent on this interface
                currentImpl.initialize();
            }
        });
        coreConfig[getImplName(interfaceName)] = implementation;
        return implementation;
    }

    function getInterfaceKeyValue(interfaceName) {
        var lcName = interfaceName.toLowerCase();
        // source may be null
        var kv = core.objectFirst(coreConfig._interfaceRegistry || {}, function (k, v) {
            return k.toLowerCase() === lcName;
        });
        if (!kv) {
            throw new Error("Unknown interface name: " + interfaceName);
        }
        return kv;
    }
    
    function getImplName(interfaceName) {
        return interfaceName + "Implementation";
    }
   
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
   
    coreConfig.stringifyPad = "  ";

    

    return core;
});
