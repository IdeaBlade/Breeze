using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;

namespace Breeze.NetClient {
  public class Validator {
    public String Name {
      get;
      private set; 
    }
  }

  public class ValidatorCollection : MapCollection<String, Validator> {
    public ValidatorCollection(IEnumerable<Validator> validators) : base(validators) { }
    
    protected override string GetKeyForItem(Validator value) {
      return value.Name;
    }
  }
}
