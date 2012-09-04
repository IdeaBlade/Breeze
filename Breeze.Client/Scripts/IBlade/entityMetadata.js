
define(["core", "dataType", "entityAspect", "validate", "defaultPropertyInterceptor"],
function (core, DataType, m_entityAspect, m_validate, defaultPropertyInterceptor) {
    "use strict";
    /**
    @module entityModel
    **/

    var Enum = core.Enum;
    var assertParam = core.assertParam;
    var assertConfig = core.assertConfig;

    var EntityAspect = m_entityAspect.EntityAspect;
    var Validator = m_validate.Validator;

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
                serviceName: "api/NorthwindIBModel", 
                metadataStore: ms 
            });
        or for an existing EntityManager
        @example
            // Assume em1 is an existing EntityManager
            em1.setProperties( { metadataStore: ms });
        @method <ctor> MetadataStore
        **/
        var ctor = function () {
            this.serviceNames = []; // array of serviceNames
            this._resourceEntityTypeMap = {}; // key is resource name - value is qualified entityType name
            this._entityTypeResourceMap = {}; // key is qualified entitytype name - value is resourceName
            this._entityTypeMap = {}; // key is qualified entitytype name - value is entityType.
            this._shortNameMap = {}; // key is shortName, value is qualified name
            this._id = __id++;
            
        };
        
        ctor.prototype._$typeName = "MetadataStore";
        ctor.ANONTYPE_PREFIX = "_IB_";

        /**
        The 'default' MetadataStore to be used when none is specified.
        @property defaultInstance
        @static    
        **/
        ctor.defaultInstance = new ctor();

        /**
        Exports this MetadataStore to a serialized string appropriate for local storage.   This operation is also called 
        internally when exporting an EntityManager. 
        @example
            // assume ms is a previously created MetadataStore
            var metadataAsString = ms.export();
            window.localStorage.setItem("metadata", metadataAsString);
            // and later, usually in a different session imported
            var metadataFromStorage = window.localStorage.getItem("metadata");
            var newMetadataStore = new MetadataStore();
            newMetadataStore.import(metadataFromStorage);
        @method export
        @return {String} A serialized version of this MetadataStore that may be stored locally and later restored. 
        **/
        ctor.prototype.export = function () {
            var result = JSON.stringify(this, function (key, value) {
                return value;
            }, core.config.stringifyPad);
            return result;
        };

        /**
        Imports a previously exported serialized MetadataStore into this MetadataStore.
        @example
            // assume ms is a previously created MetadataStore
            var metadataAsString = ms.export();
            window.localStorage.setItem("metadata", metadataAsString);
            // and later, usually in a different session
            var metadataFromStorage = window.localStorage.getItem("metadata");
            var newMetadataStore = new MetadataStore();
            newMetadataStore.import(metadataFromStorage);
        @method import
        @param exportedString {String} A previously exported MetadataStore.
        @return {MetadataStore} This MetadataStore.
        @chainable
        **/
        ctor.prototype.import = function (exportedString) {
            var json = JSON.parse(exportedString);
            var entityTypeMap = {};
            var that = this;
            core.objectForEach(json._entityTypeMap, function (key, value) {
                var et = EntityType.fromJSON(value, that);
                entityTypeMap[key] = et;
            });
            json._entityTypeMap = entityTypeMap;
            core.extend(this, json);
            this._updateCrossEntityRelationships();
            return this;
        };

        /**
        Creates a new MetadataStore from a previously exported serialized MetadataStore
        @example
            // assume ms is a previously created MetadataStore
            var metadataAsString = ms.export();
            window.localStorage.setItem("metadata", metadataAsString);
            // and later, usually in a different session
            var metadataFromStorage = window.localStorage.getItem("metadata");
            var newMetadataStore = MetadataStore.import(metadataFromStorage);
        @method import
        @static
        @param exportedString {String} A previously exported MetadataStore.
        @return {MetadataStore} A new MetadataStore.
        
        **/
        ctor.import = function(exportedString) {
            var ms = new MetadataStore();
            ms.import(exportedString);
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
        @param [remoteAccessImplementation] {instance of this RemoteAccessImplementation interface} 
        - will default to core.config.remoteAccessImplementation
        @param [callback] {successFunction} Function called on success.
        
            successFunction([data])
            @param [callback.data] {rawMetadata} 
  
        @param [errorCallback] {failureFunction} Function called on failure.
            failureFunction([error])
            @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.

        @return Promise
        **/
        ctor.prototype.fetchMetadata = function (serviceName, remoteAccessImplementation, callback, errorCallback) {
            assertParam(serviceName, "serviceName").isString().check();
            remoteAccessImplementation = assertParam(remoteAccessImplementation, "remoteAccessImplementation")
                .isOptional().hasProperty("fetchMetadata").check(core.config.remoteAccessImplementation);
            assertParam(callback, "callback").isFunction().isOptional().check();
            assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();
            
            if (this.hasMetadataFor(serviceName)) {
                throw new Error("Metadata for a specific serviceName may only be fetched once per MetadataStore. ServiceName: " + serviceName);
            }

            var deferred = Q.defer();
            remoteAccessImplementation.fetchMetadata(this, serviceName, deferred.resolve, deferred.reject);
            var that = this;
            return deferred.promise.then(function (rawMetadata) {
                that._updateCrossEntityRelationships();
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
            entityType.setEntityCtor(entityCtor, interceptor);
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
        **/
        ctor.prototype.registerEntityTypeCtor = function (entityTypeName, entityCtor) {
            assertParam(entityTypeName, "entityTypeName").isString().check();
            assertParam(entityCtor, "entityCtor").isFunction().check();
            var qualifiedTypeName = getQualifiedTypeName(this, entityTypeName, false);
            if (qualifiedTypeName) {
                core.config.registerType(entityCtor, qualifiedTypeName);
                var entityType = this._entityTypeMap[qualifiedTypeName];
                entityType.setEntityCtor(entityCtor);
            } else {
                core.config.registerType(entityCtor, entityTypeName);
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
        **/
        ctor.prototype.getEntityType = function (entityTypeName, okIfNotFound) {
            assertParam(entityTypeName, "entityTypeName").isString().check();
            assertParam(okIfNotFound, "okIfNotFound").isBoolean().isOptional().check(false);
            entityTypeName = getQualifiedTypeName(this, entityTypeName, false);
            var entityType = this._entityTypeMap[entityTypeName];
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


        /*
        INTERNAL FOR NOW
        Returns a fully qualified entityTypeName for a specified resource name.  The reverse of this operation
        can be obtained via the  {{#crossLink "EntityType"}}{{/crossLink}} 'defaultResourceName' property
        @method getEntityTypeNameForResourceName
        @param resourceName {String}
        */
        ctor.prototype._getEntityTypeNameForResourceName = function (resourceName) {
            assertParam(resourceName, "resourceName").isString().check();
            return this._resourceEntityTypeMap[resourceName.toLowerCase()];
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
            resourceName = resourceName.toLowerCase();
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

        ctor.prototype._updateCrossEntityRelationships = function () {
            this.getEntityTypes().forEach(function (et) { et._updateCrossEntityRelationships(); });
        };

        ctor.prototype._registerEntityType = function (entityType) {
            // entityType.metadataStore = this; // back pointer.

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
                        var entityType = convertFromODataEntityType(et, schema, that);
                        entityType.serviceName = serviceName;
                        entityType._postProcess();
                        that._registerEntityType(entityType);
                    });
                }
            });

        };

        function getQualifiedTypeName(metadataStore, entityTypeName, throwIfNotFound) {
            if (isQualifiedTypeName(entityTypeName)) return entityTypeName;
            var result = metadataStore._shortNameMap[entityTypeName];
            if (!result && throwIfNotFound) {
                throw new Error("Unable to locate 'entityTypeName' of: " + entityTypeName);
            }
            return result;
        }

        function convertFromODataEntityType(odataEntityType, schema, metadataStore) {
            var entityType = new EntityType(metadataStore);
            entityType.shortName = odataEntityType.name;
            entityType.namespace = translateNamespace(schema, schema.namespace);
            entityType.name = entityType.shortName + ":#" + entityType.namespace;

            entityType.dataProperties = toArray(odataEntityType.property).map(function (prop) {
                return convertFromOdataDataProperty(entityType, prop);
            });

            entityType.navigationProperties = toArray(odataEntityType.navigationProperty).map(function (prop) {
                return convertFromOdataNavProperty(entityType, prop, schema);
            });

            toArray(odataEntityType.key.propertyRef).forEach(function (propertyRef) {
                var keyProp = entityType.getDataProperty(propertyRef.name);
                keyProp.isKeyProperty = true;
            });

            return entityType;
        }


        function convertFromOdataDataProperty(entityType, odataProperty) {
            if (entityType.autoGeneratedKeyType == AutoGeneratedKeyType.None) {
                if (isIdentityProperty(odataProperty)) {
                    entityType.autoGeneratedKeyType = AutoGeneratedKeyType.Identity;
                }
            }
            var dataType = DataType.toDataType(odataProperty.type);
            var isNullable = odataProperty.nullable === 'true';
            var fixedLength = odataProperty.fixedLength ? odataProperty.fixedLength === true : undefined;

            var dp = new DataProperty({
                parentEntityType: entityType,
                name: odataProperty.name,
                dataType: dataType,
                isNullable: isNullable,
                maxLength: odataProperty.maxLength,
                fixedLength: fixedLength,
                concurrencyMode: odataProperty.concurrencyMode
            });

            addValidators(dp);
            return dp;
        }

        function addValidators(dataProperty) {

            var typeValidator;
            if (!dataProperty.isNullable) {
                dataProperty.validators.push(Validator.required());
            }
            if (dataProperty.dataType === DataType.String) {
                if (dataProperty.maxLength && dataProperty.maxLength != "Max") {
                    var validatorArgs = { maxLength: parseInt(dataProperty.maxLength) };
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
            var fkNames = null;
            if (toEnd && toEnd.multiplicity !== "*") {
                var constraint = association.referentialConstraint;
                if (constraint) {
                    var principal = constraint.principal;
                    var dependent = constraint.dependent;
                    var propertyRefs;
                    if (odataProperty.fromRole === principal.role) {
                        propertyRefs = toArray(principal.propertyRef);
                    } else {
                        propertyRefs = toArray(dependent.propertyRef);
                    }
                    fkNames = propertyRefs.map(function (pr) {
                        return entityType.getDataProperty(pr.name).name;
                    });
                }
            }

            var isScalar = !(toEnd.multiplicity === "*");
            var dataType = normalizeTypeName(toEnd.type, schema).typeName;

            var np = new NavigationProperty({
                parentEntityType: entityType,
                name: odataProperty.name,
                entityTypeName: dataType,
                isScalar: isScalar,
                associationName: association.name,
                foreignKeyNames: fkNames
            });
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

            var association = core.arrayFirst(schema.association, function (assoc) {
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

    var AutoGeneratedKeyType = function() {
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
        @property None {symbol}
        @final
        @static
        **/
        ctor.None = ctor.addSymbol();
        /**
        This entity's key is an Identity column and is set by the backend database. 
        Keys for new entities will be temporary until the entities are saved at which point the keys will
        be converted to their 'real' versions.
        @property Identity {symbol}
        @final
        @static
        **/
        ctor.Identity = ctor.addSymbol();
        /**
        This entity's key is generated by a KeyGenerator and is set by the backend database. 
        Keys for new entities will be temporary until the entities are saved at which point the keys will
        be converted to their 'real' versions.
        @property KeyGenerator {symbol}
        @final
        @static
        **/
        ctor.KeyGenerator = ctor.addSymbol();
        ctor.seal();

        return ctor;
    }();

    var EntityType = (function () {
        /**
        Container for all of the metadata about a specific type of Entity.
        Constructor is for internal use only.
        @class EntityType
        **/
        
        var ctor = function (metadataStore) {
            /**
            The {{#crossLink "MetadataStore"}}{{/crossLink}} that contains this EntityType

            __readOnly__
            @property metadataStore {MetadataStore}
            **/
            this.metadataStore = metadataStore;
            /**
            The DataProperties (see {{#crossLink "DataProperty"}}{{/crossLink}}) associated with this EntityType.

            __readOnly__
            @property dataProperties {Array of DataProperty} 
            **/
            this.dataProperties = [];
            /**
            The NavigationProperties  (see {{#crossLink "NavigationProperty"}}{{/crossLink}}) associated with this EntityType.

            __readOnly__
            @property navigationProperties {Array of NavigationProperty} 
            **/
            this.navigationProperties = [];
            /**
            The DataProperties associated with this EntityType that make up it's {{#crossLink "EntityKey"}}{{/crossLink}}.

            __readOnly__
            @property keyProperties {Array of DataProperty} 
            **/
            this.keyProperties = [];
            /**
            The DataProperties associated with this EntityType that are foreign key properties.

            __readOnly__
            @property foreignKeyProperties {Array of DataProperty} 
            **/
            this.foreignKeyProperties = [];
            /**
            The DataProperties associated with this EntityType that are not mapped to any backend datastore. These are effectively free standing
            properties.

            __readOnly__
            @property unmappedProperties {Array of DataProperty} 
            **/
            this.unmappedProperties = []; // will be updated later.
            /**
            The default resource name associated with this EntityType.  An EntityType may be queried via a variety of 'resource names' but this one 
            is used as the default when no resource name is provided.  This will occur when calling {{#crossLink "EntityAspect/loadNavigationProperty"}}{{/crossLink}}
            or when executing any {{#crossLink "EntityQuery"}}{{/crossLink}} that was created via an {{#crossLink "EntityKey"}}{{/crossLink}}.

            __readOnly__
            @property defaultResourceName {String} 
            **/
            this.defaultResourceName = null; // will be set up either via metadata lookup or first query or via registerEntityTypeResourceName;
            /**
            The fully qualifed name of this EntityType.

            __readOnly__
            @property name {String} 
            **/
            this.name = null;
            /**
            The short, unqualified, name for this EntityType.

            __readOnly__
            @property shortName {String} 
            **/
            this.shortName = null;
            /**
            The namespace for this EntityType.

            __readOnly__
            @property namespace {String} 
            **/
            this.namespace = null;
            /**
            The {{#crossLink "AutoGeneratedKeyType"}}{{/crossLink}} for this EntityType.
            
            __readOnly__
            @property autoGeneratedKeyType {AutoGeneratedKeyType} 
            @default AutoGeneratedKeyType.None
            **/
            this.autoGeneratedKeyType = AutoGeneratedKeyType.None;
            /**
            The entity level validators associated with this EntityType. Validators can be added and
            removed from this collection.

            __readOnly__
            @property validators {Array of Validator} 
            **/
            this.validators = [];

            this._unresolvedEntityTypeNames = [];
            this._needsInitialization = true;
            // also includes
            // this._entityCtor
        };

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
                this.defaultResourceName = config.defaultResourceName.toLowerCase();
            }
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
            var entityCtor = this.getEntityCtor();
            var instance = new entityCtor();
            new EntityAspect(instance);
            return instance;
        };

        /**
        Returns the constructor for this EntityType.
        @method getEntityCtor
        @return {Function} The constructor for this EntityType.
        **/
        ctor.prototype.getEntityCtor = function () {
            if (this._entityCtor) return this._entityCtor;
            var entityCtor = core.config.typeRegistry[this.name] || core.config.typeRegistry[this.shortName];
            if (!entityCtor) {
                entityCtor = function () { };
            }
            this.setEntityCtor(entityCtor);
            return entityCtor;
        };

        /**
        Sets the constructor for this EntityType.
        @method setEntityCtor
        @param entityCtor {Function} An constructor function for this EntityType that requires no arguments.
        @param interceptor {Not yet documented}
        **/
        ctor.prototype.setEntityCtor = function (entityCtor, interceptor) {
            var instance = new entityCtor();

            // insure that all of the properties are on the 'template' instance before watching the class.
            calcUnmappedProperties(this, instance);

            enableTracking(this, entityCtor.prototype, interceptor);

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
        @return Array of DataProperty|NavigationProperty
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
        @return {DataProperty|null}
        **/
        ctor.prototype.getDataProperty = function (propertyName) {
            return core.arrayFirst(this.dataProperties, core.propEq("name", propertyName));
        };

        /**
        Returns a navigation property with the specified name or null.
        @example
            // assume em1 is an EntityManager containing a number of existing entities.
            var custType = em1.metadataStore.getEntityType("Customer");
            var customerOrdersNavProp = custType.getDataProperty("Orders");
        @method getNavigationProperty
        @param propertyName {String}
        @return {NavigationProperty|null}
        **/
        ctor.prototype.getNavigationProperty = function (propertyName) {
            return core.arrayFirst(this.navigationProperties, core.propEq("name", propertyName));
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
        @return {DataProperty|NavigationProperty|null}
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
            et = new EntityType(metadataStore);
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
            et._postProcess();
            return et;
        };

        ctor._getNormalizedTypeName = core.memoize(function (rawTypeName) { return normalizeTypeName(rawTypeName).typeName; });
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

        ctor.prototype._postProcess = function () {
            this.keyProperties = this.dataProperties.filter(function (dp) {
                return dp.isKeyProperty;
            });

            this.foreignKeyProperties = this.dataProperties.filter(function (dp) {
                return dp.relatedNavigationProperty != null;
            });

            this.concurrencyProperties = this.dataProperties.filter(function (dp) {
                return dp.concurrencyMode && dp.concurrencyMode !== "None";
            });

            // update fk dataproperties to point back to navProperties.
            var that = this;
            this.navigationProperties.filter(function (np) {
                var fkNames = np.foreignKeyNames;
                if (!fkNames) return;
                fkNames.forEach(function (fkn) {
                    var dp = that.getDataProperty(fkn);
                    dp.relatedNavigationProperty = np;
                    if (np.relatedDataProperties) {
                        np.relatedDataProperties.push(dp);
                    } else {
                        np.relatedDataProperties = [dp];
                    }
                });
            });
        };

        ctor.prototype._updateCrossEntityRelationships = function () {
            if (!this._needsInitialization) return;
            var unresolvedNavProps = this.navigationProperties.filter(function (np) {
                return !np.entityType;
            });

            var isInitialized = true;
            unresolvedNavProps.forEach(function (np) {
                var updated = np._update();
                isInitialized &= updated;
            });
            this._needsInitialization = !isInitialized;

        };


        // interceptor is -> function(propName, newValue, accessorFn) - may be specified later
        // by setting the prototype's interceptor property.
        // interceptor is optional
        function enableTracking(entityType, entityPrototype, interceptor) {
            entityPrototype.entityType = entityType;

            if (interceptor) {
                entityPrototype.interceptor = interceptor;
            } else {
                entityPrototype.interceptor = defaultPropertyInterceptor;
            }

            core.config.trackingImplementation.initializeEntityPrototype(entityPrototype);
        }

        function calcUnmappedProperties(entityType, instance) {
            var currentPropertyNames = entityType.getPropertyNames();
            var isTrackableProperty = core.config.trackingImplementation.isTrackableProperty;

            Object.getOwnPropertyNames(instance).forEach(function (propName) {
                if (isTrackableProperty(instance, propName)) {
                    if (currentPropertyNames.indexOf(propName) === -1) {
                        var newProp = new DataProperty({
                            parentEntityType: entityType,
                            name: propName,
                            dataType: DataType.Undefined,
                            isNullable: true,
                            isUnmappedProperty: true
                        });
                        entityType.dataProperties.push(newProp);
                        entityType.unmappedProperties.push(newProp);
                    }
                }
            });
        }

        return ctor;
    })();
   
    var DataProperty = (function () {

        /**
        A DataProperty describes the metadata for a single property of an  {{#crossLink "EntityType"}}{{/crossLink}} that contains simple data. 

        Instances of the DataProperty class are constructed automatically during Metadata retrieval.  It should almost never
        be necessary to create one directly.        
        @class DataProperty
        **/
        var ctor = function (config) {
            assertConfig(config)
                .whereParam("parentEntityType").isInstanceOf(EntityType)
                .whereParam("name").isString()
                .whereParam("dataType").isEnumOf(DataType)
                .whereParam("isNullable").isBoolean().isOptional()
                .whereParam("defaultValue").isOptional()
                .whereParam("isKeyProperty").isBoolean().isOptional()
                .whereParam("isUnmappedProperty").isBoolean().isOptional()
                .whereParam("concurrencyMode").isString().isOptional()
                .whereParam("maxLength").isString().isOptional()
                .whereParam("fixedLength").isBoolean().isOptional()
                .whereParam("validators").isInstanceOf(Validator).isArray().isOptional().withDefault([])
                .applyAll(this);
            this.defaultValue = this.isNullable ? null : this.dataType.defaultValue;

            // Set later:
            // this.isKeyProperty - on deserialization this will come in config - on metadata retrieval it will be set later
            // this.relatedNavigationProperty - this will be set for all foreignKey data properties.

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
        @property isKeyProperty {Boolean}
        **/

        /**
        Whether this property is an 'unmapped' property. 

        __readOnly__
        @property isUnmappedProperty {Boolean}
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
        @property validators {Validator|Array of Validator}
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
                dataType: this.dataType.name,
                isNullable: this.isNullable,
                isUnmappedProperty: this.isUnmappedProperty,
                concurrencyMode: this.concurrencyMode,
                maxLength: this.maxLength,
                fixedLength: this.fixedLength,
                defaultValue: this.defaultValue,
                validators: this.validators,
                isKeyProperty: this.isKeyProperty
            };
        };

        ctor.fromJSON = function (json, parentEntityType) {
            json.parentEntityType = parentEntityType;
            json.dataType = DataType.fromName(json.dataType);
            json.validators = json.validators.map(function (v) {
                return Validator.fromJSON(v);
            });
            var dp = new DataProperty(json);
            return dp;
        };

        return ctor;
    })();
  
    var NavigationProperty = (function () {

        /**
        A NavigationProperty describes the metadata for a single property of an  {{#crossLink "EntityType"}}{{/crossLink}} that return instances of other EntityTypes. 
    
        Instances of the NavigationProperty class are constructed automatically during Metadata retrieval.  It should almost never
        be necessary to create one directly.
        @class NavigationProperty
        **/
        var ctor = function (config) {
            assertConfig(config)
                .whereParam("parentEntityType").isInstanceOf(EntityType)
                .whereParam("name").isString()
                .whereParam("entityTypeName").isString()
                .whereParam("isScalar").isBoolean()
                .whereParam("associationName").isString().isOptional()
                .whereParam("foreignKeyNames").isArray().isString().isOptional()
                .whereParam("validators").isInstanceOf(Validator).isArray().isOptional().withDefault([])
                .applyAll(this);
            this.relatedDataProperties = null; // will be set later for all navProps with corresponding foreignKey properties.

            // Set later:
            // this.inverse
            // this.entityType
            // this.relatedDataProperties

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
        ctor.prototype.isDataProperty = false;

        /**
        Is this a NavigationProperty? - always true here 
        Allows polymorphic treatment of DataProperties and NavigationProperties.

        __readOnly__
        @property isNavigationProperty {Boolean}
        **/

        ctor.prototype.isNavigationProperty = true;

        ctor.prototype.toJSON = function () {
            return {
                name: this.name,
                entityTypeName: this.entityTypeName,
                isScalar: this.isScalar,
                associationName: this.associationName,
                foreignKeyNames: this.foreignKeyNames,
                validators: this.validators
            };
        };

        ctor.fromJSON = function (json, parentEntityType) {
            json.parentEntityType = parentEntityType;
            json.validators = json.validators.map(function (v) {
                return Validator.fromJSON(v);
            });
            var np = new NavigationProperty(json);
            return np;
        };

        ctor.prototype._update = function () {
            var metadataStore = this.parentEntityType.metadataStore;
            this.entityType = metadataStore.getEntityType(this.entityTypeName);
            if (!this.entityType) {
                throw new Error("Unable to find entityType: " + entityTypeName);
            }
            var that = this;
            this.inverse = core.arrayFirst(this.entityType.navigationProperties, function (np) {
                return np.associationName === that.associationName && np !== that;
            });
            return true;
        };

      

        return ctor;
    })();

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

    // schema is only needed for navProperty type name
    function normalizeTypeName(entityTypeName, schema) {
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
                typeName: simpleTypeName + ":#" + namespace
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
        AutoGeneratedKeyType: AutoGeneratedKeyType
    };

})


