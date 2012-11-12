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
    coreConfig.interfaceInitialized = new Event("interfaceInitialized_core", coreConfig);
    
    var InterfaceDef = function(name) {
        this.name = name;
        
        this.defaultImplementation = null;
        this.dependents = [];
        this._ctorMap = {};
    };
    InterfaceDef.prototype.registerCtor = function(implementationName, ctor) {
        this._ctorMap[implementationName.toLowerCase()] = ctor;
    };
    InterfaceDef.prototype.getCtor = function(implementationName) {
        return this._ctorMap[implementationName.toLowerCase()];
    };
    
    coreConfig.interfaceRegistry = {
        ajax: new InterfaceDef("ajax"),
        entityTracking: new InterfaceDef("entityTracking"),
        remoteAccess: new InterfaceDef("remoteAccess")
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
        assertParam(interfaceName, "interfaceName").isNonEmptyString();
        assertParam(implementationCtor, "implementationCtor").isFunction();
        assertParam(shouldInitialize, "shouldInitialize").isBoolean();
        // this impl will be thrown away after the name is retrieved.
        var impl = new implementationCtor();
        var implName = impl.name;
        if (!implName) {
            throw new Error("Unable to locate a 'name' property on the constructor passed into the 'registerInterface' call.");
        }
        var idef = getInterfaceDef(interfaceName);
        idef.registerCtor(implName, implementationCtor);

        if (shouldInitialize === true) {
            initializeInterfaceCore(idef, implementationCtor);
        }
    };

    coreConfig.initializeInterfaces = function(config) {
        assertConfig(config)
            .whereParam("remoteAccess").isOptional()
            .whereParam("entityTracking").isOptional()
            .whereParam("ajax").isOptional();
        return core.objectMapToArray(config, coreConfig.initializeInterface);
        
    };

    coreConfig.initializeInterface = function (interfaceName, implementationName, isDefault) {
        isDefault = isDefault === undefined ? true : isDefault;
        assertParam(interfaceName, "interfaceName").isNonEmptyString();
        assertParam(implementationName, "implementationName").isNonEmptyString();
        assertParam(isDefault, "isDefault").isBoolean();
        
        var idef = getInterfaceDef(interfaceName);
        var implementationCtor = idef.getCtor(implementationName);
        if (!implementationCtor) {
            throw new Error("Unregistered implementation.  Interface: " + interfaceName + " ImplementationName: " + implementationName);
        }

        return initializeInterfaceCore(idef, implementationCtor, isDefault);
    };
    
    coreConfig.getInterface = function (interfaceName, implementationName) {
        var idef = getInterfaceDef(interfaceName);
        if (implementationName) {
            return idef.getCtor(implementationName);
        } else {
            return idef.defaultImplementation._$ctor;
        }
    };

    coreConfig.getDefaultImplementation = function(interfaceName) {
        var idef = getInterfaceDef(interfaceName);
        return idef.defaultImplementation;
    };
    
    function initializeInterfaceCore(interfaceDef, implementationCtor, isDefault) {
        var defaultImpl = interfaceDef.defaultImplementation;
        if (defaultImpl && defaultImpl._$ctor === implementationCtor) {
            defaultImpl.initialize();
            return defaultImpl;
        }
        var implementation = new implementationCtor();
        implementation._$interfaceDef = interfaceDef;
        implementation._$ctor = implementationCtor;     
        implementation.initialize();
        
        if (isDefault) {
            // next line needs to occur before any recomposition 
            interfaceDef.defaultImplementation = implementation;
        }

        // recomposition of other impls will occur here.
        coreConfig.interfaceInitialized.publish({ interfaceName: interfaceDef.name, implementation: implementation, isDefault: true });
        
        if (implementation.checkForRecomposition) {
            // now register for own dependencies.
            coreConfig.interfaceInitialized.subscribe(function(interfaceInitializedArgs) {
                implementation.checkForRecomposition(interfaceInitializedArgs);
            });
        }
               
        return implementation;
    }

    function getInterfaceDef(interfaceName) {
        var lcName = interfaceName.toLowerCase();
        // source may be null
        var kv = core.objectFirst(coreConfig.interfaceRegistry || {}, function (k, v) {
            return k.toLowerCase() === lcName;
        });
        if (!kv) {
            throw new Error("Unknown interface name: " + interfaceName);
        }
        return kv.value;
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
