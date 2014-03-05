using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient.Core {
  public class UtilFns {

    public static bool DictionariesEqual<K,V>(Dictionary<K,V> d1, Dictionary<K, V> d2)  {
      return d1.Keys.Count == d2.Keys.Count
        && d1.Keys.All(k => d2.ContainsKey(k) && object.Equals(d1[k], d2[k]));
    }

    public static T[] ToArray<T>(params T[] p) {
      return p;
    }
  }
}
