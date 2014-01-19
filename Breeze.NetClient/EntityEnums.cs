using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.NetClient {

  #region EntityState
  /// <summary>
  /// The state of an <see cref="IEntity"/>.
  /// </summary>
  /// <remarks>
  /// </remarks>
  [Flags]
  public enum EntityState {
    /// <summary>
    /// The entity has been created but is not part of any EntityGroup.
    /// A Entity is in this state immediately after it has been created
    /// and before it is added to the EntityManager, or if it has been removed from the
    /// EntityManager.
    /// </summary>
    Detached = 1,
    /// <summary>
    ///     The entity has not changed since last queried or saved.
    /// </summary>
    Unchanged = 2,

    /// <summary>
    ///     The entity has been added to the EntityManager.
    /// </summary>
    Added = 4,
    /// <summary>
    ///     The entity was deleted using the Entity.Delete() method.
    /// </summary>
    Deleted = 8,
    /// <summary>
    ///     The entity has been modified and EntityManager.SaveChanges() has not
    ///     been called.
    /// </summary>
    Modified = 16,
    /// <summary>
    /// Added or Modified or Deleted.
    /// </summary>
    AnyAddedModifiedOrDeleted = Added | Modified | Deleted,
    /// <summary>
    ///All states except detached. 
    /// </summary>
    AllButDetached = Added | Modified | Deleted | Unchanged

  }
  #endregion

  #region EntityStateFns
  /// <summary>
  /// Provides a set of static methods extending an <see cref="IEntity"/> to provide
  /// information about the <see cref="EntityState"/>.
  /// <seealso cref="System.Linq"/>
  /// </summary>
  /// <remarks>
  /// To use these extensions, add a using statement (Imports in Visual Basic) for this namespace
  /// to your class.  
  /// <para>
  /// For more information on extension methods, see <b>Extension Methods (C# Programming Guide)</b>
  /// or <b>Extension Methods (Visual Basic)</b> in the Visual Studio 2008 documentation.
  /// </para>
  /// </remarks>
  public static class EntityStateFns {
    /// <summary>
    /// Whether this Entity is unchanged.
    /// </summary>
    public static bool IsUnchanged(this EntityState es) {
      return (es & EntityState.Unchanged) > 0;
    }

    // JJT - not sure if this makes sense.
    ///// <summary>
    ///// Whether this entity has been changed ( added, deleted, detached)
    ///// </summary>
    ///// <param name="es"></param>
    ///// <returns></returns>
    //public static bool IsChanged(this EntityState es) {
    //  return !IsUnchanged(es);
    //}

    /// <summary>
    /// Whether this Entity has been added.
    /// </summary>
    public static bool IsAdded(this EntityState es) {
      return (es & EntityState.Added) > 0;
    }

    /// <summary>
    /// Whether this Entity has been modified.
    /// </summary>
    public static bool IsModified(this EntityState es) {
      return (es & EntityState.Modified) > 0;
    }

    /// <summary>
    /// Whether this Entity has been detached (either not yet attached or removed via RemoveFromManager).
    /// </summary>
    public static bool IsDetached(this EntityState es) {
      return (es & EntityState.Detached) > 0;
    }

    /// <summary>
    /// Whether this Entity has been deleted (but the change has not yet been persisted to the data source).
    /// </summary>
    public static bool IsDeleted(this EntityState es) {
      return (es & EntityState.Deleted) > 0;
    }

    /// <summary>
    /// Whether this Entity has been either added or modified.
    /// </summary>
    public static bool IsAddedOrModified(this EntityState es) {
      return (es & (EntityState.Added | EntityState.Modified)) > 0;
    }

    /// <summary>
    /// Whether this Entity has been added, modified or deleted.
    /// </summary>
    /// <param name="es"></param>
    /// <returns></returns>
    public static bool IsAddedOrModifiedOrDeleted(this EntityState es) {
      return (es & (EntityState.Added | EntityState.Modified | EntityState.Deleted)) > 0;
    }

    /// <summary>
    /// Whether this Entity has been either deleted or detached.
    /// </summary>
    public static bool IsDeletedOrDetached(this EntityState es) {
      return (es & (EntityState.Deleted | EntityState.Detached)) > 0;
    }

    /// <summary>
    /// Whether this Entity has been either deleted or modified
    /// </summary>
    public static bool IsDeletedOrModified(this EntityState es) {
      return (es & (EntityState.Deleted | EntityState.Modified)) > 0;
    }
  }

  #endregion

  #region EntityVersion
  /// <summary>
  ///    Describes the version of an Entity.
  /// </summary>
  public enum EntityVersion {
    /// <summary>
    ///     The default version for the state of the entity. For an <see cref="EntityState"/> value
    ///     of Added, Modified or Unchanged,  the default version is Current. For an EntityState of Deleted the
    ///     default version is Original. For an entity in IEditableObject.Edit state the version is Proposed. 
    /// </summary>
    Default = 0,
    /// <summary>
    ///    The entity contains its original values.
    /// </summary>
    Original = 256,

    /// <summary>
    ///    The entity contains current values.
    /// </summary>
    Current = 512,
    /// <summary>
    ///    The entity contains a proposed value.
    /// </summary>
    Proposed = 1024,
  }
  #endregion

  #region EntityAction
  /// <summary>
  ///    Describes an action performed on an Entity.
  /// </summary>
  /// <remarks>
  /// The <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanging"/> and <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanged"/> events
  /// both receive arguments containing the <b>EntityAction</b>.
  /// </remarks>
  [Flags]
  public enum EntityAction {

    /// <summary>
    /// The entity has not changed.
    /// </summary>
    Nothing = 0,
    /// <summary>
    /// The entity was removed from the EntityGroup.
    /// </summary>
    Remove = 1,
    /// <summary>
    /// The entity has changed.
    /// </summary>
    Change = 2,
    /// <summary>
    /// The most recent change to the entity has been rolled back.
    /// </summary>
    Rollback = 4,
    /// <summary>
    /// The changes to the entity have been committed.
    /// </summary>
    Commit = 8,
    /// <summary>
    /// The entity has been added to an EntityGroup.
    /// </summary>
    Add = 16,
    /// <summary>
    /// The original version of the entity has been changed. (Occurs on Merge with PreserveChangesUpdateOriginal strategy.)
    /// </summary>
    ChangeOriginal = 32,
    /// <summary>
    /// The original and the current versions of the entity have been changed. (Occurs on Merge.)
    /// </summary>
    ChangeCurrentAndOriginal = 64,
    /// <summary>
    /// The entity has been added to an EntityGroup as a result of a query.
    /// </summary>
    AddOnQuery = 256 + 16,
    /// <summary>
    /// The entity has been added to an EntityGroup as a result of an import operation.
    /// </summary>
    AddOnImport = 512 + 16, // 
    /// <summary>
    /// The entity has been added to an EntityGroup as a result of an attach operation.
    /// </summary>
    AddOnAttach = 2048 + 16, // 
    /// <summary>
    /// The entity was marked for deletion 
    /// </summary>
    Delete = 1024,
  }
  #endregion
}


