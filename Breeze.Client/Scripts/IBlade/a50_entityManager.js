/**
@module breeze
**/

var EntityManager = (function () {
    /**
    Instances of the EntityManager contain and manage collections of entities, either retrieved from a backend datastore or created on the client. 
    @class EntityManager
    **/
        
    /** 
    @example                    
    At its most basic an EntityManager can be constructed with just a service name
    @example                    
        var entityManager = new EntityManager( "api/NorthwindIBModel");
    This is the same as calling it with the following configuration object
    @example                    
        var entityManager = new EntityManager( {serviceName: "api/NorthwindIBModel" });
    Usually however, configuration objects will contain more than just the 'serviceName';
    @example
        var metadataStore = new MetadataStore();
        var entityManager = new EntityManager( {
            serviceName: "api/NorthwindIBModel", 
            metadataStore: metadataStore 
        });
    or
    @example
        return new QueryOptions({ 
            mergeStrategy: obj, 
            fetchStrategy: this.fetchStrategy 
        });
        var queryOptions = new QueryOptions({ 
            mergeStrategy: MergeStrategy.OverwriteChanges, 
            fetchStrategy: FetchStrategy.FromServer 
        });
        var validationOptions = new ValidationOptions({ 
            validateOnAttach: true, 
            validateOnSave: true, 
            validateOnQuery: false
        });
        var entityManager = new EntityManager({ 
            serviceName: "api/NorthwindIBModel", 
            queryOptions: queryOptions, 
            validationOptions: validationOptions 
        });
    @method <ctor> EntityManager
    @param [config] {Object|String} Configuration settings or a service name.
    @param [config.serviceName] {String}
    @param [config.dataService] {DataService} An entire DataService (instead of just the serviceName above).
    @param [config.metadataStore=MetadataStore.defaultInstance] {MetadataStore}
    @param [config.queryOptions=QueryOptions.defaultInstance] {QueryOptions}
    @param [config.saveOptions=SaveOptions.defaultInstance] {SaveOptions}
    @param [config.validationOptions=ValidationOptions.defaultInstance] {ValidationOptions}
    @param [config.keyGeneratorCtor] {Function}
    **/
    var ctor = function (config) {
            
        if (arguments.length > 1) {
            throw new Error("The EntityManager ctor has a single optional argument that is either a 'serviceName' or a configuration object.");
        }
        if (arguments.length === 0) {
            config = { serviceName: "" };
        } else if (typeof config === 'string') {
            config = { serviceName: config };
        }
            
        assertConfig(config)
            .whereParam("serviceName").isOptional().isString()
            .whereParam("dataService").isOptional().isInstanceOf(DataService)
            .whereParam("metadataStore").isInstanceOf(MetadataStore).isOptional().withDefault(new MetadataStore())
            .whereParam("queryOptions").isInstanceOf(QueryOptions).isOptional().withDefault(QueryOptions.defaultInstance)
            .whereParam("saveOptions").isInstanceOf(SaveOptions).isOptional().withDefault(SaveOptions.defaultInstance)
            .whereParam("validationOptions").isInstanceOf(ValidationOptions).isOptional().withDefault(ValidationOptions.defaultInstance)
            .whereParam("keyGeneratorCtor").isFunction().isOptional().withDefault(KeyGenerator)
            .applyAll(this);

                
        if (config.serviceName) {
            this.dataService = new DataService({
                serviceName: this.serviceName
            });
        }
        this.serviceName = this.dataService && this.dataService.serviceName;
            
        this.entityChanged = new Event("entityChanged_entityManager", this);
        this.hasChangesChanged = new Event("hasChangesChanged_entityManager", this);
            
        this.clear();
            
    };
    var proto = ctor.prototype;
        
        
        
    proto._$typeName = "EntityManager";
        

    Event.bubbleEvent(proto, null);
        
    /**
    The service name associated with this EntityManager.

    __readOnly__
    @property serviceName {String}
    **/
        
    /**
    The DataService name associated with this EntityManager.

    __readOnly__
    @property dataService {DataService}
    **/

    /**
    The {{#crossLink "MetadataStore"}}{{/crossLink}} associated with this EntityManager. 

        __readOnly__         
    @property metadataStore {MetadataStore}
    **/

    /**
    The {{#crossLink "QueryOptions"}}{{/crossLink}} associated with this EntityManager.

    __readOnly__
    @property queryOptions {QueryOptions}
    **/

    /**
    The {{#crossLink "SaveOptions"}}{{/crossLink}} associated with this EntityManager.

    __readOnly__
    @property saveOptions {SaveOptions}
    **/

    /**
    The {{#crossLink "ValidationOptions"}}{{/crossLink}} associated with this EntityManager.

    __readOnly__
    @property validationOptions {ValidationOptions}
    **/

    /**
    The {{#crossLink "KeyGenerator"}}{{/crossLink}} constructor associated with this EntityManager.

    __readOnly__
    @property keyGeneratorCtor {KeyGenerator constructor}
    **/

       
       
    // events
    /**
    An {{#crossLink "Event"}}{{/crossLink}} that fires whenever a change to any entity in this EntityManager occurs.
    @example                    
        var em = new EntityManager( {serviceName: "api/NorthwindIBModel" });
        em.entityChanged.subscribe(function(changeArgs) {
            // This code will be executed any time any entity within the entityManager is added, modified, deleted or detached for any reason. 
            var action = changeArgs.entityAction;
            var entity = changeArgs.entity;
            // .. do something to this entity when it is changed.
        });
    });
        
    @event entityChanged 
    @param entityAction {EntityAction} The {{#crossLink "EntityAction"}}{{/crossLink}} that occured. 
    @param entity {Object} The entity that changed.  If this is null, then all entities in the entityManager were affected. 
    @param args {Object} Additional information about this event. This will differ based on the entityAction.
    @readOnly
    **/

    // class methods 
          
    /**
    Creates a new entity of a specified type and optionally initializes it. By default the new entity is created with an EntityState of Added
    but you can also optionally specify an EntityState.  An EntityState of 'Detached' will insure that the entity is created but not yet added 
    to the EntityManager.
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities.
        // create and add an entity;
        var emp1 = em1.createEntity("Employee");
        // create and add an initialized entity;
        var emp2 = em1.createEntity("Employee", { lastName: Smith", firstName: "John" });
        // create and attach (not add) an initialized entity
        var emp3 = em1.createEntity("Employee", { id: 435, lastName: Smith", firstName: "John" }, EntityState.Unchanged);
        // create but don't attach an entity;
        var emp4 = em1.createEntity("Employee", { id: 435, lastName: Smith", firstName: "John" }, EntityState.Detached);

    @method createEntity
    @param typeName {String} The name of the type for which an instance should be created.
    @param [initialValues=null] {Config object} - Configuration object of the properties to set immediately after creation.
    @param [entityState=EntityState.Added] {EntityState} - Configuration object of the properties to set immediately after creation.
    @return {Entity} A new Entity of the specified type.
    **/
    proto.createEntity = function (typeName, initialValues, entityState) {
        entityState = entityState || EntityState.Added;
        var entity = this.metadataStore
            .getEntityType(typeName)
            .createEntity(initialValues);
        if (entityState !== EntityState.Detached) {
            this.attachEntity(entity, entityState);
        }
        return entity;
    };

    /**
    Creates a new EntityManager and imports a previously exported result into it.
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities.
        var bundle = em1.exportEntities();
        // can be stored via the web storage api
        window.localStorage.setItem("myEntityManager", bundle);
        // assume the code below occurs in a different session.
        var bundleFromStorage = window.localStorage.getItem("myEntityManager");
        // and imported
        var em2 = EntityManager.importEntities(bundleFromStorage);
        // em2 will now have a complete copy of what was in em1
    @method importEntities
    @static
    @param exportedString {String} The result of a previous 'exportEntities' call.
    @param [config] {Object} A configuration object.
    @param [config.mergeStrategy] {MergeStrategy} A  {{#crossLink "MergeStrategy"}}{{/crossLink}} to use when 
    merging into an existing EntityManager.
    @return {EntityManager} A new EntityManager.
    **/
    ctor.importEntities = function (exportedString, config) {
        var em = new EntityManager();
        em.importEntities(exportedString, config);
        return em;
    };

    // instance methods

    /**
    Exports an entire EntityManager or just selected entities into a serialized string for external storage.
    @example
    This method can be used to take a snapshot of an EntityManager that can be either stored offline or held 
    memory.  This snapshot can be restored or merged into an another EntityManager at some later date. 
    @example
        // assume em1 is an EntityManager containing a number of existing entities.
        var bundle = em1.exportEntities();
        // can be stored via the web storage api
        window.localStorage.setItem("myEntityManager", bundle);
        // assume the code below occurs in a different session.
        var bundleFromStorage = window.localStorage.getItem("myEntityManager");
        var em2 = new EntityManager({ 
            serviceName: em1.serviceName, 
            metadataStore: em1.metadataStore 
        });
        em2.importEntities(bundleFromStorage);
        // em2 will now have a complete copy of what was in em1
    You can also control exactly which entities are exported. 
    @example
        // assume entitiesToExport is an array of entities to export.
        var bundle = em1.exportEntities(entitiesToExport);
        // assume em2 is another entityManager containing some of the same entities possibly with modifications.
        em2.importEntities(bundle, { mergeStrategy: MergeStrategy.PreserveChanges} );
    @method exportEntities
    @param [entities] {Array of entities} The entities to export; all entities are exported if this is omitted.
    @return {String} A serialized version of the exported data.
    **/
    proto.exportEntities = function (entities) {
        var exportBundle = exportEntityGroups(this, entities);
        var json = {
            metadataStore: this.metadataStore.exportMetadata(),
            dataService: this.dataService,
            saveOptions: this.saveOptions,
            queryOptions: this.queryOptions,
            validationOptions: this.validationOptions,
            tempKeys: exportBundle.tempKeys,
            entityGroupMap: exportBundle.entityGroupMap
        };
        var result = JSON.stringify(json, null, __config.stringifyPad);
        return result;
    };

    /**
    Imports a previously exported result into this EntityManager.
    @example
    This method can be used to make a complete copy of any previously created entityManager, even if created
    in a previous session and stored in localStorage. The static version of this method performs a
    very similar process. 
    @example
        // assume em1 is an EntityManager containing a number of existing entities.
        var bundle = em1.exportEntities();
        // bundle can be stored in window.localStorage or just held in memory.
        var em2 = new EntityManager({ 
            serviceName: em1.serviceName, 
            metadataStore: em1.metadataStore 
        });
        em2.importEntities(bundle);
        // em2 will now have a complete copy of what was in em1
    It can also be used to merge the contents of a previously created EntityManager with an 
    existing EntityManager with control over how the two are merged.
    @example
        var bundle = em1.exportEntities();
        // assume em2 is another entityManager containing some of the same entities possibly with modifications.
        em2.importEntities(bundle, { mergeStrategy: MergeStrategy.PreserveChanges} );
        // em2 will now contain all of the entities from both em1 and em2.  Any em2 entities with previously 
        // made modifications will not have been touched, but all other entities from em1 will have been imported.
    @method importEntities
    @param exportedString {String} The result of a previous 'export' call.
    @param [config] {Object} A configuration object.
        @param [config.mergeStrategy] {MergeStrategy} A  {{#crossLink "MergeStrategy"}}{{/crossLink}} to use when 
        merging into an existing EntityManager.
    @chainable
    **/
    proto.importEntities = function (exportedString, config) {
        config = config || {};
        assertConfig(config)
            .whereParam("mergeStrategy").isEnumOf(MergeStrategy).isOptional().withDefault(this.queryOptions.mergeStrategy)
            .applyAll(config);
        var that = this;
            
        var json = JSON.parse(exportedString);
        this.metadataStore.importMetadata(json.metadataStore);
        // the || clause is for backwards compat with an earlier serialization format.           
        this.dataService = (json.dataService && DataService.fromJSON(json.dataService)) || new DataService({ serviceName: json.serviceName });
        
        this.saveOptions = new SaveOptions(json.saveOptions);
        this.queryOptions = QueryOptions.fromJSON(json.queryOptions);
        this.validationOptions = new ValidationOptions(json.validationOptions);

        var tempKeyMap = {};
        json.tempKeys.forEach(function (k) {
            var oldKey = EntityKey.fromJSON(k, that.metadataStore);
            tempKeyMap[oldKey.toString()] = that.keyGenerator.generateTempKeyValue(oldKey.entityType);
        });
        config.tempKeyMap = tempKeyMap;
        __wrapExecution(function() {
            that._pendingPubs = [];
        }, function(state) {
            that._pendingPubs.forEach(function(fn) { fn(); });
            that._pendingPubs = null;
        }, function() {
            __objectForEach(json.entityGroupMap, function(entityTypeName, jsonGroup) {
                var entityType = that.metadataStore.getEntityType(entityTypeName, true);
                var targetEntityGroup = findOrCreateEntityGroup(that, entityType);
                importEntityGroup(targetEntityGroup, jsonGroup, config);
            });
        });
        return this;
    };

        
    /**
    Clears this EntityManager's cache but keeps all other settings. Note that this 
    method is not as fast as creating a new EntityManager via 'new EntityManager'.
    This is because clear actually detaches all of the entities from the EntityManager.
    @example
        // assume em1 is an EntityManager containing a number of existing entities.
        em1.clear();
        // em1 is will now contain no entities, but all other setting will be maintained.
    @method clear
    **/
    proto.clear = function () {
        __objectForEach(this._entityGroupMap, function (key, entityGroup) {
            // remove en
            entityGroup._clear();
        });
            
        this._entityGroupMap = {};
        this._unattachedChildrenMap = new UnattachedChildrenMap();
        this.keyGenerator = new this.keyGeneratorCtor();
        this.entityChanged.publish({ entityAction: EntityAction.Clear });
        if (this._hasChanges) {
            this._hasChanges = false;
            this.hasChangesChanged.publish({ entityManager: this, hasChanges: false });
        }
    };

    /**
    General purpose property set method.  Any of the properties documented below 
    may be set.
    @example
            // assume em1 is a previously created EntityManager
            // where we want to change some of its settings.
            em1.setProperties( {
            serviceName: "api/foo"
            });
    @method setProperties
    @param config {Object}
        @param [config.serviceName] {String}
        @param [config.dataService] {DataService}
        @param [config.queryOptions] {QueryOptions}
        @param [config.saveOptions] {SaveOptions}
        @param [config.validationOptions] {ValidationOptions}
        @param [config.keyGeneratorCtor] {Function}

    **/
    proto.setProperties = function (config) {
        assertConfig(config)
            .whereParam("serviceName").isString().isOptional()
            .whereParam("dataService").isInstanceOf(DataService).isOptional()
            .whereParam("queryOptions").isInstanceOf(QueryOptions).isOptional()
            .whereParam("saveOptions").isInstanceOf(SaveOptions).isOptional()
            .whereParam("validationOptions").isInstanceOf(ValidationOptions).isOptional()
            .whereParam("keyGeneratorCtor").isOptional()
            .applyAll(this);
                
        if (config.serviceName) {
            this.dataService = new DataService({
                serviceName: this.serviceName,
            });
        }
        this.serviceName = this.dataService && this.dataService.serviceName;
            
        if (config.keyGeneratorCtor) {
            this.keyGenerator = new this.keyGeneratorCtor();
        }
            
    };

    /**
    Creates an empty copy of this EntityManager
    @example
        // assume em1 is an EntityManager containing a number of existing entities.
        var em2 = em1.createEmptyCopy();
        // em2 is a new EntityManager with all of em1's settings
        // but no entities.
    @method createEmptyCopy
    @return {EntityManager} A new EntityManager.
    **/
    proto.createEmptyCopy = function () {
        var copy = new ctor({
            dataService: this.dataService,
            metadataStore: this.metadataStore,
            queryOptions: this.queryOptions,
            saveOptions: this.saveOptions,
            validationOptions: this.validationOptions,
            keyGeneratorCtor: this.keyGeneratorCtor
        });
        return copy;
    };

    /**
    Attaches an entity to this EntityManager with an  {{#crossLink "EntityState"}}{{/crossLink}} of 'Added'.
    @example
        // assume em1 is an EntityManager containing a number of existing entities.
        var custType = em1.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        em1.addEntity(cust1);
    Note that this is the same as using 'attachEntity' with an {{#crossLink "EntityState"}}{{/crossLink}} of 'Added'.
    @example
        // assume em1 is an EntityManager containing a number of existing entities.
        var custType = em1.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        em1.attachEntity(cust1, EntityState.Added);
    @method addEntity
    @param entity {Entity} The entity to add.
    @return {Entity} The added entity.
    **/
    proto.addEntity = function (entity) {
        return this.attachEntity(entity, EntityState.Added);
    };

    /**
    Attaches an entity to this EntityManager with a specified {{#crossLink "EntityState"}}{{/crossLink}}.
    @example
        // assume em1 is an EntityManager containing a number of existing entities.
        var custType = em1.metadataStore.getEntityType("Customer");
        var cust1 = custType.createEntity();
        em1.attachEntity(cust1, EntityState.Added);
    @method attachEntity
    @param entity {Entity} The entity to add.
    @param [entityState=EntityState.Unchanged] {EntityState} The EntityState of the newly attached entity. If omitted this defaults to EntityState.Unchanged.
    @return {Entity} The attached entity.
    **/
    proto.attachEntity = function (entity, entityState) {
        assertParam(entity, "entity").isRequired().check();
        this.metadataStore._checkEntityType(entity);
        entityState = assertParam(entityState, "entityState").isEnumOf(EntityState).isOptional().check(EntityState.Unchanged);

        if (entity.entityType.metadataStore != this.metadataStore) {
            throw new Error("Cannot attach this entity because the EntityType and MetadataStore associated with this entity does not match this EntityManager's MetadataStore.");
        }
        var aspect = entity.entityAspect;
        if (!aspect) {
            aspect = new EntityAspect(entity);
            aspect._postInitialize(entity);
        }
        var manager = aspect.entityManager;
        if (manager) {
            if (manager == this) {
                return entity;
            } else {
                throw new Error("This entity already belongs to another EntityManager");
            }
        }
            
        var that = this;
        __using(this, "isLoading", true, function () {
            if (entityState.isAdded()) {
                checkEntityKey(that, entity);
            }
            attachEntityCore(that, entity, entityState);
            attachRelatedEntities(that, entity, entityState);
        });
        if (this.validationOptions.validateOnAttach) {
            entity.entityAspect.validateEntity();
        }
        if (!entityState.isUnchanged()) {
            this._notifyStateChange(entity, true);
        }
        this.entityChanged.publish({ entityAction: EntityAction.Attach, entity: entity });

        return entity;
    };
        
        

    /**
    Detaches an entity from this EntityManager.
    @example
        // assume em1 is an EntityManager containing a number of existing entities.
        // assume cust1 is a customer Entity previously attached to em1
        em1.detachEntity(cust1);
        // em1 will now no longer contain cust1 and cust1 will have an 
        // entityAspect.entityState of EntityState.Detached
    @method detachEntity
    @param entity {Entity} The entity to detach.
    @return {Boolean} Whether the entity could be detached. This will return false if the entity is already detached or was never attached.
    **/
    proto.detachEntity = function (entity) {
        assertParam(entity, "entity").isEntity().check();
        var aspect = entity.entityAspect;
        if (!aspect) {
            // no aspect means in couldn't appear in any group
            return false;
        }
        var group = aspect.entityGroup;
        if (!group) {
            // no group === already detached.
            return false;
        }
        if (group.entityManager !== this) {
            throw new Error("This entity does not belong to this EntityManager.");
        }
        group.detachEntity(entity);
        aspect._removeFromRelations();
        this.entityChanged.publish({ entityAction: EntityAction.Detach, entity: entity });
        aspect._detach();
        return true;
    };

    /**
    Fetches the metadata associated with the EntityManager's current 'serviceName'.  This call
    occurs internally before the first query to any service if the metadata hasn't already been
    loaded.
    @example
    Usually you will not actually process the results of a fetchMetadata call directly, but will instead
    ask for the metadata from the EntityManager after the fetchMetadata call returns.
    @example
            var em1 = new EntityManager( "api/NorthwindIBModel");
            em1.fetchMetadata()
            .then(function() {
                var metadataStore = em1.metadataStore;
                // do something with the metadata
            }
            .fail(function(exception) {
                // handle exception here
            };
    @method fetchMetadata
    @async
    @param [callback] {Function} Function called on success.
        
        successFunction([schema])
        @param [callback.schema] {Object} The raw Schema object from metadata provider - Because this schema will differ depending on the metadata provider
        it is usually better to access metadata via the 'metadataStore' property of the EntityManager after this method's Promise or callback completes.
    @param [errorCallback] {Function} Function called on failure.
            
        failureFunction([error])
        @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.
    @return {Promise} Promise 

        promiseData.schema {Object} The raw Schema object from metadata provider - Because this schema will differ depending on the metadata provider
        it is usually better to access metadata via the 'metadataStore' property of the EntityManager instead of using this 'raw' data.            
    **/
    proto.fetchMetadata = function (callback, errorCallback) {
        assertParam(callback, "callback").isFunction().isOptional().check();
        assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();

        var promise = this.metadataStore.fetchMetadata(this.dataService);

        // TODO: WARNING: DO NOT LEAVE THIS CODE IN PRODUCTION.
        // TEST::: see if serialization actually works completely
//            var that = this;
//            promise = promise.then(function () {
//                var stringified = that.metadataStore.exportMetadata();
//                that.metadataStore = new MetadataStore();
//                that.metadataStore.importMetadata(stringified);
//            });

        return promiseWithCallbacks(promise, callback, errorCallback);
    };

    /**
    Executes the specified query.
    @example
    This method can be called using a 'promises' syntax ( recommended)
    @example
            var em = new EntityManager(serviceName);
            var query = new EntityQuery("Orders");
            em.executeQuery(query)
            .then( function(data) {
                var orders = data.results;
                ... query results processed here
            }).fail( function(err) {
                ... query failure processed here
            });
    or with callbacks
    @example
            var em = new EntityManager(serviceName);
            var query = new EntityQuery("Orders");
            em.executeQuery(query,
            function(data) {
                var orders = data.results;
                ... query results processed here
            },
            function(err) {
                ... query failure processed here
            });
    Either way this method is the same as calling the The {{#crossLink "EntityQuery"}}{{/crossLink}} 'execute' method.
    @example
            var em = new EntityManager(serviceName);
            var query = new EntityQuery("Orders").using(em);
            query.execute()
            .then( function(data) {
                var orders = data.results;
                ... query results processed here
            }).fail( function(err) {
                ... query failure processed here
            });
         
    @method executeQuery
    @async
    @param query {EntityQuery|String}  The {{#crossLink "EntityQuery"}}{{/crossLink}} or OData query string to execute.
    @param [callback] {Function} Function called on success.
        
        successFunction([data])
        @param callback.data {Object} 
        @param callback.data.results {Array of Entity}
        @param callback.data.query {EntityQuery} The original query
        @param callback.data.XHR {XMLHttpRequest} The raw XMLHttpRequest returned from the server.
        @param callback.data.inlineCount {Integer} Only available if 'inlineCount(true)' was applied to the query.  Returns the count of 
        items that would have been returned by the query before applying any skip or take operators, but after any filter/where predicates
        would have been applied. 

    @param [errorCallback] {Function} Function called on failure.
            
        failureFunction([error])
        @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.
        @param [errorCallback.error.query] The query that caused the error.
        @param [errorCallback.error.XHR] {XMLHttpRequest} The raw XMLHttpRequest returned from the server.
            

    @return {Promise} Promise

        promiseData.results {Array of Entity}
        promiseData.query {EntityQuery} The original query
        promiseData.XHR {XMLHttpRequest} The raw XMLHttpRequest returned from the server.
        promiseData.inlineCount {Integer} Only available if 'inlineCount(true)' was applied to the query.  Returns the count of 
        items that would have been returned by the query before applying any skip or take operators, but after any filter/where predicates
        would have been applied. 
    **/
    proto.executeQuery = function (query, callback, errorCallback) {
        // TODO: think about creating an executeOdataQuery or executeRawOdataQuery as a seperate method.
        assertParam(query, "query").isInstanceOf(EntityQuery).or().isString().check();
        assertParam(callback, "callback").isFunction().isOptional().check();
        assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();
        var promise;
        if ( (!this.dataService.hasServerMetadata ) || this.metadataStore.hasMetadataFor(this.dataService.serviceName)) {
            promise = executeQueryCore(this, query);
        } else {
            var that = this;
            promise = this.fetchMetadata().then(function () {
                return executeQueryCore(that, query);
            }).fail(function (error) {
                return Q.reject(error);
            });
        }
        return promiseWithCallbacks(promise, callback, errorCallback);
    };

    /**
    Executes the specified query against this EntityManager's local cache.

    @example
    Because this method is executed immediately there is no need for a promise or a callback
    @example
            var em = new EntityManager(serviceName);
            var query = new EntityQuery("Orders");
            var orders = em.executeQueryLocally(query);
    Note that this can also be accomplished using the 'executeQuery' method with
    a FetchStrategy of FromLocalCache and making use of the Promise or callback
    @example
            var em = new EntityManager(serviceName);
            var query = new EntityQuery("Orders").using(FetchStrategy.FromLocalCache);
            em.executeQuery(query)
            .then( function(data) {
                var orders = data.results;
                ... query results processed here
            }).fail( function(err) {
                ... query failure processed here
            });
    @method executeQueryLocally
    @param query {EntityQuery}  The {{#crossLink "EntityQuery"}}{{/crossLink}} to execute.
    @return  {Array of Entity}  Array of Entities
    **/
    proto.executeQueryLocally = function (query) {
        assertParam(query, "query").isInstanceOf(EntityQuery).check();
        var result;
        var metadataStore = this.metadataStore;
        var entityType = query._getFromEntityType(metadataStore, true);
        // TODO: there may be multiple groups once we go further with inheritence
        var group = findOrCreateEntityGroup(this, entityType);
        // filter then order then skip then take
        var filterFunc = query._toFilterFunction(entityType);
        
        if (filterFunc) {
            var undeletedFilterFunc = function(entity) {
                return entity && (!entity.entityAspect.entityState.isDeleted()) && filterFunc(entity);
            };
            result = group._entities.filter(undeletedFilterFunc);
        } else {
            result = group._entities.filter(function(entity) {
                return entity && (!entity.entityAspect.entityState.isDeleted());
            });
        }
            
        var orderByComparer = query._toOrderByComparer(entityType);
        if (orderByComparer) {
            result.sort(orderByComparer);
        }
        var skipCount = query.skipCount;
        if (skipCount) {
            result = result.slice(skipCount);
        }
        var takeCount = query.takeCount;
        if (takeCount) {
            result = result.slice(0, takeCount);
        }

        var selectClause = query.selectClause;
        if (selectClause) {
            var selectFn = selectClause.toFunction();
            result = result.map(function(e) {
                return selectFn(e);
            });
        }
        return result;
    };

    /**
    Saves either a list of specified entities or all changed entities within this EntityManager. If there are no changes to any of the entities
    specified then there will be no server side call made but a valid 'empty' saveResult will still be returned.
    @example
    Often we will be saving all of the entities within an EntityManager that are either added, modified or deleted
    and we will let the 'saveChanges' call determine which entities these are. 
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        // This could include added, modified and deleted entities.
        em.saveChanges().then(function(saveResult) {
            var savedEntities = saveResult.entities;
            var keyMappings = saveResult.keyMappings;
        }).fail(function (e) {
            // e is any exception that was thrown.
        });
    But we can also control exactly which entities to save and can specify specific SaveOptions
    @example
        // assume entitiesToSave is an array of entities to save.
        var saveOptions = new SaveOptions({ allowConcurrentSaves: true });
        em.saveChanges(entitiesToSave, saveOptions).then(function(saveResult) {
            var savedEntities = saveResult.entities;
            var keyMappings = saveResult.keyMappings;
        }).fail(function (e) {
            // e is any exception that was thrown.
        });
    Callback methods can also be used
    @example
        em.saveChanges(entitiesToSave, null, 
            function(saveResult) {
                var savedEntities = saveResult.entities;
                var keyMappings = saveResult.keyMappings;
            }, function (e) {
                // e is any exception that was thrown.
            }
        );
    @method saveChanges
    @async
    @param [entities] {Array of Entity} The list of entities to save.  All entities with changes 
    within this EntityManager will be saved if this parameter is omitted, null or empty.
    @param [saveOptions] {SaveOptions} {{#crossLink "SaveOptions"}}{{/crossLink}} for the save - will default to
    {{#crossLink "EntityManager/saveOptions"}}{{/crossLink}} if null.
    @param [callback] {Function} Function called on success.
        
        successFunction([saveResult])
        @param [callback.saveResult] {Object} 
        @param [callback.saveResult.entities] {Array of Entity} The saved entities - with any temporary keys converted into 'real' keys.  
        These entities are actually references to entities in the EntityManager cache that have been updated as a result of the
        save.
        @param [callback.saveResult.keyMappings] {Object} Map of OriginalEntityKey, NewEntityKey
        @param [callback.saveResult.XHR] {XMLHttpRequest} The raw XMLHttpRequest returned from the server.

    @param [errorCallback] {Function} Function called on failure.
            
        failureFunction([error])
        @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.
        @param [errorCallback.error.XHR] {XMLHttpRequest} The raw XMLHttpRequest returned from the server.
    @return {Promise} Promise
    **/
    proto.saveChanges = function (entities, saveOptions, callback, errorCallback) {
        assertParam(entities, "entities").isOptional().isArray().isEntity().check();
        assertParam(saveOptions, "saveOptions").isInstanceOf(SaveOptions).isOptional().check();
        assertParam(callback, "callback").isFunction().isOptional().check();
        assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();
            
        saveOptions = saveOptions || this.saveOptions || SaveOptions.defaultInstance;
        var isFullSave = entities == null;
        var entitiesToSave = getEntitiesToSave(this, entities);
            
        if (entitiesToSave.length == 0) {
            var saveResult =  { entities: [], keyMappings: [] };
            if (callback) callback(saveResult);
            return Q.resolve(saveResult);
        }
            
        if (!saveOptions.allowConcurrentSaves) {
            var anyPendingSaves = entitiesToSave.some(function (entity) {
                return entity.entityAspect.isBeingSaved;
            });                
            if (anyPendingSaves) {
                var err = new Error("ConcurrentSaves not allowed - SaveOptions.allowConcurrentSaves is false");
                if (errorCallback) errorCallback(err);
                return Q.reject(err);
            }
        }
            
        if (this.validationOptions.validateOnSave) {
            var failedEntities = entitiesToSave.filter(function (entity) {
                var aspect = entity.entityAspect;
                var isValid = aspect.entityState.isDeleted() || aspect.validateEntity();
                return !isValid;
            });
            if (failedEntities.length > 0) {
                var valError = new Error("Validation error");
                valError.entitiesWithErrors = failedEntities;
                if (errorCallback) errorCallback(valError);
                return Q.reject(valError);
            }
        }
            
        updateConcurrencyProperties(entitiesToSave);

        // TODO: need to check that if we are doing a partial save that all entities whose temp keys 
        // are referenced are also in the partial save group

        var saveBundle = { entities: unwrapEntities(entitiesToSave, this.metadataStore), saveOptions: saveOptions};
        var saveBundleStringified = JSON.stringify(saveBundle);

        var deferred = Q.defer();
        this.dataService.adapterInstance.saveChanges(this, saveBundleStringified, deferred.resolve, deferred.reject);
        var that = this;
        return deferred.promise.then(function (rawSaveResult) {
            // HACK: simply to change the 'case' of properties in the saveResult
            // but KeyMapping properties are still ucase. ugh...
            var saveResult = { entities: rawSaveResult.Entities, keyMappings: rawSaveResult.KeyMappings, XHR: rawSaveResult.XHR };
            fixupKeys(that, saveResult.keyMappings);
                
            var queryContext = {
                query: null, // tells visitAndMerge that this is a save instead of a query
                entityManager: that,
                jsonResultsAdapter: that.dataService.jsonResultsAdapter,
                mergeStrategy: MergeStrategy.OverwriteChanges,
                refMap: {},
                deferredFns: []
            };
                
            var savedEntities = saveResult.entities.map(function (rawEntity) {
                return visitAndMerge(rawEntity, queryContext, { nodeType: "root" });
            });
            markIsBeingSaved(entitiesToSave, false);
            // update _hasChanges after save.
            that._hasChanges = (isFullSave && haveSameContents(entitiesToSave, savedEntities)) ? false : that._hasChangesCore();
            if (!that._hasChanges) {
                that.hasChangesChanged.publish({ entityManager: that, hasChanges: false });
            }
            saveResult.entities = savedEntities;
            if (callback) callback(saveResult);
            return Q.resolve(saveResult);
        }, function (error) {
            markIsBeingSaved(entitiesToSave, false);
            if (errorCallback) errorCallback(error);
            return Q.reject(error);
        });

    };
    
    function haveSameContents(arr1, arr2) {
        if (arr1.length != arr2.length) {
            return false;
        }
        for (var i=0, c=arr1.length; i<c; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    }

    // TODO: make this internal - no good reason to expose the EntityGroup to the external api yet.
    proto.findEntityGroup = function (entityType) {
        assertParam(entityType, "entityType").isInstanceOf(EntityType).check();
        return this._entityGroupMap[entityType.name];
    };

        
    /**
    Attempts to locate an entity within this EntityManager by its key. 
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var employee = em1.getEntityByKey("Employee", 1);
        // employee will either be an entity or null.
    @method getEntityByKey
    @param typeName {String} The entityType name for this key.
    @param keyValues {Object|Array of Object} The values for this key - will usually just be a single value; an array is only needed for multipart keys.
    @return {Entity} An Entity or null;
    **/
        
    /**
    Attempts to locate an entity within this EntityManager by its  {{#crossLink "EntityKey"}}{{/crossLink}}.
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var employeeType = em1.metadataStore.getEntityType("Employee");
        var employeeKey = new EntityKey(employeeType, 1);
        var employee = em1.getEntityByKey(employeeKey);
        // employee will either be an entity or null.
    @method getEntityByKey - overload
    @param entityKey {EntityKey} The  {{#crossLink "EntityKey"}}{{/crossLink}} of the Entity to be located.
    @return {Entity} An Entity or null;
    **/
    proto.getEntityByKey = function () {
        var entityKey = createEntityKey(this, arguments).entityKey;

        var group = this.findEntityGroup(entityKey.entityType);
        if (!group) {
            return null;
        }
        return group.findEntityByKey(entityKey);
    };
        
    /**
    Attempts to fetch an entity from the server by its key with
    an option to check the local cache first. Note the this EntityManager's queryOptions.mergeStrategy 
    will be used to merge any server side entity returned by this method.
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var employeeType = em1.metadataStore.getEntityType("Employee");
        var employeeKey = new EntityKey(employeeType, 1);
        em1.fetchEntityByKey(employeeKey).then(function(result) {
            var employee = result.entity;
            var entityKey = result.entityKey;
            var fromCache = result.fromCache;
        });
    @method fetchEntityByKey
    @async
    @param typeName {String} The entityType name for this key.
    @param keyValues {Object|Array of Object} The values for this key - will usually just be a single value; an array is only needed for multipart keys.
    @param checkLocalCacheFirst {Boolean=false} Whether to check this EntityManager first before going to the server. By default, the query will NOT do this.
    @return {Promise} 

        promiseData.entity {Object} The entity returned or null
        promiseData.entityKey {EntityKey} The entityKey of the entity to fetch.
        promiseData.fromCache {Boolean} Whether this entity was fetched from the server or was found in the local cache.
    **/
        
    /**
    Attempts to fetch an entity from the server by its {{#crossLink "EntityKey"}}{{/crossLink}} with
    an option to check the local cache first. 
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var employeeType = em1.metadataStore.getEntityType("Employee");
        var employeeKey = new EntityKey(employeeType, 1);
        em1.fetchEntityByKey(employeeKey).then(function(result) {
            var employee = result.entity;
            var entityKey = result.entityKey;
            var fromCache = result.fromCache;
        });
    @method fetchEntityByKey - overload
    @async
    @param entityKey {EntityKey} The  {{#crossLink "EntityKey"}}{{/crossLink}} of the Entity to be located.
    @param checkLocalCacheFirst {Boolean=false} Whether to check this EntityManager first before going to the server. By default, the query will NOT do this.
    @return {Promise} 
        
        promiseData.entity {Object} The entity returned or null
        promiseData.entityKey {EntityKey} The entityKey of the entity to fetch.
        promiseData.fromCache {Boolean} Whether this entity was fetched from the server or was found in the local cache.
    **/
    proto.fetchEntityByKey = function () {
        var tpl = createEntityKey(this, arguments);
        var entityKey = tpl.entityKey;
        var checkLocalCacheFirst = tpl.remainingArgs.length === 0 ? false : !!tpl.remainingArgs[0];
        var entity;
        var isDeleted = false;
        if (checkLocalCacheFirst) {
            entity = this.getEntityByKey(entityKey);
            isDeleted = entity && entity.entityAspect.entityState.isDeleted();
            if (isDeleted) {
                entity = null;
                if (this.queryOptions.mergeStrategy === MergeStrategy.OverwriteChanges) {
                    isDeleted = false;
                }
            }
        } 
        if (entity || isDeleted) {
            return Q.resolve({ entity: entity, entityKey: entityKey, fromCache: true });
        } else {
            return EntityQuery.fromEntityKey(entityKey).using(this).execute().then(function(data) {
                entity = (data.results.length === 0) ? null : data.results[0];
                return Q.resolve({ entity: entity, entityKey: entityKey, fromCache: false });
            });
        }
    };
        
    /**
    Attempts to locate an entity within this EntityManager by its  {{#crossLink "EntityKey"}}{{/crossLink}}.
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var employeeType = em1.metadataStore.getEntityType("Employee");
        var employeeKey = new EntityKey(employeeType, 1);
        var employee = em1.findEntityByKey(employeeKey);
        // employee will either be an entity or null.
    @method findEntityByKey
    @deprecated - use getEntityByKey instead
    @param entityKey {EntityKey} The  {{#crossLink "EntityKey"}}{{/crossLink}} of the Entity to be located.
    @return {Entity} An Entity or null;
    **/
    proto.findEntityByKey = function (entityKey) {
        return this.getEntityByKey(entityKey);
    };

    /**
    Generates a temporary key for the specified entity.  This is used to insure that newly
    created entities have unique keys and to register that these keys are temporary and
    need to be automatically replaced with 'real' key values once these entities are saved.

    The EntityManager.keyGeneratorCtor property is used internally by this method to actually generate
    the keys - See the  {{#crossLink "~keyGenerator-interface"}}{{/crossLink}} interface description to see
    how a custom key generator can be plugged in.
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var custType = em1.metadataStore.getEntityType("Customer");
        var custumer = custType.createEntity();
        var customerId = em.generateTempKeyValue(custumer);
        // The 'customer' entity 'CustomerID' property is now set to a newly generated unique id value
        // This property will change again after a successful save of the 'customer' entity.

        em1.saveChanges()
            .then( function( data) {
                var sameCust1 = data.results[0];
                // cust1 === sameCust1;
                // but cust1.getProperty("CustomerId") != customerId
                // because the server will have generated a new id 
                // and the client will have been updated with this 
                // new id.
            })

    @method generateTempKeyValue
    @param entity {Entity} The Entity to generate a key for.
    @return {Object} The new key value
    **/
    proto.generateTempKeyValue = function (entity) {
        // TODO - check if this entity is attached to this EntityManager.
        assertParam(entity, "entity").isEntity().check();
        var entityType = entity.entityType;
        var nextKeyValue = this.keyGenerator.generateTempKeyValue(entityType);
        var keyProp = entityType.keyProperties[0];
        entity.setProperty(keyProp.name, nextKeyValue);
        entity.entityAspect.hasTempKey = true;
        return nextKeyValue;
    };
        
    /**
    Returns whether there are any changed entities of the specified {{#crossLink "EntityType"}}{{/crossLink}}s. A 'changed' Entity has
    has an {{#crossLink "EntityState"}}{{/crossLink}} of either Added, Modified or Deleted.
    @example
    This method can be used to determine if an EntityManager has any changes
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        if ( em1.hasChanges() {
            // do something interesting
        }
    or if it has any changes on to a specific {{#crossLink "EntityType"}}{{/crossLink}}
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var custType = em1.metadataStore.getEntityType("Customer");
        if ( em1.hasChanges(custType) {
            // do something interesting
        }
    or to a collection of {{#crossLink "EntityType"}}{{/crossLink}}s
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var custType = em1.metadataStore.getEntityType("Customer");
        var orderType = em1.metadataStore.getEntityType("Order");
        if ( em1.hasChanges( [custType, orderType]) {
            // do something interesting
        }
    @method hasChanges
    @param [entityTypes] {String|Array of String|EntityType|Array of EntityType} The {{#crossLink "EntityType"}}{{/crossLink}}s for which 'changed' entities will be found.
    If this parameter is omitted, all EntityTypes are searched. String parameters are treated as EntityType names. 
    @return {Boolean} Whether there were any changed entities.
    **/
    proto.hasChanges = function (entityTypes) {
        if (!this._hasChanges) return false;
        if (entityTypes === undefined) return this._hasChanges;
        return this._hasChangesCore(entityTypes);
    };
        
    /**
    An {{#crossLink "Event"}}{{/crossLink}} that fires whenever an EntityManager transitions to or from having changes. 
    @example                    
        var em = new EntityManager( {serviceName: "api/NorthwindIBModel" });
        em.hasChangesChanged.subscribe(function(args) {
            var hasChangesChanged = args.hasChanges;
            var entityManager = args.entityManager;
        });
    });
      
    @event hasChangesChanged
    @param entityManager {EntityManager} The EntityManager whose 'hasChanges' status has changed. 
    @param hasChanges {Boolean} Whether or not this EntityManager has changes.
    @readOnly
    **/
        
        
    // backdoor the "really" check for changes.
    proto._hasChangesCore = function(entityTypes) {
        entityTypes = checkEntityTypes(this, entityTypes);
        var entityGroups = getEntityGroups(this, entityTypes);
        return entityGroups.some(function(eg) {
            return eg.hasChanges();
        });
    };
        
    /**
    Returns a array of all changed entities of the specified {{#crossLink "EntityType"}}{{/crossLink}}s. A 'changed' Entity has
    has an {{#crossLink "EntityState"}}{{/crossLink}} of either Added, Modified or Deleted.
    @example
    This method can be used to get all of the changed entities within an EntityManager
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var changedEntities = em1.getChanges();
    or you can specify that you only want the changes on a specific {{#crossLink "EntityType"}}{{/crossLink}}
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var custType = em1.metadataStore.getEntityType("Customer");
        var changedCustomers = em1.getChanges(custType);
    or to a collection of {{#crossLink "EntityType"}}{{/crossLink}}s
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var custType = em1.metadataStore.getEntityType("Customer");
        var orderType = em1.metadataStore.getEntityType("Order");
        var changedCustomersAndOrders = em1.getChanges([custType, orderType]);
    @method getChanges
    @param [entityTypes] {String|Array of String|EntityType|Array of EntityType} The {{#crossLink "EntityType"}}{{/crossLink}}s for which 'changed' entities will be found.
    If this parameter is omitted, all EntityTypes are searched. String parameters are treated as EntityType names. 
    @return {Array of Entity} Array of Entities
    **/
    proto.getChanges = function (entityTypes) {
        entityTypes = checkEntityTypes(this, entityTypes);
        var entityStates = [EntityState.Added, EntityState.Modified, EntityState.Deleted];
        return this._getEntitiesCore(entityTypes, entityStates);
    };

    /**
    Rejects (reverses the effects) all of the additions, modifications and deletes from this EntityManager.
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities.
        var entities = em1.rejectChanges();
        
    @method rejectChanges
    @return {Array of Entity} The entities whose changes were rejected. These entities will all have EntityStates of 
    either 'Unchanged' or 'Detached'
    **/
    proto.rejectChanges = function () {
        if (!this._hasChanges) return [];
        var entityStates = [EntityState.Added, EntityState.Modified, EntityState.Deleted];
        var changes = this._getEntitiesCore(null, entityStates);
        // next line stops individual reject changes from each calling _hasChangesCore
        this._hasChanges = false;
        changes.forEach(function(e) {
            e.entityAspect.rejectChanges();
        });
        this.hasChangesChanged.publish({ entityManager: this, hasChanges: false });
        return changes;
    };
        
    /**
    Returns a array of all entities of the specified {{#crossLink "EntityType"}}{{/crossLink}}s with the specified {{#crossLink "EntityState"}}{{/crossLink}}s. 
    @example
    This method can be used to get all of the entities within an EntityManager
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var entities = em1.getEntities();
    or you can specify that you only want the changes on a specific {{#crossLink "EntityType"}}{{/crossLink}}
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var custType = em1.metadataStore.getEntityType("Customer");
        var customers = em1.getEntities(custType);
    or to a collection of {{#crossLink "EntityType"}}{{/crossLink}}s
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var custType = em1.metadataStore.getEntityType("Customer");
        var orderType = em1.metadataStore.getEntityType("Order");
        var customersAndOrders = em1.getChanges([custType, orderType]);
    You can also ask for entities with a particular {{#crossLink "EntityState"}}{{/crossLink}} or EntityStates.
    @example
        // assume em1 is an EntityManager containing a number of preexisting entities. 
        var custType = em1.metadataStore.getEntityType("Customer");
        var orderType = em1.metadataStore.getEntityType("Order");
        var addedCustomersAndOrders = em1.getEntities([custType, orderType], EntityState.Added);
    @method getEntities
    @param [entityTypes] {String|Array of String|EntityType|Array of EntityType} The {{#crossLink "EntityType"}}{{/crossLink}}s for which entities will be found.
    If this parameter is omitted, all EntityTypes are searched. String parameters are treated as EntityType names. 
    @param [entityState] {EntityState|Array of EntityState} The {{#crossLink "EntityState"}}{{/crossLink}}s for which entities will be found.
    If this parameter is omitted, entities of all EntityStates are returned. 
    @return {Array of Entity} Array of Entities
    **/
    proto.getEntities = function (entityTypes, entityStates) {
        entityTypes = checkEntityTypes(this, entityTypes);
        assertParam(entityStates, "entityStates").isOptional().isEnumOf(EntityState).or().isNonEmptyArray().isEnumOf(EntityState).check();
            
        if (entityStates) {
            entityStates = validateEntityStates(this, entityStates);
        }
        return this._getEntitiesCore(entityTypes, entityStates);
    };
        
    // takes in entityTypes as either strings or entityTypes or arrays of either
    // and returns either an entityType or an array of entityTypes or throws an error
    function checkEntityTypes(em, entityTypes) {
        assertParam(entityTypes, "entityTypes").isString().isOptional().or().isNonEmptyArray().isString()
            .or().isInstanceOf(EntityType).or().isNonEmptyArray().isInstanceOf(EntityType).check();
        if (typeof entityTypes === "string") {
            entityTypes = em.metadataStore.getEntityType(entityTypes, false);
        } else if (Array.isArray(entityTypes) && typeof entityTypes[0] === "string") {
            entityTypes = entityTypes.map(function(etName) {
                return em.metadataStore.getEntityType(etName, false);
            });
        }
        return entityTypes;
    }

    // protected methods

    proto._notifyStateChange = function (entity, needsSave) {
        this.entityChanged.publish({ entityAction: EntityAction.EntityStateChange, entity: entity });

        if (needsSave) {
            if (!this._hasChanges) {
                this._hasChanges = true;
                this.hasChangesChanged.publish({ entityManager: this, hasChanges: true });
            }
        } else {
            // called when rejecting a change or merging an unchanged record.
            if (this._hasChanges) {
                // NOTE: this can be slow with lots of entities in the cache.
                this._hasChanges = this._hasChangesCore();
                if (!this._hasChanges) {
                    this.hasChangesChanged.publish({ entityManager: this, hasChanges: false });
                }
            }
        }
    };

    proto._getEntitiesCore = function (entityTypes, entityStates) {
        var entityGroups = getEntityGroups(this, entityTypes);

        // TODO: think about writing a core.mapMany method if we see more of these.
        var selected;
        entityGroups.forEach(function (eg) {
            // eg may be undefined or null
            if (!eg) return;
            var entities = eg.getEntities(entityStates);
            if (!selected) {
                selected = entities;
            } else {
                selected.push.apply(selected, entities);
            }
        });
        return selected || [];
    };

    proto._addUnattachedChild = function (parentEntityKey, navigationProperty, child) {
        var key = parentEntityKey.toString();
        var children = this._unattachedChildrenMap[key];
        if (!children) {
            children = [];
            this._unattachedChildrenMap[key] = children;
        }
        children.push(child);
    };

        
    proto._linkRelatedEntities = function (entity) {
        var em = this;
        var entityAspect = entity.entityAspect;
        // we do not want entityState to change as a result of linkage.
        __using(em, "isLoading", true, function () {

            var entityType = entity.entityType;
            var navigationProperties = entityType.navigationProperties;
            var unattachedMap = em._unattachedChildrenMap;

            navigationProperties.forEach(function (np) {
                if (np.isScalar) {
                    var value = entity.getProperty(np.name);
                    // property is already linked up
                    if (value) return;
                }

                // first determine if np contains a parent or child
                // having a parentKey means that this is a child
                var parentKey = entityAspect.getParentKey(np);
                if (parentKey) {
                    // check for empty keys - meaning that parent id's are not yet set.
                    if (parentKey._isEmpty()) return;
                    // if a child - look for parent in the em cache
                    var parent = em.findEntityByKey(parentKey);
                    if (parent) {
                        // if found hook it up
                        entity.setProperty(np.name, parent);
                    } else {
                        // else add parent to unresolvedParentMap;
                        unattachedMap.addChild(parentKey, np, entity);
                    }
                } else {
                    // if a parent - look for unresolved children associated with this entity
                    // and hook them up.
                    var entityKey = entityAspect.getKey();
                    var inverseNp = np.inverse;
                    if (!inverseNp) return;
                    var unattachedChildren = unattachedMap.getChildren(entityKey, inverseNp);
                    if (!unattachedChildren) return;
                    if (np.isScalar) {
                        var onlyChild = unattachedChildren[0];
                        entity.setProperty(np.name, onlyChild);
                        onlyChild.setProperty(inverseNp.name, entity);
                    } else {
                        var currentChildren = entity.getProperty(np.name);
                        unattachedChildren.forEach(function (child) {
                            currentChildren.push(child);
                            child.setProperty(inverseNp.name, entity);
                        });
                    }
                    unattachedMap.removeChildren(entityKey, np);
                }
            });
        });
    };

    // private fns
        
    function createEntityKey(em, args) {
        if (args[0] instanceof EntityKey) {
            return { entityKey: args[0], remainingArgs: Array.prototype.slice.call(args, 1) };
        } else if (typeof args[0] === 'string' && args.length >= 2) {
            var entityType = em.metadataStore.getEntityType(args[0], false);
            return { entityKey: new EntityKey(entityType, args[1]), remainingArgs: Array.prototype.slice.call(args, 2) };
        } else {
            throw new Error("This method requires as its initial parameters either an EntityKey or an entityType name followed by a value or an array of values.");
        }
    }       
        
    function markIsBeingSaved(entities, flag) {
        entities.forEach(function(entity) {
            entity.entityAspect.isBeingSaved = flag;
        });
    }

    function exportEntityGroups(em, entities) {
        var entityGroupMap;
        if (entities) {
            // group entities by entityType and 
            // create 'groups' that look like entityGroups.
            entityGroupMap = {};
            entities.forEach(function (e) {
                var group = entityGroupMap[e.entityType.name];
                if (!group) {
                    group = {};
                    group.entityType = e.entityType;
                    group._entities = [];
                    entityGroupMap[e.entityType.name] = group;
                }
                group._entities.push(e);
            });
        } else {
            entityGroupMap = em._entityGroupMap;
        }

        var tempKeys = [];
        var newGroupMap = {};
        __objectForEach(entityGroupMap, function (entityTypeName, entityGroup) {
            newGroupMap[entityTypeName] = exportEntityGroup(entityGroup, tempKeys);
        });

        return { entityGroupMap: newGroupMap, tempKeys: tempKeys };
    }

    function exportEntityGroup(entityGroup, tempKeys) {
        var resultGroup = {};
        var entityType = entityGroup.entityType;
        var dpNames = entityType.dataProperties.map(__pluck("name"));
        resultGroup.dataPropertyNames = dpNames;
        var rawEntities = [];
        entityGroup._entities.forEach(function (e) {
            if (e) {
                var rawEntity = [];
                dpNames.forEach(function(dpName) {
                    rawEntity.push(e.getProperty(dpName));
                });
                var aspect = e.entityAspect;
                var entityState = aspect.entityState;
                var newAspect = {
                    tempNavPropNames: exportTempKeyInfo(aspect, tempKeys),
                    entityState: entityState.name
                };
                if (entityState.isModified() || entityState.isDeleted()) {
                    newAspect.originalValuesMap = aspect.originalValues;
                }
                rawEntity.push(newAspect);
                rawEntities.push(rawEntity);
            }
        });
        resultGroup.entities = rawEntities;
        return resultGroup;
    }

    function exportTempKeyInfo(entityAspect, tempKeys) {
        var entity = entityAspect.entity;
        if (entityAspect.hasTempKey) {
            tempKeys.push(entityAspect.getKey().toJSON());
        }
        // create map for this entity with foreignKeys that are 'temporary'
        // map -> key: tempKey, value: fkPropName
        var tempNavPropNames;
        entity.entityType.navigationProperties.forEach(function (np) {
            if (np.relatedDataProperties) {
                var relatedValue = entity.getProperty(np.name);
                if (relatedValue && relatedValue.entityAspect.hasTempKey) {
                    tempNavPropNames = tempNavPropNames || [];
                    tempNavPropNames.push(np.name);
                }
            }
        });
        return tempNavPropNames;
    }

    function importEntityGroup(entityGroup, jsonGroup, config) {

        var tempKeyMap = config.tempKeyMap;

        var entityType = entityGroup.entityType;
        var shouldOverwrite = config.mergeStrategy === MergeStrategy.OverwriteChanges;
        var targetEntity = null;
        var dpNames = jsonGroup.dataPropertyNames;
        var dataProperties = dpNames.map(function(dpName) {
            return entityType.getProperty(dpName);
        });
        var keyIxs = entityType.keyProperties.map(function (kp) {
            return dpNames.indexOf(kp.name);
        });
        var lastIx = dpNames.length;
        var entityChanged = entityGroup.entityManager.entityChanged;
        jsonGroup.entities.forEach(function (rawEntity) {
            var newAspect = rawEntity[lastIx];
            var keyValues = keyIxs.map(function (ix) { return rawEntity[ix]; });
            var entityKey = new EntityKey(entityType, keyValues);
            var entityState = EntityState.fromName(newAspect.entityState);
            var newTempKeyValue;
            if (entityState.isAdded()) {
                newTempKeyValue = tempKeyMap[entityKey.toString()];
                if (newTempKeyValue === undefined) {
                    // merge added records with non temp keys
                    targetEntity = entityGroup.findEntityByKey(entityKey);
                } else {
                    targetEntity = null;
                }
            } else {
                targetEntity = entityGroup.findEntityByKey(entityKey);
            }

            if (targetEntity) {
                var wasUnchanged = targetEntity.entityAspect.entityState.isUnchanged();
                if (shouldOverwrite || wasUnchanged) {
                    dataProperties.forEach(function (dp, ix) {
                        if (dp.dataType == DataType.DateTime) {
                            targetEntity.setProperty(dp.name, new Date(Date.parse(rawEntity[ix])));
                        } else {
                            targetEntity.setProperty(dp.name, rawEntity[ix]);
                        }
                    });
                    entityChanged.publish({ entityAction: EntityAction.MergeOnImport, entity: targetEntity });
                    if (wasUnchanged) {
                        if (!entityState.isUnchanged()) {
                            entityGroup.entityManager._notifyStateChange(targetEntity, true);
                        }
                    } else {
                        if (entityState.isUnchanged()) {
                            entityGroup.entityManager._notifyStateChange(targetEntity, false);
                        }
                    }
                } else {
                    targetEntity = null;
                }
            } else {
                targetEntity = entityType._createEntityCore();
                dataProperties.forEach(function (dp, ix) {
                    if (dp.dataType == DataType.DateTime) {
                        targetEntity.setProperty(dp.name, new Date(Date.parse(rawEntity[ix])));
                    } else {
                        targetEntity.setProperty(dp.name, rawEntity[ix]);
                    }
                });
                if (newTempKeyValue !== undefined) {
                    // fixup pk
                    targetEntity.setProperty(entityType.keyProperties[0].name, newTempKeyValue);

                    // fixup foreign keys
                    if (newAspect.tempNavPropNames) {
                        newAspect.tempNavPropNames.forEach(function (npName) {
                            var np = entityType.getNavigationProperty(npName);
                            var fkPropName = np.relatedDataProperties[0].name;
                            var oldFkValue = targetEntity.getProperty(fkPropName);
                            var fk = new EntityKey(np.entityType, [oldFkValue]);
                            var newFkValue = tempKeyMap[fk.toString()];
                            targetEntity.setProperty(fkPropName, newFkValue);
                        });
                    }
                }
                targetEntity.entityAspect._postInitialize();
                targetEntity = entityGroup.attachEntity(targetEntity, entityState);
                if (entityChanged) {
                    entityChanged.publish({ entityAction: EntityAction.AttachOnImport, entity: targetEntity });
                    if (!entityState.isUnchanged()) {
                        entityGroup.entityManager._notifyStateChange(targetEntity, true);
                    }
                }
            }

            if (targetEntity) {
                targetEntity.entityAspect.entityState = entityState;
                if (entityState.isModified()) {
                    targetEntity.entityAspect.originalValuesMap = newAspect.originalValues;
                }
                entityGroup.entityManager._linkRelatedEntities( targetEntity);
            }
        });
    }

    function promiseWithCallbacks(promise, callback, errorCallback) {

        promise = promise.then(function (data) {
            if (callback) callback(data);
            return Q.resolve(data);
        }).fail(function (error) {
            if (errorCallback) errorCallback(error);
            return Q.reject(error);
        });
        return promise;
    }

    function getEntitiesToSave(em, entities) {
        var entitiesToSave;
        if (entities) {
            entitiesToSave = entities.filter(function (e) {
                if (e.entityAspect.entityManager !== em) {
                    throw new Error("Only entities in this entityManager may be saved");
                }
                return !e.entityAspect.entityState.isDetached();
            });
        } else {
            entitiesToSave = em.getChanges();
        }
        return entitiesToSave;
    }

    function fixupKeys(em, keyMappings) {
        keyMappings.forEach(function (km) {
            var entityTypeName = EntityType._getNormalizedTypeName(km.EntityTypeName);
            var group = em._entityGroupMap[entityTypeName];
            group._fixupKey(km.TempValue, km.RealValue);
        });
    }

    function getEntityGroups(em, entityTypes) {
        var groupMap = em._entityGroupMap;
        if (entityTypes) {
            if (entityTypes instanceof EntityType) {
                return [groupMap[entityTypes.name]];
            } else if (Array.isArray(entityTypes)) {
                return entityTypes.map(function (et) {
                    if (et instanceof EntityType) {
                        return groupMap[et.name];
                    } else {
                        throw createError();
                    }
                });
            } else {
                throw createError();
            }
        } else {
            return __getOwnPropertyValues(groupMap);
        }

        function createError() {
            return new Error("The EntityManager.getChanges() 'entityTypes' parameter must be either an entityType or an array of entityTypes or null");
        }
    }

    function checkEntityKey(em, entity) {
        var ek = entity.entityAspect.getKey();
        // return properties that are = to defaultValues
        var keyPropsWithDefaultValues = __arrayZip(entity.entityType.keyProperties, ek.values, function (kp, kv) {
            return (kp.defaultValue === kv) ? kp : null;
        }).filter(function (kp) {
            return kp !== null;
        });
        if (keyPropsWithDefaultValues.length) {
            if (entity.entityType.autoGeneratedKeyType !== AutoGeneratedKeyType.None) {
                em.generateTempKeyValue(entity);
            } else {
                // we will allow attaches of entities where only part of the key is set.
                if (keyPropsWithDefaultValues.length === ek.values.length) {
                    throw new Error("Cannot attach an object to an EntityManager without first setting its key or setting its entityType 'AutoGeneratedKeyType' property to something other than 'None'");
                }
            }
        }
    }

    function validateEntityStates(em, entityStates) {
        if (!entityStates) return null;
        if (EntityState.contains(entityStates)) {
            entityStates = [entityStates];
        } else if (Array.isArray(entityStates)) {
            entityStates.forEach(function (es) {
                if (!EntityState.contains(es)) {
                    throw createError();
                }
            });
        } else {
            throw createError();
        }
        return entityStates;

        function createError() {
            return new Error("The EntityManager.getChanges() 'entityStates' parameter must either be null, an entityState or an array of entityStates");
        }
    }

    function attachEntityCore(em, entity, entityState) {
        var group = findOrCreateEntityGroup(em, entity.entityType);
        group.attachEntity(entity, entityState);
        em._linkRelatedEntities(entity);
    }

    function attachRelatedEntities(em, entity, entityState) {
        var navProps = entity.entityType.navigationProperties;
        navProps.forEach(function (np) {
            var related = entity.getProperty(np.name);
            if (np.isScalar) {
                if (!related) return;
                em.attachEntity(related, entityState);
            } else {
                related.forEach(function (e) {
                    em.attachEntity(e, entityState);
                });
            }
        });
    }

    // returns a promise
    function executeQueryCore(em, query) {
        try {
            var metadataStore = em.metadataStore;
            var dataService = query.dataService || em.dataService;
            if (metadataStore.isEmpty() && dataService.hasServerMetadata) {
                throw new Error("cannot execute _executeQueryCore until metadataStore is populated.");
            }
            var queryOptions = query.queryOptions || em.queryOptions || QueryOptions.defaultInstance;
            if (queryOptions.fetchStrategy == FetchStrategy.FromLocalCache) {
                return Q.fcall(function () {
                    var results = em.executeQueryLocally(query);
                    return { results: results, query: query };
                });
            }
            
            var jsonResultsAdapter = query.jsonResultsAdapter || dataService.jsonResultsAdapter;

            var odataQuery = toOdataQueryString(query, metadataStore);
            var queryContext = {
                    query: query,
                    entityManager: em,
                    dataService: dataService,
                    mergeStrategy: queryOptions.mergeStrategy,
                    jsonResultsAdapter: jsonResultsAdapter,
                    refMap: {}, 
                    deferredFns: []
            };
            var deferred = Q.defer();
            var validateOnQuery = em.validationOptions.validateOnQuery;
            var promise = deferred.promise;
                
            dataService.adapterInstance.executeQuery(em, odataQuery, function (data) {
                var result = __wrapExecution(function () {
                    var state = { isLoading: em.isLoading };
                    em.isLoading = true;
                    em._pendingPubs = [];
                    return state;
                }, function (state) {
                    // cleanup
                    em.isLoading = state.isLoading;
                    em._pendingPubs.forEach(function(fn) { fn(); });
                    em._pendingPubs = null;
                    // HACK for GC
                    query = null;
                    queryContext = null;
                    // HACK: some errors thrown in next function do not propogate properly - this catches them.
                    if (state.error) deferred.reject(state.error);

                }, function () {
                    var nodes = jsonResultsAdapter.extractResults(data);
                    if (!Array.isArray(nodes)) {
                        nodes = [nodes];
                    }
                    var results = nodes.map(function (node) {
                        var r = visitAndMerge(node, queryContext, { nodeType: "root" });
                        // anon types and simple types will not have an entityAspect.
                        if (validateOnQuery && r.entityAspect) {
                            r.entityAspect.validateEntity();
                        }
                        return r;
                    });
                    if (queryContext.deferredFns.length > 0) {
                        queryContext.deferredFns.forEach(function(fn) {
                            fn();
                        });
                    }
                    return { results: results, query: query, XHR: data.XHR, inlineCount: data.inlineCount };
                });
                deferred.resolve( result);
            }, function (e) {
                if (e) {
                    e.query = query;
                }
                deferred.reject(e);
            });
            return promise;
        } catch (e) {
            if (e) {
                e.query = query;
            }
            return Q.reject(e);
        }
    }
               
    function visitAndMerge(node, queryContext, nodeContext) {
        nodeContext = nodeContext || {};
        var meta = queryContext.jsonResultsAdapter.visitNode(node, queryContext, nodeContext);
        if (queryContext.query && nodeContext.isTopLevel && !meta.entityType) {
            meta.entityType = queryContext.query._getToEntityType && queryContext.query._getToEntityType(queryContext.entityManager.metadataStore);
        }
        return processMeta(node, queryContext, meta);
    }
        
    function processMeta(node, queryContext, meta, assignFn) {
        // == is deliberate here instead of ===
        if (meta.ignore || node == null) {
            return null;
        } else if (meta.nodeRefId) {
            var refValue = resolveRefEntity(meta.nodeRefId, queryContext);
            if (typeof refValue == "function") {
                queryContext.deferredFns.push(function () {
                    assignFn(refValue);
                });
                return undefined; // deferred and will be set later;
            }
            return refValue;
        } else if (meta.entityType) {
            return mergeEntity(node, queryContext, meta);
        } else {
            // updating the refMap for entities is handled by updateEntityRef for entities.
            if (meta.nodeId) {
                queryContext.refMap[meta.nodeId] = node;
            }
                
            if (typeof node === 'object') {
                return processAnonType(node, queryContext);
            } else {
                return node;
            }
        }
    }
        
    function resolveRefEntity(nodeRefId, queryContext) {
        var entity = queryContext.refMap[nodeRefId];
        if (entity === undefined) {
            return function () { return queryContext.refMap[nodeRefId]; };
        } else {
            return entity;
        }
    }
        
    function mergeEntity(node, queryContext, meta) {
        node._$meta = meta;
        var entityType = meta.entityType;
        node.entityType = entityType;
            
        var em = queryContext.entityManager;
        var mergeStrategy = queryContext.mergeStrategy;
        var isSaving = queryContext.query == null;

            
        var entityKey = EntityKey._fromRawEntity(node, entityType);
        var targetEntity = em.findEntityByKey(entityKey);
        if (targetEntity) {
            if (isSaving && targetEntity.entityAspect.entityState.isDeleted()) {
                em.detachEntity(targetEntity);
                return targetEntity;
            }
            var targetEntityState = targetEntity.entityAspect.entityState;
            if (mergeStrategy === MergeStrategy.OverwriteChanges
                    || targetEntityState.isUnchanged()) {
                updateEntity(targetEntity, node, queryContext);
                targetEntity.entityAspect.wasLoaded = true;
                    
                targetEntity.entityAspect.entityState = EntityState.Unchanged;
                targetEntity.entityAspect.originalValues = {};
                targetEntity.entityAspect.propertyChanged.publish({ entity: targetEntity, propertyName: null  });
                var action = isSaving ? EntityAction.MergeOnSave : EntityAction.MergeOnQuery;
                em.entityChanged.publish({ entityAction: action, entity: targetEntity });
                // this is needed to handle an overwrite or a modified entity with an unchanged entity 
                // which might in turn cause _hasChanges to change.
                if (!targetEntityState.isUnchanged) {
                    em._notifyStateChange(targetEntity, false);
                }
            } else {
                updateEntityRef(queryContext, targetEntity, node);
                // we still need to merge related entities even if top level entity wasn't modified.
                entityType.navigationProperties.forEach(function (np) {
                    if (np.isScalar) {
                        mergeRelatedEntityCore(node, np, queryContext);
                    } else {
                        mergeRelatedEntitiesCore(node, np, queryContext);
                    }
                });
            }

        } else {
            targetEntity = entityType._createEntityCore();
            if (targetEntity.initializeFrom) {
                // allows any injected post ctor activity to be performed by modelLibrary impl.
                targetEntity.initializeFrom(node);
            }
            updateEntity(targetEntity, node, queryContext);
            targetEntity.entityAspect._postInitialize();
            attachEntityCore(em, targetEntity, EntityState.Unchanged);
            targetEntity.entityAspect.wasLoaded = true;
            em.entityChanged.publish({ entityAction: EntityAction.AttachOnQuery, entity: targetEntity });
        }
        return targetEntity;
    }
        
    function processAnonType(node, queryContext) {
        // node is guaranteed to be an object by this point, i.e. not a scalar          
        var em = queryContext.entityManager;
        var jsonResultsAdapter = queryContext.jsonResultsAdapter;
        var keyFn = em.metadataStore.namingConvention.serverPropertyNameToClient;
        var result = { };
        __objectForEach(node, function(key, value) {
            var meta = jsonResultsAdapter.visitNode(value, queryContext, { nodeType: "anonProp", propertyName: key });
            if (meta.ignore) return;
                
            var newKey = keyFn(key);
                
            if (Array.isArray(value)) {
                result[newKey] = value.map(function(v, ix) {
                    meta = jsonResultsAdapter.visitNode(v, queryContext, { nodeType: "anonPropItem", propertyName: key });
                    return processMeta(v, queryContext, meta, function(refValue) {
                        result[newKey][ix] = refValue();
                    });
                });
            } else {
                result[newKey] = processMeta(value, queryContext, meta, function(refValue) {
                    result[newKey] = refValue();
                });
            }
        });
        return result;
    }

    function updateEntity(targetEntity, rawEntity, queryContext) {
        updateEntityRef(queryContext, targetEntity, rawEntity);
        var entityType = targetEntity.entityType;
            
        entityType.dataProperties.forEach(function (dp) {
            if (dp.isUnmapped) return;
            var val = rawEntity[dp.nameOnServer];
            if (dp.dataType === DataType.DateTime && val) {
                if (!__isDate(val)) {
                    val = DataType.parseDateFromServer(val);
                }
            } else if (dp.dataType == DataType.Binary) {
                if (val && val.$value !== undefined) {
                    val = val.$value; // this will be a byte[] encoded as a string
                }
            } else if (dp.isComplexProperty) {
                if (val != undefined) {
                    var coVal = targetEntity.getProperty(dp.name);
                    dp.dataType.dataProperties.forEach(function(cdp) {
                        // recursive call
                        coVal.setProperty(cdp.name, val[cdp.nameOnServer]);
                    });
                }
            }

            if (!dp.isComplexProperty) {
                targetEntity.setProperty(dp.name, val);
            }
        });
            
        entityType.navigationProperties.forEach(function (np) {
            if (np.isScalar) {
                mergeRelatedEntity(np, targetEntity, rawEntity, queryContext);
            } else {
                mergeRelatedEntities(np, targetEntity, rawEntity, queryContext);
            }
        });
    }
        
        
    function updateEntityRef(queryContext, targetEntity, rawEntity) {
        var nodeId = rawEntity._$meta.nodeId;
        if (nodeId != null) {
            queryContext.refMap[nodeId] = targetEntity;
        }
    }

    function mergeRelatedEntity(navigationProperty, targetEntity, rawEntity, queryContext) {
          
        var relatedEntity = mergeRelatedEntityCore(rawEntity, navigationProperty, queryContext);
        if (relatedEntity == null) return;
        if (typeof relatedEntity === 'function') {
            queryContext.deferredFns.push(function() {
                relatedEntity = relatedEntity();
                updateRelatedEntity(relatedEntity, targetEntity, navigationProperty);
            });
        } else {
            updateRelatedEntity(relatedEntity, targetEntity, navigationProperty);
        }
    }
        
    function mergeRelatedEntityCore(rawEntity, navigationProperty, queryContext) {
        var relatedRawEntity = rawEntity[navigationProperty.nameOnServer];
        if (!relatedRawEntity) return null;
            
        var relatedEntity = visitAndMerge(relatedRawEntity, queryContext, { nodeType: "navProp",  navigationProperty: navigationProperty });
        return relatedEntity;
    }
        
    function updateRelatedEntity(relatedEntity, targetEntity, navigationProperty) {
        if (!relatedEntity) return;
        var propName = navigationProperty.name;
        var currentRelatedEntity = targetEntity.getProperty(propName);
        // check if the related entity is already hooked up
        if (currentRelatedEntity != relatedEntity) {
            // if not hook up both directions.
            targetEntity.setProperty(propName, relatedEntity);
            var inverseProperty = navigationProperty.inverse;
            if (!inverseProperty) return;
            if (inverseProperty.isScalar) {
                relatedEntity.setProperty(inverseProperty.name, targetEntity);
            } else {
                var collection = relatedEntity.getProperty(inverseProperty.name);
                collection.push(targetEntity);
            }
        }
    }

       
    function mergeRelatedEntities(navigationProperty, targetEntity, rawEntity, queryContext) {
        var relatedEntities = mergeRelatedEntitiesCore(rawEntity, navigationProperty, queryContext);
        if (relatedEntities == null) return;
            
        var inverseProperty = navigationProperty.inverse;
        if (!inverseProperty) return;
        var originalRelatedEntities = targetEntity.getProperty(navigationProperty.name);
        originalRelatedEntities.wasLoaded = true;
        relatedEntities.forEach(function (relatedEntity) {
            if (typeof relatedEntity === 'function') {
                queryContext.deferredFns.push(function() {
                    relatedEntity = relatedEntity();
                    updateRelatedEntityInCollection(relatedEntity, originalRelatedEntities, targetEntity, inverseProperty);
                });
            } else {
                updateRelatedEntityInCollection(relatedEntity, originalRelatedEntities, targetEntity, inverseProperty);
            }
        });
    }

    function mergeRelatedEntitiesCore(rawEntity, navigationProperty, queryContext) {
        var relatedRawEntities = rawEntity[navigationProperty.nameOnServer];
        if (!relatedRawEntities) return null;
            
        // needed if what is returned is not an array and we expect one - this happens with __deferred in OData.
        if (!Array.isArray(relatedRawEntities)) return null;

        var relatedEntities = relatedRawEntities.map(function(relatedRawEntity) {
            return visitAndMerge(relatedRawEntity, queryContext, { nodeType: "navPropItem", navigationProperty: navigationProperty });
        });
        return relatedEntities;

    }

    function updateRelatedEntityInCollection(relatedEntity, relatedEntities, targetEntity, inverseProperty) {
        if (!relatedEntity) return;
        // check if the related entity is already hooked up
        var thisEntity = relatedEntity.getProperty(inverseProperty.name);
        if (thisEntity !== targetEntity) {
            // if not - hook it up.
            relatedEntities.push(relatedEntity);
            relatedEntity.setProperty(inverseProperty.name, targetEntity);
        }
    }

    function updateConcurrencyProperties(entities) {
        var candidates = entities.filter(function (e) {
            e.entityAspect.isBeingSaved = true;
            return e.entityAspect.entityState.isModified()
                && e.entityType.concurrencyProperties.length > 0;

        });
        if (candidates.length === 0) return;
        candidates.forEach(function (c) {
            c.entityType.concurrencyProperties.forEach(function (cp) {
                updateConcurrencyProperty(c, cp);
            });
        });
    }

    function updateConcurrencyProperty(entity, property) {
        // check if property has already been updated 
        if (entity.entityAspect.originalValues[property.name]) return;
        var value = entity.getProperty(property.name);
        if (!value) value = property.dataType.defaultValue;
        if (property.dataType.isNumeric) {
            entity.setProperty(property.name, value + 1);
        } else if (property.dataType === DataType.DateTime) {
            // use the current datetime but insure that it
            // is different from previous call.
            var dt = new Date();
            var dt2 = new Date();
            while (dt == dt2) {
                dt2 = new Date();
            }
            entity.setProperty(property.name, dt2);
        } else if (property.dataType === DataType.Guid) {
            entity.setProperty(property.name, __getUuid());
        } else if (property.dataType === DataType.Binary) {
            // best guess - that this is a timestamp column and is computed on the server during save 
            // - so no need to set it here.
            return;
        } else {
            // this just leaves DataTypes of Boolean, String and Byte - none of which should be the
            // type for a concurrency column.
            // NOTE: thought about just returning here but would rather be safe for now. 
            throw new Error("Unable to update the value of concurrency property before saving: " + property.name);
        }
    }

    function toOdataQueryString(query, metadataStore) {
        if (!query) {
            throw new Error("query cannot be empty");
        }
        if (typeof query === 'string') {
            return query;
        } else if (query instanceof EntityQuery) {
            return query._toUri(metadataStore);
        } else {
            throw new Error("unable to recognize query parameter as either a string or an EntityQuery");
        }
    }

    function findOrCreateEntityGroup(em, entityType) {
        var group = em._entityGroupMap[entityType.name];
        if (!group) {
            group = new EntityGroup(em, entityType);
            em._entityGroupMap[entityType.name] = group;
        }
        return group;
    }
        
    function unwrapEntities(entities, metadataStore) {
        var rawEntities = entities.map(function(e) {
            var rawEntity = unwrapInstance(e);

            var autoGeneratedKey = null;
            if (e.entityType.autoGeneratedKeyType !== AutoGeneratedKeyType.None) {
                autoGeneratedKey = {
                    propertyName: e.entityType.keyProperties[0].nameOnServer,
                    autoGeneratedKeyType: e.entityType.autoGeneratedKeyType.name
                };
            }
                
            var originalValuesOnServer = unwrapOriginalValues(e, metadataStore);
            rawEntity.entityAspect = {
                entityTypeName: e.entityType.name,
                entityState: e.entityAspect.entityState.name,
                originalValuesMap: originalValuesOnServer,
                autoGeneratedKey: autoGeneratedKey
            };
            return rawEntity;
        });
        return rawEntities;
    }
        
    function unwrapInstance(structObj) {
        var rawObject = {};
        var stype = structObj.entityType || structObj.complexType;
        stype.dataProperties.forEach(function (dp) {
            if (dp.isComplexProperty) {
                rawObject[dp.nameOnServer] = unwrapInstance(structObj.getProperty(dp.name));
            } else {
                rawObject[dp.nameOnServer] = structObj.getProperty(dp.name);
            }
        });
        return rawObject;
    }
        
    function unwrapOriginalValues(target, metadataStore) {
        var stype = target.entityType || target.complexType;
        var aspect = target.entityAspect || target.complexAspect;
        var fn = metadataStore.namingConvention.clientPropertyNameToServer;
        var result = {};
        __objectForEach(aspect.originalValues, function (propName, value) {
            var prop = stype.getProperty(propName);
            result[fn(propName, prop)] = value;
        });
        stype.complexProperties.forEach(function(cp) {
            var nextTarget = target.getProperty(cp.name);
            var unwrappedCo = unwrapOriginalValues(nextTarget, metadataStore);
            if (!__isEmpty(unwrappedCo)) {
                result[fn(cp.name, cp)] = unwrappedCo;
            }
        });
        return result;
    }
        

    function UnattachedChildrenMap() {
        // key is EntityKey.toString(), value is array of { navigationProperty, children }
        this.map = {};
    }

    UnattachedChildrenMap.prototype.addChild = function (parentEntityKey, navigationProperty, child) {
        var tuple = this.getTuple(parentEntityKey, navigationProperty);
        if (!tuple) {
            var tuples = this.map[parentEntityKey.toString()];
            if (!tuples) {
                tuples = [];
                this.map[parentEntityKey.toString()] = tuples;
            }
            tuple = { navigationProperty: navigationProperty, children: [] };
            tuples.push(tuple);
        }
        tuple.children.push(child);
    };

    UnattachedChildrenMap.prototype.removeChildren = function (parentEntityKey, navigationProperty) {
        var tuples = this.map[parentEntityKey.toString()];
        if (!tuples) return;
        __arrayRemoveItem(tuples, function (t) {
            return t.navigationProperty === navigationProperty;
        });
        if (!tuples.length) {
            delete this.map[parentEntityKey.toString()];
        }
    };

    UnattachedChildrenMap.prototype.getChildren = function (parentEntityKey, navigationProperty) {
        var tuple = this.getTuple(parentEntityKey, navigationProperty);
        if (tuple) {
            return tuple.children.filter(function (child) {
                // it may have later been detached.
                return !child.entityAspect.entityState.isDetached();
            });
        } else {
            return null;
        }
    };

    UnattachedChildrenMap.prototype.getTuple = function (parentEntityKey, navigationProperty) {
        var tuples = this.map[parentEntityKey.toString()];
        if (!tuples) return null;
        var tuple = __arrayFirst(tuples, function (t) {
            return t.navigationProperty === navigationProperty;
        });
        return tuple;
    };

    return ctor;
})();

var EntityGroup = (function () {

    var __changedFilter = getFilter([EntityState.Added, EntityState.Modified, EntityState.Deleted]);
        
    var ctor = function (entityManager, entityType) {
        this.entityManager = entityManager;
        this.entityType = entityType;
        this._indexMap = {};
        this._entities = [];
        this._emptyIndexes = [];
    };
    var proto = ctor.prototype;

    proto.attachEntity = function (entity, entityState) {
        // entity should already have an aspect.
        var ix;
        var aspect = entity.entityAspect;
        var keyInGroup = aspect.getKey()._keyInGroup;
        ix = this._indexMap[keyInGroup];
        if (ix >= 0) {
            if (this._entities[ix] === entity) {
                return entity;
            }
            throw new Error("This key is already attached: " + aspect.getKey());
        }

        if (this._emptyIndexes.length === 0) {
            ix = this._entities.push(entity) - 1;
        } else {
            ix = this._emptyIndexes.pop();
            this._entities[ix] = entity;
        }
        this._indexMap[keyInGroup] = ix;
        aspect.entityState = entityState;
        aspect.entityGroup = this;
        aspect.entityManager = this.entityManager;
        return entity;
    };

    proto.detachEntity = function (entity) {
        // by this point we have already determined that this entity 
        // belongs to this group.
        var aspect = entity.entityAspect;
        var keyInGroup = aspect.getKey()._keyInGroup;
        var ix = this._indexMap[keyInGroup];
        if (ix === undefined) {
            // shouldn't happen.
            throw new Error("internal error - entity cannot be found in group");
        }
        delete this._indexMap[keyInGroup];
        this._emptyIndexes.push(ix);
        this._entities[ix] = null;
        return entity;
    };
        


    // returns entity based on an entity key defined either as an array of key values or an EntityKey
    proto.findEntityByKey = function (entityKey) {
        var keyInGroup;
        if (entityKey instanceof EntityKey) {
            keyInGroup = entityKey._keyInGroup;
        } else {
            keyInGroup = EntityKey.createKeyString(entityKey);
        }
        var ix = this._indexMap[keyInGroup];
        // can't use just (ix) below because 0 is valid
        return (ix !== undefined) ? this._entities[ix] : null;
    };

    proto.hasChanges = function() {
        return this._entities.some(__changedFilter);
    };

    proto.getEntities = function (entityStates) {
        var filter = getFilter(entityStates);
        var changes = this._entities.filter(filter);
        return changes;
    };
        
    // do not expose this method. It is doing a special purpose INCOMPLETE fast detach operation
    // just for the entityManager clear method - the entityGroup will be in an inconsistent state
    // after this op, which is ok because it will be thrown away.
    proto._clear = function() {
        this._entities.forEach(function (entity) {
            if (entity != null) {
                entity.entityAspect._detach();
            }
        });
        this._entities = null;
        this._indexMap = null;
        this._emptyIndexes = null;
    };

    proto._fixupKey = function (tempValue, realValue) {
        // single part keys appear directly in map
        var ix = this._indexMap[tempValue];
        if (ix === undefined) {
            throw new Error("Internal Error in key fixup - unable to locate entity");
        }
        var entity = this._entities[ix];
        var keyPropName = entity.entityType.keyProperties[0].name;
        // fks on related entities will automatically get updated by this as well
        entity.setProperty(keyPropName, realValue);
        delete entity.entityAspect.hasTempKey;
        delete this._indexMap[tempValue];
        this._indexMap[realValue] = ix;
    };

    proto._replaceKey = function(oldKey, newKey) {
        var ix = this._indexMap[oldKey._keyInGroup];
        delete this._indexMap[oldKey._keyInGroup];
        this._indexMap[newKey._keyInGroup] = ix;
    };
        
    function getFilter(entityStates) {
        if (!entityStates) {
            return function (e) {
                return !!e;
            };
        } else if (entityStates.length === 1) {
            var entityState = entityStates[0];
            return function (e) {
                if (!e) return false;
                return e.entityAspect.entityState === entityState;
            };
        } else {
            return function (e) {
                if (!e) return false;
                return entityStates.some(function (es) {
                    return e.entityAspect.entityState === es;
                });
            };
        }
    }

    return ctor;

})();
   
// expose

breeze.EntityManager = EntityManager;



