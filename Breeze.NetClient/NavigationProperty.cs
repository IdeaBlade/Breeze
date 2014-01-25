using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.NetClient {

  public class NavigationPropertyCollection : KeyedMap<String, NavigationProperty> {
    protected override String GetKeyForItem(NavigationProperty item) {
      return item.Name;
    }
  }

  public class NavigationProperty : EntityProperty {
    public NavigationProperty() {

    }

    public NavigationProperty(NavigationProperty np)
      : base(np) {
      this.EntityTypeName = np.EntityTypeName;
      this.AssociationName = np.AssociationName;
      this._foreignKeyNames = np._foreignKeyNames.ToList();
      this._foreignKeyNamesOnServer = np._foreignKeyNamesOnServer.ToList();
      this._invForeignKeyNames = np._invForeignKeyNames.ToList();
      this._invForeignKeyNamesOnServer = np._invForeignKeyNamesOnServer.ToList();
    }

    public EntityType EntityType { get; internal set; }
    public override Type ClrType {
      get { return EntityType.ClrType; }
    }
    public String EntityTypeName { get; internal set; }
    public String AssociationName { get; internal set; }
    
    public NavigationProperty Inverse { get; internal set; }

    // AsReadOnly doesn't seem to exist in the PCL
    public ReadOnlyCollection<DataProperty> RelatedDataProperties {
      get { return new ReadOnlyCollection<DataProperty>(_relatedDataProperties); }
    }
    
    public ReadOnlyCollection<String> ForeignKeyNames {
      get { return new ReadOnlyCollection<string>(_foreignKeyNames);  }
    }
    public ReadOnlyCollection<String> ForeignKeyNamesOnServer {
      get { return new ReadOnlyCollection<string>(_foreignKeyNamesOnServer); } 
    }
    public ReadOnlyCollection<String> InvForeignKeyNames {
      get { return new ReadOnlyCollection<string>(_invForeignKeyNames); }
    }
    public ReadOnlyCollection<String> InvForeignKeyNamesOnServer {
      get { return new ReadOnlyCollection<string>(_invForeignKeyNamesOnServer); }
    }

    public override bool IsDataProperty { get { return false; } }
    public override bool IsNavigationProperty { get { return true; } }

    internal List<DataProperty> _relatedDataProperties = new List<DataProperty>();

    internal List<String> _foreignKeyNames = new List<string>();
    internal List<String> _foreignKeyNamesOnServer = new List<string>();
    internal List<String> _invForeignKeyNames = new List<string>();
    internal List<String> _invForeignKeyNamesOnServer = new List<string>();

  }



}
