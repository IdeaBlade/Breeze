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
    @param [config.dataService] {DataService}  
    @param [config.jsonResultsAdapter] {JsonResultsAdapter}  
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
    
    /**
    A {{#crossLink "DataService"}}{{/crossLink}}. 
    __readOnly__
    @property dataService {DataService}
    **/
    
    /**
    A {{#crossLink "JsonResultsAdapter"}}{{/crossLink}}.
    __readOnly__
    @property jsonResultsAdapter {JsonResultsAdapter}
    **/

    proto._$typeName = "QueryOptions";


    
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
    @param config {Configuration Object|MergeStrategy|FetchStrategy|DataService|JsonResultsAdapter} The object to apply to create a new QueryOptions.
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
        } else if (config instanceof DataService) {
            config = { dataService: config };
        } else if (config instanceof JsonResultsAdapter) {
            config = { jsonResultsAdapter: config };
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
            mergeStrategy: null,
            dataService: null,
            jsonResultsAdapter: function (v) { return v && v.name; }
        });
    };

    ctor.fromJSON = function (json) {
        return new QueryOptions({
            fetchStrategy: FetchStrategy.fromName(json.fetchStrategy),
            mergeStrategy: MergeStrategy.fromName(json.mergeStrategy),
            dataService: json.dataService && DataService.fromJSON(json.dataService),
            jsonResultsAdapter: __config._fetchObject(JsonResultsAdapter, json.jsonResultsAdapter)
        });       
    };
        
    function updateWithConfig( obj, config ) {
        if (config) {
            assertConfig(config)
                .whereParam("fetchStrategy").isEnumOf(FetchStrategy).isOptional()
                .whereParam("mergeStrategy").isEnumOf(MergeStrategy).isOptional()
                .whereParam("dataService").isInstanceOf(DataService).isOptional()
                .whereParam("jsonResultsAdapter").isInstanceOf(JsonResultsAdapter).isOptional()
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
    @param [config.allowConcurrentSaves] {Boolean} Whether multiple saves can be in-flight at the same time. The default is false.
    @param [config.resourceName] {String} Resource name to be used during the save - this defaults to "SaveChanges"
    @param [config.dataService] {DataService} The DataService to be used for this save.
    @param [config.tag] {Object} Free form value that will be sent to the server during the save. 
    **/
    var ctor = function (config) {
        updateWithConfig(this, config);
    };
    
    var proto = ctor.prototype;
    proto._$typeName = "SaveOptions";
        
    /**
    Sets the 'defaultInstance' by creating a copy of the current 'defaultInstance' and then applying all of the properties of the current instance. 
    The current instance is returned unchanged.
    @method setAsDefault
    @chainable
    **/
    proto.setAsDefault = function() {
        return __setAsDefault(this, ctor);
    };
    
    /**
    Whether another save can be occuring at the same time as this one - default is false.

    __readOnly__
    @property allowConcurrentSaves {Boolean}
    **/
    
    /**
    A {{#crossLink "DataService"}}{{/crossLink}}. 
    __readOnly__
    @property dataService {DataService}
    **/

    /**
    The resource name to call to perform the save.
    __readOnly__
    @property resourceName {String}
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
    
    /**
    Returns a copy of this SaveOptions with the specified config options applied.
    @example
        var saveOptions = em1.saveOptions.using( {resourceName: "anotherResource" });
    
    @method using
    @param config {Configuration Object|} The object to apply to create a new SaveOptions.
    @param [config.allowConcurrentSaves] {Boolean} Whether multiple saves can be in-flight at the same time. The default is false.
    @param [config.resourceName] {String} Resource name to be used during the save - this defaults to "SaveChanges"
    @param [config.dataService] {DataService} The DataService to be used for this save.
    @param [config.tag] {Object} Free form value that will be sent to the server during the save. 
    @chainable
    **/
    proto.using = function (config) {
        return updateWithConfig(this, config);
    };

    function updateWithConfig(obj, config) {
        if (config) {
            assertConfig(config)
              .whereParam("resourceName").isOptional().isString()
              .whereParam("dataService").isOptional().isInstanceOf(DataService)
              .whereParam("allowConcurrentSaves").isBoolean().isOptional()
              .whereParam("tag").isOptional()
              .applyAll(obj);
        }
        return obj;
    }

    ctor.defaultInstance = new ctor({ allowConcurrentSaves: false});
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
    proto.using = function (config) {
        if (!config) return this;
        var result = new ValidationOptions(this);
        updateWithConfig(result, config);
        return result;
    };

    /**
    Sets the 'defaultInstance' by creating a copy of the current 'defaultInstance' and then applying all of the properties of the current instance. 
    The current instance is returned unchanged.
    @example
        var validationOptions = new ValidationOptions()
        var newOptions = validationOptions.using( { validateOnQuery: true, validateOnSave: false} );
        var newOptions.setAsDefault();
    @method setAsDefault
    @chainable
    **/
    proto.setAsDefault = function() {
        return __setAsDefault(this, ctor);
    };

    /**
    The default value whenever ValidationOptions are not specified.
    @property defaultInstance {ValidationOptions}
    @static
    **/
    ctor.defaultInstance = new ctor({
            validateOnAttach: true,
            validateOnSave: true,
            validateOnQuery: false,
            validateOnPropertyChange: true
    });
        
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


