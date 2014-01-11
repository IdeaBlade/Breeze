using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.Metadata {

  public class PropertyCollection : KeyedCollection<String, AbstractProperty> {
    protected override String GetKeyForItem(AbstractProperty item) {
      return item.Name;
    }
  }

  public abstract class AbstractProperty  {
    public AbstractProperty() { }

    public AbstractProperty(AbstractProperty prop) {
      this.Name = prop.Name;
      this.NameOnServer = prop.NameOnServer;
      this.Custom = prop.Custom;
      this.IsInherited = prop.IsInherited;
      this.IsScalar = prop.IsScalar;
      this.Validators = new ValidatorCollection(prop.Validators);
    }
    public String Name { get; protected set; }
    public String NameOnServer { get; protected set; }
    public bool IsScalar { get; protected set; }
    public bool IsInherited { get; set; }
    public ValidatorCollection Validators { get; protected set; }
    public dynamic Custom { get; set; }

    public abstract bool IsDataProperty { get;  }
    public abstract bool IsNavigationProperty { get; }
  }


}
