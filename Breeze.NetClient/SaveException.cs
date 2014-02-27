
using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
namespace Breeze.NetClient {

  public class SaveException : Exception {
    public static SaveException Parse(String json) {
      var jn = JNode.DeserializeFrom(json);
      var message = jn.Get<String>("ExceptionMessage");
      if (message != null) {
        return new SaveException(message, Enumerable.Empty<EntityError>());
      } else {
        // TODO: parse EntityErrors;
        return new SaveException("see EntityErrors property", Enumerable.Empty<EntityError>());
      }

    }
    public SaveException(String message, IEnumerable<EntityError> entityErrors) : base(message) {
      _entityErrors = new SafeList<EntityError>(entityErrors);
    }

    public ReadOnlyCollection<EntityError> EntityErrors {
      get { return _entityErrors.ReadOnlyValues; }
    }
    private SafeList<EntityError> _entityErrors;
  }

 
}
