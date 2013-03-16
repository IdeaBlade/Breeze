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
    @method <ctor> QueryOptions
    @param [config] {Object}
    @param [config.fetchStrategy=FetchStrategy.FromServer] {FetchStrategy}  
    @param [config.mergeStrategy=MergeStrategy.PreserveChanges] {MergeStrategy}  
    **/
    var ctor = function (config) {
        this.fetchStrategy = FetchStrategy.FromServer;
        this.mergeStrategy = MergeStrategy.PreserveChanges;
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

    /**
    The default value whenever QueryOptions are not specified.
    @property defaultInstance {QueryOptions}
    @static
    **/
    ctor.defaultInstance = new ctor();

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
    proto.using = function(config) {
        var result = new QueryOptions(this);
        if (MergeStrategy.contains(config)) {
            config = { mergeStrategy: config };
        } else if (FetchStrategy.contains(config)) {
            config = { fetchStrategy: config };
        } 
        return updateWithConfig(result, config);
    };
        
    /**
    Makes this instance the default instance.
    @method setAsDefault
    @example
        var newQo = new QueryOptions( { mergeStrategy: MergeStrategy.OverwriteChanges });
        newQo.setAsDefault();
    @chainable
    **/
    proto.setAsDefault = function() {
        ctor.defaultInstance = this;
        return this;
    };

    proto.toJSON = function () {
        return __toJson(this);
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

var SaveOptions = (function () {
    /**
    A SaveOptions instance is used to specify the 'options' under which a save will occur.

    @class SaveOptions
    **/
        
    /**
    @method <ctor> SaveOptions
    @param config {Object}
    @param [config.allowConcurrentSaves] {Boolean}
    @param [config.tag] {Object} Free form value that will be sent to the server. 
    **/
    var ctor = function (config) {
        config = config || {};
        assertConfig(config)
            .whereParam("allowConcurrentSaves").isBoolean().isOptional().withDefault(false)
            .whereParam("tag").isOptional()
            .applyAll(this);
                        
    };
    var proto = ctor.prototype;
    proto._$typeName = "SaveOptions";
        
    /**
    Makes this instance the default instance.
    @method setAsDefault
    @chainable
    **/
    proto.setAsDefault = function() {
        ctor.defaultInstance = this;
        return this;
    };
        
    /**
    Whether another save can be occuring at the same time as this one - default is false.

    __readOnly__
    @property allowConcurrentSaves {Boolean}
    **/

    /**
    A free form value that will be sent to the server.

    __readOnly__
    @property tag {Object}
    **/

    /**
    The default value whenever SaveOptions are not specified.
    @property defaultInstance {SaveOptions}
    @static
    **/
    ctor.defaultInstance = new ctor();
    return ctor;
})();

var ValidationOptions = (function () {

    /**
    A ValidationOptions instance is used to specify the conditions under which validation will be executed.

    @class ValidationOptions
    **/
        
    /**
    ValidationOptions constructor
    @example
        var newVo = new ValidationOptions( { validateOnSave: false, validateOnAttach: false });
        // assume em1 is a preexisting EntityManager
        em1.setProperties( { validationOptions: newVo });
    @method <ctor> ValidationOptions
    @param [config] {Object}
    @param [config.validateOnAttach=true] {Boolean}
    @param [config.validateOnSave=true] {Boolean}
    @param [config.validateOnQuery=false] {Boolean}
    @param [config.validateOnPropertyChange=true] {Boolean}
    **/
    var ctor = function (config) {
        this.validateOnAttach = true;
        this.validateOnSave = true;
        this.validateOnQuery = false;
        this.validateOnPropertyChange = true;
        updateWithConfig(this, config);
    };
    var proto = ctor.prototype;

    /**
    Whether entity and property level validation should occur when entities are attached to the EntityManager other than via a query.

    __readOnly__
    @property validateOnAttach {Boolean}
    **/

    /**
    Whether entity and property level validation should occur before entities are saved. A failed validation will force the save to fail early.

    __readOnly__
    @property validateOnSave {Boolean}
    **/

    /**
    Whether entity and property level validation should occur after entities are queried from a remote server.

    __readOnly__
    @property validateOnQuery {Boolean}
    **/

    /**
    Whether property level validation should occur after entities are modified.

    __readOnly__
    @property validateOnPropertyChange {Boolean}
    **/

    proto._$typeName = "ValidationOptions";
        
    /**
    Returns a copy of this ValidationOptions with changes to the specified config properties.
    @example
        var validationOptions = new ValidationOptions();
        var newOptions = validationOptions.using( { validateOnQuery: true, validateOnSave: false} );
    @method using
    @param config {Object} The object to apply to create a new QueryOptions.
    @param [config.validateOnAttach] {Boolean}
    @param [config.validateOnSave] {Boolean}
    @param [config.validateOnQuery] {Boolean}
    @param [config.validateOnPropertyChange] {Boolean}
    @return {ValidationOptions}
    @chainable
    **/
    proto.using = function(config) {
        var result = new ValidationOptions(this);
        updateWithConfig(result, config);
        return result;
    };

    /**
    Makes this instance the default instance.
    @example
        var validationOptions = new ValidationOptions()
        var newOptions = validationOptions.using( { validateOnQuery: true, validateOnSave: false} );
        var newOptions.setAsDefault();
    @method setAsDefault
    @chainable
    **/
    proto.setAsDefault = function() {
        ctor.defaultInstance = this;
        return this;
    };

    /**
    The default value whenever ValidationOptions are not specified.
    @property defaultInstance {ValidationOptions}
    @static
    **/
    ctor.defaultInstance = new ctor();
        
    function updateWithConfig( obj, config ) {
        if (config) {
            assertConfig(config)
            .whereParam("validateOnAttach").isBoolean().isOptional()
            .whereParam("validateOnSave").isBoolean().isOptional()
            .whereParam("validateOnQuery").isBoolean().isOptional()
            .whereParam("validateOnPropertyChange").isBoolean().isOptional()
            .applyAll(obj);
        }
        return obj;
    }
    return ctor;
})();
    
// expose

breeze.QueryOptions= QueryOptions;
breeze.SaveOptions= SaveOptions;
breeze.ValidationOptions = ValidationOptions;
breeze.FetchStrategy= FetchStrategy;
breeze.MergeStrategy = MergeStrategy;


