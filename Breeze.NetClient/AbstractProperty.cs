using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.NetClient {

  public class PropertyCollection : KeyedCollection<String, EntityProperty> {
    protected override String GetKeyForItem(EntityProperty item) {
      return item.Name;
    }
  }

  public abstract class EntityProperty  {
    public EntityProperty() { }

    public EntityProperty(EntityProperty prop) {
      this.Name = prop.Name;
      this.NameOnServer = prop.NameOnServer;
      this.Custom = prop.Custom;
      this.IsInherited = prop.IsInherited;
      this.IsScalar = prop.IsScalar;
      this.IsUnmapped = prop.IsUnmapped;
      this.Validators = new ValidatorCollection(prop.Validators);
    }
    public StructuralType ParentType { get; internal set; }
    public String Name { get; internal set; }
    public String NameOnServer { get; internal set; }
    public bool IsScalar { get; internal set; }
    public bool IsInherited { get; internal set; }
    public bool IsUnmapped { get; internal set; }
    public ValidatorCollection Validators { get; internal set; }
    public dynamic Custom { get; internal set; }

    public abstract bool IsDataProperty { get;  }
    public abstract bool IsNavigationProperty { get; }
    public Object GetValue(IStructuralObject entity) {
      return entity.GetValue(this.Name);
    }
    public void SetValue(IStructuralObject entity, Object value) {
      entity.SetValue(this.Name, value);
    }
  }


}
