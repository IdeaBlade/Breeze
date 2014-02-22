
using Breeze.Core;
using System.Collections.Generic;
using System.Collections.ObjectModel;
namespace Breeze.NetClient {
  /// <summary>
  /// Strategy to control how Entities are merged into an EntityManager's cache.
  /// </summary>
  public class SaveResult {

    internal SaveResult(IEnumerable<IEntity> entities, Dictionary<EntityKey, EntityKey> keyMappings) {
      _savedEntities = new SafeList<IEntity>(entities);
      _keyMappings = new ReadOnlyDictionary<EntityKey, EntityKey>(keyMappings);
    }

    public ReadOnlyCollection<IEntity> SavedEntities {
      get { return _savedEntities.ReadOnlyValues;  }
    }

    public ReadOnlyDictionary<EntityKey, EntityKey> KeyMappings {
      get { return _keyMappings; }
    }

    private SafeList<IEntity> _savedEntities;
    private ReadOnlyDictionary<EntityKey, EntityKey> _keyMappings;
  }

 
}
