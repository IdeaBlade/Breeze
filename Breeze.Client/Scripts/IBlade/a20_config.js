/**
  @module breeze   
  **/

var __config = function () {

    // alias for within fns with a config param
    var __config = {};


    __config.functionRegistry = {};
    __config.typeRegistry = {};
    __config.objectRegistry = {};
    __config.interfaceInitialized = new Event("interfaceInitialized_config", __config);

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
        var kv = __objectFirst(this._implMap, function() { return true; });
        return kv ? kv.value : null;
    };

    __config.interfaceRegistry = {
        ajax: new InterfaceDef("ajax"),
        modelLibrary: new InterfaceDef("modelLibrary"),
        dataService: new InterfaceDef("dataService")
    };

    __config.interfaceRegistry.modelLibrary.getDefaultInstance = function() {
        if (!this.defaultInstance) {
            throw new Error("Unable to locate the default implementation of the '" + this.name
                + "' interface.  Possible options are 'ko', 'backingStore' or 'backbone'. See the breeze.config.initializeAdapterInstances method.");
        }
        return this.defaultInstance;
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
    @deprecated
    @param config {Object}
        @param [config.remoteAccessImplementation] { implementation of remoteAccess-interface }
        @param [config.trackingImplementation] { implementation of entityTracking-interface }
        @param [config.ajaxImplementation] {implementation of ajax-interface }
    **/
    __config.setProperties = function(config) {
        assertConfig(config)
            .whereParam("remoteAccessImplementation").isOptional()
            .whereParam("trackingImplementation").isOptional()
            .whereParam("ajaxImplementation").isOptional()
            .applyAll(config);
        if (config.remoteAccessImplementation) {
            __config.initializeAdapterInstance("dataService", config.remoteAccessImplementation);
        }
        if (config.trackingImplementation) {
            // note the name change
            __config.initializeAdapterInstance("modelLibrary", config.trackingImplementation);
        }
        if (config.ajaxImplementation) {
            __config.initializeAdapterInstance("ajax", config.ajaxImplementation);
        }
    };

    /**
    Method use to register implementations of standard breeze interfaces.  Calls to this method are usually
    made as the last step within an adapter implementation. 
    @method registerAdapter
    @param interfaceName {String} - one of the following interface names "ajax", "dataService" or "modelLibrary"
    @param adapterCtor {Function} - an ctor function that returns an instance of the specified interface.  
    **/
    __config.registerAdapter = function(interfaceName, adapterCtor) {
        assertParam(interfaceName, "interfaceName").isNonEmptyString().check();
        assertParam(adapterCtor, "adapterCtor").isFunction().check();
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
    __config.getAdapter = function(interfaceName, adapterName) {
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
    __config.initializeAdapterInstances = function(config) {
        assertConfig(config)
            .whereParam("dataService").isOptional()
            .whereParam("modelLibrary").isOptional()
            .whereParam("ajax").isOptional();
        return __objectMapToArray(config, __config.initializeAdapterInstance);

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
    __config.initializeAdapterInstance = function(interfaceName, adapterName, isDefault) {
        isDefault = isDefault === undefined ? true : isDefault;
        assertParam(interfaceName, "interfaceName").isNonEmptyString().check();
        assertParam(adapterName, "adapterName").isNonEmptyString().check();
        assertParam(isDefault, "isDefault").isBoolean().check();

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
    __config.getAdapterInstance = function(interfaceName, adapterName) {
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
    __config.registerFunction = function(fn, fnName) {
        assertParam(fn, "fn").isFunction().check();
        assertParam(fnName, "fnName").isString().check();
        fn.prototype._$fnName = fnName;
        __config.functionRegistry[fnName] = fn;
    };

    __config._storeObject = function(obj, type, name) {
        // uncomment this if we make this public.
        //assertParam(obj, "obj").isObject().check();
        //assertParam(name, "objName").isString().check();
        var key = (typeof(type) === "string" ? type : type.prototype._$typeName) + "." + name;
        __config.objectRegistry[key] = obj;
    };

    __config._fetchObject = function(type, name) {
        if (!name) return undefined;
        var key = (typeof(type) === "string" ? type : type.prototype._$typeName) + "." + name;
        var result = __config.objectRegistry[key];
        if (!result) {
            throw new Error("Unable to locate a registered object by the name: " + key);
        }
        return result;
    };

    __config.registerType = function(ctor, typeName) {
        assertParam(ctor, "ctor").isFunction().check();
        assertParam(typeName, "typeName").isString().check();
        ctor.prototype._$typeName = typeName;
        __config.typeRegistry[typeName] = ctor;
    };

    //a_config._registerNamedInstance = function (instance, nameProperty) {
    //    a_config.registerFunction(function () { return instance; }, instance._$typeName + "." + instance[nameProperty || "name"]);
    //};

    //a_config._namedInstanceFromJson = function (type, nameProperty, json) {
    //    var key = type.proto._$typeName + "." + json[nameProperty || "name"];
    //    var fn = a_config.functionRegistry[key];
    //    if (!fn) {
    //        throw new Error("Unable to locate " + key);
    //    }
    //    return fn(json);
    //};

    __config.stringifyPad = "  ";

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
        __config.interfaceInitialized.publish({ interfaceName: interfaceDef.name, instance: instance, isDefault: true });

        if (instance.checkForRecomposition) {
            // now register for own dependencies.
            __config.interfaceInitialized.subscribe(function(interfaceInitializedArgs) {
                instance.checkForRecomposition(interfaceInitializedArgs);
            });
        }

        return instance;
    }

    function getInterfaceDef(interfaceName) {
        var lcName = interfaceName.toLowerCase();
        // source may be null
        var kv = __objectFirst(__config.interfaceRegistry || {}, function(k, v) {
            return k.toLowerCase() === lcName;
        });
        if (!kv) {
            throw new Error("Unknown interface name: " + interfaceName);
        }
        return kv.value;
    }

    return __config;
}();

var __modelLibraryDef = __config.interfaceRegistry.modelLibrary;

// legacy
core.config = __config;

breeze.config = __config;