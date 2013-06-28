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
    PreserveChanges is used to stop merging from occuring if the existing entity in an entityManager is already
    in a {{#crossLink "EntityState/Modified"}}{{/crossLink}} state. In this case, the existing entity in the 
    EntityManager is not replaced by the 'merging' entity.
    
    @property PreserveChanges {MergeStrategy}
    @final
    @static
    **/
    MergeStrategy.PreserveChanges = MergeStrategy.addSymbol();
    /**
    OverwriteChanges is used to allow merging to occur even if the existing entity in an entityManager is already
    in a {{#crossLink "EntityState/Modified"}}{{/crossLink}} state. In this case, the existing entity in the 
    EntityManager is replaced by the 'merging' entity.
    
    @property OverwriteChanges {MergeStrategy}
    @final
    @static
    **/
    MergeStrategy.OverwriteChanges = MergeStrategy.addSymbol();
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


