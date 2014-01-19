using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {

  public class ComplexTypeCollection : KeyedCollection<String, ComplexType> {
    protected override String GetKeyForItem(ComplexType item) {
      return item.ShortName + ":#" + item.Namespace;
    }
  }

  public class ComplexType: StructuralType {
    
    public override IEnumerable<EntityProperty> Properties {
      get { return _dataProperties.AsEnumerable().Cast<EntityProperty>(); }
    }

    public override bool IsEntityType {
      get { return false; }
    }

    internal override DataProperty AddDataProperty(DataProperty dp) {
      _dataProperties.Add(dp);

      if (dp.IsComplexProperty) {
        _complexProperties.Add(dp);
      }

      if (dp.IsUnmapped) {
        _unmappedProperties.Add(dp);
      }
      return dp;
    }

   
  }

}
