using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {


  internal class OriginalValuesMap : BackupValuesMap {
    public OriginalValuesMap() : base() { }
    public OriginalValuesMap(IDictionary<String, object> map) : base(map) { }
  }

  internal class BackupValuesMap : Dictionary<string, Object> {
    public BackupValuesMap() : base() { }
    public BackupValuesMap(IDictionary<String, object> map) : base(map) { }

  }

 
}
