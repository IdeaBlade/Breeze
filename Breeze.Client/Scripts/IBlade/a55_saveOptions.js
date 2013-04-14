/**
@module breeze
**/
   
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

breeze.SaveOptions= SaveOptions;


