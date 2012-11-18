define(["core" ] ,
function (core ) {

    var assertParam = core.assertParam;
    var assertConfig = core.assertConfig;
    var Event = core.Event;
    
    // alias for within fns with a config param
    var a_config = {};
    
    
    a_config.functionRegistry = { };
    a_config.typeRegistry = { };
    a_config.objectRegistry = {};
    a_config.interfaceInitialized = new Event("interfaceInitialized_config", a_config);
    
    var InterfaceDef = function(name) {
        this.name = name;
        this.defaultInstance = null;
        this._implMap = {};
        
    };
    InterfaceDef.prototype.registerCtor = function(adapterName, ctor) {
        this._implMap[adapterName.toLowerCase()] = { ctor: ctor, defaultInstance: null };
    };
    InterfaceDef.prototype.getImpl = function(adapterName) {
        return this._implMap[adapterName.toLowerCase()];
    };
    InterfaceDef.prototype.getFirstImpl = function() {
        var kv = core.objectFirst(this._implMap, function () { return true; });
        return kv ? kv.value : null;
    };
    
    a_config.interfaceRegistry = {
        ajax: new InterfaceDef("ajax"),
        modelLibrary: new InterfaceDef("modelLibrary"),
        dataService: new InterfaceDef("dataService")
    };
   
    /**
    A singleton object that is the repository of all configuration options.

        config.initializeAdapterInstance( {
            modelLibrary: "ko",
            dataService: "webApi"
        });
        
    @class config
    **/
    
    /**
    This method is now OBSOLETE.  Use the "initializeAdapterInstances" to accomplish the same result.
    @method setProperties
    @obsolete
    @param config {Object}
        @param [config.remoteAccessImplementation] { implementation of remoteAccess-interface }
        @param [config.trackingImplementation] { implementation of entityTracking-interface }
        @param [config.ajaxImplementation] {implementation of ajax-interface }
    **/
    a_config.setProperties = function (config) {
        assertConfig(config)
            .whereParam("remoteAccessImplementation").isOptional()
            .whereParam("trackingImplementation").isOptional()
            .whereParam("ajaxImplementation").isOptional()
            .applyAll(config);
        if (config.remoteAccessImplementation) {
            a_config.initializeAdapterInstance("dataService", config.remoteAccessImplementation);
        }
        if (config.trackingImplementation) {
            // note the name change
            a_config.initializeAdapterInstance("modelLibrary", config.trackingImplementation);
        }
        if (config.ajaxImplementation) {
            a_config.initializeAdapterInstance("ajax", config.ajaxImplementation);
        }
    };
    
    /**
    Method use to register implementations of standard breeze interfaces.  Calls to this method are usually
    made as the last step within an adapter implementation. 
    @method registerAdapter
    @param interfaceName {String} - one of the following interface names "ajax", "dataService" or "modelLibrary"
    @param adapterCtor {Function} - an ctor function that returns an instance of the specified interface.  
    **/
    a_config.registerAdapter = function (interfaceName, adapterCtor) {
        assertParam(interfaceName, "interfaceName").isNonEmptyString();
        assertParam(adapterCtor, "adapterCtor").isFunction();
        // this impl will be thrown away after the name is retrieved.
        var impl = new adapterCtor();
        var implName = impl.name;
        if (!implName) {
            throw new Error("Unable to locate a 'name' property on the constructor passed into the 'registerAdapter' call.");
        }
        var idef = getInterfaceDef(interfaceName);
        idef.registerCtor(implName, adapterCtor);
        
    };
    
    /**
    Returns the ctor function used to implement a specific interface with a specific adapter name.
    @method getAdapter
    @param interfaceName {String} One of the following interface names "ajax", "dataService" or "modelLibrary"
    @param [adapterName] {String} The name of any previously registered adapter. If this parameter is omitted then
    this method returns the "default" adapter for this interface. If there is no default adapter, then a null is returned.
    @return {Function|null} Returns either a ctor function or null.
    **/
    a_config.getAdapter = function (interfaceName, adapterName) {
        var idef = getInterfaceDef(interfaceName);
        if (adapterName) {
            var impl = idef.getImpl(adapterName);
            return impl ? impl.ctor : null;
        } else {
            return idef.defaultInstance ? idef.defaultInstance._$impl.ctor : null;
        }
    };

    /**
    Initializes a collection of adapter implementations and makes each one the default for its corresponding interface.
    @method initializeAdapterInstances
    @param config {Object}
    @param [config.ajax] {String} - the name of a previously registered "ajax" adapter
    @param [config.dataService] {String} - the name of a previously registered "dataService" adapter
    @param [config.modelLibrary] {String} - the name of a previously registered "modelLibrary" adapter
    @return [array of instances]
    **/
    a_config.initializeAdapterInstances = function (config) {
        assertConfig(config)
            .whereParam("dataService").isOptional()
            .whereParam("modelLibrary").isOptional()
            .whereParam("ajax").isOptional();
        return core.objectMapToArray(config, a_config.initializeAdapterInstance);
        
    };

    /**
    Initializes a single adapter implementation. Initialization means either newing a instance of the 
    specified interface and then calling "initialize" on it or simply calling "initialize" on the instance
    if it already exists.
    @method initializeAdapterInstance
    @param interfaceName {String} The name of the interface to which the adapter to initialize belongs.
    @param adapterName {String} - The name of a previously registered adapter to initialize.
    @param [isDefault=true] {Boolean} - Whether to make this the default "adapter" for this interface. 
    @return {an instance of the specified adapter}
    **/
    a_config.initializeAdapterInstance = function (interfaceName, adapterName, isDefault) {
        isDefault = isDefault === undefined ? true : isDefault;
        assertParam(interfaceName, "interfaceName").isNonEmptyString();
        assertParam(adapterName, "adapterName").isNonEmptyString();
        assertParam(isDefault, "isDefault").isBoolean();
        
        var idef = getInterfaceDef(interfaceName);
        var impl = idef.getImpl(adapterName);
        if (!impl) {
            throw new Error("Unregistered adapter.  Interface: " + interfaceName + " AdapterName: " + adapterName);
        }

        return initializeAdapterInstanceCore(idef, impl, isDefault);
    };

    /**
    Returns the adapter instance corresponding to the specified interface and adapter names.
    @method getAdapterInstance
    @param interfaceName {String} The name of the interface.
    @param [adapterName] {String} - The name of a previously registered adapter.  If this parameter is
    omitted then the default implementation of the specified interface is returned. If there is
    no defaultInstance of this interface, then the first registered instance of this interface is returned.
    @return {an instance of the specified adapter}
    **/
    a_config.getAdapterInstance = function (interfaceName, adapterName) {
        var idef = getInterfaceDef(interfaceName);
        var impl;
        if (adapterName & adapterName !== "") {
            impl = idef.getImpl(adapterName);
            return impl ? impl.defaultInstance : null;
        } else {
            if (idef.defaultInstance) {
                return idef.defaultInstance;
            } else {
                impl = idef.getFirstImpl();
                if (impl.defaultInstance) {
                    return impl.defaultInstance;
                } else {
                    return initializeAdapterInstanceCore(idef, impl, true);
                }
            }
        }
    };
   

   
    // this is needed for reflection purposes when deserializing an object that needs a fn or ctor
    // used to register validators.
    a_config.registerFunction = function (fn, fnName) {
        core.assertParam(fn, "fn").isFunction().check();
        core.assertParam(fnName, "fnName").isString().check();
        fn.prototype._$fnName = fnName;
        a_config.functionRegistry[fnName] = fn;
    };

    a_config.registerObject = function (obj, objName) {
        core.assertParam(obj, "obj").isObject().check();
        core.assertParam(objName, "objName").isString().check();

        a_config.objectRegistry[objName] = obj;
    };
  
    a_config.registerType = function (ctor, typeName) {
        core.assertParam(ctor, "ctor").isFunction().check();
        core.assertParam(typeName, "typeName").isString().check();
        ctor.prototype._$typeName = typeName;
        a_config.typeRegistry[typeName] = ctor;
    };
   
    a_config.stringifyPad = "  ";
    
    function initializeAdapterInstanceCore(interfaceDef, impl, isDefault) {
        var instance = impl.defaultInstance;
        if (!instance) {
            instance = new (impl.ctor)();
            impl.defaultInstance = instance;
            instance._$impl = impl;
        }

        instance.initialize();

        if (isDefault) {
            // next line needs to occur before any recomposition 
            interfaceDef.defaultInstance = instance;
        }

        // recomposition of other impls will occur here.
        a_config.interfaceInitialized.publish({ interfaceName: interfaceDef.name, instance: instance, isDefault: true });

        if (instance.checkForRecomposition) {
            // now register for own dependencies.
            a_config.interfaceInitialized.subscribe(function (interfaceInitializedArgs) {
                instance.checkForRecomposition(interfaceInitializedArgs);
            });
        }

        return instance;
    }

    function getInterfaceDef(interfaceName) {
        var lcName = interfaceName.toLowerCase();
        // source may be null
        var kv = core.objectFirst(a_config.interfaceRegistry || {}, function (k, v) {
            return k.toLowerCase() === lcName;
        });
        if (!kv) {
            throw new Error("Unknown interface name: " + interfaceName);
        }
        return kv.value;
    }

    return a_config;
});
