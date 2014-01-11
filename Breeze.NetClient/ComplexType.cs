using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.Metadata {

  public class ComplexTypeCollection : KeyedCollection<String, ComplexType> {
    protected override String GetKeyForItem(ComplexType item) {
      return item.ShortName + ":#" + item.Namespace;
    }
  }

  public class ComplexType: StructuralType {
    
    public DataPropertyCollection DataProperties { get; internal set; }   

  }

}
