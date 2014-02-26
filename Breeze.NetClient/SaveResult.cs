
using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
namespace Breeze.NetClient {
  /// <summary>
  /// Strategy to control how Entities are merged into an EntityManager's cache.
  /// </summary>
  public class SaveResult {

    internal SaveResult(IEnumerable<IEntity> entities, Dictionary<EntityKey, EntityKey> keyMappings) {
      _savedEntities = new SafeList<IEntity>(entities);
      _keyMappings = new SafeDictionary<EntityKey,EntityKey>(keyMappings);
    }


    //internal SaveResult(SaveResult2 saveResult2) {
    //  _savedEntities = new SafeList<IEntity>(saveResult2.Entities);
    //  _keyMappings = new SafeList<KeyMapping>(saveResult2.KeyMappings);
    //  _entityErrors = new SafeList<EntityError>(saveResult2.EntityErrors);
    //}

    public ReadOnlyCollection<IEntity> Entities {
      get { return _savedEntities.ReadOnlyValues;  }
    }

    public ReadOnlyDictionary<EntityKey, EntityKey> KeyMappings {
      get { return _keyMappings.ReadOnlyDictionary; }
    }

    public ReadOnlyCollection<EntityError> EntityErrors {
      get { return _entityErrors.ReadOnlyValues; }
    }


    private SafeList<IEntity> _savedEntities;
    private SafeDictionary<EntityKey, EntityKey> _keyMappings;
    private SafeList<EntityError> _entityErrors;
  }


 
}
