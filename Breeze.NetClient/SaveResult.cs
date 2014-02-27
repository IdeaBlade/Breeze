
using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
namespace Breeze.NetClient {
  
  public class SaveResult {

    internal SaveResult(IEnumerable<IEntity> entities, Dictionary<EntityKey, EntityKey> keyMappings) {
      _savedEntities = new SafeList<IEntity>(entities);
      _keyMappings = new SafeDictionary<EntityKey,EntityKey>(keyMappings);
    }

    public ReadOnlyCollection<IEntity> Entities {
      get { return _savedEntities.ReadOnlyValues;  }
    }

    public ReadOnlyDictionary<EntityKey, EntityKey> KeyMappings {
      get { return _keyMappings.ReadOnlyDictionary; }
    }

    private SafeList<IEntity> _savedEntities;
    private SafeDictionary<EntityKey, EntityKey> _keyMappings;
    
  }


}
