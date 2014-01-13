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
    public String Name { get; internal set; }
    public String NameOnServer { get; internal set; }
    public bool IsScalar { get; internal set; }
    public bool IsInherited { get; internal set; }
    public ValidatorCollection Validators { get; internal set; }
    public dynamic Custom { get; internal set; }

    public abstract bool IsDataProperty { get;  }
    public abstract bool IsNavigationProperty { get; }
  }


}
