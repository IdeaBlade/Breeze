/**
@module breeze   
**/
    
var EntityKey = (function () {

    var ENTITY_KEY_DELIMITER = ":::";

    /**
    An EntityKey is an object that represents the unique identity of an entity.  EntityKey's are immutable. 

    @class EntityKey
    **/
        
    /** 
    Constructs a new EntityKey.  Each entity within an EntityManager will have a unique EntityKey. 
    @example
        // assume em1 is an EntityManager containing a number of existing entities.
        var empType = em1.metadataStore.getEntityType("Employee");
        var entityKey = new EntityKey(empType, 1);
    EntityKey's may also be found by calling EntityAspect.getKey()
    @example
        // assume employee1 is an existing Employee entity
        var empKey = employee1.entityAspect.getKey();
    Multipart keys are created by passing an array as the 'keyValues' parameter
    @example
        var empTerrType = em1.metadataStore.getEntityType("EmployeeTerritory");            
        var empTerrKey = new EntityKey(empTerrType, [ 1, 77]);
        // The order of the properties in the 'keyValues' array must be the same as that 
        // returned by empTerrType.keyProperties
    @method <ctor> EntityKey
    @param entityType {EntityType} The {{#crossLink "EntityType"}}{{/crossLink}} of the entity.
    @param keyValues {value|Array of values} A single value or an array of values.
    **/
    var ctor = function (entityType, keyValues) {
        assertParam(entityType, "entityType").isInstanceOf(EntityType).check();
        var subtypes = entityType.getSelfAndSubtypes();
        if (subtypes.length > 1) {
            this._subtypes = subtypes.filter(function (st) { return st.isAbstract === false; });
        }
       
        if (!Array.isArray(keyValues)) {
            keyValues = __arraySlice(arguments, 1);
        }
        
        this.entityType = entityType;
        entityType.keyProperties.forEach(function (kp, i) {
            // insure that guid keys are comparable.
            if (kp.dataType === DataType.Guid) {
                keyValues[i] = keyValues[i] && keyValues[i].toLowerCase();
            }
        });
        
        this.values = keyValues;
        this._keyInGroup = createKeyString(keyValues);        

    };
    
    ctor._$typeName = "EntityKey";
    var proto = ctor.prototype;
    
    /**
    The 'EntityType' that this is a key for. 

    __readOnly__
    @property entityType {EntityType} 
    **/
    
    /**
    An array of the values for this key. This will usually only have a single element, unless the entity type has a multipart key.

    __readOnly__
    @property values {Array} 
    **/

    proto.toJSON = function () {
        return {
            entityType: this.entityType.name,
            values: this.values
        };
    };

    ctor.fromJSON = function (json, metadataStore) {
        var et = metadataStore._getEntityType(json.entityType, true);
        return new EntityKey(et, json.values);
    };

    /**
    Used to compare EntityKeys are determine if they refer to the same Entity.
    There is also an static version of 'equals' with the same functionality. 
    @example
        // assume em1 is an EntityManager containing a number of existing entities.
        var empType = em1.metadataStore.getEntityType("Employee");
        var empKey1 = new EntityKey(empType, 1);
        // assume employee1 is an existing Employee entity
        var empKey2 = employee1.entityAspect.getKey();
        if (empKey1.equals(empKey2)) {
            // do something  ...
        }
    @method equals
    @param entityKey {EntityKey}
    **/
    proto.equals = function (entityKey) {
        if (!(entityKey instanceof EntityKey)) return false;
        return (this.entityType === entityKey.entityType) &&
            __arrayEquals(this.values, entityKey.values);
    };

    /*
    Returns a human readable representation of this EntityKey.
    @method toString
    */
    proto.toString = function () {
        return this.entityType.name + '-' + this._keyInGroup;
    };

    /**
    Used to compare EntityKeys are determine if they refer to the same Entity. 
    There is also an instance version of 'equals' with the same functionality. 
    @example
        // assume em1 is an EntityManager containing a number of existing entities.
        var empType = em1.metadataStore.getEntityType("Employee");
        var empKey1 = new EntityKey(empType, 1);
        // assume employee1 is an existing Employee entity
        var empKey2 = employee1.entityAspect.getKey();
        if (EntityKey.equals(empKey1, empKey2)) {
            // do something  ...
        }
    @method equals
    @static
    @param k1 {EntityKey}
    @param k2 {EntityKey}
    **/
    ctor.equals = function (k1, k2) {
        if (!(k1 instanceof EntityKey)) return false;
        return k1.equals(k2);
    };

    // TODO: we may want to compare to default values later.
    proto._isEmpty = function () {
        return this.values.join("").length === 0;
    };

    ctor.createKeyString = createKeyString;

    function createKeyString(keyValues) {
        return keyValues.join(ENTITY_KEY_DELIMITER);
    }

    return ctor;
})();

breeze.EntityKey = EntityKey;
