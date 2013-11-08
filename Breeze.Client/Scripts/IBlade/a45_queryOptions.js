/**
@module breeze
**/
   
var MergeStrategy = (function() {
    /**
    MergeStrategy is an 'Enum' that determines how entities are merged into an EntityManager.
    
    @class MergeStrategy
    @static
    **/
    var MergeStrategy = new Enum("MergeStrategy");
    /**
    MergeStrategy.PreserveChanges updates the cached entity with the incoming values unless the cached entity is in a changed 
    state (added, modified, deleted) in which case the incoming values are ignored. The updated cached entity’s EntityState will
    remain {{#crossLink "EntityState/Unchanged"}}{{/crossLink}} unless you’re importing entities in which case the new EntityState will 
    be that of the imported entities.
    
    @property PreserveChanges {MergeStrategy}
    @final
    @static
    **/
    MergeStrategy.PreserveChanges = MergeStrategy.addSymbol();
    /**
    MergeStrategy.OverwriteChanges always updates the cached entity with incoming values even if the entity is in
    a changed state (added, modified, deleted). After the merge, the pending changes are lost. 
    The new EntityState will be  {{#crossLink "EntityState/Unchanged"}}{{/crossLink}} unless you’re importing entities 
    in which case the new EntityState will be that of the imported entities.   
    
    @property OverwriteChanges {MergeStrategy}
    @final
    @static
    **/
    MergeStrategy.OverwriteChanges = MergeStrategy.addSymbol();

    /**
    SkipMerge is used to ignore incoming values. Adds the incoming entity to the cache only if there is no cached entity with the same key. 
    This is the fastest merge strategy but your existing cached data will remain “stale”.
  
    @property SkipMerge {MergeStrategy}
    @final
    @static
    **/
    MergeStrategy.SkipMerge = MergeStrategy.addSymbol();

    /**
    Disallowed is used to throw an exception if there is an incoming entity with the same key as an entity already in the cache.  
    Use this strategy when you want to be sure that the incoming entity is not already in cache. 
    This is the default strategy for EntityManager.attachEntity.
  
    @property Disallowed {MergeStrategy}
    @final
    @static
    **/
    MergeStrategy.Disallowed = MergeStrategy.addSymbol();
    MergeStrategy.seal();
    return MergeStrategy;
})();

var FetchStrategy = (function() {
    /**
    FetchStrategy is an 'Enum' that determines how and where entities are retrieved from as a result of a query.
    
    @class FetchStrategy
    @static
    **/
    var FetchStrategy = new Enum("FetchStrategy");
    /**
    FromServer is used to tell the query to execute the query against a remote data source on the server.
    @property FromServer {MergeStrategy}
    @final
    @static
    **/
    FetchStrategy.FromServer = FetchStrategy.addSymbol();
    /**
    FromLocalCache is used to tell the query to execute the query against a local EntityManager instead of going to a remote server.
    @property FromLocalCache {MergeStrategy}
    @final
    @static
    **/
    FetchStrategy.FromLocalCache = FetchStrategy.addSymbol();
    FetchStrategy.seal();
    return FetchStrategy;
})();

var QueryOptions = (function () {
    /**
    A QueryOptions instance is used to specify the 'options' under which a query will occur.

    @class QueryOptions
    **/
        
    /**
    QueryOptions constructor
    @example
        var newQo = new QueryOptions( { mergeStrategy: MergeStrategy.OverwriteChanges });
        // assume em1 is a preexisting EntityManager
        em1.setProperties( { queryOptions: newQo });

    Any QueryOptions property that is not defined will be defaulted from any QueryOptions defined at a higher level in the breeze hierarchy, i.e. 
    -  from query.queryOptions 
    -  to   entityManager.queryOptions 
    -  to   QueryOptions.defaultInstance;

    @method <ctor> QueryOptions
    @param [config] {Object}
    @param [config.fetchStrategy] {FetchStrategy}  
    @param [config.mergeStrategy] {MergeStrategy}  
    **/
    var ctor = function (config) {
        updateWithConfig(this, config);
    };
    var proto = ctor.prototype;
     
    
    /**
    A {{#crossLink "FetchStrategy"}}{{/crossLink}}
    __readOnly__
    @property fetchStrategy {FetchStrategy}
    **/

    /**
    A {{#crossLink "MergeStrategy"}}{{/crossLink}}
    __readOnly__
    @property mergeStrategy {MergeStrategy}
    **/
    
    proto._$typeName = "QueryOptions";

    ctor.resolve = function (queryOptionsArray) {
        return new QueryOptions(__resolveProperties(queryOptionsArray, ["fetchStrategy", "mergeStrategy"]));
    };
    
    /**
    The default value whenever QueryOptions are not specified.
    @property defaultInstance {QueryOptions}
    @static
    **/
    ctor.defaultInstance = new ctor({
        fetchStrategy: FetchStrategy.FromServer,
        mergeStrategy: MergeStrategy.PreserveChanges
    });

    /**
    Returns a copy of this QueryOptions with the specified {{#crossLink "MergeStrategy"}}{{/crossLink}} 
    or {{#crossLink "FetchStrategy"}}{{/crossLink}} applied.
    @example
        var queryOptions = em1.queryOptions.using(MergeStrategy.PreserveChanges);
    or
    @example
        var queryOptions = em1.queryOptions.using(FetchStrategy.FromLocalCache);
    or
    @example
        var queryOptions = em1.queryOptions.using( { mergeStrategy: OverwriteChanges });
    @method using
    @param config {Configuration Object|MergeStrategy|FetchStrategy} The object to apply to create a new QueryOptions.
    @return {QueryOptions}
    @chainable
    **/
    proto.using = function (config) {
        if (!config) return this;
        var result = new QueryOptions(this);
        if (MergeStrategy.contains(config)) {
            config = { mergeStrategy: config };
        } else if (FetchStrategy.contains(config)) {
            config = { fetchStrategy: config };
        } 
        return updateWithConfig(result, config);
    };
        
    /**
    Sets the 'defaultInstance' by creating a copy of the current 'defaultInstance' and then applying all of the properties of the current instance. 
    The current instance is returned unchanged.
    @method setAsDefault
    @example
        var newQo = new QueryOptions( { mergeStrategy: MergeStrategy.OverwriteChanges });
        newQo.setAsDefault();
    @chainable
    **/
    proto.setAsDefault = function() {
        return __setAsDefault(this, ctor);
    };

    proto.toJSON = function () {
        return __toJson(this, {
            fetchStrategy: null,
            mergeStrategy: null
        });
    };

    ctor.fromJSON = function (json) {
        return new QueryOptions({
            fetchStrategy: FetchStrategy.fromName(json.fetchStrategy),
            mergeStrategy: MergeStrategy.fromName(json.mergeStrategy)
        });       
    };
        
    function updateWithConfig( obj, config ) {
        if (config) {
            assertConfig(config)
                .whereParam("fetchStrategy").isEnumOf(FetchStrategy).isOptional()
                .whereParam("mergeStrategy").isEnumOf(MergeStrategy).isOptional()
                .applyAll(obj);
        }
        return obj;
    }
       
    return ctor;
})();

breeze.QueryOptions= QueryOptions;
breeze.FetchStrategy= FetchStrategy;
breeze.MergeStrategy = MergeStrategy;


