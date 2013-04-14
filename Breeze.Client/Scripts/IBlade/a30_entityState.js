/**
@module breeze   
**/

var EntityState = (function () {
    /**
    EntityState is an 'Enum' containing all of the valid states for an 'Entity'.

    @class EntityState
    @static
    **/
    var entityStateMethods = {
        /**
        @example
            var es = anEntity.entityAspect.entityState;
            return es.isUnchanged();
        is the same as
        @example
            return es === EntityState.Unchanged;
        @method isUnchanged
        @return {Boolean} Whether an entityState instance is EntityState.Unchanged.
        **/
        isUnchanged: function () { return this === EntityState.Unchanged; },
        /**
        @example
            var es = anEntity.entityAspect.entityState;
            return es.isAdded();
        is the same as
        @example
            return es === EntityState.Added;
        @method isAdded
        @return {Boolean} Whether an entityState instance is EntityState.Added.
        **/
        isAdded: function () { return this === EntityState.Added; },
        /**
        @example
            var es = anEntity.entityAspect.entityState;
            return es.isModified();
        is the same as
        @example
            return es === EntityState.Modified;
        @method isModified
        @return {Boolean} Whether an entityState instance is EntityState.Modified.
        **/
        isModified: function () { return this === EntityState.Modified; },
        /**
        @example
            var es = anEntity.entityAspect.entityState;
            return es.isDeleted();
        is the same as
        @example
            return es === EntityState.Deleted;
        @method isDeleted
        @return  {Boolean} Whether an entityState instance is EntityState.Deleted.
        **/
        isDeleted: function () { return this === EntityState.Deleted; },
        /**
        @example
            var es = anEntity.entityAspect.entityState;
            return es.isDetached();
        is the same as
        @example
            return es === EntityState.Detached;
        @method isDetached
        @return  {Boolean} Whether an entityState instance is EntityState.Detached.
        **/
        isDetached: function () { return this === EntityState.Detached; },
        /**
        @example
            var es = anEntity.entityAspect.entityState;
            return es.isUnchangedOrModified();
        is the same as
        @example
            return es === EntityState.Unchanged || es === EntityState.Modified
        @method isUnchangedOrModified
        @return {Boolean} Whether an entityState instance is EntityState.Unchanged or EntityState.Modified.
        **/
        isUnchangedOrModified: function () {
            return this === EntityState.Unchanged || this === EntityState.Modified;
        },
        /**
        @example
            var es = anEntity.entityAspect.entityState;
            return es.isAddedModifiedOrDeleted();
        is the same as
        @example
            return es === EntityState.Added || es === EntityState.Modified || es === EntityState.Deleted
        @method isAddedModifiedOrDeleted
        @return {Boolean} Whether an entityState instance is EntityState.Unchanged or EntityState.Modified or EntityState.Deleted.
        **/
        isAddedModifiedOrDeleted: function () {
            return this === EntityState.Added ||
                this === EntityState.Modified ||
                this === EntityState.Deleted;
        }
    };

    var EntityState = new Enum("EntityState", entityStateMethods);
    /**
    The 'Unchanged' state.

    @property Unchanged {EntityState}
    @final
    @static
    **/
    EntityState.Unchanged = EntityState.addSymbol();
    /**
    The 'Added' state.

    @property Added {EntityState}
    @final
    @static
    **/
    EntityState.Added = EntityState.addSymbol();
    /**
    The 'Modified' state.

    @property Modified {EntityState}
    @final
    @static
    **/
    EntityState.Modified = EntityState.addSymbol();
    /**
    The 'Deleted' state.

    @property Deleted {EntityState}
    @final
    @static
    **/
    EntityState.Deleted = EntityState.addSymbol();
    /**
    The 'Detached' state.

    @property Detached {EntityState}
    @final
    @static
    **/
    EntityState.Detached = EntityState.addSymbol();
    EntityState.seal();
    return EntityState;
})();
   
breeze.EntityState= EntityState;
