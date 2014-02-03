using Breeze.Core;
using System;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.NetClient {

  public class NavigationPropertyCollection : MapCollection<String, NavigationProperty> {
    protected override String GetKeyForItem(NavigationProperty item) {
      return item.Name;
    }
  }

  public class NavigationProperty : StructuralProperty, IJsonSerializable {
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

    JNode IJsonSerializable.ToJNode() {
      var jo = new JNode();
      jo.Add("name", this.Name);
      jo.Add("entityTypeName", this.EntityTypeName);
      jo.Add("isScalar", this.IsScalar);
      jo.Add("associationName", this.AssociationName);
      // jo.AddArray("validators", this.Validators);
      jo.AddArray("foreignKeyNames", this.ForeignKeyNames);
      jo.AddArray("invForeignKeyNames", this.InvForeignKeyNames);
      // jo.Add("custom", this.Custom.ToJObject)
      return jo;
    }

    void IJsonSerializable. FromJNode(JNode jNode) {
      Name = jNode.Get<String>("name");
      EntityTypeName = jNode.Get<String>("entityTypeName");
      IsScalar = jNode.Get<bool>("isScalar", true);
      AssociationName = jNode.Get<String>("associationName");
      // _validators.AddRange()
      _foreignKeyNames.AddRange(jNode.GetSimpleArray<String>("foreignKeyNames"));
      _invForeignKeyNames.AddRange(jNode.GetSimpleArray<String>("invForeignKeyNames"));
      // custom
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

    public ReadOnlyCollection<DataProperty> ForeignKeyProperties {
      get {
        if (_foreignKeyProperties == null) {
          if (_foreignKeyNames.Count == 0) {
            _foreignKeyProperties = new SafeList<DataProperty>();
          } else {
            _foreignKeyProperties = new SafeList<DataProperty>(_foreignKeyNames.Select(fkName => ParentType.GetDataProperty(fkName)));
          }
        }
        return _foreignKeyProperties.ReadOnlyValues;
      }
    }

    public ReadOnlyCollection<DataProperty> InvForeignKeyProperties {
      get {
        if (_invForeignKeyProperties == null) {
          if (_invForeignKeyNames.Count == 0) {
            _invForeignKeyProperties = new SafeList<DataProperty>();
          } else {
            _invForeignKeyProperties = new SafeList<DataProperty>(_invForeignKeyNames.Select(invFkName => EntityType.GetDataProperty(invFkName)));
          }
        }
        return _invForeignKeyProperties.ReadOnlyValues;
      }
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
    internal SafeList<DataProperty> _foreignKeyProperties = null;
    internal SafeList<DataProperty> _invForeignKeyProperties = null;
    internal SafeList<String> _invForeignKeyNamesOnServer = new SafeList<string>();

  }



}
