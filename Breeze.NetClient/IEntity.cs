using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public interface IEntity : IStructuralObject {
    EntityAspect EntityAspect { get; }
  }

  public interface IComplexObject : IStructuralObject {
    ComplexAspect ComplexAspect { get; }
  }
}
