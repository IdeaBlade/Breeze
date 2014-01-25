
namespace Breeze.NetClient {
  /// <summary>
  /// Strategy to control how Entities are merged into an EntityManager's cache.
  /// </summary>
  public enum MergeStrategy {

    /// <summary>
    /// Do not allow merging
    /// </summary>
    Disallowed,
    /// <summary>
    /// Overwrites the cached entity with incoming data and uses the EntityState of the incoming entity (will be 
    /// Unchanged if the incoming entity is from the data source).
    /// </summary>
    OverwriteChanges,
    /// <summary>
    /// Preserves (does not overwrite) any existing entities that have been changed (modified, added or deleted).
    /// </summary>
    PreserveChanges,
    ///// <summary>
    ///// Preserves the persistent state of the cached entity if the entity is current. 
    ///// Overwrites an entity if it is obsolete and gives it the EntityState of the incoming entity (will be
    ///// Unchanged if the incoming entity is from the data source).
    ///// </summary>
    //PreserveChangesUnlessOriginalObsolete,
    ///// <summary>
    ///// Preserves the persistent state of the cached entity whether it is current or not.
    ///// Overwrites the <b>Original</b> version of the entity if obsolete.
    ///// </summary>
    //PreserveChangesUpdateOriginal,

  }
}
