using System;
using System.Collections.Generic;
using System.Linq;

using System.Threading.Tasks;

using Breeze.Core;
using Breeze.Metadata;

namespace Breeze.NetClient {
  public class EntityQuery<T> : EntityQuery, IQueryable<T>, IOrderedQueryable<T> {

  }
  
  public class EntityQuery {
    public EntityQuery(String resourceName) {
      ResourceName = resourceName;
    }
    public EntityQuery(Type clrType) {

    }
    public EntityQuery(EntityType entityType) {

    }

    public static EntityQuery From(String resourceName) {
      return new EntityQuery(resourceName);
    }

    String ResourceName { get; protected set; }
  }
}
