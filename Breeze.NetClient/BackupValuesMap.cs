using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {

  public  class BackupValuesMap : SafeDictionary<String, Object> {
    public BackupValuesMap() : base() {}
    public BackupValuesMap(Dictionary<String, Object> map) : base(map) {
    }

    public static BackupValuesMap Empty = new BackupValuesMap(new Dictionary<String, Object>());
  }

 
}
