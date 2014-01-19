using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Breeze.Core;

namespace Breeze.NetClient {
  #region EntityCache
  /// <summary>
  /// Cache of Entities held by the EntityManager. For internal use only.
  /// </summary>
  
  public class EntityCache {

    /// <summary>
    /// Ctor.
    /// </summary>
    public EntityCache() {
      EntityGroups = new EntityGroupCollection(this);
    }

    /// <summary>
    /// Copy ctor.
    /// </summary>
    /// <param name="entityCache"></param>
    public EntityCache(EntityCache entityCache)
      : this() {
      entityCache.EntityGroups.ForEach(g => EntityGroups.Add(g.Clone()));
      EntityManager = null;
    }


    /// <summary>
    /// Collection of all <see cref="EntityGroup"/>s within the cache.
    /// </summary>
    internal EntityGroupCollection EntityGroups {
      get;
      set;
    }

    /// <summary>
    /// Accept changes to all modified, deleted or added entities within the cache. All
    /// entities will be marked as <see cref="EntityState.Unchanged"/> after this operation.
    /// </summary>
    public void AcceptChanges() {
      EntityGroups.ForEach(t => t.AcceptChanges());
    }

    /// <summary>
    /// Reject changes to all modified, deleted or added entities within the cache. All
    /// entities will be marked as <see cref="EntityState.Unchanged"/> after this operation.
    /// </summary>
    public void RejectChanges() {
      EntityGroups.ForEach(t => t.RejectChanges());
    }

    /// <summary>
    /// Are there any added, modified or deleted records in the cache.
    /// </summary>
    /// <returns></returns>
    public bool HasChanges() {
      return EntityGroups.Any(t => t.HasChanges());
    }


    /// <summary>
    /// Creates a copy.
    /// </summary>
    /// <returns></returns>
    public EntityCache Clone() {
      return new EntityCache(this);
    }

    /// <summary>
    /// Clears all data from the cache.
    /// </summary>
    public void Clear() {
      EntityGroups.Clear();
    }

    /// <summary>
    /// The owning EntityManager.
    /// </summary>
    public EntityManager EntityManager {
      get;
      internal set;
    }

    //// Hack: Used to pass and return store-generated id map - only used during Save call.
    ///// <summary>
    ///// 
    ///// </summary>
    //[DataMember(Order = 1)]
    //internal Dictionary<string, UniqueIdMap> IdMap { get; set; }


    //// In place of passing all ec.ExtendedProperties around - we only want the Exception
    ///// <summary>
    ///// 
    ///// </summary>
    //[DataMember(Order = 1)]
    //public EntityServerFault Fault {
    //  get {
    //    object ex = null;
    //    ExtendedProperties.TryGetValue("Exception", out ex);
    //    if (ex == null) return null;
    //    return new EntityServerFault((Exception)ex);
    //  }
    //  set {
    //    if (value != null) {
    //      ExtendedProperties["Exception"] = value.ToException();
    //    }
    //  }
    //}

    //internal Dictionary<Object, Object> ExtendedProperties {
    //  get {
    //    if (_extendedProperties == null) {
    //      _extendedProperties = new Dictionary<object, object>();
    //    }
    //    return _extendedProperties;
    //  }
    //  set {
    //    _extendedProperties = value;
    //  }
    //}

    // private Dictionary<Object, Object> _extendedProperties;
  }

  #endregion

}
