/**
@module breeze   
**/

    
var EntityAction = (function () {
    /**
    EntityAction is an 'Enum' containing all of the valid actions that can occur to an 'Entity'.

    @class EntityAction
    @static
    **/
    var entityActionMethods = {
        isAttach: function () { return !!this.isAttach; },
        isDetach: function () { return !!this.isDetach; },
        isModification: function () { return !!this.isModification; }
    };

    var EntityAction = new Enum("EntityAction", entityActionMethods);
        
    /**
    Attach - Entity was attached via an AttachEntity call.

    @property Attach {EntityAction}
    @final
    @static
    **/
    EntityAction.Attach = EntityAction.addSymbol({ isAttach: true});
        
    /**
    AttachOnQuery - Entity was attached as a result of a query.

    @property AttachOnQuery {EntityAction}
    @final
    @static
    **/
    EntityAction.AttachOnQuery = EntityAction.addSymbol({ isAttach: true});
        
    /**
    AttachOnImport - Entity was attached as a result of an import.

    @property AttachOnImport {EntityAction}
    @final
    @static
    **/
    EntityAction.AttachOnImport = EntityAction.addSymbol({ isAttach: true});
        
        
    /**
    Detach - Entity was detached.

    @property Detach {EntityAction}
    @final
    @static
    **/
    EntityAction.Detach = EntityAction.addSymbol( { isDetach: true });
        
    /**
    MergeOnQuery - Properties on the entity were merged as a result of a query.

    @property MergeOnQuery {EntityAction}
    @final
    @static
    **/
    EntityAction.MergeOnQuery = EntityAction.addSymbol( { isModification: true });
        
    /**
    MergeOnImport - Properties on the entity were merged as a result of an import.

    @property MergeOnImport {EntityAction}
    @final
    @static
    **/
    EntityAction.MergeOnImport = EntityAction.addSymbol( { isModification: true });
        
    /**
    MergeOnSave - Properties on the entity were merged as a result of a save

    @property MergeOnSave {EntityAction}
    @final
    @static
    **/
    EntityAction.MergeOnSave = EntityAction.addSymbol( { isModification: true });
        
    /**
    PropertyChange - A property on the entity was changed.

    @property PropertyChange {EntityAction}
    @final
    @static
    **/
    EntityAction.PropertyChange = EntityAction.addSymbol({ isModification: true});
        
    /**
    EntityStateChange - The EntityState of the entity was changed.

    @property EntityStateChange {EntityAction}
    @final
    @static
    **/
    EntityAction.EntityStateChange = EntityAction.addSymbol();
        
        
    /**
    AcceptChanges - AcceptChanges was called on the entity, or its entityState was set to Unmodified.

    @property AcceptChanges {EntityAction}
    @final
    @static
    **/
    EntityAction.AcceptChanges = EntityAction.addSymbol();

    /**
    RejectChanges - RejectChanges was called on the entity.

    @property RejectChanges {EntityAction}
    @final
    @static
    **/
    EntityAction.RejectChanges = EntityAction.addSymbol({ isModification: true});
        
    /**
    Clear - The EntityManager was cleared.  All entities detached.

    @property Clear {EntityAction}
    @final
    @static
    **/
    EntityAction.Clear = EntityAction.addSymbol({ isDetach: true});
        
    EntityAction.seal();
    return EntityAction;
})();

breeze.EntityAction= EntityAction;

