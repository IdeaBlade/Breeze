using System;
using System.Collections.ObjectModel;

namespace Breeze.NetClient {

  public class ComplexType: StructuralType {
    
    public override bool IsEntityType {
      get { return false; }
    }
   
  }

  public class ComplexTypeCollection : KeyedCollection<String, ComplexType> {
    protected override String GetKeyForItem(ComplexType item) {
      return item.ShortName + ":#" + item.Namespace;
    }
  }

}
