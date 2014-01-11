using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;


namespace Breeze.Metadata {

  public class NavigationPropertyCollection : KeyedMap<String, NavigationProperty> {
    protected override String GetKeyForItem(NavigationProperty item) {
      return item.Name;
    }
  }

  public class NavigationProperty : AbstractProperty {
    public String EntityTypeName { get; internal set; }
    public String AssociationName { get; internal set; }
    public List<String> ForeignKeyNames { get; internal set;}
    public List<String> ForeignKeyNamesOnServer { get; internal set;}
    public List<String> InvForeignKeyNames { get; internal set; }
    public List<String> InvForeignKeyNamesOnServer { get; internal set; }

    public NavigationProperty(NavigationProperty np) : base(np) {
      this.EntityTypeName = np.EntityTypeName;
      this.AssociationName = np.AssociationName;
      this.ForeignKeyNames = np.ForeignKeyNames.ToList();
      this.ForeignKeyNamesOnServer = np.ForeignKeyNamesOnServer.ToList();
      this.InvForeignKeyNames = np.InvForeignKeyNames.ToList();
      this.InvForeignKeyNamesOnServer = np.InvForeignKeyNamesOnServer.ToList();
    }

    public override bool IsDataProperty { get { return false; } }
    public override bool IsNavigationProperty { get { return true; } }

  }



}
