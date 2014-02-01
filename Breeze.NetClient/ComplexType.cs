using Newtonsoft.Json.Linq;
using System;
using System.Collections.ObjectModel;

using System.Linq;

namespace Breeze.NetClient {

  public class ComplexType: StructuralType, IJsonSerializable {
    
    public override bool IsEntityType {
      get { return false; }
    }

    JObject IJsonSerializable.ToJObject() {
      var jo = new JObject();
      jo.AddProperty("shortName", this.ShortName);
      jo.AddProperty("namespace", this.Namespace);
      jo.AddProperty("isComplexType", true);
      // jo.AddProperty("baseTypeName", this.BaseTypeName);
      // jo.AddProperty("isAbstract", this.IsAbstract, false);

      jo.AddArrayProperty("dataProperties", this.DataProperties.Where(dp => dp.IsInherited == false));

      // jo.AddArrayProperty("validators", this.Validators);
      // jo.AddProperty("custom", this.Custom.ToJObject)
      return jo;
    }

    object IJsonSerializable.FromJObject(JObject jObject) {
      throw new NotImplementedException();
    }
   
  }

  public class ComplexTypeCollection : KeyedCollection<String, ComplexType> {
    protected override String GetKeyForItem(ComplexType item) {
      return item.ShortName + ":#" + item.Namespace;
    }
  }

}
