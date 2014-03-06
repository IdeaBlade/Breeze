using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.NetClient {

  public class PropertyCollection : KeyedCollection<String, StructuralProperty> {
    protected override String GetKeyForItem(StructuralProperty item) {
      return item.Name;
    }
  }

  public abstract class StructuralProperty  {
    public StructuralProperty() { }

    public StructuralProperty(StructuralProperty prop) {
      this.Name = prop.Name;
      this.NameOnServer = prop.NameOnServer;
      this.Custom = prop.Custom;
      this.IsInherited = prop.IsInherited;
      this.IsScalar = prop.IsScalar;
      this.IsUnmapped = prop.IsUnmapped;
      this._validators = prop.Validators.ToList();
    }
    public StructuralType ParentType { get; internal set; }
    public abstract Type ClrType { get; }
    public String Name { get; internal set; }
    public String NameOnServer { get; internal set; }
    public bool IsScalar { get; internal set; }
    public bool IsInherited { get; internal set; }
    public bool IsUnmapped { get; internal set; }
    public IEnumerable<ValidationRule> Validators {
      get { return _validators; }
    }

    // TODO: enhance this later with DisplayName property and localization
    public String DisplayName {
      get { return this.Name; }
    }
    public Object Custom { get; internal set; }

    public abstract bool IsDataProperty { get;  }
    public abstract bool IsNavigationProperty { get; }

    internal List<ValidationRule> _validators = new List<ValidationRule>();

  }


}
