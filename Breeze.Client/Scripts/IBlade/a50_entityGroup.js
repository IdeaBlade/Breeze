/**
@module breeze
**/

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
        if (!aspect._initialized) {
            this.entityType._initializeInstance(entity);
        }
        delete aspect._initialized;  
            
        var keyInGroup = aspect.getKey()._keyInGroup;
        ix = this._indexMap[keyInGroup];
        if (ix >= 0) {
            if (this._entities[ix] === entity) {
                aspect.entityState = entityState;
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
        return this._entities.filter(filter);
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
   
// do not expose EntityGroup - internal only


