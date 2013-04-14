/**
@module breeze
**/

var LocalQueryComparisonOptions = (function () {

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

    var ctor = function (config) {
        assertConfig(config || {})
            .whereParam("name").isOptional().isString()
            .whereParam("isCaseSensitive").isOptional().isBoolean()
            .whereParam("usesSql92CompliantStringComparison").isBoolean()
            .applyAll(this);
        if (!this.name) {
            this.name = __getUuid();
        }
        __config._storeObject(this, proto._$typeName, this.name);
    };
    var proto = ctor.prototype;
    proto._$typeName = "LocalQueryComparisonOptions";
        
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
    ctor.defaultInstance = new ctor(ctor.caseInsensitiveSQL);

    /**
    Sets the 'defaultInstance' by creating a copy of the current 'defaultInstance' and then applying all of the properties of the current instance. 
    The current instance is returned unchanged.
    @method setAsDefault
    @example
        var lqco = new LocalQueryComparisonOptions({
            isCaseSensitive: false;
            usesSql92CompliantStringComparison: true;
        });
        lqco.setAsDefault();
    @chainable
    **/
    proto.setAsDefault = function () {
        return __setAsDefault(this, ctor);
    };


    return ctor;
})();
       
breeze.LocalQueryComparisonOptions = LocalQueryComparisonOptions;


