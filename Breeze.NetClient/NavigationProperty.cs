using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.NetClient {

  public class NavigationPropertyCollection : MapCollection<String, NavigationProperty> {
    protected override String GetKeyForItem(NavigationProperty item) {
      return item.Name;
    }
  }

  public class NavigationProperty : StructuralProperty {
    public NavigationProperty() {

    }

    public NavigationProperty(NavigationProperty np)
      : base(np) {
      this.EntityTypeName = np.EntityTypeName;
      this.AssociationName = np.AssociationName;
      this._foreignKeyNames = np._foreignKeyNames;
      this._foreignKeyNamesOnServer = np._foreignKeyNamesOnServer;
      this._invForeignKeyNames = np._invForeignKeyNames;
      this._invForeignKeyNamesOnServer = np._invForeignKeyNamesOnServer;
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
      get { return _relatedDataProperties.ReadOnlyValues; }
    }
    
    public ReadOnlyCollection<String> ForeignKeyNames {
      get { return _foreignKeyNames.ReadOnlyValues;  }
    }
    public ReadOnlyCollection<String> ForeignKeyNamesOnServer {
      get { return _foreignKeyNamesOnServer.ReadOnlyValues; } 
    }
    public ReadOnlyCollection<String> InvForeignKeyNames {
      get { return _invForeignKeyNames.ReadOnlyValues; }
    }
    public ReadOnlyCollection<String> InvForeignKeyNamesOnServer {
      get { return _invForeignKeyNamesOnServer.ReadOnlyValues; }
    }

    public override bool IsDataProperty { get { return false; } }
    public override bool IsNavigationProperty { get { return true; } }

    internal SafeList<DataProperty> _relatedDataProperties = new SafeList<DataProperty>();

    internal SafeList<String> _foreignKeyNames = new SafeList<string>();
    internal SafeList<String> _foreignKeyNamesOnServer = new SafeList<string>();
    internal SafeList<String> _invForeignKeyNames = new SafeList<string>();
    internal SafeList<String> _invForeignKeyNamesOnServer = new SafeList<string>();

  }



}
