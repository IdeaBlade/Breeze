
define(["core", "config", "dataType", "entityAspect", "validate", "defaultPropertyInterceptor"],
function (core, a_config, DataType, m_entityAspect, m_validate, defaultPropertyInterceptor) {
    "use strict";
    /**
    @module breeze
    **/

    var Enum = core.Enum;
    var assertParam = core.assertParam;
    var assertConfig = core.assertConfig;
    
    var v_modelLibraryDef = a_config.interfaceRegistry.modelLibrary;

    var EntityAspect = m_entityAspect.EntityAspect;
    var ComplexAspect = m_entityAspect.ComplexAspect;
    var Validator = m_validate.Validator;

    var Q = core.requireLib("Q", "See https://github.com/kriskowal/q ");

    // TODO: still need to handle inheritence here.

    var LocalQueryComparisonOptions = (function () {

        /**
        A LocalQueryComparisonOptions instance is used to specify the "comparison rules" used when performing "local queries" in order 
        to match the semantics of these same queries when executed against a remote service.  These options should be set based on the 
        manner in which your remote service interprets certain comparison operations.
    
        The default LocalQueryComparisonOptions stipulates 'caseInsensitive" queries with ANSI SQL rules regarding comparisons of unequal
        length strings. 
    
        @class LocalQueryComparisonOptions
        **/

        /**
        LocalQueryComparisonOptions constructor
        @example
            // create a 'caseSensitive - non SQL' instance.
            var lqco = new LocalQueryComparisonOptions({
                name: "caseSensitive-nonSQL"
                isCaseSensitive: true;
                usesSql92CompliantStringComparison: false;
            });
            // either apply it globally
            lqco.setAsDefault();
            // or to a specific MetadataStore
            var ms = new MetadataStore({ localQueryComparisonOptions: lqco });
            var em = new EntityManager( { metadataStore: ms });
    
        @method <ctor> LocalQueryComparisonOptions
        @param config {Object}
        @param [config.name] {String}
        @param [config.isCaseSensitive] {Boolean} Whether predicates that involve strings will be interpreted in a "caseSensitive" manner. Default is 'false'
        @param [config.usesSql92CompliantStringComparison] {Boolean} Whether of not to enforce the ANSI SQL standard 
           of padding strings of unequal lengths before comparison with spaces. Note that per the standard, padding only occurs with equality and 
           inequality predicates, and not with operations like 'startsWith', 'endsWith' or 'contains'.  Default is true.
        **/

        var ctor = function (config) {
            assertConfig(config || {})
                .whereParam("name").isOptional().isString()
                .whereParam("isCaseSensitive").isOptional().isBoolean().withDefault(false)
                .whereParam("usesSql92CompliantStringComparison").isBoolean().withDefault(true)
                .applyAll(this);
            if (!this.name) {
                this.name = core.getUuid();
            }
            a_config.registerObject(this, "LocalQueryComparisonOptions:" + this.name);
        };
        var proto = ctor.prototype;
        proto._$typeName = "LocalQueryComparisonOptions";
        
        // 
        /**
        Case insensitive SQL compliant options - this is also the default unless otherwise changed.
        @property caseInsensitiveSQL {LocalQueryComparisonOptions}
        @static
        **/
        ctor.caseInsensitiveSQL = new ctor({
            name: "caseInsensitiveSQL",
            isCaseSensitive: false,
            usesSql92CompliantStringComparison: true
        });

        /**
        The default value whenever LocalQueryComparisonOptions are not specified. By default this is 'caseInsensitiveSQL'.
        @property defaultInstance {LocalQueryComparisonOptions}
        @static
        **/
        ctor.defaultInstance = ctor.caseInsensitiveSQL;

        /**
        Makes this instance the default instance.
        @method setAsDefault
        @example
            var lqco = new LocalQueryComparisonOptions({
                isCaseSensitive: false;
                usesSql92CompliantStringComparison: true;
            });
            lqco.setAsDefault();
        @chainable
        **/
        proto.setAsDefault = function () {
            ctor.defaultInstance = this;
            return this;
        };


        return ctor;
    })();
    
    var NamingConvention = (function () {
        /**
        A NamingConvention instance is used to specify the naming conventions under which a MetadataStore 
        will translate property names between the server and the javascript client. 
    
        The default NamingConvention does not perform any translation, it simply passes property names thru unchanged.
    
        @class NamingConvention
        **/
        
        /**
        NamingConvention constructor

        @example
            // A naming convention that converts the first character of every property name to uppercase on the server
            // and lowercase on the client.
            var namingConv = new NamingConvention({
                serverPropertyNameToClient: function(serverPropertyName) {
                    return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
                },
                clientPropertyNameToServer: function(clientPropertyName) {
                    return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
                }            
            });
        var ms = new MetadataStore({ namingConvention: namingConv });
        var em = new EntityManager( { metadataStore: ms });
        @method <ctor> NamingConvention
        @param config {Object}
        @param config.serverPropertyNameToClient {Function} Function that takes a server property name add converts it into a client side property name.  
        @param config.clientPropertyNameToServer {Function} Function that takes a client property name add converts it into a server side property name.  
        **/
        var ctor = function(config) {
            assertConfig(config || {})
                .whereParam("name").isOptional().isString()
                .whereParam("serverPropertyNameToClient").isFunction()
                .whereParam("clientPropertyNameToServer").isFunction()
                .applyAll(this);
            if (!this.name) {
                this.name = core.getUuid();
            }
            a_config.registerObject(this, "NamingConvention:" + this.name);
        };
        var proto = ctor.prototype;
        proto._$typeName = "NamingConvention";
        /**
        The function used to convert server side property names to client side property names.

        @method serverPropertyNameToClient
        @param serverPropertyName {String}
        @param [property] {DataProperty|NavigationProperty} The actual DataProperty or NavigationProperty corresponding to the property name.
        @return {String} The client side property name.
        **/

        /**
        The function used to convert client side property names to server side property names.

        @method clientPropertyNameToServer
        @param clientPropertyName {String}
        @param [property] {DataProperty|NavigationProperty} The actual DataProperty or NavigationProperty corresponding to the property name.
        @return {String} The server side property name.
        **/
        
        /**
        A noop naming convention - This is the default unless another is specified.
        @property none {NamingConvention}
        @static
        **/
        ctor.none = new ctor({
            name: "noChange",
            serverPropertyNameToClient: function(serverPropertyName) {
                return serverPropertyName;
            },
            clientPropertyNameToServer: function(clientPropertyName) {
                return clientPropertyName;
            }
        });
        
        /**
        The "camelCase" naming convention - This implementation only lowercases the first character of the server property name
        but leaves the rest of the property name intact.  If a more complicated version is needed then one should be created via the ctor.
        @property camelCase {NamingConvention}
        @static
        **/
        ctor.camelCase = new ctor({
            name: "camelCase",
            serverPropertyNameToClient: function (serverPropertyName) {
                return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
            },
            clientPropertyNameToServer: function (clientPropertyName) {
                return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
            }
        });
        
        /**
        The default value whenever NamingConventions are not specified.
        @property defaultInstance {NamingConvention}
        @static
        **/
        ctor.defaultInstance = ctor.none;
        
        /**
        Makes this instance the default instance.
        @method setAsDefault
        @example
            var namingConv = new NamingConvention({
                serverPropertyNameToClient: function(serverPropertyName) {
                    return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
                },
                clientPropertyNameToServer: function(clientPropertyName) {
                    return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
                }            
            });
            namingConv.setAsDefault();
        @chainable
        **/
        proto.setAsDefault = function() {
            ctor.defaultInstance = this;
            return this;
        };
        
        return ctor;
    })();
    
    var MetadataStore = (function () {

        /**
        An instance of the MetadataStore contains all of the metadata about a collection of {{#crossLink "EntityType"}}{{/crossLink}}'s.
        MetadataStores may be shared across {{#crossLink "EntityManager"}}{{/crossLink}}'s.  If an EntityManager is created without an
        explicit MetadataStore, the MetadataStore from the MetadataStore.defaultInstance property will be used.
        @class MetadataStore
        **/

        var __id = 0;
        
        /**
        Constructs a new MetadataStore.  
        @example
            var ms = new MetadataStore();
        The store can then be associated with an EntityManager
        @example
            var entityManager = new EntityManager( {
                serviceName: "api/NorthwindIBModel", 
                metadataStore: ms 
            });
        or for an existing EntityManager
        @example
            // Assume em1 is an existing EntityManager
            em1.setProperties( { metadataStore: ms });
        @method <ctor> MetadataStore
        @param [config] {Object} Configuration settings .
        @param [config.namingConvention=NamingConvention.defaultInstance] {NamingConvention} NamingConvention to be used in mapping property names
        between client and server. Uses the NamingConvention.defaultInstance if not specified.
        @param [config.localQueryComparisonOptions=LocalQueryComparisonOptions.defaultInstance] {LocalQueryComparisonOptions} The LocalQueryComparisonOptions to be
        used when performing "local queries" in order to match the semantics of queries against a remote service. 
        **/
        var ctor = function (config) {
            config = config || { };
            assertConfig(config)
                .whereParam("namingConvention").isOptional().isInstanceOf(NamingConvention).withDefault(NamingConvention.defaultInstance)
                .whereParam("localQueryComparisonOptions").isOptional().isInstanceOf(LocalQueryComparisonOptions).withDefault(LocalQueryComparisonOptions.defaultInstance)
                .applyAll(this);
            this.dataServices = []; // array of dataServices;
            this._resourceEntityTypeMap = {}; // key is resource name - value is qualified entityType name
            this._entityTypeResourceMap = {}; // key is qualified entitytype name - value is resourceName
            this._structuralTypeMap = {}; // key is qualified structuraltype name - value is structuralType. ( structural = entityType or complexType).
            this._shortNameMap = {}; // key is shortName, value is qualified name
            this._id = __id++;
            this._typeRegistry = {};
            this._incompleteTypeMap = {}; // key is entityTypeName; value is map where key is assocName and value is navProp
        };
        var proto = ctor.prototype;
        proto._$typeName = "MetadataStore";
        ctor.ANONTYPE_PREFIX = "_IB_";

        /**
        Adds a DataService to this MetadataStore. If a DataService with the same serviceName is already
        in the MetadataStore an exception will be thrown. 
        @method addDataService
        @param dataService {DataService} The DataService to add
        **/
        
        proto.addDataService = function(dataService) {
            assertParam(dataService, "dataService").isInstanceOf(DataService).check();
            var alreadyExists = this.dataServices.some(function(ds) {
                return dataService.serviceName === ds.serviceName;
            });
            if (alreadyExists) {
                throw new Error("A dataService with this name '" + dataService.serviceName + "' already exists in this MetadataStore");
            }
            this.dataServices.push(dataService);
        };

        /**
        Adds an EntityType to this MetadataStore.  No additional properties may be added to the EntityType after its has
        been added to the MetadataStore.
        @method addEntityType
        @param structuralType {EntityType|ComplexType} The EntityType or ComplexType to add
        **/
        proto.addEntityType = function (structuralType) {
            if (this.getEntityType(structuralType.name, true)) {
                var xxx = 7;
            }
            structuralType.metadataStore = this;
            // don't register anon types
            if (!structuralType.isAnonymous) {
                this._structuralTypeMap[structuralType.name] = structuralType;
                this._shortNameMap[structuralType.shortName] = structuralType.name;
                
                // in case resourceName was registered before this point
                if (structuralType instanceof EntityType) {
                    var resourceName = this._entityTypeResourceMap[structuralType.name];
                    if (resourceName) {
                        structuralType.defaultResourceName = resourceName;
                    }
                }
            }
            structuralType._fixup();
                                  
            structuralType.getProperties().forEach(function (property) {
                if (!property.isUnmapped) {
                    structuralType._mappedPropertiesCount++;
                }
            });

        };
        
        
        /**
        The  {{#crossLink "NamingConvention"}}{{/crossLink}} associated with this MetadataStore.

        __readOnly__
        @property namingConvention {NamingConvention}
        **/
        
        /**
        Exports this MetadataStore to a serialized string appropriate for local storage.   This operation is also called 
        internally when exporting an EntityManager. 
        @example
            // assume ms is a previously created MetadataStore
            var metadataAsString = ms.exportMetadata();
            window.localStorage.setItem("metadata", metadataAsString);
            // and later, usually in a different session imported
            var metadataFromStorage = window.localStorage.getItem("metadata");
            var newMetadataStore = new MetadataStore();
            newMetadataStore.importMetadata(metadataFromStorage);
        @method exportMetadata
        @return {String} A serialized version of this MetadataStore that may be stored locally and later restored. 
        **/
        proto.exportMetadata = function () {
            var result = JSON.stringify(this, function (key, value) {
                if (key === "metadataStore") return null;
                if (key === "adapterInstance") return null;
                if (key === "namingConvention" || key === "localQueryComparisonOptions") {
                    return value.name;
                }
                return value;
            }, a_config.stringifyPad);
            return result;
        };

        /**
        Imports a previously exported serialized MetadataStore into this MetadataStore.
        @example
            // assume ms is a previously created MetadataStore
            var metadataAsString = ms.exportMetadata();
            window.localStorage.setItem("metadata", metadataAsString);
            // and later, usually in a different session
            var metadataFromStorage = window.localStorage.getItem("metadata");
            var newMetadataStore = new MetadataStore();
            newMetadataStore.importMetadata(metadataFromStorage);
        @method importMetadata
        @param exportedString {String} A previously exported MetadataStore.
        @return {MetadataStore} This MetadataStore.
        @chainable
        **/
        proto.importMetadata = function (exportedString) {
            var json = JSON.parse(exportedString);
            var ncName = json.namingConvention;
            var lqcoName = json.localQueryComparisonOptions;
            delete json.namingConvention;
            delete json.localQueryComparisonOptions;
            if (this.isEmpty()) {
                var nc = a_config.objectRegistry["NamingConvention:" + ncName];
                if (!nc) {
                    throw new Error("Unable to locate a naming convention named: " + ncName);
                }
                this.namingConvention = nc;
                var lqco = a_config.objectRegistry["LocalQueryComparisonOptions:" + lqcoName];
                if (!lqco) {
                    throw new Error("Unable to locate a LocalQueryComparisonOptions instance named: " + lqcoName);
                }
                this.localQueryComparisonOptions = lqco;
            } else {
                if (this.namingConvention.name !== ncName) {
                    throw new Error("Cannot import metadata with a different 'namingConvention' from the current MetadataStore");
                }
                if (this.localQueryComparisonOptions.name !== lqcoName) {
                    throw new Error("Cannot import metadata with different 'localQueryComparisonOptions' from the current MetadataStore");
                }
            }
            var structuralTypeMap = {};
            var that = this;
            core.objectForEach(json._structuralTypeMap, function (key, value) {
                structuralTypeMap[key] = that._structuralTypeFromJson(value);
                checkTypeRegistry(that, structuralTypeMap[key]);
            });
            // TODO: don't think that this next line is needed
            json._structuralTypeMap = structuralTypeMap;
            core.extend(this, json);
            return this;
        };
        
        

        /**
        Creates a new MetadataStore from a previously exported serialized MetadataStore
        @example
            // assume ms is a previously created MetadataStore
            var metadataAsString = ms.exportMetadata();
            window.localStorage.setItem("metadata", metadataAsString);
            // and later, usually in a different session
            var metadataFromStorage = window.localStorage.getItem("metadata");
            var newMetadataStore = MetadataStore.importMetadata(metadataFromStorage);
        @method importMetadata
        @static
        @param exportedString {String} A previously exported MetadataStore.
        @return {MetadataStore} A new MetadataStore.
        
        **/
        ctor.importMetadata = function(exportedString) {
            var ms = new MetadataStore();
            ms.importMetadata(exportedString);
            return ms;
        };

        /**
        Returns whether Metadata has been retrieved for a specified service name.
        @example
            // Assume em1 is an existing EntityManager.
            if (!em1.metadataStore.hasMetadataFor("api/NorthwindIBModel"))) {
                // do something interesting
            }
        @method hasMetadataFor
        @param serviceName {String} The service name.
        @return {Boolean}
        **/
        proto.hasMetadataFor = function(serviceName) {
            return !!this.getDataService(serviceName);
        };
        
        /**
        Returns the DataService for a specified service name
        @example
            // Assume em1 is an existing EntityManager.
            var ds = em1.metadataStore.getDataService("api/NorthwindIBModel");
            var adapterName = ds.adapterName; // may be null
           
        @method getDataService
        @param serviceName {String} The service name.
        @return {Boolean}
        **/
        proto.getDataService = function (serviceName) {
            assertParam(serviceName, "serviceName").isString().check();

            serviceName = DataService._normalizeServiceName(serviceName);
            return core.arrayFirst(this.dataServices, function (ds) {
                return ds.serviceName === serviceName;
            });
        };

        /**
        Fetches the metadata for a specified 'service'. This method is automatically called 
        internally by an EntityManager before its first query against a new service.  

        @example
        Usually you will not actually process the results of a fetchMetadata call directly, but will instead
        ask for the metadata from the EntityManager after the fetchMetadata call returns.
        @example
            var ms = new MetadataStore();
            // or more commonly
            // var ms = anEntityManager.metadataStore;
            ms.fetchMetadata("api/NorthwindIBModel")
            .then(function(rawMetadata) {
                // do something with the metadata
            }
            .fail(function(exception) {
                // handle exception here
            };
        @method fetchMetadata
        @async
        @param dataService {DataService|String}  Either a DataService or just the name of the DataService to fetch metadata for.
        
        @param [callback] {Function} Function called on success.
        
            successFunction([data])
            @param [callback.data] {rawMetadata} 
  
        @param [errorCallback] {Function} Function called on failure.

            failureFunction([error])
            @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.

        @return {Promise} Promise
        **/
        proto.fetchMetadata = function (dataService, callback, errorCallback) {
            assertParam(dataService, "dataService").isString().or().isInstanceOf(DataService).check();
            assertParam(callback, "callback").isFunction().isOptional().check();
            assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();
            
            if (typeof dataService === "string") {
                // use the dataService with a matching name or create a new one.
                dataService = this.getDataService(dataService) || new DataService({ serviceName: dataService });
            }
           
            if (this.hasMetadataFor(dataService.serviceName)) {
                throw new Error("Metadata for a specific serviceName may only be fetched once per MetadataStore. ServiceName: " + dataService.serviceName);
            }
            

            var deferred = Q.defer();
            dataService.adapterInstance.fetchMetadata(this, dataService, deferred.resolve, deferred.reject);
            return deferred.promise.then(function (rawMetadata) {
                if (callback) callback(rawMetadata);
                return Q.resolve(rawMetadata);
            }, function (error) {
                if (errorCallback) errorCallback(error);
                return Q.reject(error);
            });
        };


        /**
        Used to register a constructor for an EntityType that is not known via standard Metadata discovery; 
        i.e. an unmapped type.  

        @method trackUnmappedType
        @param entityCtor {Function} The constructor for the 'unmapped' type. 
        @param [interceptor] {Function} A function
        **/
        proto.trackUnmappedType = function (entityCtor, interceptor) {
            assertParam(entityCtor, "entityCtor").isFunction().check();
            assertParam(interceptor, "interceptor").isFunction().isOptional().check();
            // TODO: think about adding this to the MetadataStore.
            var entityType = new EntityType(this);
            entityType._setCtor(entityCtor, interceptor);
        };

        /**
        Provides a mechanism to register a 'custom' constructor to be used when creating new instances
        of the specified entity type.  If this call is not made, a default constructor is created for
        the entity as needed.
        This call may be made before or after the corresponding EntityType has been discovered via
        Metadata discovery.
        @example
            var Customer = function () {
                this.miscData = "asdf";
            };
            Customer.prototype.doFoo() {
                ...
            }
            // assume em1 is a preexisting EntityManager;
            em1.metadataStore.registerEntityTypeCtor("Customer", Customer);
            // any queries or EntityType.create calls from this point on will call the Customer constructor
            // registered above.
        @method registerEntityTypeCtor
        @param structuralTypeName {String} The name of the EntityType o0r ComplexType.
        @param aCtor {Function}  The constructor for this EntityType or ComplexType; may be null if all you want to do is set the next parameter. 
        @param [initializationFn] {Function} A function or the name of a function on the entity that is to be executed immediately after the entity has been created
        and populated with any initial values.
            
        initializationFn(entity)
        @param initializationFn.entity {Entity} The entity being created or materialized.
        **/
        proto.registerEntityTypeCtor = function (structuralTypeName, aCtor, initializationFn) {
            assertParam(structuralTypeName, "structuralTypeName").isString().check();
            assertParam(aCtor, "aCtor").isFunction().isOptional().check();
            assertParam(initializationFn, "initializationFn").isOptional().isFunction().or().isString().check();
            if (!aCtor) {
                aCtor = createEmptyCtor();
            }
            var qualifiedTypeName = getQualifiedTypeName(this, structuralTypeName, false);
            var typeName;
            if (qualifiedTypeName) {
                var stype = this._structuralTypeMap[qualifiedTypeName];
                if (stype) {
                    stype._setCtor(aCtor);
                }
                typeName = qualifiedTypeName;
            } else {
                typeName = structuralTypeName;
            }
            aCtor.prototype._$typeName = typeName;
            this._typeRegistry[typeName] = aCtor;
            if (initializationFn) {
                aCtor._$initializationFn = initializationFn;
            }
        };
      
        function createEmptyCtor() {
            return function() {};
        }
        
        /**
        Returns whether this MetadataStore contains any metadata yet.
        @example
            // assume em1 is a preexisting EntityManager;
            if (em1.metadataStore.isEmpty()) {
                // do something interesting
            }
        @method isEmpty
        @return {Boolean}
        **/
        proto.isEmpty = function () {
            return this.dataServices.length === 0;
        };


        /**
        Returns an  {{#crossLink "EntityType"}}{{/crossLink}} or a {{#crossLink "ComplexType"}}{{/crossLink}} given its name.
        @example
            // assume em1 is a preexisting EntityManager
            var odType = em1.metadataStore.getEntityType("OrderDetail");
        or to throw an error if the type is not found
        @example
            var badType = em1.metadataStore.getEntityType("Foo", false);
            // badType will not get set and an exception will be thrown.
        @method getEntityType
        @param structuralTypeName {String}  Either the fully qualified name or a short name may be used. If a short name is specified and multiple types share
        that same short name an exception will be thrown. 
        @param [okIfNotFound=false] {Boolean} Whether to throw an error if the specified EntityType is not found.
        @return {EntityType|ComplexType} The EntityType. ComplexType or 'undefined' if not not found.
        **/
        proto.getEntityType = function (structuralTypeName, okIfNotFound) {
            assertParam(structuralTypeName, "structuralTypeName").isString().check();
            assertParam(okIfNotFound, "okIfNotFound").isBoolean().isOptional().check(false);
            return getTypeFromMap(this, this._structuralTypeMap, structuralTypeName, okIfNotFound);
        };

        /**
        Returns an array containing all of the  {{#crossLink "EntityType"}}{{/crossLink}}s or {{#crossLink "ComplexType"}}{{/crossLink}}s in this MetadataStore.
        @example
            // assume em1 is a preexisting EntityManager
            var allTypes = em1.metadataStore.getEntityTypes();
        @method getEntityTypes
        @return {Array of EntityType|ComplexType}
        **/
        proto.getEntityTypes = function () {
            return getTypesFromMap(this._structuralTypeMap);
        };
        
        
        function getTypeFromMap(metadataStore, typeMap, typeName, okIfNotFound) {
            
            var qualTypeName = getQualifiedTypeName(metadataStore, typeName, false);
            var type = typeMap[qualTypeName];
            if (!type) {
                if (okIfNotFound) return null;
                throw new Error("Unable to locate a 'Type' by the name: " + typeName);
            }
            if (type.length) {
                var typeNames = type.join(",");
                throw new Error("There are multiple types with this 'shortName': " + typeNames);
            }
            return type;
        };
        
        function getTypesFromMap(typeMap) {
            var types = [];
            for (var key in typeMap) {
                var value = typeMap[key];
                // skip 'shortName' entries
                if (key === value.name) {
                    types.push(typeMap[key]);
                }
            }
            return types;
        }

        proto.getIncompleteNavigationProperties = function() {
            return core.objectMapToArray(this._structuralTypeMap, function (key, value) {
                if (value instanceof ComplexType) return null;
                var badProps = value.navigationProperties.filter(function(np) {
                    return !np.entityType;
                });
                return badProps.length === 0 ? null : badProps;
            });
        };


        /**
        Returns a fully qualified entityTypeName for a specified resource name.  The reverse of this operation
        can be obtained via the  {{#crossLink "EntityType"}}{{/crossLink}} 'defaultResourceName' property
        @method getEntityTypeNameForResourceName
        @param resourceName {String}
        **/
        proto.getEntityTypeNameForResourceName = function (resourceName) {
            assertParam(resourceName, "resourceName").isString().check();
            // return this._resourceEntityTypeMap[resourceName.toLowerCase()];
            return this._resourceEntityTypeMap[resourceName];
        };

        /**
        Associates a resourceName with an entityType. 

        This method is only needed in those cases where multiple resources return the same
        entityType.  In this case Metadata discovery will only determine a single resource name for 
        each entityType.
        @method setEntityTypeForResourceName
        @param resourceName {String}
        @param entityTypeOrName {EntityType|String} If passing a string either the fully qualified name or a short name may be used. If a short name is specified and multiple types share
        that same short name an exception will be thrown. If the entityType has not yet been discovered then a fully qualified name must be used.
        **/
        proto.setEntityTypeForResourceName = function (resourceName, entityTypeOrName) {
            assertParam(resourceName, "resourceName").isString().check();
            assertParam(entityTypeOrName, "entityTypeOrName").isInstanceOf(EntityType).or().isString().check();
            // resourceName = resourceName.toLowerCase();
            var entityTypeName;
            if (entityTypeOrName instanceof EntityType) {
                entityTypeName = entityTypeOrName.name;
            } else {
                entityTypeName = getQualifiedTypeName(this, entityTypeOrName, true);
            }

            this._resourceEntityTypeMap[resourceName] = entityTypeName;
            this._entityTypeResourceMap[entityTypeName] = resourceName;
            var entityType = this.getEntityType(entityTypeName, true);
            if (entityType) {
                entityType.defaultResourceName = entityType.defaultResourceName || resourceName;
            }
        };

        // protected methods

        proto._structuralTypeFromJson = function(json) {
            var stype = this.getEntityType(json.name, true);
            if (stype) return stype;
            var config = {
                shortName: json.shortName,
                namespace: json.namespace
            };
            var isEntityType = !!json.navigationProperties;
            stype = isEntityType ? new EntityType(config) : new ComplexType(config);

            json.validators = json.validators.map(function(v) {
                return Validator.fromJSON(v);
            });

            json.dataProperties = json.dataProperties.map(function(dp) {
                return DataProperty.fromJSON(dp, stype);
            });

            if (isEntityType) {
                json.autoGeneratedKeyType = AutoGeneratedKeyType.fromName(json.autoGeneratedKeyType);
                json.navigationProperties = json.navigationProperties.map(function(dp) {
                    return NavigationProperty.fromJSON(dp, stype);
                });
            }
            stype = core.extend(stype, json);
            this.addEntityType(stype);
            return stype;
        };
        
        proto._checkEntityType = function(entity) {
            if (entity.entityType) return;
            var typeName = entity.prototype._$typeName;
            if (!typeName) {
                throw new Error("This entity has not been registered. See the MetadataStore.registerEntityTypeCtor method");
            }
            var entityType = this.getEntityType(typeName);
            if (entityType) {
                entity.entityType = entityType;
            }
        };
       
        proto._parseODataMetadata = function (serviceName, schemas) {
            var that = this;
            
            toArray(schemas).forEach(function (schema) {
                if (schema.cSpaceOSpaceMapping) {
                    // Web api only - not avail in OData.
                    var mappings = JSON.parse(schema.cSpaceOSpaceMapping);
                    var newMap = {};
                    mappings.forEach(function(mapping) {
                        newMap[mapping[0]] = mapping[1];
                    });
                    schema.cSpaceOSpaceMapping = newMap;
                }
                if (schema.entityContainer) {
                    toArray(schema.entityContainer).forEach(function (container) {
                        toArray(container.entitySet).forEach(function (entitySet) {
                            var entityTypeName = normalizeTypeName(entitySet.entityType, schema).typeName;
                            that.setEntityTypeForResourceName(entitySet.name, entityTypeName);
                        });
                    });
                }
               
                // process complextypes before entity types.
                if (schema.complexType) {
                    toArray(schema.complexType).forEach(function (ct) {
                        var complexType = convertFromODataComplexType(ct, schema, that);
                        checkTypeRegistry(that, complexType);
                    });
                }
                if (schema.entityType) {
                    toArray(schema.entityType).forEach(function (et) {
                        var entityType = convertFromODataEntityType(et, schema, that);
                        checkTypeRegistry(that, entityType);
                           
                    });
                }

            });
            var badNavProps = this.getIncompleteNavigationProperties();
            if (badNavProps.length > 0) {
                throw new Error("Bad nav properties");
            }
        };
        
        function checkTypeRegistry(metadataStore, structuralType) {
            // check if this structural type's name, short version or qualified version has a registered ctor.
            var typeCtor = metadataStore._typeRegistry[structuralType.name] || metadataStore._typeRegistry[structuralType.shortName];
            if (typeCtor) {
                // next line is in case the entityType was originally registered with a shortname.
                typeCtor.prototype._$typeName = structuralType.name;
                structuralType._setCtor(typeCtor);
                metadataStore._structuralTypeMap[structuralType.name] = structuralType;
            }
        }

        function getQualifiedTypeName(metadataStore, structTypeName, throwIfNotFound) {
            if (isQualifiedTypeName(structTypeName)) return structTypeName;
            var result = metadataStore._shortNameMap[structTypeName];
            if (!result && throwIfNotFound) {
                throw new Error("Unable to locate 'entityTypeName' of: " + structTypeName);
            }
            return result;
        }

        function convertFromODataEntityType(odataEntityType, schema, metadataStore) {
            var shortName = odataEntityType.name;
            var ns = getNamespaceFor(shortName, schema);
            var entityType = new EntityType({
                shortName: shortName,
                namespace: ns
            });
            var keyNamesOnServer = toArray(odataEntityType.key.propertyRef).map(core.pluck("name"));
            toArray(odataEntityType.property).forEach(function (prop) {
                convertFromODataDataProperty(entityType, prop, schema, keyNamesOnServer);
            });
            
            toArray(odataEntityType.navigationProperty).forEach(function (prop) {
                convertFromODataNavProperty(entityType, prop, schema);
            });
            metadataStore.addEntityType(entityType);
            return entityType;
        }
        
      
        function convertFromODataComplexType(odataComplexType, schema, metadataStore) {
            var shortName = odataComplexType.name;
            var ns = getNamespaceFor(shortName, schema);
            var complexType = new ComplexType({
                shortName: shortName,
                namespace: ns
            });
            
            toArray(odataComplexType.property).forEach(function (prop) {
                convertFromODataDataProperty(complexType, prop, schema);
            });
            
            metadataStore.addEntityType(complexType);
            return complexType;
        }
        

        function convertFromODataDataProperty(parentType, odataProperty, schema, keyNamesOnServer) {
            var dp;
            var typeParts = odataProperty.type.split(".");
            if (typeParts.length == 2) {
                dp = convertFromODataSimpleProperty(parentType, odataProperty, keyNamesOnServer);
            } else {
                if (isEnumType(odataProperty, schema)) {
                    dp = convertFromODataSimpleProperty(parentType, odataProperty, keyNamesOnServer);
                    if (dp) {
                        dp.enumType = odataProperty.type;
                    }
                } else {
                    dp = convertFromODataComplexProperty(parentType, odataProperty, schema);
                }
            }
            if (dp) {
                parentType.addProperty(dp);
                addValidators(dp);
            }
            return dp;
        }
        
        function isEnumType(odataProperty, schema) {
            if (!schema.enumType) return false;
            var enumTypes = toArray(schema.enumType);
            var typeParts = odataProperty.type.split(".");
            var baseTypeName = typeParts[typeParts.length - 1];
            return enumTypes.some(function(enumType) {
                return enumType.name === baseTypeName;
            });
        }

        function convertFromODataSimpleProperty(parentType, odataProperty, keyNamesOnServer) {
             var dataType = DataType.fromEdmDataType(odataProperty.type);
             if (dataType == null) {
                 parentType.warnings.push("Unable to recognize DataType for property: " + odataProperty.name + " DateType: " + odataProperty.type);
                 return null;
             }
             var isNullable = odataProperty.nullable === 'true' || odataProperty.nullable == null;
             var fixedLength = odataProperty.fixedLength ? odataProperty.fixedLength === true : undefined;
             var isPartOfKey = keyNamesOnServer!=null && keyNamesOnServer.indexOf(odataProperty.name) >= 0;
             if (parentType.autoGeneratedKeyType == AutoGeneratedKeyType.None) {
                 if (isIdentityProperty(odataProperty)) {
                     parentType.autoGeneratedKeyType = AutoGeneratedKeyType.Identity;
                 }
             }
             var maxLength = odataProperty.maxLength;
             maxLength = (maxLength == null || maxLength==="Max") ? null : parseInt(maxLength);
             // can't set the name until we go thru namingConventions and these need the dp.
             var dp = new DataProperty({
                 nameOnServer: odataProperty.name,
                 dataType: dataType,
                 isNullable: isNullable,
                 isPartOfKey: isPartOfKey,
                 maxLength: maxLength,
                 fixedLength: fixedLength,
                 concurrencyMode: odataProperty.concurrencyMode
             });
             if (dataType === DataType.Undefined) {
                 dp.rawTypeName = odataProperty.type;
             }
            return dp;
        }
        
        function convertFromODataComplexProperty(parentType, odataProperty, schema) {
            
            // Complex properties are never nullable ( per EF specs)
            // var isNullable = odataProperty.nullable === 'true' || odataProperty.nullable == null;
            // var complexTypeName = odataProperty.type.split("Edm.")[1];
            var complexTypeName = normalizeTypeName(odataProperty.type, schema).typeName;
            // can't set the name until we go thru namingConventions and these need the dp.
            var dp = new DataProperty({
                nameOnServer: odataProperty.name,
                complexTypeName: complexTypeName,
                isNullable: false
            });
            
            return dp;
        }

        function addValidators(dataProperty) {
            var typeValidator;
            if (!dataProperty.isNullable) {
                dataProperty.validators.push(Validator.required());
            }

            if (dataProperty.isComplexProperty) return;

            if (dataProperty.dataType === DataType.String) {
                if (dataProperty.maxLength) {
                    var validatorArgs = { maxLength: dataProperty.maxLength };
                    typeValidator = Validator.maxLength(validatorArgs);
                } else {
                    typeValidator = Validator.string();
                }
            } else {
                typeValidator = dataProperty.dataType.validatorCtor();
            }

            dataProperty.validators.push(typeValidator);

        }

        function convertFromODataNavProperty(entityType, odataProperty, schema) {
            var association = getAssociation(odataProperty, schema);
            var toEnd = core.arrayFirst(association.end, function (assocEnd) {
                return assocEnd.role === odataProperty.toRole;
            });
            
            var isScalar = !(toEnd.multiplicity === "*");
            var dataType = normalizeTypeName(toEnd.type, schema).typeName;
            var fkNamesOnServer = [];
            if (toEnd && isScalar) {
                var constraint = association.referentialConstraint;
                if (constraint) {
                    var principal = constraint.principal;
                    var dependent = constraint.dependent;
                    var propRefs;
                    if (odataProperty.fromRole === principal.role) {
                        propRefs = toArray(principal.propertyRef);
                    } else {
                        propRefs = toArray(dependent.propertyRef);
                    }
                    // will be used later by np._update
                    fkNamesOnServer = propRefs.map(core.pluck("name"));
                }
            }
            var np = new NavigationProperty({
                nameOnServer: odataProperty.name,
                entityTypeName: dataType,
                isScalar: isScalar,
                associationName: association.name,
                foreignKeyNamesOnServer: fkNamesOnServer
            });
            entityType.addProperty(np);
       
            return np;
        }
        
        function isIdentityProperty(odataProperty) {
            // see if web api feed
            var propName = core.arrayFirst(Object.keys(odataProperty), function (pn) {
                return pn.indexOf("StoreGeneratedPattern") >= 0;
            });
            if (propName) {
                return (odataProperty[propName] === "Identity");
            } else {
                // see if Odata feed
                var extensions = odataProperty.extensions;
                if (!extensions) {
                    return false;
                }
                var identityExtn = core.arrayFirst(extensions, function (extension) {
                    return extension.name === "StoreGeneratedPattern" && extension.value === "Identity";
                });
                return !!identityExtn;
            }
        }

        // Fast version
        // np: schema.entityType[].navigationProperty.relationship -> schema.association
        //   match( shortName(np.relationship) == schema.association[].name
        //      --> association

        // Correct version
        // np: schema.entityType[].navigationProperty.relationship -> schema.association
        //   match( np.relationship == schema.entityContainer[0].associationSet[].association )
        //      -> associationSet.name
        //   match ( associationSet.name == schema.association[].name )
        //      -> association

        function getAssociation(odataNavProperty, schema) {
            var assocName = normalizeTypeName(odataNavProperty.relationship, schema).shortTypeName;
            var assocs = schema.association;
            if (!assocs) return null;
            if (!Array.isArray(assocs)) {
                assocs = [assocs];
            }
            var association = core.arrayFirst(assocs, function (assoc) {
                return assoc.name === assocName;
            });
            return association;
        }

        function toArray(item) {
            if (!item) {
                return [];
            } else if (Array.isArray(item)) {
                return item;
            } else {
                return [item];
            }
        }
        

        return ctor;
    })();

    var DataService = function () {
        
        /**
        A DataService instance is used to encapsulate the details of a single 'service'; this includes a serviceName, a dataService adapterInstance, 
        and whether the service has server side metadata.  

        You can construct an EntityManager with either a serviceName or a DataService instance, if you use a serviceName then a DataService 
        is constructed for you.  (It can also be set via the EntityManager.setProperties method).

        The same applies to the MetadataStore.fetchMetadata method, i.e. it takes either a serviceName or a DataService instance.

        Each metadataStore contains a list of DataServices, each accessible via its ‘serviceName’. 
        ( see MetadataStore.getDataService and MetadataStore.addDataService).  The ‘addDataService’ method is called internally 
        anytime a MetadataStore.fetchMetadata call occurs with a new dataService ( or service name).
        @class DataService
        **/

        /**
        DataService constructor

        @example
            // 
            var dataService = new DataService({
                serviceName: altServiceName,
                hasServerMetadata: false
            });

            var metadataStore = new MetadataStore({
                namingConvention: NamingConvention.camelCase
            });

            return new EntityManager({
                dataService: dataService,
                metadataStore: metadataStore
            });
            
        @method <ctor> DataService
        @param config {Object}
        @param config.serviceName {String} The name of the service. 
        @param [config.adapterName] {String} The name of the dataServiceAdapter to be used with this service. 
        @param [config.hasServerMetadata] {bool} Whether the server can provide metadata for this service.
        **/
        
        var ctor = function(config) {
            if (arguments.length != 1) {
                throw new Error("The DataService ctor should be called with a single argument that is a configuration object.");
            }

            assertConfig(config)
                .whereParam("serviceName").isNonEmptyString()
                .whereParam("adapterName").isString().isOptional().withDefault(null)
                .whereParam("hasServerMetadata").isBoolean().isOptional().withDefault(true)
                .whereParam("jsonResultsAdapter").isInstanceOf(JsonResultsAdapter).isOptional().withDefault(null)
                .applyAll(this);
            this.serviceName = DataService._normalizeServiceName(this.serviceName);
            this.adapterInstance = a_config.getAdapterInstance("dataService", this.adapterName);
            
            if (!this.jsonResultsAdapter) {
                this.jsonResultsAdapter = this.adapterInstance.jsonResultsAdapter;
            }
        };
        var proto = ctor.prototype;
        proto._$typeName = "DataService";
        
        /**
        The serviceName for this DataService.

        __readOnly__
        @property serviceName {String}
        **/
        
        /**
        The adapter name for the dataServiceAdapter to be used with this service.

        __readOnly__
        @property adapterName {String}
        **/
        
        /**
       The "dataService" adapter implementation instance associated with this EntityManager.

       __readOnly__
       @property adapterInstance {an instance of the "dataService" adapter interface}
       **/

        /**
        Whether the server can provide metadata for this service.

        __readOnly__
        @property hasServerMetadata {Boolean}
        **/
        
        ctor._normalizeServiceName = function(serviceName) {
            serviceName = serviceName.trim();
            if (serviceName.substr(-1) !== "/") {
                return serviceName + '/';
            } else {
                return serviceName;
            }
        };
        
        proto.toJSON = function () {
            return {
                serviceName: this.serviceName,
                adapterName: this.adapterName || this.adapterInstance.name,
                hasServerMetadata: this.hasServerMetadata
            };
        };

  

        
        return ctor;
    }();
    
    var JsonResultsAdapter = (function () {

        /**
        A JsonREsultsAdapter is used ... 

        @class JsonResultsAdapter
        **/

        var ctor = function (config) {
            if (arguments.length != 1) {
                throw new Error("The DataService ctor should be called with a single argument that is a configuration object.");
            }

            assertConfig(config)
                .whereParam("name").isNonEmptyString()
                .whereParam("extractResults").isFunction().isOptional().withDefault(extractResultsDefault)
                .whereParam("visitObjectNode").isFunction()
                .whereParam("visitAnonPropNode").isFunction().withDefault(visitAnonPropNodeDefault)
                .whereParam("visitNavPropNode").isFunction().isOptional().withDefault(visitNavPropNodeDefault)
                .applyAll(this);
            
        };
        var proto = ctor.prototype;

        proto.copyAdapter = function(entityType) {
            var newAdapter = new JsonResultsAdapter(this);
            newAdapter.visitObjectNode = function(e) { return { entityType: entityType }; };
            return newAdapter;
        };

        proto._$typeName = "JsonResultsAdapter";

        function extractResultsDefault(data) {
            return data.results;
        }
        
        // params are - value, key, queryContext ) {
        function visitAnonPropNodeDefault() {
            return {};
        }
        
        // params are value, navProp, queryContext
        function visitNavPropNodeDefault() {
            return {};
        }

        return ctor;
    })();

    var EntityType = (function () {
        /**
        Container for all of the metadata about a specific type of Entity.
        @class EntityType
        **/
        var __nextAnonIx = 0;
        

        /** 
        @example                    
            var entityType = new EntityType( {
                shortName: "person",
                namespace: "myAppNamespace"
             });
        @method <ctor> EntityType
        @param config {Object|MetadataStore} Configuration settings or a MetadataStore.  If this parameter is just a MetadataStore
        then what will be created is an 'anonymous' type that will never be communicated to or from the server. It is purely for
        client side use and will be given an automatically generated name. Normally, however, you will use a configuration object.
        @param config.shortName {String}
        @param [config.namespace=""] {String}
        @param [config.autogeneratedKeyType] {AutoGeneratedKeyType}
        @param [config.defaultResourceName] { String}
        **/
        var ctor = function (config) {
            if (arguments.length > 1) {
                throw new Error("The EntityType ctor has a single argument that is either a 'MetadataStore' or a configuration object.");
            }
            if  (config._$typeName === "MetadataStore") {
                this.metadataStore = config;
                this.shortName = "Anon_" + ++__nextAnonIx;
                this.namespace = "";
                this.isAnonymous = true;
            } else {
                assertConfig(config)
                    .whereParam("shortName").isNonEmptyString()
                    .whereParam("namespace").isString().isOptional().withDefault("")
                    .whereParam("autoGeneratedKeyType").isEnumOf(AutoGeneratedKeyType).isOptional().withDefault(AutoGeneratedKeyType.None)
                    .whereParam("defaultResourceName").isNonEmptyString().isOptional().withDefault(null)
                    .applyAll(this);
            }

            this.name = qualifyTypeName(this.shortName, this.namespace);
            
            // the defaultResourceName may also be set up either via metadata lookup or first query or via the 'setProperties' method
            
            this.dataProperties = [];
            this.navigationProperties = [];
            this.complexProperties = [];
            this.keyProperties = [];
            this.foreignKeyProperties = [];
            this.concurrencyProperties = [];
            this.unmappedProperties = []; // will be updated later.
            this.validators = [];
            this.warnings = [];
            this._mappedPropertiesCount = 0;
            
        };
        var proto = ctor.prototype;
        proto._$typeName = "EntityType";
        
        /**
        The {{#crossLink "MetadataStore"}}{{/crossLink}} that contains this EntityType

        __readOnly__
        @property metadataStore {MetadataStore}
        **/
            
        /**
        The DataProperties (see {{#crossLink "DataProperty"}}{{/crossLink}}) associated with this EntityType.

        __readOnly__
        @property dataProperties {Array of DataProperty} 
        **/
            
        /**
        The NavigationProperties  (see {{#crossLink "NavigationProperty"}}{{/crossLink}}) associated with this EntityType.

        __readOnly__
        @property navigationProperties {Array of NavigationProperty} 
        **/
        
        /**
        The DataProperties for this EntityType that contain instances of a ComplexType (see {{#crossLink "ComplexType"}}{{/crossLink}}).

        __readOnly__
        @property complexProperties {Array of DataProperty} 
        **/
            
        /**
        The DataProperties associated with this EntityType that make up it's {{#crossLink "EntityKey"}}{{/crossLink}}.

        __readOnly__
        @property keyProperties {Array of DataProperty} 
        **/
            
        /**
        The DataProperties associated with this EntityType that are foreign key properties.

        __readOnly__
        @property foreignKeyProperties {Array of DataProperty} 
        **/
            
        /**
        The DataProperties associated with this EntityType that are concurrency properties.

        __readOnly__
        @property concurrencyProperties {Array of DataProperty} 
        **/

        /**
        The DataProperties associated with this EntityType that are not mapped to any backend datastore. These are effectively free standing
        properties.

        __readOnly__
        @property unmappedProperties {Array of DataProperty} 
        **/
            
        /**
        The default resource name associated with this EntityType.  An EntityType may be queried via a variety of 'resource names' but this one 
        is used as the default when no resource name is provided.  This will occur when calling {{#crossLink "EntityAspect/loadNavigationProperty"}}{{/crossLink}}
        or when executing any {{#crossLink "EntityQuery"}}{{/crossLink}} that was created via an {{#crossLink "EntityKey"}}{{/crossLink}}.

        __readOnly__
        @property defaultResourceName {String} 
        **/

        /**
        The fully qualifed name of this EntityType.

        __readOnly__
        @property name {String} 
        **/

        /**
        The short, unqualified, name for this EntityType.

        __readOnly__
        @property shortName {String} 
        **/

        /**
        The namespace for this EntityType.

        __readOnly__
        @property namespace {String} 
        **/

        /**
        The {{#crossLink "AutoGeneratedKeyType"}}{{/crossLink}} for this EntityType.
        
        __readOnly__
        @property autoGeneratedKeyType {AutoGeneratedKeyType} 
        @default AutoGeneratedKeyType.None
        **/

        /**
        The entity level validators associated with this EntityType. Validators can be added and
        removed from this collection.

        __readOnly__
        @property validators {Array of Validator} 
        **/

        /**
        General purpose property set method
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            custType.setProperties( {
                autoGeneratedKeyType: AutoGeneratedKeyType.Identity;
                defaultResourceName: "CustomersAndIncludedOrders"
            )};
        @method setProperties
        @param config [object]
            @param [config.autogeneratedKeyType] {AutoGeneratedKeyType}
            @param [config.defaultResourceName] {String}
        **/
        proto.setProperties = function (config) {
            assertConfig(config)
                .whereParam("autoGeneratedKeyType").isEnumOf(AutoGeneratedKeyType).isOptional()
                .whereParam("defaultResourceName").isString().isOptional()
                .applyAll(this);
            if (config.defaultResourceName) {
                this.defaultResourceName = config.defaultResourceName;
            }
        };

        /**
        Adds a  {{#crossLink "DataProperty"}}{{/crossLink}} or a {{#crossLink "NavigationProperty"}}{{/crossLink}} to this EntityType.
        @example
            // assume myEntityType is a newly constructed EntityType. 
            myEntityType.addProperty(dataProperty1);
            myEntityType.addProperty(dataProperty2);
            myEntityType.addProperty(navigationProperty1);
        @method addProperty
        @param property {DataProperty|NavigationProperty}
        **/
        proto.addProperty = function (property) {
            assertParam(property, "dataProperty").isInstanceOf(DataProperty).or().isInstanceOf(NavigationProperty).check();
            if (this.metadataStore && !property.isUnmapped) {
                throw new Error("The '" + this.name + "' EntityType has already been added to a MetadataStore and therefore no additional properties may be added to it.");
            }
            if (property.parentType) {
                if (property.parentType !== this) {
                    throw new Error("This dataProperty has already been added to " + property.parentType.name);
                } else {
                    return this;
                }
            }
            property.parentType = this;
            if (property.isDataProperty) {
                this._addDataProperty(property);
            } else {
                this._addNavigationProperty(property);
            }
            return this;
        };
        


        /**
        Create a new entity of this type.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var cust1 = custType.createEntity();
            em1.addEntity(cust1);
        @method createEntity
        @param [initialValues] {Config object} - Configuration object of the properties to set immediately after creation.
        @return {Entity} The new entity.
        **/
        proto.createEntity = function (initialValues) {
            var instance = this._createEntityCore();
            
            if (initialValues) {
                core.objectForEach(initialValues, function(key, value) {
                    instance.setProperty(key, value);
                });
            }
            
            instance.entityAspect._postInitialize();
            return instance;
        };

        proto._createEntityCore = function() {
            var aCtor = this.getEntityCtor();
            var instance = new aCtor();
            new EntityAspect(instance);
            return instance;
        };

        /**
        Returns the constructor for this EntityType.
        @method getEntityCtor
        @return {Function} The constructor for this EntityType.
        **/
        proto.getEntityCtor = function () {
            if (this._ctor) return this._ctor;
            var typeRegistry = this.metadataStore._typeRegistry;
            var aCtor = typeRegistry[this.name] || typeRegistry[this.shortName];
            if (!aCtor) {
                var createCtor = v_modelLibraryDef.getDefaultInstance().createCtor;
                if (createCtor) {
                    aCtor = createCtor(this);
                } else {
                    aCtor = createEmptyCtor();
                }
            }
            this._setCtor(aCtor);
            return aCtor;
        };
        
        function createEmptyCtor() {
            return function() { };
        }

        // May make public later.
        proto._setCtor = function (aCtor, interceptor) {
            var instance = new aCtor();
            var proto = aCtor.prototype;
            
            if (this._$typeName == "EntityType") {
                // insure that all of the properties are on the 'template' instance before watching the class.
                calcUnmappedProperties(this, instance);
                proto.entityType = this;
            } else {
                calcUnmappedProperties(this, instance);
                proto.complexType = this;
            }

            if (interceptor) {
                proto._$interceptor = interceptor;
            } else {
                proto._$interceptor = defaultPropertyInterceptor;
            }

            v_modelLibraryDef.getDefaultInstance().initializeEntityPrototype(proto);

            this._ctor = aCtor;
        };

        /**
        Adds either an entity or property level validator to this EntityType.  
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var countryProp = custType.getProperty("Country");
            var valFn = function (v) {
                if (v == null) return true;
                return (core.stringStartsWith(v, "US"));
            };
            var countryValidator = new Validator("countryIsUS", valFn, 
                { displayName: "Country", messageTemplate: "'%displayName%' must start with 'US'" });
            custType.addValidator(countryValidator, countryProp);
        This is the same as adding an entity level validator via the 'validators' property of DataProperty or NavigationProperty
        @example
            countryProp.validators.push(countryValidator);
        Entity level validators can also be added by omitting the 'property' parameter.
        @example
            custType.addValidator(someEntityLevelValidator);
        or
        @example
            custType.validators.push(someEntityLevelValidator);
        @method addValidator
        @param validator {Validator} Validator to add.
        @param [property] Property to add this validator to.  If omitted, the validator is assumed to be an
        entity level validator and is added to the EntityType's 'validators'.
        **/
        proto.addValidator = function (validator, property) {
            assertParam(validator, "validator").isInstanceOf(Validator).check();
            assertParam(property, "property").isOptional().isString().or().isEntityProperty().check();
            if (property) {
                if (typeof (property) === 'string') {
                    property = this.getProperty(property, true);
                }
                property.validators.push(validator);
            } else {
                this.validators.push(validator);
            }
        };

        /**
        Returns all of the properties ( dataProperties and navigationProperties) for this EntityType.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var arrayOfProps = custType.getProperties();
        @method getProperties
        @return {Array of DataProperty|NavigationProperty} Array of Data and Navigation properties.
        **/
        proto.getProperties = function () {
            return this.dataProperties.concat(this.navigationProperties);
        };

        /**
        Returns all of the property names ( for both dataProperties and navigationProperties) for this EntityType.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var arrayOfPropNames = custType.getPropertyNames();
        @method getPropertyNames
        @return {Array of String}
        **/
        proto.getPropertyNames = function () {
            return this.getProperties().map(core.pluck('name'));
        };

        /**
        Returns a data property with the specified name or null.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var customerNameDataProp = custType.getDataProperty("CustomerName");
        @method getDataProperty
        @param propertyName {String}
        @return {DataProperty} Will be null if not found.
        **/
        proto.getDataProperty = function (propertyName, isServerName) {
            var propName = isServerName ? "nameOnServer" : "name";
            return core.arrayFirst(this.dataProperties, core.propEq(propName, propertyName));
        };

        /**
        Returns a navigation property with the specified name or null.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var customerOrdersNavProp = custType.getDataProperty("Orders");
        @method getNavigationProperty
        @param propertyName {String}
        @return {NavigationProperty} Will be null if not found.
        **/
        proto.getNavigationProperty = function (propertyName, isServerName) {
            var propName = isServerName ? "nameOnServer" : "name";
            return core.arrayFirst(this.navigationProperties, core.propEq(propName, propertyName));
        };

        /**
        Returns either a DataProperty or a NavigationProperty with the specified name or null.  

        This method also accepts a '.' delimited property path and will return the 'property' at the 
        end of the path.
        @example
            var custType = em1.metadataStore.getEntityType("Customer");
            var companyNameProp = custType.getProperty("CompanyName");
        This method can also walk a property path to return a property
        @example
            var orderDetailType = em1.metadataStore.getEntityType("OrderDetail");
            var companyNameProp2 = orderDetailType.getProperty("Order.Customer.CompanyName");
            // companyNameProp === companyNameProp2 
        @method getProperty
        @param propertyPath {String}
        @param [throwIfNotFound=false] {Boolean} Whether to throw an exception if not found.
        @return {DataProperty|NavigationProperty} Will be null if not found.
        **/
        proto.getProperty = function (propertyPath, throwIfNotFound) {
            throwIfNotFound = throwIfNotFound || false;
            var propertyNames = (Array.isArray(propertyPath)) ? propertyPath : propertyPath.trim().split('.');
            var propertyName = propertyNames[0];
            var prop = core.arrayFirst(this.getProperties(), core.propEq("name", propertyName));
            if (propertyNames.length === 1) {
                if (prop) {
                    return prop;
                } else if (throwIfNotFound) {
                    throw new Error("unable to locate property: " + propertyName + " on entityType: " + this.name);
                } else {
                    return null;
                }
            } else {
                if (prop) {
                    propertyNames.shift();
                    // dataType is line below will be a complexType
                    var nextParentType = prop.isNavigationProperty ? prop.entityType : prop.dataType;
                    if (nextParentType) {
                        return nextParentType.getProperty(propertyNames, throwIfNotFound);
                    } else {
                        throw new Error("should not get here - unknown property type for: " + prop.name);
                    }
                } else {
                    if (throwIfNotFound) {
                        throw new Error("unable to locate property: " + propertyName + " on type: " + this.name);
                    } else {
                        return null;
                    }
                }
            }
        };

        /**
        Returns a string representation of this EntityType.
        @method toString
        @return {String}
        **/
        proto.toString = function () {
            return this.name;
        };

        proto.toJSON = function () {
            return {
                name: this.name,
                shortName: this.shortName,
                namespace: this.namespace,
                defaultResourceName: this.defaultResourceName,
                dataProperties: this.dataProperties,
                navigationProperties: this.navigationProperties,
                autoGeneratedKeyType: this.autoGeneratedKeyType.name,
                validators: this.validators
            };
        };

        // fromJSON is handled by metadataStore._structuralTypeFromJson;
        
        proto._clientPropertyPathToServer = function (propertyPath) {
            var fn = this.metadataStore.namingConvention.clientPropertyNameToServer;
            var that = this;
            var serverPropPath = propertyPath.split(".").map(function (propName) {
                var prop = that.getProperty(propName);
                return fn(propName, prop);
            }).join("/");
            return serverPropPath;
        };

        proto._updateProperty = function (property) {
            var nc = this.metadataStore.namingConvention;
            var serverName = property.nameOnServer;
            var clientName, testName;
            if (serverName) {
                clientName = nc.serverPropertyNameToClient(serverName, property);
                testName = nc.clientPropertyNameToServer(clientName, property);
                if (serverName !== testName) {
                    throw new Error("NamingConvention for this server property name does not roundtrip properly:" + serverName + "-->" + testName);
                }
                property.name = clientName;
            } else {
                clientName = property.name;
                serverName = nc.clientPropertyNameToServer(clientName, property);
                testName = nc.serverPropertyNameToClient(serverName, property);
                if (clientName !== testName) {
                    throw new Error("NamingConvention for this client property name does not roundtrip properly:" + clientName + "-->" + testName);
                }
                property.nameOnServer = serverName;
            }
            
            if (property.isComplexProperty) {
                // Not ok to not find it. - all complex types should be resolved before they are ref'd.
                var targetComplexType = this.metadataStore.getEntityType(property.complexTypeName, false);
                if (targetComplexType && targetComplexType instanceof ComplexType) {
                    property.dataType = targetComplexType;
                    property.defaultValue = null;
                } else {
                    throw new Error("Unable to resolve ComplexType with the name: " + property.complexTypeName + " for the property: " + property.name);
                }
            } else if (property.isNavigationProperty) {
                // sets navigation property: relatedDataProperties and dataProperty: relatedNavigationProperty
                resolveFks(property);
                // Tries to set - these two may get set later
                // this.inverse
                // this.entityType
                updateCrossEntityRelationship(property);
                
            }
        };

        ctor._getNormalizedTypeName = core.memoize(function (rawTypeName) {
            return rawTypeName && normalizeTypeName(rawTypeName).typeName;
        });
        // for debugging use the line below instead.
        //ctor._getNormalizedTypeName = function (rawTypeName) { return normalizeTypeName(rawTypeName).typeName; };

        proto._checkNavProperty = function (navigationProperty) {
            if (navigationProperty.isNavigationProperty) {
                if (navigationProperty.parentType != this) {
                    throw new Error(core.formatString("The navigationProperty '%1' is not a property of entity type '%2'",
                            navigationProperty.name, this.name));
                }
                return navigationProperty;
            }

            if (typeof (navigationProperty) === 'string') {
                var np = this.getProperty(navigationProperty);
                if (np && np.isNavigationProperty) return np;
            }
            throw new Error("The 'navigationProperty' parameter must either be a NavigationProperty or the name of a NavigationProperty");
        };
        
        proto._addDataProperty = function (dp) {

            this.dataProperties.push(dp);
            
            if (dp.isPartOfKey) {
                this.keyProperties.push(dp);
            };
            
            if (dp.isComplexProperty) {
                this.complexProperties.push(dp);
            }

            if (dp.concurrencyMode && dp.concurrencyMode !== "None") {
                this.concurrencyProperties.push(dp);
            };

            if (dp.isUnmapped) {
                this.unmappedProperties.push(dp);
            }

        };

        proto._addNavigationProperty = function (np) {

            this.navigationProperties.push(np);

            if (!isQualifiedTypeName(np.entityTypeName)) {
                np.entityTypeName = qualifyTypeName(np.entityTypeName, this.namespace);
            }
        };

        proto._fixup = function () {
            var that = this;
            this.getProperties().forEach(function (property) {
                that._updateProperty(property);
            });
            updateIncomplete(this);
        };

        function updateIncomplete(entityType) {
            var incompleteTypeMap = entityType.metadataStore._incompleteTypeMap;
            var incompleteMap = incompleteTypeMap[entityType.name];
            if (core.isEmpty(incompleteMap)) {
                delete incompleteTypeMap[entityType.name];
                return;
            }
            if (incompleteMap) {
                core.objectForEach(incompleteMap, function (assocName, np) {
                    if (!np.entityType) {
                        if (np.entityTypeName === entityType.name) {
                            np.entityType = entityType;
                            delete incompleteMap[assocName];
                            updateIncomplete(np.parentType);
                        }
                    }
                });
            }

        }

        function resolveFks(np) {
            if (np.foreignKeyProperties) return;
            var fkProps = getFkProps(np);
            // returns null if can't yet finish
            if (!fkProps) return;

            fkProps.forEach(function (dp) {
                dp.relatedNavigationProperty = np;
                np.parentType.foreignKeyProperties.push(dp);
                if (np.relatedDataProperties) {
                    np.relatedDataProperties.push(dp);
                } else {
                    np.relatedDataProperties = [dp];
                }
            });
        };



        // returns null if can't yet finish
        function getFkProps(np) {
            var fkNames = np.foreignKeyNames;
            var isNameOnServer = fkNames.length == 0;
            if (isNameOnServer) {
                fkNames = np.foreignKeyNamesOnServer;
                if (fkNames.length == 0) {
                    np.foreignKeyProperties = [];
                    return np.foreignKeyProperties;
                }
            }
            var ok = true;
            var parentEntityType = np.parentType;
            var fkProps = fkNames.map(function (fkName) {
                var fkProp = parentEntityType.getDataProperty(fkName, isNameOnServer);
                ok = ok && !!fkProp;
                return fkProp;
            });

            if (ok) {
                if (isNameOnServer) {
                    np.foreignKeyNames = fkProps.map(core.pluck("name"));
                }
                np.foreignKeyProperties = fkProps;
                return fkProps;
            } else {
                return null;
            }
        }

        function updateCrossEntityRelationship(np) {
            var metadataStore = np.parentType.metadataStore;
            var incompleteTypeMap = metadataStore._incompleteTypeMap;

            // ok to not find it yet
            var targetEntityType = metadataStore.getEntityType(np.entityTypeName, true);
            if (targetEntityType) {
                np.entityType = targetEntityType;
            }

            var assocMap = incompleteTypeMap[np.entityTypeName];
            if (!assocMap) {
                addToIncompleteMap(incompleteTypeMap, np);
            } else {
                var inverse = assocMap[np.associationName];
                if (inverse) {
                    removeFromIncompleteMap(incompleteTypeMap, np, inverse);
                } else {
                    addToIncompleteMap(incompleteTypeMap, np);
                }
            }
        };

        function addToIncompleteMap(incompleteTypeMap, np) {
            if (!np.entityType) {
                // Fixed based on this: http://stackoverflow.com/questions/14329352/bad-navigation-property-one-to-zero-or-one-relationship/14384399#14384399
                var assocMap = incompleteTypeMap[np.entityTypeName];
                if (!assocMap) {
                    assocMap = {};
                    incompleteTypeMap[np.entityTypeName] = assocMap;
                }
                assocMap[np.associationName] = np;
                
            }

            var altAssocMap = incompleteTypeMap[np.parentType.name];
            if (!altAssocMap) {
                altAssocMap = {};
                incompleteTypeMap[np.parentType.name] = altAssocMap;
            }
            altAssocMap[np.associationName] = np;
        }

        function removeFromIncompleteMap(incompleteTypeMap, np, inverse) {
            np.inverse = inverse;
            var assocMap = incompleteTypeMap[np.entityTypeName];

            delete assocMap[np.associationName];
            if (core.isEmpty(assocMap)) {
                delete incompleteTypeMap[np.entityTypeName];
            }
            if (!inverse.inverse) {
                inverse.inverse = np;
                // not sure if these are needed
                if (inverse.entityType == null) {
                    inverse.entityType = np.parentType;
                }
                var altAssocMap = incompleteTypeMap[np.parentType.name];
                if (altAssocMap) {
                    delete altAssocMap[np.associationName];
                    if (core.isEmpty(altAssocMap)) {
                        delete incompleteTypeMap[np.parentType.name];
                    }
                }
            }
        }
        
        function calcUnmappedProperties(entityType, instance) {
            var metadataPropNames = entityType.getPropertyNames();
            var trackablePropNames = v_modelLibraryDef.getDefaultInstance().getTrackablePropertyNames(instance);
            trackablePropNames.forEach(function (pn) {
                if (metadataPropNames.indexOf(pn) == -1) {
                    var newProp = new DataProperty({
                        name: pn,
                        dataType: DataType.Undefined,
                        isNullable: true,
                        isUnmapped: true
                    });
                    entityType.addProperty(newProp);
                }
            });
        }

        return ctor;
    })();
    
    var ComplexType = (function () {
        /**
        Container for all of the metadata about a specific type of Complex object.
        @class ComplexType
        **/
        
        /** 
        @example                    
            var complexType = new ComplexType( {
                shortName: "address",
                namespace: "myAppNamespace"
             });
        @method <ctor> ComplexType
        @param config {Object} Configuration settings
        @param config.shortName {String}
        @param [config.namespace=""] {String}
        **/

        var ctor = function (config) {
            if (arguments.length > 1) {
                throw new Error("The ComplexType ctor has a single argument that is a configuration object.");
            }

            assertConfig(config)
                .whereParam("shortName").isNonEmptyString()
                .whereParam("namespace").isString().isOptional().withDefault("")
                .applyAll(this);

            this.name = qualifyTypeName(this.shortName, this.namespace);
            this.dataProperties = [];
            this.complexProperties = [];
            this.validators = [];
            this.concurrencyProperties = [];
            this.unmappedProperties = [];
        };
        var proto = ctor.prototype;
        /**
        The DataProperties (see {{#crossLink "DataProperty"}}{{/crossLink}}) associated with this ComplexType.

        __readOnly__
        @property dataProperties {Array of DataProperty} 
        **/

        /**
        The DataProperties for this ComplexType that contain instances of a ComplexType (see {{#crossLink "ComplexType"}}{{/crossLink}}).

        __readOnly__
        @property complexProperties {Array of DataProperty} 
        **/

        /**
        The DataProperties associated with this ComplexType that are not mapped to any backend datastore. These are effectively free standing
        properties.

        __readOnly__
        @property unmappedProperties {Array of DataProperty} 
        **/

        /**
        The fully qualifed name of this ComplexType.

        __readOnly__
        @property name {String} 
        **/

        /**
        The short, unqualified, name for this ComplexType.

        __readOnly__
        @property shortName {String} 
        **/

        /**
        The namespace for this ComplexType.

        __readOnly__
        @property namespace {String} 
        **/
        
        /**
        The entity level validators associated with this ComplexType. Validators can be added and
        removed from this collection.

        __readOnly__
        @property validators {Array of Validator} 
        **/


        /**
        Creates a new non-attached instance of this ComplexType.
        @method createInstance
        @param initialValues {Object} Configuration object containing initial values for the instance. 
        **/
        proto.createInstance = function (initialValues) {
            var instance = this._createInstanceCore();

            if (initialValues) {
                core.objectForEach(initialValues, function (key, value) {
                    instance.setProperty(key, value);
                });
            }

            instance.complexAspect._postInitialize();
            return instance;
        };

        proto._createInstanceCore = function (parent, parentProperty ) {
            var aCtor = this.getCtor();
            var instance = new aCtor();
            new ComplexAspect(instance, parent, parentProperty);
            if (parent) {
                instance.complexAspect._postInitialize();
            }
            return instance;
        };
        

        proto.addProperty = function (dataProperty) {
            assertParam(dataProperty, "dataProperty").isInstanceOf(DataProperty).check();
            if (this.metadataStore && ! dataProperty.isUnmapped) {
                throw new Error("The '" + this.name + "' ComplexType has already been added to a MetadataStore and therefore no additional properties may be added to it.");
            }
            if (dataProperty.parentType) {
                if (dataProperty.parentType !== this) {
                    throw new Error("This dataProperty has already been added to " + property.parentType.name);
                } else {
                    return this;
                }
            }
            this._addDataProperty(dataProperty);

            return this;
        };
        
        proto.getProperties = function () {
            return this.dataProperties;
        };       

        /**
        See  {{#crossLink "EntityType.addValidator"}}{{/crossLink}}
        @method addValidator
        @param validator {Validator} Validator to add.
        @param [property] Property to add this validator to.  If omitted, the validator is assumed to be an
        entity level validator and is added to the EntityType's 'validators'.
        **/
        
        /**
        See  {{#crossLink "EntityType.getProperty"}}{{/crossLink}}
        @method getProperty
        **/
        
        /**
        See  {{#crossLink "EntityType.getPropertyNames"}}{{/crossLink}}
        @method getPropertyNames
        **/
        
        /**
        See  {{#crossLink "EntityType.getEntityCtor"}}{{/crossLink}}
        @method getCtor
        **/

        proto.addValidator = EntityType.prototype.addValidator;
        proto.getProperty = EntityType.prototype.getProperty;
        proto.getPropertyNames = EntityType.prototype.getPropertyNames;
        proto._addDataProperty = EntityType.prototype._addDataProperty;
        proto._updateProperty = EntityType.prototype._updateProperty;
        // note the name change.
        proto.getCtor = EntityType.prototype.getEntityCtor;
        proto._setCtor = EntityType.prototype._setCtor;
        
        proto.toJSON = function () {
            return {
                name: this.name,
                shortName: this.shortName,
                namespace: this.namespace,
                dataProperties: this.dataProperties,
                validators: this.validators
            };
        };
       
        proto._fixup = function () {
            var that = this;
            this.dataProperties.forEach(function (property) {
                that._updateProperty(property);
            });
        };

        proto._$typeName = "ComplexType";

        return ctor;
    })();
    
    var DataProperty = (function () {

        /**
        A DataProperty describes the metadata for a single property of an  {{#crossLink "EntityType"}}{{/crossLink}} that contains simple data. 

        Instances of the DataProperty class are constructed automatically during Metadata retrieval. However it is also possible to construct them
        directly via the constructor.
        @class DataProperty
        **/
        
        /** 
        @example                    
            var lastNameProp = new DataProperty( {
                name: "lastName",
                dataType: DataType.String,
                isNullable: true,
                maxLength: 20
            });
            // assuming personEntityType is a newly constructed EntityType
            personEntityType.addProperty(lastNameProperty);
        @method <ctor> DataProperty
        @param config {configuration Object} 
        @param [config.name] {String}  The name of this property. 
        @param [config.nameOnServer] {String} Same as above but the name is that defined on the server.
        Either this or the 'name' above must be specified. Whichever one is specified the other will be computed using
        the NamingConvention on the MetadataStore associated with the EntityType to which this will be added.
        @param [config.dataType=DataType.String] {DataType}
        @param [config.complexTypeName] {String}
        @param [config.isNullable=true] {Boolean}
        @param [config.defaultValue] {Any}
        @param [config.isPartOfKey=false] {Boolean}
        @param [config.isUnmapped=false] {Boolean}
        @param [config.concurrencyMode] {String}
        @param [config.maxLength] {Integer} Only meaningfull for DataType.String
        @param [config.fixedLength] {Boolean} Only meaningfull for DataType.String
        @param [config.validators] {Array of Validator}
        **/
        var ctor = function(config) {
            assertConfig(config)
                .whereParam("name").isString().isOptional()
                .whereParam("nameOnServer").isString().isOptional()
                .whereParam("dataType").isEnumOf(DataType).isOptional().or().isInstanceOf(ComplexType)
                .whereParam("complexTypeName").isOptional()
                .whereParam("isNullable").isBoolean().isOptional().withDefault(true)
                .whereParam("defaultValue").isOptional()
                .whereParam("isPartOfKey").isBoolean().isOptional()
                .whereParam("isUnmapped").isBoolean().isOptional()
                .whereParam("concurrencyMode").isString().isOptional()
                .whereParam("maxLength").isNumber().isOptional()
                .whereParam("fixedLength").isBoolean().isOptional()
                .whereParam("validators").isInstanceOf(Validator).isArray().isOptional().withDefault([])
                .applyAll(this);
            var hasName = !!(this.name || this.nameOnServer);
            if (!hasName) {
                throw new Error("A DataProperty must be instantiated with either a 'name' or a 'nameOnServer' property");
            }
            
            if (this.complexTypeName) {
                this.isComplexProperty = true;
            } else if (!this.dataType) {
                this.dataType = DataType.String;
            }
            
            // == as opposed to === is deliberate here.
            if (this.defaultValue == null) {
                if (this.isNullable) {
                    this.defaultValue = null;
                } else {
                    if (this.isComplexProperty) {
                        // what to do? - shouldn't happen from EF - but otherwise ???
                    } else if (this.dataType === DataType.Binary) {
                        this.defaultValue = "AAAAAAAAJ3U="; // hack for all binary fields but value is specifically valid for timestamp fields - arbitrary valid 8 byte base64 value.
                    } else {
                        this.defaultValue = this.dataType.defaultValue;
                        if (this.defaultValue == null) {
                            throw new Error("A nonnullable DataProperty cannot have a null defaultValue. Name: " + this.name);
                        }
                    }
                }
            }
        };
        var proto = ctor.prototype;
        proto._$typeName = "DataProperty";

        /**
        The name of this property

        __readOnly__
        @property name {String}
        **/

        /**
        The parent type that this property belongs to - will be either a {{#crossLink "EntityType"}}{{/crossLink}} or a {{#crossLink "ComplexType"}}{{/crossLink}}.

        __readOnly__
        @property parentType {EntityType|ComplexType}
        **/

        /**
        The {{#crossLink "DataType"}}{{/crossLink}} of this property.

        __readOnly__
        @property dataType {DataType}
        **/

        /**
        The name of the {{#crossLink "ComplexType"}}{{/crossLink}} associated with this property; may be null. 

        __readOnly__
        @property complexTypeName {String}
        **/

        /**
        Whether the contents of this property is an instance of a {{#crossLink "ComplexType"}}{{/crossLink}}.

        __readOnly__
        @property isComplexProperty {bool}
        **/

        /**
        Whether this property is nullable. 

        __readOnly__
        @property isNullable {Boolean}
        **/

        /**
        Whether this property is a 'key' property. 

        __readOnly__
        @property isPartOfKey {Boolean}
        **/

        /**
        Whether this property is an 'unmapped' property. 

        __readOnly__
        @property isUnmapped {Boolean}
        **/

        /**
        __Describe this__

        __readOnly__
        @property concurrencyMode {String}
        **/

        /**
        The maximum length for the value of this property.

        __readOnly__
        @property maxLength {Number}
        **/

        /**
        Whether this property is of 'fixed' length or not.

        __readOnly__
        @property fixedLength {Boolean}
        **/

        /**
        The {{#crossLink "Validator"}}{{/crossLink}}s that are associated with this property. Validators can be added and
        removed from this collection.

        __readOnly__
        @property validators {Array of Validator}
        **/

        /**
        The default value for this property.

        __readOnly__
        @property defaultValue {any}
        **/

        /**
        The navigation property related to this property.  Will only be set if this is a foreign key property. 

        __readOnly__
        @property relatedNavigationProperty {NavigationProperty}
        **/
        
        /**
        Is this a DataProperty? - always true here 
        Allows polymorphic treatment of DataProperties and NavigationProperties.

        __readOnly__
        @property isDataProperty {Boolean}
        **/

        /**
        Is this a NavigationProperty? - always false here 
        Allows polymorphic treatment of DataProperties and NavigationProperties.

        __readOnly__
        @property isNavigationProperty {Boolean}
        **/

        proto.isDataProperty = true;
        proto.isNavigationProperty = false;

        proto.toJSON = function () {
            return {
                name: this.name,
                nameOnServer: this.nameOnServer,
                dataType: this.dataType.name,
                complexTypeName: this.complexTypeName,
                isNullable: this.isNullable,
                isUnmapped: this.isUnmapped,
                concurrencyMode: this.concurrencyMode,
                maxLength: this.maxLength,
                fixedLength: this.fixedLength,
                defaultValue: this.defaultValue,
                validators: this.validators,
                isPartOfKey: this.isPartOfKey
            };
        };

        ctor.fromJSON = function (json, parentEntityType) {
            
            json.dataType = DataType.fromName(json.dataType);
            json.validators = json.validators.map(function (v) {
                return Validator.fromJSON(v);
            });
            var dp = new DataProperty(json);
            parentEntityType.addProperty(dp);
            return dp;
        };

        return ctor;
    })();
  
    var NavigationProperty = (function () {

        /**
        A NavigationProperty describes the metadata for a single property of an  {{#crossLink "EntityType"}}{{/crossLink}} that return instances of other EntityTypes. 
    
        Instances of the NavigationProperty class are constructed automatically during Metadata retrieval.   However it is also possible to construct them
        directly via the constructor.
        @class NavigationProperty
        **/
        
        /** 
        @example                    
            var homeAddressProp = new NavigationProperty( {
                name: "homeAddress",
                entityTypeName: "Address:#myNamespace",
                isScalar: true,
                associationName: "address_person",
                foreignKeyNames: ["homeAddressId"]
            });
            var homeAddressIdProp = new DataProperty( {
                name: "homeAddressId"
                dataType: DataType.Integer
            });
            // assuming personEntityType is a newly constructed EntityType
            personEntityType.addProperty(homeAddressProp);
            personEntityType.addProperty(homeAddressIdProp);
        @method <ctor> NavigationProperty
        @param config {configuration Object} 
        @param [config.name] {String}  The name of this property.
        @param [config.nameOnServer] {String} Same as above but the name is that defined on the server.
        Either this or the 'name' above must be specified. Whichever one is specified the other will be computed using
        the NamingConvention on the MetadataStore associated with the EntityType to which this will be added.
        @param config.entityTypeName {String} The fully qualified name of the type of entity that this property will return.  This type
        need not yet have been created, but it will need to get added to the relevant MetadataStore before this EntityType will be 'complete'.
        The entityType name is constructed as: {shortName} + ":#" + {namespace}
        @param [config.isScalar] {Boolean}
        @param [config.associationName] {String} A name that will be used to connect the two sides of a navigation. May be omitted for unidirectional navigations.
        @param [config.foreignKeyNames] {Array of String} An array of foreign key names. The array is needed to support the possibility of multipart foreign keys.
        Most of the time this will be a single foreignKeyName in an array.
        @param [config.foreignKeyNamesOnServer] {Array of String} Same as above but the names are those defined on the server. Either this or 'foreignKeyNames' must
        be specified, if there are foreignKeys. Whichever one is specified the other will be computed using
        the NamingConvention on the MetadataStore associated with the EntityType to which this will be added.
        @param [config.validators] {Array of Validator}
        **/
        var ctor = function(config) {
            assertConfig(config)
                .whereParam("name").isString().isOptional()
                .whereParam("nameOnServer").isString().isOptional()
                .whereParam("entityTypeName").isString()
                .whereParam("isScalar").isBoolean()
                .whereParam("associationName").isString().isOptional()
                .whereParam("foreignKeyNames").isArray().isString().isOptional().withDefault([])
                .whereParam("foreignKeyNamesOnServer").isArray().isString().isOptional().withDefault([])
                .whereParam("validators").isInstanceOf(Validator).isArray().isOptional().withDefault([])
                .applyAll(this);
            var hasName = !!(this.name || this.nameOnServer);
                                                              
            if (!hasName) {
                throw new Error("A Navigation property must be instantiated with either a 'name' or a 'nameOnServer' property");
            }
        };
        var proto = ctor.prototype;
        proto._$typeName = "NavigationProperty";
        
        /**
        The {{#crossLink "EntityType"}}{{/crossLink}} that this property belongs to.
        __readOnly__
        @property parentEntityType {EntityType}
        **/

        /**
        The name of this property

        __readOnly__
        @property name {String}
        **/

        /**
        The {{#crossLink "EntityType"}}{{/crossLink}} returned by this property.

        __readOnly__
        @property entityType {EntityType}
        **/

        /**
        Whether this property returns a single entity or an array of entities.

        __readOnly__
        @property isScalar {Boolean}
        **/

        /**
        The name of the association to which that this property belongs.  This associationName will be shared with this 
        properties 'inverse'.

        __readOnly__
        @property associationName {String}
        **/

        /**
        The names of the foreign key DataProperties associated with this NavigationProperty. There will usually only be a single DataProperty associated 
        with a Navigation property except in the case of entities with multipart keys.

        __readOnly__
        @property foreignKeyNames {Array of String}
        **/

        /**
        The 'foreign key' DataProperties associated with this NavigationProperty. There will usually only be a single DataProperty associated 
        with a Navigation property except in the case of entities with multipart keys.

        __readOnly__
        @property relatedDataProperties {Array of DataProperty}
        **/

        /**
        The inverse of this NavigationProperty.  The NavigationProperty that represents a navigation in the opposite direction
        to this NavigationProperty.

        __readOnly__
        @property inverse {NavigationProperty}
        **/

        /**
        The {{#crossLink "Validator"}}{{/crossLink}}s that are associated with this property. Validators can be added and
        removed from this collection.

        __readOnly__
        @property validators {Array of Validator}
        **/

        /**
        Is this a DataProperty? - always false here 
        Allows polymorphic treatment of DataProperties and NavigationProperties.

        __readOnly__
        @property isDataProperty {Boolean}
        **/
        
        /**
        Is this a NavigationProperty? - always true here 
        Allows polymorphic treatment of DataProperties and NavigationProperties.

        __readOnly__
        @property isNavigationProperty {Boolean}
        **/
        
        proto.isDataProperty = false;
        proto.isNavigationProperty = true;

        proto.toJSON = function () {
            return {
                name: this.name,
                nameOnServer: this.nameOnServer,
                entityTypeName: this.entityTypeName,
                isScalar: this.isScalar,
                associationName: this.associationName,
                foreignKeyNames: this.foreignKeyNames,
                foreignKeyNamesOnServer: this.foreignKeyNamesOnServer,
                validators: this.validators
            };
        };

        ctor.fromJSON = function (json, parentEntityType) {
            json.validators = json.validators.map(function (v) {
                return Validator.fromJSON(v);
            });
            var np = new NavigationProperty(json);
            parentEntityType.addProperty(np);
            return np;
        };

        return ctor;
    })();
    
    var AutoGeneratedKeyType = function () {
        /**
        AutoGeneratedKeyType is an 'Enum' containing all of the valid states for an automatically generated key.
        @class AutoGeneratedKeyType
        @static
        @final
        **/
        var ctor = new Enum("AutoGeneratedKeyType");
        /**
        This entity does not have an autogenerated key. 
        The client must set the key before adding the entity to the EntityManager
        @property None {AutoGeneratedKeyType}
        @final
        @static
        **/
        ctor.None = ctor.addSymbol();
        /**
        This entity's key is an Identity column and is set by the backend database. 
        Keys for new entities will be temporary until the entities are saved at which point the keys will
        be converted to their 'real' versions.
        @property Identity {AutoGeneratedKeyType}
        @final
        @static
        **/
        ctor.Identity = ctor.addSymbol();
        /**
        This entity's key is generated by a KeyGenerator and is set by the backend database. 
        Keys for new entities will be temporary until the entities are saved at which point the keys will
        be converted to their 'real' versions.
        @property KeyGenerator {AutoGeneratedKeyType}
        @final
        @static
        **/
        ctor.KeyGenerator = ctor.addSymbol();
        ctor.seal();

        return ctor;
    }();

    // mixin methods
    var pproto = core.Param.prototype;

    pproto.isEntity = function () {
        return this._addContext({
            fn: isEntity,
            msg: " must be an entity"
        });
    };
    
    function isEntity(context, v) {
        if (v == null) return false;
        return (v.entityType !== undefined);
    }

    pproto.isEntityProperty = function() {
        return this._addContext({
            fn: isEntityProperty,
            msg: " must be either a DataProperty or a NavigationProperty"
        });
    };

    function isEntityProperty(context, v) {
        if (v == null) return false;
        return (v.isDataProperty || v.isNavigationProperty);
    }

    function isQualifiedTypeName(entityTypeName) {
        return entityTypeName.indexOf(":#") >= 0;
    }
    
    function qualifyTypeName(simpleTypeName, namespace) {
        return simpleTypeName + ":#" + namespace;
    }

    // schema is only needed for navProperty type name
    function normalizeTypeName(entityTypeName, schema) {
        if (!entityTypeName) {
            return null;
        }
        if (core.stringStartsWith(entityTypeName, MetadataStore.ANONTYPE_PREFIX)) {
            return {
                shortTypeName: entityTypeName,
                namespace: "",
                typeName: entityTypeName,
                isAnon: true
            };
        }
        var entityTypeNameNoAssembly = entityTypeName.split(",")[0];
        var nameParts = entityTypeNameNoAssembly.split(".");
        if (nameParts.length > 1) {
            
            var simpleTypeName = nameParts[nameParts.length - 1];
            //var namespace = namespaceParts.join(".");
            //if (schema) {
            //    if (namespace == schema.alias || namespace == "Edm." + schema.alias) {
            //        namespace = schema.namespace;
            //    } else if (core.stringStartsWith(namespace, "Edm.")) {
            //        namespace = namespace.substr(4);
            //    }
            //}
            var ns;
            if (schema) {
                ns = getNamespaceFor(simpleTypeName, schema);
            } else {
                var namespaceParts = nameParts.slice(0, nameParts.length - 1);
                ns = namespaceParts.join(".");
            }
            return {
                shortTypeName: simpleTypeName,
                namespace: ns,
                typeName: qualifyTypeName(simpleTypeName, ns)
            };
        } else {
            return {
                shortTypeName: entityTypeName,
                namespace: "",
                typeName: entityTypeName
            };
        }
    }
    
    function getNamespaceFor(shortName, schema) {
        var ns;
        var mapping = schema.cSpaceOSpaceMapping;
        if (mapping) {
            var fullName = mapping[schema.namespace + "." + shortName];
            ns = fullName && fullName.substr(0, fullName.length - (shortName.length + 1));
        }
        return ns || schema.namespace;
    }

    return {
        MetadataStore: MetadataStore,
        DataService: DataService,
        JsonResultsAdapter: JsonResultsAdapter,
        EntityType: EntityType,
        ComplexType: ComplexType,
        DataProperty: DataProperty,
        NavigationProperty: NavigationProperty,
        DataType: DataType,
        AutoGeneratedKeyType: AutoGeneratedKeyType,
        NamingConvention: NamingConvention
    };

})


