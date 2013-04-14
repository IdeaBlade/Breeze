/**
@module breeze
**/
   
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

breeze.ValidationOptions = ValidationOptions;



