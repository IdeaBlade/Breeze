
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
    var Validator = m_validate.Validator;

    var Q = core.requireLib("Q", "See https://github.com/kriskowal/q ");

    // TODO: still need to handle inheritence here.

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
    var LocalQueryComparisonOptions = (function() {
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
        ctor.prototype.setAsDefault = function () {
            ctor.defaultInstance = this;
            return this;
        };


        return ctor;
    })();

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
    var NamingConvention = (function() {
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
        ctor.prototype.setAsDefault = function() {
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
            this.serviceNames = []; // array of serviceNames
            this._resourceEntityTypeMap = {}; // key is resource name - value is qualified entityType name
            this._entityTypeResourceMap = {}; // key is qualified entitytype name - value is resourceName
            this._entityTypeMap = {}; // key is qualified entitytype name - value is entityType.
            this._shortNameMap = {}; // key is shortName, value is qualified name
            this._id = __id++;
            this._typeRegistry = {};
            this._incompleteTypeMap = {};
        };
        
        ctor.prototype._$typeName = "MetadataStore";
        ctor.ANONTYPE_PREFIX = "_IB_";
        
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
        ctor.prototype.exportMetadata = function () {
            var result = JSON.stringify(this, function (key, value) {
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
        ctor.prototype.importMetadata = function (exportedString) {
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
            var entityTypeMap = {};
            var that = this;
            core.objectForEach(json._entityTypeMap, function (key, value) {
                var et = EntityType.fromJSON(value, that);
                entityTypeMap[key] = et;
            });
            json._entityTypeMap = entityTypeMap;
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
        ctor.prototype.hasMetadataFor = function (serviceName) {
            assertParam(serviceName, "serviceName").isString().check();
            if (serviceName.substr(-1) !== "/") {
                serviceName = serviceName + '/';
            }
            return this.serviceNames.indexOf(serviceName) >= 0;
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
        @param serviceName {String}  The service name to fetch metadata for.
        @param [dataServiceAdapterName] {String} - name of a dataService adapter - will default to a default dataService adapter
        @param [callback] {Function} Function called on success.
        
            successFunction([data])
            @param [callback.data] {rawMetadata} 
  
        @param [errorCallback] {Function} Function called on failure.

            failureFunction([error])
            @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.

        @return {Promise} Promise
        **/
        ctor.prototype.fetchMetadata = function (serviceName, dataServiceAdapterName, callback, errorCallback) {
            assertParam(serviceName, "serviceName").isString().check();
            assertParam(dataServiceAdapterName, "dataServiceAdapterName").isOptional().isString();
            assertParam(callback, "callback").isFunction().isOptional().check();
            assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();
            
            if (serviceName.substr(-1) !== "/") {
                serviceName = serviceName + '/';
            }
            
            if (this.hasMetadataFor(serviceName)) {
                throw new Error("Metadata for a specific serviceName may only be fetched once per MetadataStore. ServiceName: " + serviceName);
            }
            
            var dataServiceInstance = a_config.getAdapterInstance("dataService", dataServiceAdapterName);

            var deferred = Q.defer();
            dataServiceInstance.fetchMetadata(this, serviceName, deferred.resolve, deferred.reject);
            var that = this;
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
        ctor.prototype.trackUnmappedType = function (entityCtor, interceptor) {
            assertParam(entityCtor, "entityCtor").isFunction().check();
            assertParam(interceptor, "interceptor").isFunction().isOptional().check();
            // TODO: think about adding this to the MetadataStore.
            var entityType = new EntityType(this);
            entityType._setEntityCtor(entityCtor, interceptor);
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
        @param entityTypeName {String} The name of the EntityType
        @param entityCtor {Function}  The constructor for this EntityType.
        @param [initializationFn] {Function} A function or the name of a function on the entity that is to be executed immediately after the entity has been created.
            
        initializationFn(entity)
        @param initializationFn.entity {Entity} The entity being created or materialized.
        **/
        ctor.prototype.registerEntityTypeCtor = function (entityTypeName, entityCtor, initializationFn) {
            assertParam(entityTypeName, "entityTypeName").isString().check();
            assertParam(entityCtor, "entityCtor").isFunction().check();
            assertParam(initializationFn, "initializationFn").isOptional().isFunction().or().isString().check();
            var qualifiedTypeName = getQualifiedTypeName(this, entityTypeName, false);
            var typeName;
            if (qualifiedTypeName) {
                var entityType = this._entityTypeMap[qualifiedTypeName];
                if (entityType) {
                    entityType._setEntityCtor(entityCtor);
                }
                typeName = qualifiedTypeName;
            } else {
                typeName = entityTypeName;
            }
            entityCtor.prototype._$typeName = typeName;
            this._typeRegistry[typeName] = entityCtor;
            if (initializationFn) {
                entityCtor._$initializationFn = initializationFn;
            }
        };
      

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
        ctor.prototype.isEmpty = function () {
            return this.serviceNames.length === 0;
        };


        /**
        Returns an  {{#crossLink "EntityType"}}{{/crossLink}} given its name.
        @example
            // assume em1 is a preexisting EntityManager
            var odType = em1.metadataStore.getEntityType("OrderDetail");
        or to throw an error if the type is not found
        @example
            var badType = em1.metadataStore.getEntityType("Foo", false);
            // badType will not get set and an exception will be thrown.
        @method getEntityType
        @param entityTypeName {String}  Either the fully qualified name or a short name may be used. If a short name is specified and multiple types share
        that same short name an exception will be thrown. 
        @param [okIfNotFound=false] {Boolean} Whether to throw an error if the specified EntityType is not found.
        @return {EntityType} The EntityType or 'undefined' if not not found.
        **/
        ctor.prototype.getEntityType = function (entityTypeName, okIfNotFound) {
            assertParam(entityTypeName, "entityTypeName").isString().check();
            assertParam(okIfNotFound, "okIfNotFound").isBoolean().isOptional().check(false);
            var qualTypeName = getQualifiedTypeName(this, entityTypeName, false);
            var entityType = this._entityTypeMap[qualTypeName];
            if (!entityType) {
                if (okIfNotFound) return null;
                throw new Error("Unable to locate an 'EntityType' by the name: " + entityTypeName);
            }
            if (entityType.length) {
                var entityTypeNames = entityType.join(",");
                throw new Error("There are multiple entity types with this 'shortName': " + entityTypeNames);
            }
            return entityType;
        };

        /**
        Returns an array containing all of the  {{#crossLink "EntityType"}}{{/crossLink}}s in this MetadataStore.
        @example
            // assume em1 is a preexisting EntityManager
            var allTypes = em1.metadataStore.getEntityTypes();
        @method getEntityTypes
        @return {Array of EntityType}
        **/
        ctor.prototype.getEntityTypes = function () {
            var entityTypes = [];
            for (var key in this._entityTypeMap) {
                var value = this._entityTypeMap[key];
                // skip 'shortName' entries
                if (key === value.name) {
                    entityTypes.push(this._entityTypeMap[key]);
                }
            }
            return entityTypes;
        };

        ctor.prototype.getIncompleteNavigationProperties = function() {
            return core.objectMapToArray(this._entityTypeMap, function(key, value) {
                var badProps = value.navigationProperties.filter(function(np) {
                    return !np.entityType;
                });
                return badProps.length === 0 ? null : badProps;
            });
        };


        /*
        INTERNAL FOR NOW
        Returns a fully qualified entityTypeName for a specified resource name.  The reverse of this operation
        can be obtained via the  {{#crossLink "EntityType"}}{{/crossLink}} 'defaultResourceName' property
        @method getEntityTypeNameForResourceName
        @param resourceName {String}
        */
        ctor.prototype._getEntityTypeNameForResourceName = function (resourceName) {
            assertParam(resourceName, "resourceName").isString().check();
            // return this._resourceEntityTypeMap[resourceName.toLowerCase()];
            return this._resourceEntityTypeMap[resourceName];
        };

        /*
        INTERNAL FOR NOW
        Associates a resourceName with an entityType. 

        This method is only needed in those cases where multiple resources return the same
        entityType.  In this case Metadata discovery will only determine a single resource name for 
        each entityType.
        @method setEntityTypeForResourceName
        @param resourceName {String}
        @param entityTypeOrName {EntityType|String} If passing a string either the fully qualified name or a short name may be used. If a short name is specified and multiple types share
        that same short name an exception will be thrown. If the entityType has not yet been discovered then a fully qualified name must be used.
        */
        ctor.prototype._setEntityTypeForResourceName = function (resourceName, entityTypeOrName) {
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

       
        ctor.prototype._checkEntityType = function(entity) {
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
       
        ctor.prototype._registerEntityType = function (entityType) {
            this._entityTypeMap[entityType.name] = entityType;
            this._shortNameMap[entityType.shortName] = entityType.name;
            // in case resourceName was registered before this point
            var resourceName = this._entityTypeResourceMap[entityType.name];
            if (resourceName) {
                entityType.defaultResourceName = resourceName;
            }
        };

        ctor.prototype._parseODataMetadata = function (serviceName, schemas) {
            this.serviceNames.push(serviceName);
            var that = this;
            toArray(schemas).forEach(function (schema) {
                if (schema.entityContainer) {
                    toArray(schema.entityContainer).forEach(function (container) {
                        toArray(container.entitySet).forEach(function (entitySet) {
                            var entityTypeName = normalizeTypeName(entitySet.entityType, schema).typeName;
                            that._setEntityTypeForResourceName(entitySet.name, entityTypeName);
                        });
                    });
                }
                if (schema.entityType) {
                    toArray(schema.entityType).forEach(function (et) {
                        var entityType = convertFromODataEntityType(et, schema, that, serviceName);

                        // check if this entityTypeName, short version or qualified version has a registered ctor.
                        var entityCtor = that._typeRegistry[entityType.name] || that._typeRegistry[entityType.shortName];
                        if (entityCtor) {
                             // next line is in case the entityType was originally registered with a shortname.
                             entityCtor.prototype._$typeName = entityType.name; 
                             entityType._setEntityCtor(entityCtor);
                             that._entityTypeMap[entityType.name] = entityType;
                        }
                            
                    });
                }
            });
            var badNavProps = this.getIncompleteNavigationProperties();
            if (badNavProps.length > 0) {
                throw new Error("Bad nav properties");
            }
        };

        function getQualifiedTypeName(metadataStore, entityTypeName, throwIfNotFound) {
            if (isQualifiedTypeName(entityTypeName)) return entityTypeName;
            var result = metadataStore._shortNameMap[entityTypeName];
            if (!result && throwIfNotFound) {
                throw new Error("Unable to locate 'entityTypeName' of: " + entityTypeName);
            }
            return result;
        }

        function convertFromODataEntityType(odataEntityType, schema, metadataStore, serviceName) {
            var shortName = odataEntityType.name;
            var namespace = translateNamespace(schema, schema.namespace);
            var entityType = new EntityType({
                metadataStore: metadataStore,
                shortName: shortName,
                namespace: namespace,
                serviceName: serviceName
            });
            var keyNamesOnServer = toArray(odataEntityType.key.propertyRef).map(core.pluck("name"));
            toArray(odataEntityType.property).forEach(function (prop) {
                convertFromOdataDataProperty(entityType, prop, keyNamesOnServer);
            });
            
            toArray(odataEntityType.navigationProperty).forEach(function (prop) {
                convertFromOdataNavProperty(entityType, prop, schema);
            });
            
            return entityType;
        }


        function convertFromOdataDataProperty(entityType, odataProperty, keyNamesOnServer) {
            var dataType = DataType.toDataType(odataProperty.type);
            var isNullable = odataProperty.nullable === 'true' || odataProperty.nullable == null;
            var fixedLength = odataProperty.fixedLength ? odataProperty.fixedLength === true : undefined;
            var isPartOfKey = keyNamesOnServer.indexOf(odataProperty.name) >= 0;
            if (entityType.autoGeneratedKeyType == AutoGeneratedKeyType.None) {
                if (isIdentityProperty(odataProperty)) {
                    entityType.autoGeneratedKeyType = AutoGeneratedKeyType.Identity;
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
            
            entityType.addProperty(dp);
            addValidators(dp);
            
            return dp;
        }

        function addValidators(dataProperty) {

            var typeValidator;
            if (!dataProperty.isNullable) {
                dataProperty.validators.push(Validator.required());
            }
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

        function convertFromOdataNavProperty(entityType, odataProperty, schema) {
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

    var EntityType = (function () {
        /**
        Container for all of the metadata about a specific type of Entity.
        @class EntityType
        **/
        var __nextAnonIx = 0;
        

        /** 
        @example                    
            var entityManager = new EntityType( {
                metadataStore: myMetadataStore,
                serviceName: "api/NorthwindIBModel",
                name: "person",
                namespace: "myAppNamespace"
             });
        @method <ctor> EntityType
        @param config {Object|MetadataStore} Configuration settings or a MetadataStore.  If this parameter is just a MetadataStore
        then what will be created is an 'anonymous' type that will never be communicated to or from the server. It is purely for
        client side use and will be given an automatically generated name. Normally, however, you will use a configuration object.
        @param config.metadataStore  {MetadataStore} The MetadataStore that will contain this EntityType.
        @param config.serviceName {String} 
        @param config.shortName {String}
        @param [config.namespace=""] {String}
        @param [config.defaultResourceName] {String}
        **/
        var ctor = function (config) {
            if (arguments.length > 1) {
                throw new Error("The EntityType ctor has a single argument that is either a 'MetadataStore' or a configuration object.");
            }
            if  (config._$typeName === "MetadataStore") {
                this.metadataStore = config;
                this.shortName = "Anon_" + ++__nextAnonIx;
                this.namespace = "";
                this.serviceName = null;
            } else {
                assertConfig(config)
                    .whereParam("metadataStore").isInstanceOf(MetadataStore)
                    .whereParam("shortName").isNonEmptyString()
                    .whereParam("namespace").isString().isOptional().withDefault("")
                    .whereParam("serviceName").isString()
                    .whereParam("defaultResourceName").isNonEmptyString().isOptional().withDefault(null)
                    .applyAll(this);
                if (this.serviceName.substr(-1) !== "/") {
                    this.serviceName = this.serviceName + '/';
                }
            }

            this.name = this.shortName + ":#" + this.namespace;
            
            // the defaultResourceName may also be set up either via metadata lookup or first query or via the 'setProperties' method

            var metadataStore = this.metadataStore;
            // don't register anon types
            if (this.serviceName) {
                metadataStore._registerEntityType(this);
            }
            var incompleteMap = metadataStore._incompleteTypeMap[this.name];
            var that = this;
            if (incompleteMap) {
                core.objectForEach(incompleteMap, function (key, value) {
                    value.entityType = that;
                    // I think this is allowed per the spec. i.e. within an outer loop
                    delete incompleteMap[key];
                });
                if (core.isEmpty(incompleteMap)) {
                    delete metadataStore._incompleteTypeMap[that.name];
                }
            }
            this.dataProperties = [];
            this.navigationProperties = [];
            this.keyProperties = [];
            this.foreignKeyProperties = [];
            this.concurrencyProperties = [];
            this.unmappedProperties = []; // will be updated later.
            this.autoGeneratedKeyType = AutoGeneratedKeyType.None;
            this.validators = [];
            this._mappedPropertiesCount = 0;
            
        };
        
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
            

        ctor.prototype._$typeName = "EntityType";

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
        ctor.prototype.setProperties = function (config) {
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
        ctor.prototype.addProperty = function (property) {
            assertParam(property, "dataProperty").isInstanceOf(DataProperty).or().isInstanceOf(NavigationProperty);
            if (this._$initialized && !property.isUnmapped) {
                throw new Error("This EntityType has been 'completed' and is no longer open for additional properties");
            }
            property._completeInitialization(this);
            if (!property.isUnmapped) {
                this._mappedPropertiesCount++;
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
        @return {Entity} The new entity.
        **/
        ctor.prototype.createEntity = function () {
            return this._createEntity(false);
        };

        ctor.prototype._createEntity = function(deferInitialization) {
            var entityCtor = this.getEntityCtor();
            var instance = new entityCtor();
            new EntityAspect(instance, deferInitialization);
            return instance;
        };

        /**
        Returns the constructor for this EntityType.
        @method getEntityCtor
        @return {Function} The constructor for this EntityType.
        **/
        ctor.prototype.getEntityCtor = function () {
            if (this._entityCtor) return this._entityCtor;
            var typeRegistry = this.metadataStore._typeRegistry;
            var entityCtor = typeRegistry[this.name] || typeRegistry[this.shortName];
            if (!entityCtor) {
                var createCtor = v_modelLibraryDef.defaultInstance.createCtor;
                if (createCtor) {
                    entityCtor = createCtor(this);
                } else {
                    entityCtor = function() {
                    };
                }
            }
            this._setEntityCtor(entityCtor);
            return entityCtor;
        };

        // May make public later.
        ctor.prototype._setEntityCtor = function (entityCtor, interceptor) {
            var instance = new entityCtor();

            // insure that all of the properties are on the 'template' instance before watching the class.
            calcUnmappedProperties(this, instance);

            var proto = entityCtor.prototype;
            proto.entityType = this;

            if (interceptor) {
                proto._$interceptor = interceptor;
            } else {
                proto._$interceptor = defaultPropertyInterceptor;
            }

            v_modelLibraryDef.defaultInstance.initializeEntityPrototype(proto);

            this._entityCtor = entityCtor;
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
        ctor.prototype.addValidator = function (validator, property) {
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
        ctor.prototype.getProperties = function () {
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
        ctor.prototype.getPropertyNames = function () {
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
        ctor.prototype.getDataProperty = function (propertyName, isServerName) {
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
        ctor.prototype.getNavigationProperty = function (propertyName, isServerName) {
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
        ctor.prototype.getProperty = function (propertyPath, throwIfNotFound) {
            throwIfNotFound = throwIfNotFound || false;
            var propertyNames = (Array.isArray(propertyPath)) ? propertyPath : propertyPath.trim().split('.');
            var propertyName = propertyNames[0];
            if (propertyNames.length === 1) {
                var prop = core.arrayFirst(this.getProperties(), core.propEq("name", propertyName));

                if (prop) {
                    return prop;
                } else if (throwIfNotFound) {
                    throw new Error("unable to locate property: " + propertyName + " on entityType: " + this.name);
                } else {
                    return null;
                }
            } else {
                var navProp = this.getNavigationProperty(propertyName);
                if (!navProp) {
                    if (throwIfNotFound) {
                        throw new Error("unable to locate navigation property: " + propertyName + " on entityType: " + this.name);
                    } else {
                        return null;
                    }
                }
                propertyNames.shift();
                var nextEntityType = navProp.entityType;
                return nextEntityType.getProperty(propertyNames, throwIfNotFound);
            }
        };

        /**
        Returns a string representation of this EntityType.
        @method toString
        @return {String}
        **/
        ctor.prototype.toString = function () {
            return this.name;
        };

        ctor.prototype.toJSON = function () {
            return {
                name: this.name,
                shortName: this.shortName,
                namespace: this.namespace,
                serviceName: this.serviceName,
                defaultResourceName: this.defaultResourceName,
                dataProperties: this.dataProperties,
                navigationProperties: this.navigationProperties,
                autoGeneratedKeyType: this.autoGeneratedKeyType.name,
                validators: this.validators
            };
        };

        // TODO: haven't yet handled _entityCtor.
        ctor.fromJSON = function (json, metadataStore) {
            var et = metadataStore.getEntityType(json.name, true);
            if (et) return et;
            et = new EntityType({
                metadataStore: metadataStore,
                shortName: json.shortName,
                namespace: json.namespace,
                serviceName: json.serviceName
            });
                
            json.autoGeneratedKeyType = AutoGeneratedKeyType.fromName(json.autoGeneratedKeyType);
            json.validators = json.validators.map(function (v) {
                return Validator.fromJSON(v);
            });
            json.dataProperties = json.dataProperties.map(function (dp) {
                return DataProperty.fromJSON(dp, et);
            });
            json.navigationProperties = json.navigationProperties.map(function (dp) {
                return NavigationProperty.fromJSON(dp, et);
            });
            et = core.extend(et, json);
            return et;
        };
        
        ctor.prototype._clientPropertyPathToServer = function (propertyPath) {
            var fn = this.metadataStore.namingConvention.clientPropertyNameToServer;
            var that = this;
            var serverPropPath = propertyPath.split(".").map(function (propName) {
                var prop = that.getProperty(propName);
                return fn(propName, prop);
            }).join("/");
            return serverPropPath;
        };

        ctor.prototype._clientObjectToServer = function (clientObject) {
            var fn = this.metadataStore.namingConvention.clientPropertyNameToServer;
            var result = {};
            var that = this;
            core.objectForEach(clientObject, function (propName, value) {
                var prop = that.getProperty(propName);
                result[fn(propName, prop)] = value;
            });
            return result;
        };

        ctor.prototype._updatePropertyNames = function (property) {
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
        };

        ctor._getNormalizedTypeName = core.memoize(function (rawTypeName) {
            return rawTypeName && normalizeTypeName(rawTypeName).typeName;
        });
        // for debugging use the line below instead.
        //ctor._getNormalizedTypeName = function (rawTypeName) { return normalizeTypeName(rawTypeName).typeName; };

        ctor.prototype._checkNavProperty = function (navigationProperty) {
            if (navigationProperty.isNavigationProperty) {
                if (navigationProperty.parentEntityType != this) {
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
        
        function calcUnmappedProperties(entityType, instance) {
            var metadataPropNames = entityType.getPropertyNames();
            var trackablePropNames = v_modelLibraryDef.defaultInstance.getTrackablePropertyNames(instance);
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
        @param [config.isNullable=false] {Boolean}
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
                .whereParam("dataType").isEnumOf(DataType).isOptional().withDefault(DataType.String)
                .whereParam("isNullable").isBoolean().isOptional().withDefault(false)
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
        };
        
        ctor.prototype._completeInitialization = function (parentEntityType) {
            if (this.parentEntityType) {
                if (this.parentEntityType !== parentEntityType) {
                    throw new Error("This dataProperty has already been added to " + this.parentEntityType.name);
                } else {
                    return;
                }
            }
            this.parentEntityType = parentEntityType;
            parentEntityType._updatePropertyNames(this);

            if (this.defaultValue === undefined) {
                this.defaultValue = this.isNullable ? null : this.dataType.defaultValue;
            } else if (this.defaultValue === null && !this.isNullable) {
                throw new Error("A nonnullable DataProperty cannot have a null defaultValue. Name: " + this.name);
            }
            parentEntityType.dataProperties.push(this);
            
            if (this.isPartOfKey) {
                parentEntityType.keyProperties.push(this);
            };
            
            if (this.concurrencyMode && this.concurrencyMode !== "None") {
                parentEntityType.concurrencyProperties.push(this);
            };

            if (this.isUnmapped) {
                parentEntityType.unmappedProperties.push(this);
            }

            // sets this.relatedNavigationProperty - this will be set for all foreignKey data properties.
            this.parentEntityType.navigationProperties.forEach(function (np) {
                np._resolveFks();
            });
            
        };
        
        ctor.prototype._$typeName = "DataProperty";

        /**
        The name of this property

        __readOnly__
        @property name {String}
        **/

        /**
        The {{#crossLink "EntityType"}}{{/crossLink}} that this property belongs to.

        __readOnly__
        @property parentEntityType {EntityType}
        **/

        /**
        The {{#crossLink "DataType"}}{{/crossLink}} of this property.

        __readOnly__
        @property dataType {DataType}
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

        ctor.prototype.isDataProperty = true;
        ctor.prototype.isNavigationProperty = false;

        ctor.prototype.toJSON = function () {
            return {
                name: this.name,
                nameOnServer: this.nameOnServer,
                dataType: this.dataType.name,
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
                dataType: DataType.Integer,
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
        
        ctor.prototype._$typeName = "NavigationProperty";
        
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
        
        ctor.prototype.isDataProperty = false;
        ctor.prototype.isNavigationProperty = true;

        ctor.prototype.toJSON = function () {
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
        
        ctor.prototype._completeInitialization = function (parentEntityType) {
            if (this.parentEntityType) {
                if (this.parentEntityType !== parentEntityType) {
                    throw new Error("This dataProperty has already been added to " + this.parentEntityType.name);
                } else {
                    return;
                }
            }
            if (!isQualifiedTypeName(this.entityTypeName)) {
                this.entityTypeName = qualifyTypeName(this.entityTypeName, parentEntityType.namespace)
            }
            this.parentEntityType = parentEntityType;
            parentEntityType._updatePropertyNames(this);
            parentEntityType.navigationProperties.push(this);
            // set this.relatedDataProperties and dataProperty.relatedNavigationPropery to this
            this._resolveFks();

            // Tries to set - these two may get set later
            // this.inverse
            // this.entityType
            updateCrossEntityRelationship(this);
        };
        
        ctor.prototype._resolveFks = function () {
            var np = this;
            if (np.foreignKeyProperties) return;
            var fkProps = getFkProps(np);
            // returns null if can't yet finish
            if (!fkProps) return;

            fkProps.forEach(function (dp) {
                dp.relatedNavigationProperty = np;
                np.parentEntityType.foreignKeyProperties.push(dp);
                if (np.relatedDataProperties) {
                    np.relatedDataProperties.push(dp);
                } else {
                    np.relatedDataProperties = [dp];
                }
            });
        };
        
        function updateCrossEntityRelationship(np) {
            var metadataStore = np.parentEntityType.metadataStore;
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
                var assocMap = {};
                incompleteTypeMap[np.entityTypeName] = assocMap;
                assocMap[np.associationName] = np;
            }

            var altAssocMap = incompleteTypeMap[np.parentEntityType.name];
            if (!altAssocMap) {
                altAssocMap = {};
                incompleteTypeMap[np.parentEntityType.name] = altAssocMap;
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
                    inverse.entityType = np.parentEntityType;
                }
                var altAssocMap = incompleteTypeMap[np.parentEntityType.name];
                if (altAssocMap) {
                    delete altAssocMap[np.associationName];
                    if (core.isEmpty(altAssocMap)) {
                        delete incompleteTypeMap[np.parentEntityType.name];
                    }
                }
            }
        }

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
            var parentEntityType = np.parentEntityType;
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

    core.Param.prototype.isEntity = function () {
        var result = function (that, v) {
            if (v == null) return false;
            return (v.entityType !== undefined);
        };
        result.getMessage = function () {
            return " must be an entity";
        };
        return this.compose(result);
    };

    core.Param.prototype.isEntityProperty = function () {
        var result = function (that, v) {
            if (v == null) return false;
            return (v.isDataProperty || v.isNavigationProperty);
        };
        result.getMessage = function () {
            return " must be either a DataProperty or a NavigationProperty";
        };
        return this.compose(result);
    };

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
            var namespaceParts = nameParts.slice(0, nameParts.length - 1);
            var simpleTypeName = nameParts[nameParts.length - 1];
            var namespace = namespaceParts.join(".");
            if (schema) {
                if (namespace == schema.alias || namespace == "Edm." + schema.alias) {
                    namespace = schema.namespace;
                } else if (core.stringStartsWith(namespace, "Edm.")) {
                    namespace = namespace.substr(4);
                }
            }
            if (schema) {
                namespace = translateNamespace(schema, namespace);
            }
            return {
                shortTypeName: simpleTypeName,
                namespace: namespace,
                typeName: qualifyTypeName(simpleTypeName, namespace)
            };
        } else {
            return {
                shortTypeName: entityTypeName,
                namespace: "",
                typeName: entityTypeName
            };
        }
    }

    // needed for Edmx models where the embedded ns is different from the clr namespace.
    function translateNamespace(schema, namespace) {
        var clrNamespace = schema.clrNamespace;
        if (!clrNamespace) return namespace;
        if (namespace === schema.namespace) {
            return clrNamespace;
        } else {
            return namespace;
        }
    }

    return {
        MetadataStore: MetadataStore,
        EntityType: EntityType,
        DataProperty: DataProperty,
        NavigationProperty: NavigationProperty,
        DataType: DataType,
        AutoGeneratedKeyType: AutoGeneratedKeyType,
        NamingConvention: NamingConvention
    };

})


