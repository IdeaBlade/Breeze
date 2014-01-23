using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;
using System.Collections;

namespace Breeze.NetClient {
  public abstract class StructuralAspect {

    public StructuralAspect() {
      
    }

    protected abstract StructuralType StructuralType { get; }

    protected abstract IStructuralObject StructuralObject { get; }

    protected void ProcessComplexProperties( Action<IComplexObject> action) {
      this.StructuralType.ComplexProperties.ForEach(cp => {
        var cos = StructuralObject.GetValue(cp.Name);
        if (cp.IsScalar) {
          var co = (IComplexObject)cos;
          action(co);
        } else {
          ((IEnumerable)cos).Cast<IComplexObject>().ForEach(co => action(co));
        }
      });

    }

    protected internal OriginalValuesMap OriginalValuesMap {
      get;
      set;
    }

    protected internal BackupValuesMap PreproposedValuesMap {
      get;
      set;
    }

    protected bool _defaultValuesInitialized;

    
  }
}
