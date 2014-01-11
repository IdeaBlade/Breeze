using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.Metadata {

  public class StructuralTypeCollection : KeyedCollection<String, StructuralType> {
    protected override String GetKeyForItem(StructuralType item) {
      return item.ShortName + ":#" + item.Namespace;
    }
  }

  public abstract class StructuralType {
    public String ShortName { get; internal set; }
    public String Namespace { get; internal set;}
    public dynamic Custom { get; set; }

  }


}
