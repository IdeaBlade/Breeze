/**
@module breeze
**/

var Q = __requireLib("Q", "See https://github.com/kriskowal/q ");

// TODO: still need to handle inheritence here.
             
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
            serviceName: "breeze/NorthwindIBModel", 
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
        this._structuralTypeMap = {}; // key is qualified structuraltype name - value is structuralType. ( structural = entityType or complexType).
        this._shortNameMap = {}; // key is shortName, value is qualified name - does not need to be serialized.
        this._ctorRegistry = {}; // key is either short or qual type name - value is ctor;
        this._incompleteTypeMap = {}; // key is entityTypeName; value is array of nav props
        this._incompleteComplexTypeMap = {}; // key is complexTypeName; value is array of complexType props
        this._id = __id++;
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
        
    proto.addDataService = function(dataService, shouldOverwrite) {
        assertParam(dataService, "dataService").isInstanceOf(DataService).check();
        assertParam(shouldOverwrite, "shouldOverwrite").isBoolean().isOptional().check();
        var ix = this._getDataServiceIndex(dataService.serviceName);
        if (ix >= 0) {
            if (!!shouldOverwrite) {
                this.dataServices[ix] = dataService;
            } else {
                throw new Error("A dataService with this name '" + dataService.serviceName + "' already exists in this MetadataStore");
            }
        } else {
            this.dataServices.push(dataService);
        }
    };

    proto._getDataServiceIndex = function (serviceName) {
        return __arrayIndexOf(this.dataServices, function(ds) {
            return ds.serviceName === serviceName;
        });
    };

    /**
    Adds an EntityType to this MetadataStore.  No additional properties may be added to the EntityType after its has
    been added to the MetadataStore.
    @method addEntityType
    @param structuralType {EntityType|ComplexType} The EntityType or ComplexType to add
    **/
    proto.addEntityType = function (structuralType) {
        if (!(structuralType instanceof EntityType || structuralType instanceof ComplexType)) {
            structuralType = structuralType.isComplexType ? new ComplexType(structuralType) : new EntityType(structuralType);
        }

        if (!structuralType.isComplexType) {
            if (structuralType.keyProperties.length === 0) {
                throw new Error("Unable to add " + structuralType.name +
                    " to this MetadataStore.  An EntityType must have at least one property designated as a key property - See the 'DataProperty.isPartOfKey' property.");
            }
        }

        structuralType.metadataStore = this;
        // don't register anon types
        if (!structuralType.isAnonymous) {
            this._structuralTypeMap[structuralType.name] = structuralType;
            this._shortNameMap[structuralType.shortName] = structuralType.name;
        }

        
        structuralType.getProperties().forEach(function (property) {
            structuralType._updateNames(property);
            if (!property.isUnmapped) {
                structuralType._mappedPropertiesCount++;
            }
        });

        structuralType._updateCps();

        if (!structuralType.isComplexType) {
            structuralType._updateNps();
            // give the type it's base's resource name if it doesn't have its own.
            var defResourceName = structuralType.defaultResourceName || (structuralType.baseEntityType && structuralType.baseEntityType.defaultResourceName);
            if (defResourceName && !this.getEntityTypeNameForResourceName(defResourceName)) {
                this.setEntityTypeForResourceName(defResourceName, structuralType.name);
            }
            structuralType.defaultResourceName = defResourceName;
            // check if this structural type's name, short version or qualified version has a registered ctor.
            structuralType.getEntityCtor();
        } 

        if (structuralType.baseEntityType) {
            structuralType.baseEntityType.subtypes.push(structuralType);
        }
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
        var result = JSON.stringify({
            "metadataVersion": breeze.metadataVersion,
            "namingConvention": this.namingConvention.name,
            "localQueryComparisonOptions": this.localQueryComparisonOptions.name,
            "dataServices": this.dataServices,
            "structuralTypes": __objectMapToArray(this._structuralTypeMap),
            "resourceEntityTypeMap": this._resourceEntityTypeMap
        }, __config.stringifyPad);
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
    @param exportedMetadata {String|JSON Object} A previously exported MetadataStore.
    @return {MetadataStore} This MetadataStore.
    @chainable
    **/
    proto.importMetadata = function (exportedMetadata) {

        this._deferredTypes = {};
        var json = (typeof (exportedMetadata) === "string") ? JSON.parse(exportedMetadata) : exportedMetadata;

        if (json.schema) {
            return CsdlMetadataParser.parse(this, json.schema);
        } 

        if (json.metadataVersion && json.metadataVersion !== breeze.metadataVersion) {
            var msg = __formatString("Cannot import metadata with a different 'metadataVersion' (%1) than the current 'breeze.metadataVersion' (%2) ",
                json.metadataVersion, breeze.metadataVersion);
            throw new Error(msg);
        }

        var ncName = json.namingConvention;
        var lqcoName = json.localQueryComparisonOptions;
        if (this.isEmpty()) {
            this.namingConvention = __config._fetchObject(NamingConvention, ncName) || NamingConvention.defaultInstance;
            this.localQueryComparisonOptions = __config._fetchObject(LocalQueryComparisonOptions, lqcoName) || LocalQueryComparisonOptions.defaultInstance;
        } else {
            if (ncName && this.namingConvention.name !== ncName) {
                throw new Error("Cannot import metadata with a different 'namingConvention' from the current MetadataStore");
            }
            if (lqcoName && this.localQueryComparisonOptions.name !== lqcoName) {
                throw new Error("Cannot import metadata with different 'localQueryComparisonOptions' from the current MetadataStore");
            }
        }
        
        var that = this;

        //noinspection JSHint
        json.dataServices && json.dataServices.forEach(function (ds) {
            ds = DataService.fromJSON(ds);
            that.addDataService(ds, true);
        });
        var structuralTypeMap = this._structuralTypeMap;
        
        json.structuralTypes.forEach(function (stype) {
            var structuralType = structuralTypeFromJson(that, stype);
            structuralTypeMap[structuralType.name] = structuralType;
        });
        __extend(this._resourceEntityTypeMap, json.resourceEntityTypeMap);
        __extend(this._incompleteTypeMap, json.incompleteTypeMap);
       
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
        if (!em1.metadataStore.hasMetadataFor("breeze/NorthwindIBModel"))) {
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
        var ds = em1.metadataStore.getDataService("breeze/NorthwindIBModel");
        var adapterName = ds.adapterName; // may be null
           
    @method getDataService
    @param serviceName {String} The service name.
    @return {Boolean}
    **/
    proto.getDataService = function (serviceName) {
        assertParam(serviceName, "serviceName").isString().check();

        serviceName = DataService._normalizeServiceName(serviceName);
        return __arrayFirst(this.dataServices, function (ds) {
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
        ms.fetchMetadata("breeze/NorthwindIBModel")
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

        dataService = DataService.resolve([dataService]);
           
        if (this.hasMetadataFor(dataService.serviceName)) {
            throw new Error("Metadata for a specific serviceName may only be fetched once per MetadataStore. ServiceName: " + dataService.serviceName);
        }

        return dataService.adapterInstance.fetchMetadata(this, dataService).then(function (rawMetadata) {
            if (callback) callback(rawMetadata);
            return Q.resolve(rawMetadata);
        }).fail(function (error) {
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
        
        var qualifiedTypeName = getQualifiedTypeName(this, structuralTypeName, false);
        var typeName = qualifiedTypeName || structuralTypeName;
            
        this._ctorRegistry[typeName] = { ctor: aCtor, initFn: initializationFn };
        if (qualifiedTypeName) {
            var stype = this._structuralTypeMap[qualifiedTypeName];
            stype && stype.getCtor(true); // this will complete the registration if avail now.
        }
        
    };
    
    proto.toQueryString = function(query) {
        if (!query) {
            throw new Error("query cannot be empty");
        }
        if (typeof query === 'string') {
            return query;
        } else if (query instanceof EntityQuery) {
            return query._toUri(this);
        } else {
            throw new Error("unable to recognize query parameter as either a string or an EntityQuery");
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
    proto.isEmpty = function () {
        return __isEmpty(this._structuralTypeMap);
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
        return this._getEntityType(structuralTypeName, okIfNotFound);
    };

    proto._getEntityType = function(typeName, okIfNotFound) {
        var qualTypeName = getQualifiedTypeName(this, typeName, false);
        var type = this._structuralTypeMap[qualTypeName];
        if (!type) {
            if (okIfNotFound) return null;
            var msg = __formatString("Unable to locate a 'Type' by the name: '%1'. Be sure to execute a query or call fetchMetadata first.", typeName);
            throw new Error(msg);
            
        }
        if (type.length) {
            var typeNames = type.join(",");
            throw new Error("There are multiple types with this 'shortName': " + typeNames);
        }
        return type;
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

    proto.getIncompleteNavigationProperties = function () {
        return __objectMapToArray(this._incompleteTypeMap, function (key, value) {
            return value;
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
        
        var entityTypeName;
        if (entityTypeOrName instanceof EntityType) {
            entityTypeName = entityTypeOrName.name;
        } else {
            entityTypeName = getQualifiedTypeName(this, entityTypeOrName, true);
        }

        this._resourceEntityTypeMap[resourceName] = entityTypeName;
        var entityType = this._getEntityType(entityTypeName, true);
        if (entityType && !entityType.defaultResourceName) {
            entityType.defaultResourceName = resourceName;
        }
    };

    // protected methods

    proto._checkEntityType = function(entity) {
        if (entity.entityType) return;
        var typeName = entity.prototype._$typeName;
        if (!typeName) {
            throw new Error("This entity has not been registered. See the MetadataStore.registerEntityTypeCtor method");
        }
        var entityType = this._getEntityType(typeName);
        if (entityType) {
            entity.entityType = entityType;
        }
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

    function structuralTypeFromJson(metadataStore, json) {
        var typeName = qualifyTypeName(json.shortName, json.namespace);
        var stype = metadataStore._getEntityType(typeName, true);
        if (stype) return stype;
        var config = {
            shortName: json.shortName,
            namespace: json.namespace,
            isAbstract: json.isAbstract,
            autoGeneratedKeyType: AutoGeneratedKeyType.fromName(json.autoGeneratedKeyType),
            defaultResourceName: json.defaultResourceName
        };

        stype = json.isComplexType ? new ComplexType(config) : new EntityType(config);
        
        // baseType may not have been imported yet so we need to defer handling this type until later.
        if (json.baseTypeName) {
            stype.baseTypeName = json.baseTypeName;
            var baseEntityType = metadataStore._getEntityType(json.baseTypeName);
            if (baseEntityType) {
                completeStructuralTypeFromJson(metadataStore, json, stype, baseEntityType);
            } else {
                __getArray(metadataStore.deferredTypes, baseTypeName).push({ json: json, stype: stype });
                
            }
        } else {
            completeStructuralTypeFromJson(metadataStore, json, stype, null);
        }

        // sype may or may not have been added to the metadataStore at this point.
        return stype;
    }

    function completeStructuralTypeFromJson(metadataStore, json, stype, baseEntityType) {

        // TODO: should validators from baseType appear on subtypes.
        if (json.validators) {
            stype.validators = json.validators.map(Validator.fromJSON);
        }

        if (baseEntityType) {
            stype.baseEntityType = baseEntityType;
            
            baseEntityType.dataProperties.forEach(function (dp) {
                var newDp = new DataProperty(dp);
                newDp.isInherited = true;
                stype.addProperty(newDp);
            });
            baseEntityType.navigationProperties.forEach(function (np) {
                var newNp = new NavigationProperty(np);
                newNp.isInherited = true;
                stype.addProperty(newNp);
            });
        }
        
        json.dataProperties.forEach(function(dp) {
            stype.addProperty(DataProperty.fromJSON(dp));
        });
        
        
        var isEntityType = !json.isComplexType;
        if (isEntityType) {
            //noinspection JSHint
            json.navigationProperties && json.navigationProperties.forEach(function(np) {
                stype.addProperty(NavigationProperty.fromJSON(np));
            });
        }
        
        metadataStore.addEntityType(stype);

        var deferredTypes = metadataStore._deferredTypes;
        var deferrals = deferredTypes[stype.name];
        if (deferrals) {
            deferrals.forEach(function (d) {
                completeStructuralTypeFromJson(metadataStore, d.json, d.stype, stype);
            });
            delete deferredTypes[stype.name];
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

    return ctor;
})();

var CsdlMetadataParser = (function () {

    function parse(metadataStore, schemas) {

        metadataStore._entityTypeResourceMap = {};
        __toArray(schemas).forEach(function (schema) {
            if (schema.cSpaceOSpaceMapping) {
                // Web api only - not avail in OData.
                var mappings = JSON.parse(schema.cSpaceOSpaceMapping);
                var newMap = {};
                mappings.forEach(function (mapping) {
                    newMap[mapping[0]] = mapping[1];
                });
                schema.cSpaceOSpaceMapping = newMap;
            }

            if (schema.entityContainer) {
                __toArray(schema.entityContainer).forEach(function (container) {
                    __toArray(container.entitySet).forEach(function (entitySet) {
                        var entityTypeName = parseTypeName(entitySet.entityType, schema).typeName;
                        metadataStore.setEntityTypeForResourceName(entitySet.name, entityTypeName);
                        metadataStore._entityTypeResourceMap[entityTypeName] = entitySet.name;
                    });
                });
            }

            // process complextypes before entity types.
            if (schema.complexType) {
                __toArray(schema.complexType).forEach(function (ct) {
                    var complexType = parseCsdlComplexType(ct, schema, metadataStore);
                });
            }
            if (schema.entityType) {
                __toArray(schema.entityType).forEach(function (et) {
                    var entityType = parseCsdlEntityType(et, schema, metadataStore);

                });
            }

        });
        var badNavProps = metadataStore.getIncompleteNavigationProperties();
        if (badNavProps.length > 0) {
            throw new Error("Bad nav properties");
        }
        return metadataStore;
    }

    function parseCsdlEntityType(csdlEntityType, schema, metadataStore) {
        var shortName = csdlEntityType.name;
        var ns = getNamespaceFor(shortName, schema);
        var entityType = new EntityType({
            shortName: shortName,
            namespace: ns,
            isAbstract: csdlEntityType.abstract && csdlEntityType.abstract === 'true'
        });
        if (csdlEntityType.baseType) {
            var baseTypeName = parseTypeName(csdlEntityType.baseType, schema).typeName;
            entityType.baseTypeName = baseTypeName;
            var baseEntityType = metadataStore._getEntityType(baseTypeName, true);
            if (baseEntityType) {
                completeParseCsdlEntityType(entityType, csdlEntityType, schema, metadataStore, baseEntityType);
            } else {
                var deferrals = metadataStore._deferredTypes[baseTypeName];
                if (!deferrals) {
                    deferrals = [];
                    metadataStore._deferredTypes[baseTypeName] = deferrals;
                }
                deferrals.push({ entityType: entityType, csdlEntityType: csdlEntityType });
            }
        } else {
            completeParseCsdlEntityType(entityType, csdlEntityType, schema, metadataStore, null);
        }
        // entityType may or may not have been added to the metadataStore at this point.
        return entityType;

    }

    function completeParseCsdlEntityType(entityType, csdlEntityType, schema, metadataStore, baseEntityType) {
        var baseKeyNamesOnServer = [];
        if (baseEntityType) {
            entityType.baseEntityType = baseEntityType;
            entityType.autoGeneratedKeyType = baseEntityType.autoGeneratedKeyType;
            baseKeyNamesOnServer = baseEntityType.keyProperties.map(__pluck("name"));
            baseEntityType.dataProperties.forEach(function (dp) {
                var newDp = new DataProperty(dp);
                newDp.isInherited = true;
                entityType.addProperty(newDp);
            });
            baseEntityType.navigationProperties.forEach(function (np) {
                var newNp = new NavigationProperty(np);
                newNp.isInherited = true;
                entityType.addProperty(newNp);
            });
        }

        var keyNamesOnServer = csdlEntityType.key ? __toArray(csdlEntityType.key.propertyRef).map(__pluck("name")) : [];
        keyNamesOnServer = baseKeyNamesOnServer.concat(keyNamesOnServer);

        __toArray(csdlEntityType.property).forEach(function (prop) {
            parseCsdlDataProperty(entityType, prop, schema, keyNamesOnServer);
        });

        __toArray(csdlEntityType.navigationProperty).forEach(function (prop) {
            parseCsdlNavProperty(entityType, prop, schema);
        });

        metadataStore.addEntityType(entityType);
        entityType.defaultResourceName = metadataStore._entityTypeResourceMap[entityType.name];

        var deferredTypes = metadataStore._deferredTypes;
        var deferrals = deferredTypes[entityType.name];
        if (deferrals) {
            deferrals.forEach(function (d) {
                completeParseCsdlEntityType(d.entityType, d.csdlEntityType, schema, metadataStore, entityType);
            });
            delete deferredTypes[entityType.name];
        }

    }

    function parseCsdlComplexType(csdlComplexType, schema, metadataStore) {
        var shortName = csdlComplexType.name;
        var ns = getNamespaceFor(shortName, schema);
        var complexType = new ComplexType({
            shortName: shortName,
            namespace: ns
        });

        __toArray(csdlComplexType.property).forEach(function (prop) {
            parseCsdlDataProperty(complexType, prop, schema);
        });

        metadataStore.addEntityType(complexType);
        return complexType;
    }

    function parseCsdlDataProperty(parentType, csdlProperty, schema, keyNamesOnServer) {
        var dp;
        var typeParts = csdlProperty.type.split(".");
        if (typeParts.length === 2) {
            dp = parseCsdlSimpleProperty(parentType, csdlProperty, keyNamesOnServer);
        } else {
            if (isEnumType(csdlProperty, schema)) {
                dp = parseCsdlSimpleProperty(parentType, csdlProperty, keyNamesOnServer);
                if (dp) {
                    dp.enumType = csdlProperty.type;
                }
            } else {
                dp = parseCsdlComplexProperty(parentType, csdlProperty, schema);
            }
        }
        if (dp) {
            parentType.addProperty(dp);
            addValidators(dp);
        }
        return dp;
    }

    function parseCsdlSimpleProperty(parentType, csdlProperty, keyNamesOnServer) {
        var dataType = DataType.fromEdmDataType(csdlProperty.type);
        if (dataType == null) {
            parentType.warnings.push("Unable to recognize DataType for property: " + csdlProperty.name + " DateType: " + csdlProperty.type);
            return null;
        }
        var isNullable = csdlProperty.nullable === 'true' || csdlProperty.nullable == null;
        // var fixedLength = csdlProperty.fixedLength ? csdlProperty.fixedLength === true : undefined;
        var isPartOfKey = keyNamesOnServer != null && keyNamesOnServer.indexOf(csdlProperty.name) >= 0;
        if (isPartOfKey && parentType.autoGeneratedKeyType === AutoGeneratedKeyType.None) {
            if (isIdentityProperty(csdlProperty)) {
                parentType.autoGeneratedKeyType = AutoGeneratedKeyType.Identity;
            }
        }
        // TODO: nit - don't set maxLength if null;
        var maxLength = csdlProperty.maxLength;
        maxLength = (maxLength == null || maxLength === "Max") ? null : parseInt(maxLength,10);
        // can't set the name until we go thru namingConventions and these need the dp.
        var dp = new DataProperty({
            nameOnServer: csdlProperty.name,
            dataType: dataType,
            isNullable: isNullable,
            isPartOfKey: isPartOfKey,
            maxLength: maxLength,
            // fixedLength: fixedLength,
            concurrencyMode: csdlProperty.concurrencyMode
        });
        if (dataType === DataType.Undefined) {
            dp.rawTypeName = csdlProperty.type;
        }
        return dp;
    }

    function parseCsdlComplexProperty(parentType, csdlProperty, schema) {

        // Complex properties are never nullable ( per EF specs)
        // var isNullable = csdlProperty.nullable === 'true' || csdlProperty.nullable == null;
        // var complexTypeName = csdlProperty.type.split("Edm.")[1];
        var complexTypeName = parseTypeName(csdlProperty.type, schema).typeName;
        // can't set the name until we go thru namingConventions and these need the dp.
        var dp = new DataProperty({
            nameOnServer: csdlProperty.name,
            complexTypeName: complexTypeName,
            isNullable: false
        });

        return dp;
    }

    function parseCsdlNavProperty(entityType, csdlProperty, schema) {
        var association = getAssociation(csdlProperty, schema);
        var toEnd = __arrayFirst(association.end, function (assocEnd) {
            return assocEnd.role === csdlProperty.toRole;
        });

        var isScalar = toEnd.multiplicity !== "*";
        var dataType = parseTypeName(toEnd.type, schema).typeName;

        var constraint = association.referentialConstraint;
        
        var cfg = {
            nameOnServer: csdlProperty.name,
            entityTypeName: dataType,
            isScalar: isScalar,
            associationName: association.name
        };

        if (constraint) {
            var principal = constraint.principal;
            var dependent = constraint.dependent;
            var propRefs;
            if (csdlProperty.fromRole === principal.role) {
                propRefs = __toArray(principal.propertyRef);
                cfg.invForeignKeyNamesOnServer = propRefs.map(__pluck("name"));
            } else {
                propRefs = __toArray(dependent.propertyRef);
                // will be used later by np._update
                cfg.foreignKeyNamesOnServer = propRefs.map(__pluck("name"));
            }
        }

        var np = new NavigationProperty(cfg);
        entityType.addProperty(np);
        return np;
    }

    function isEnumType(csdlProperty, schema) {
        if (!schema.enumType) return false;
        var enumTypes = __toArray(schema.enumType);
        var typeParts = csdlProperty.type.split(".");
        var baseTypeName = typeParts[typeParts.length - 1];
        return enumTypes.some(function (enumType) {
            return enumType.name === baseTypeName;
        });
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

    function isIdentityProperty(csdlProperty) {
        // see if web api feed
        var propName = __arrayFirst(Object.keys(csdlProperty), function (pn) {
            return pn.indexOf("StoreGeneratedPattern") >= 0;
        });
        if (propName) {
            return (csdlProperty[propName] === "Identity");
        } else {
            // see if Odata feed
            var extensions = csdlProperty.extensions;
            if (!extensions) {
                return false;
            }
            var identityExtn = __arrayFirst(extensions, function (extension) {
                return extension.name === "StoreGeneratedPattern" && extension.value === "Identity";
            });
            return !!identityExtn;
        }
    }

    // Fast version
    // np: schema.entityType[].navigationProperty.relationship -> schema.association
    //   match( shortName(np.relationship) == schema.association[].name
    //      --> association__

    // Correct version
    // np: schema.entityType[].navigationProperty.relationship -> schema.association
    //   match( np.relationship == schema.entityContainer[0].associationSet[].association )
    //      -> associationSet.name
    //   match ( associationSet.name == schema.association[].name )
    //      -> association

    function getAssociation(csdlNavProperty, schema) {
        var assocName = parseTypeName(csdlNavProperty.relationship, schema).shortTypeName;
        var assocs = schema.association;
        if (!assocs) return null;
        if (!Array.isArray(assocs)) {
            assocs = [assocs];
        }
        var association = __arrayFirst(assocs, function (assoc) {
            return assoc.name === assocName;
        });
        return association;
    }

    // schema is only needed for navProperty type name
    function parseTypeName(entityTypeName, schema) {
        if (!entityTypeName) {
            return null;
        }

        if (__stringStartsWith(entityTypeName, MetadataStore.ANONTYPE_PREFIX)) {
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

            var shortName = nameParts[nameParts.length - 1];

            var ns;
            if (schema) {
                ns = getNamespaceFor(shortName, schema);
            } else {
                var namespaceParts = nameParts.slice(0, nameParts.length - 1);
                ns = namespaceParts.join(".");
            }
            return {
                shortTypeName: shortName,
                namespace: ns,
                typeName: qualifyTypeName(shortName, ns)
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

    var normalizeTypeName = __memoize(function (rawTypeName) {
        return rawTypeName && parseTypeName(rawTypeName).typeName;
    });

    // for debugging use the line below instead.
    //ctor.normalizeTypeName = function (rawTypeName) { return parseTypeName(rawTypeName).typeName; };

    return {
        parse: parse,
        normalizeTypeName: normalizeTypeName
    };

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
            this.shortName = "Anon_" + (++__nextAnonIx);
            this.namespace = "";
            this.isAnonymous = true;
        } else {
            assertConfig(config)
                .whereParam("shortName").isNonEmptyString()
                .whereParam("namespace").isString().isOptional().withDefault("")
                .whereParam("baseTypeName").isString().isOptional()
                .whereParam("isAbstract").isBoolean().isOptional().withDefault(false)
                .whereParam("autoGeneratedKeyType").isEnumOf(AutoGeneratedKeyType).isOptional().withDefault(AutoGeneratedKeyType.None)
                .whereParam("defaultResourceName").isNonEmptyString().isOptional().withDefault(null)
                .whereParam("dataProperties").isOptional()
                .whereParam("navigationProperties").isOptional()
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
        this.subtypes = [];
        // now process any data/nav props
        addProperties(this, config.dataProperties, DataProperty);
        addProperties(this, config.navigationProperties, NavigationProperty);
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
    The fully qualified name of this EntityType.

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
    The base EntityType (if any) for this EntityType.

    __readOnly__
    @property baseEntityType {EntityType} 
    **/

    /**
    Whether this EntityType is abstract.

    __readOnly__
    @property isAbstract {boolean} 
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
    Returns whether this type is a subtype of a specified type.
    
    @method isSubtypeOf
    @param entityType [EntityType]
    **/
    proto.isSubtypeOf = function (entityType) {
        assertParam(entityType, "entityType").isInstanceOf(EntityType).check();
        var baseType = this;
        do {
            if (baseType === entityType) return true;
            baseType = baseType.baseEntityType;
        } while (baseType);
        return false;
    };

    /**
    Returns an array containing this type and any/all subtypes of this type down thru the hierarchy.
  
    @method getSelfAndSubtypes
    **/
    proto.getSelfAndSubtypes = function () {
        var result = [this];
        this.subtypes.forEach(function(st) {
            var subtypes = st.getSelfAndSubtypes();
            result.push.apply(result, subtypes );
        });
        return result;
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
            __objectForEach(initialValues, function (key, value) {
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
    @method getCtor ( or obsolete getEntityCtor)
    @return {Function} The constructor for this EntityType.
    **/
    proto.getCtor = proto.getEntityCtor = function (forceRefresh) {
        if (this._ctor && !forceRefresh) return this._ctor;
        var ctorRegistry = this.metadataStore._ctorRegistry;
        var r = ctorRegistry[this.name] || ctorRegistry[this.shortName] || {};
        var aCtor = r.ctor || this._ctor;
        
        if (!aCtor) {
            var createCtor = __modelLibraryDef.getDefaultInstance().createCtor;
            aCtor = createCtor ? createCtor(this) : createEmptyCtor();
        }
        if (r.initFn) {
            aCtor._$initializationFn = r.initFn;
        }
        aCtor.prototype._$typeName = this.name;
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
            
        if (this._$typeName === "EntityType") {
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

        __modelLibraryDef.getDefaultInstance().initializeEntityPrototype(proto);

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
        return this.getProperties().map(__pluck('name'));
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
        return __arrayFirst(this.dataProperties, __propEq(propName, propertyName));
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
        return __arrayFirst(this.navigationProperties, __propEq(propName, propertyName));
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
        var prop = __arrayFirst(this.getProperties(), __propEq("name", propertyName));
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
        return __toJson(this, {
            shortName: null,
            namespace: null,
            baseTypeName: null,
            isAbstract: false,
            autoGeneratedKeyType: null, // do not suppress default value
            defaultResourceName: null,
            dataProperties: localPropsOnly,
            navigationProperties: localPropsOnly,
            validators: null
        });
    };

    function localPropsOnly(props) {
        return props.filter(function (prop) { return !prop.isInherited; });
    }

    // fromJSON is handled by structuralTypeFromJson function.
        
    proto._clientPropertyPathToServer = function (propertyPath) {
        var fn = this.metadataStore.namingConvention.clientPropertyNameToServer;
        var that = this;
        var serverPropPath = propertyPath.split(".").map(function (propName) {
            var prop = that.getProperty(propName);
            return fn(propName, prop);
        }).join("/");
        return serverPropPath;
    };

    proto._updateNames = function (property) {
        var nc = this.metadataStore.namingConvention;
        updateClientServerNames(nc, property, "name");
                   
        if (property.isNavigationProperty) {
            updateClientServerNames(nc, property, "foreignKeyNames");
            updateClientServerNames(nc, property, "invForeignKeyNames");
            
            // these will get set later via _updateNps
            // this.inverse
            // this.entityType
            // this.relatedDataProperties 
            //    dataProperty.relatedNavigationProperty
            //    dataProperty.inverseNavigationProperty
        }
    };

    function updateClientServerNames(nc, parent, clientPropName) {
        var serverPropName = clientPropName + "OnServer";
        var clientName = parent[clientPropName];
        if (clientName && clientName.length) {
            if (parent.isUnmapped) return;
            var serverNames = __toArray(clientName).map(function (cName) {
                var sName = nc.clientPropertyNameToServer(cName, parent);
                var testName = nc.serverPropertyNameToClient(sName, parent);
                if (cName !== testName) {
                    throw new Error("NamingConvention for this client property name does not roundtrip properly:" + cName + "-->" + testName);
                }
                return sName;
            });
            parent[serverPropName] = Array.isArray(clientName) ? serverNames : serverNames[0];
        } else {            
            var serverName = parent[serverPropName];
            if ((!serverName) || serverName.length === 0) return;
            var clientNames = __toArray(serverName).map(function (sName) {
                var cName = nc.serverPropertyNameToClient(sName, parent);
                var testName = nc.clientPropertyNameToServer(cName, parent);
                if (sName !== testName) {
                    throw new Error("NamingConvention for this server property name does not roundtrip properly:" + sName + "-->" + testName);
                }
                return cName;
            });
            parent[clientPropName] = Array.isArray(serverName) ? clientNames : clientNames[0];
        } 
    }

    proto._checkNavProperty = function (navigationProperty) {
        if (navigationProperty.isNavigationProperty) {
            if (navigationProperty.parentType !== this) {
                throw new Error(__formatString("The navigationProperty '%1' is not a property of entity type '%2'",
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
        }
            
        if (dp.isComplexProperty) {
            this.complexProperties.push(dp);
        }

        if (dp.concurrencyMode && dp.concurrencyMode !== "None") {
            this.concurrencyProperties.push(dp);
        }

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

    proto._updateCps = function () {
        var metadataStore = this.metadataStore;
        var incompleteMap = metadataStore._incompleteComplexTypeMap;
        this.complexProperties.forEach(function (cp) {
            if (cp.complexType) return;
            if (!resolveCp(cp, metadataStore)) {
                __getArray(incompleteMap, cp.complexTypeName).push(cp);
            }
        });

        if (this.isComplexType) {
            (incompleteMap[this.name] || []).forEach(function (cp) {
                resolveCp(cp, metadataStore);
            });
            delete incompleteMap[this.name];
        }
    };

    function resolveCp(cp, metadataStore) {
        var complexType = metadataStore._getEntityType(cp.complexTypeName, true);
        if (!complexType) return false;
        if (!(complexType instanceof ComplexType)) {
            throw new Error("Unable to resolve ComplexType with the name: " + cp.complexTypeName + " for the property: " + property.name);
        }
        cp.dataType = complexType;
        cp.defaultValue = null;
        return true;
    }

    proto._updateNps = function () {
        var metadataStore = this.metadataStore;
        var incompleteMap = metadataStore._incompleteTypeMap;
        this.navigationProperties.forEach(function (np) {
            if (np.entityType) return;
            if (!resolveNp(np, metadataStore)) {
                __getArray(incompleteMap, np.entityTypeName).push(np);
            }
        });

        (incompleteMap[this.name] || []).forEach(function (np) {
            resolveNp(np, metadataStore);
        });

        delete incompleteMap[this.name];
    };

    function resolveNp(np, metadataStore) {
        var entityType = metadataStore._getEntityType(np.entityTypeName, true);
        if (!entityType) return false;
        np.entityType = entityType;
        var invNp = __arrayFirst(entityType.navigationProperties, function( altNp) {
            // Can't do this because of possibility of comparing a base class np with a subclass altNp.
            //return altNp.associationName === np.associationName
            //    && altNp !== np;
            // So use this instead.
            return altNp.associationName === np.associationName &&
                (altNp.name !== np.name || altNp.entityTypeName !== np.entityTypeName);
        });
        np.inverse = invNp;
        if (!invNp) {
            // unidirectional 1-n relationship
            np.invForeignKeyNames.forEach(function (invFkName) {
                var fkProp = entityType.getDataProperty(invFkName);
                var invEntityType = np.parentType;
                fkProp.inverseNavigationProperty = __arrayFirst(invEntityType.navigationProperties, function (np) {
                    return np.invForeignKeyNames && np.invForeignKeyNames.indexOf(fkProp.name) >= 0;
                });
                entityType.foreignKeyProperties.push(fkProp);
            });
        }
        
        resolveRelated(np);
        return true;
    }

    // sets navigation property: relatedDataProperties and dataProperty: relatedNavigationProperty
    function resolveRelated(np) {

        var fkNames = np.foreignKeyNames;
        if (fkNames.length === 0) return;

        var parentEntityType = np.parentType;
        var fkProps = fkNames.map(function (fkName) {
            return parentEntityType.getDataProperty(fkName);
        });
        Array.prototype.push.apply(parentEntityType.foreignKeyProperties, fkProps);

        fkProps.forEach(function (dp) {
            dp.relatedNavigationProperty = np;
            if (np.relatedDataProperties) {
                np.relatedDataProperties.push(dp);
            } else {
                np.relatedDataProperties = [dp];
            }
        });
    }

   
    function calcUnmappedProperties(entityType, instance) {
        var metadataPropNames = entityType.getPropertyNames();
        var trackablePropNames = __modelLibraryDef.getDefaultInstance().getTrackablePropertyNames(instance);
        trackablePropNames.forEach(function (pn) {
            if (metadataPropNames.indexOf(pn) === -1) {
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
            .whereParam("dataProperties").isOptional()
            .whereParam("isComplexType").isOptional().isBoolean()   // needed because this ctor can get called from the addEntityType method which needs the isComplexType prop
            .applyAll(this);

        this.name = qualifyTypeName(this.shortName, this.namespace);
        this.isComplexType = true;
        this.dataProperties = [];
        this.complexProperties = [];
        this.validators = [];
        this.concurrencyProperties = [];
        this.unmappedProperties = [];
        this.navigationProperties = []; // not yet supported 
        this.keyProperties = []; // may be used later to enforce uniqueness on arrays of complextypes.

        addProperties(this, config.dataProperties, DataProperty);
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
            __objectForEach(initialValues, function (key, value) {
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
    proto._updateNames = EntityType.prototype._updateNames;
    proto._updateCps = EntityType.prototype._updateCps;
    // note the name change.
    proto.getCtor = EntityType.prototype.getEntityCtor;
    proto._setCtor = EntityType.prototype._setCtor;
        
    proto.toJSON = function () {
        return __toJson(this, {
            shortName: null,
            namespace: null,
            isComplexType: null,
            dataProperties: null,
            validators: null
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
    @param [config.validators] {Array of Validator}
    **/
    var ctor = function(config) {
        assertConfig(config)
            .whereParam("name").isString().isOptional()
            .whereParam("nameOnServer").isString().isOptional()
            .whereParam("dataType").isEnumOf(DataType).isOptional().or().isString().or().isInstanceOf(ComplexType)
            .whereParam("complexTypeName").isOptional()
            .whereParam("isNullable").isBoolean().isOptional().withDefault(true)
            .whereParam("isScalar").isOptional().withDefault(true)// will be false for some NoSQL databases.
            .whereParam("defaultValue").isOptional()
            .whereParam("isPartOfKey").isBoolean().isOptional()
            .whereParam("isUnmapped").isBoolean().isOptional()
            .whereParam("concurrencyMode").isString().isOptional()
            .whereParam("maxLength").isNumber().isOptional()
            .whereParam("validators").isInstanceOf(Validator).isArray().isOptional().withDefault([])
            .whereParam("enumType").isOptional()
            .whereParam("rawTypeName").isOptional() // occurs with undefined datatypes

            .applyAll(this);
        var hasName = !!(this.name || this.nameOnServer);
        if (!hasName) {
            throw new Error("A DataProperty must be instantiated with either a 'name' or a 'nameOnServer' property");
        }
        // name/nameOnServer is resolved later when a metadataStore is available.
            
        if (this.complexTypeName) {
            this.isComplexProperty = true;
            this.dataType = null;
        } else if (typeof(this.dataType) === "string" ) {
            var dt = DataType.fromName(this.dataType);
            if (!dt) {
                throw new Error("Unable to find a DataType enumeration by the name of: " + this.dataType);
            }
            this.dataType = dt;
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

        if (this.isComplexProperty) {
            this.isScalar = this.isScalar == null || this.isScalar === true;
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
    Whether this property is inherited from a base class. 

    __readOnly__
    @property isInherited {Boolean}
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
        // do not serialize dataTypes that are complexTypes
        return __toJson(this, {
            name: null,
            dataType: function (v) { return (v && v.parentEnum) ? v.name : undefined;  }, // do not serialize dataTypes that are complexTypes
            complexTypeName: null,
            isNullable: true,
            defaultValue: null,
            isPartOfKey: false,
            isUnmapped: false,
            concurrencyMode: null,
            maxLength: null,
            validators: null,
            enumType: null,
            rawTypeName: null,
            isScalar: true
        });
    };

    ctor.fromJSON = function(json) {
        json.dataType = DataType.fromName(json.dataType);
        // dateTime instances require 'extra' work to deserialize properly.
        if (json.defaultValue && json.dataType && json.dataType.isDate) {
            json.defaultValue = new Date(Date.parse(json.defaultValue));
        }
        
        if (json.validators) {
            json.validators = json.validators.map(Validator.fromJSON);
        }

        return new DataProperty(json);
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
            .whereParam("invForeignKeyNames").isArray().isString().isOptional().withDefault([])
            .whereParam("invForeignKeyNamesOnServer").isArray().isString().isOptional().withDefault([])
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
    Whether this property is inherited from a base class. 

    __readOnly__
    @property isInherited {Boolean}
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
        return __toJson(this, {
            name: null,
            entityTypeName: null,
            isScalar: null,
            associationName: null,
            validators: null,
            foreignKeyNames: null,
            invForeignKeyNames: null
        });
    };

    ctor.fromJSON = function (json) {
        if (json.validators) {
            json.validators = json.validators.map(Validator.fromJSON);
        }
        return new NavigationProperty(json);
    };
    
    return ctor;
})();
    
var AutoGeneratedKeyType = (function () {
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
})();

// mixin methods
(function() {
   
    var proto = Param.prototype;

    proto.isEntity = function() {
        return this._addContext({
            fn: isEntity,
            msg: " must be an entity"
        });
    };

    function isEntity(context, v) {
        if (v == null) return false;
        return (v.entityType !== undefined);
    }

    proto.isEntityProperty = function() {
        return this._addContext({
            fn: isEntityProperty,
            msg: " must be either a DataProperty or a NavigationProperty"
        });
    };

    function isEntityProperty(context, v) {
        if (v == null) return false;
        return (v.isDataProperty || v.isNavigationProperty);
    }
})();

// functions shared between classes related to Metadata

function isQualifiedTypeName(entityTypeName) {
    return entityTypeName.indexOf(":#") >= 0;
}
    
function qualifyTypeName(shortName, namespace) {
    return shortName + ":#" + namespace;
}

// Used by both ComplexType and EntityType
function addProperties(entityType, propObj, ctor) {

    if (!propObj) return;
    if (Array.isArray(propObj)) {
        propObj.forEach(entityType.addProperty.bind(entityType));
    } else if (typeof (propObj) === 'object') {
        for (var key in propObj) {
            if (__hasOwnProperty(propObj, key)) {
                var value = propObj[key];
                value.name = key;
                var prop = new ctor(value);
                entityType.addProperty(prop);
            }
        }
    } else {
        throw new Error("The 'dataProperties' or 'navigationProperties' values must be either an array of data/nav properties or an object where each property defines a data/nav property");
    }
}

breeze.MetadataStore = MetadataStore;
breeze.EntityType = EntityType;
breeze.ComplexType = ComplexType;
breeze.DataProperty= DataProperty;
breeze.NavigationProperty = NavigationProperty;
breeze.AutoGeneratedKeyType = AutoGeneratedKeyType;

// needs to be made avail to breeze.dataService.xxx files and we don't want to expose CsdlMetadataParser just for this.
MetadataStore.normalizeTypeName = CsdlMetadataParser.normalizeTypeName;


