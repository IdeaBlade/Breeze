using Breeze.Core;
using System;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.NetClient {

  public class ComplexType: StructuralType, IJsonSerializable {
    
    public override bool IsEntityType {
      get { return false; }
    }

    JNode IJsonSerializable.ToJNode(Object config) {
      var jo = new JNode();
      jo.AddPrimitive("shortName", this.ShortName);
      jo.AddPrimitive("namespace", this.Namespace);
      jo.AddPrimitive("isComplexType", true);
      // jo.AddProperty("baseTypeName", this.BaseTypeName);
      // jo.AddProperty("isAbstract", this.IsAbstract, false);
      jo.AddArray("dataProperties", this.DataProperties.Where(dp => dp.IsInherited == false));
      // jo.AddArrayProperty("validators", this.Validators);
      // jo.AddProperty("custom", this.Custom.ToJObject)
      return jo;
    }

    void IJsonSerializable.FromJNode(JNode jNode) {
      ShortName = jNode.Get<String>("shortName");
      Namespace = jNode.Get<String>("namespace");
      // BaseTypeName = jnode.Get<String>("baseTypeName");
      // IsAbstract = jnode.Get<bool>("isAbstract");
      jNode.GetObjectArray<DataProperty>("dataProperties").ForEach(dp => AddDataProperty(dp));
      // validators
      // custom
    }
   
  }

  public class ComplexTypeCollection : KeyedCollection<String, ComplexType> {
    protected override String GetKeyForItem(ComplexType item) {
      return item.ShortName + ":#" + item.Namespace;
    }
  }

}
