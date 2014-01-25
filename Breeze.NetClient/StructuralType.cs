using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

using System.Reflection;
using Breeze.Core;

namespace Breeze.NetClient {

  public class StructuralTypeCollection : MapCollection<String, StructuralType> {
    protected override String GetKeyForItem(StructuralType item) {
      return item.ShortName + ":#" + item.Namespace;
    }
  }

  public abstract class StructuralType {
    public StructuralType() {
      Warnings = new List<string>();
    }

    public static string ClrTypeToStructuralTypeName(Type clrType) {
      return QualifyTypeName(clrType.Name, clrType.Namespace);
    }

    public static String QualifyTypeName(String shortName, String ns) {
      return shortName + ":#" + ns;
    }

    public static bool IsQualifiedTypeName(String entityTypeName) {
      return entityTypeName.IndexOf(":#") >= 0;
    }

    public MetadataStore MetadataStore { get; internal set; }
    public String Name { 
      get { return QualifyTypeName(ShortName, Namespace); }
    }
    public Type ClrType {
      get {
        if (_clrType == null) {
          _clrType = MetadataStore.GetClrTypeFor(this);
          if (_clrType == null) {
            throw new Exception("Unable to locate a CLR type corresponding to: " + this.Name);
          }
        }
        return _clrType;
      }
      internal set {
        _clrType = value;
      }  
    }
    private Type _clrType;
    public String ShortName { get; internal set; }
    public String Namespace { get; internal set;}
    public dynamic Custom { get; set; }
    public bool IsAbstract { get; internal set; }
    // TODO: determine if this is  still needed;
    public bool IsAnonymous { get; internal set; }
    public List<String> Warnings { get; internal set; }
    public abstract bool IsEntityType { get;  }
    
    public virtual  IEnumerable<EntityProperty> Properties {
      get { return _dataProperties.Cast<EntityProperty>(); }
    }

    public ICollection<DataProperty> DataProperties {
      get { return _dataProperties.ReadOnlyValues; }
    }

    public DataProperty GetDataProperty(String dpName) {
      return _dataProperties[dpName];
    }

    public virtual EntityProperty GetProperty(String propName) {
      return _dataProperties[propName];
    }

    internal virtual DataProperty AddDataProperty(DataProperty dp) {
      UpdateClientServerName(dp);
      _dataProperties.Add(dp);

      if (dp.IsComplexProperty) {
        _complexProperties.Add(dp);
      }

      if (dp.IsUnmapped) {
        _unmappedProperties.Add(dp);
      }

      return dp;
    } 

  

    public ReadOnlyCollection<DataProperty> ComplexProperties {
      get { return _complexProperties.ReadOnlyValues; }
    }

    public ReadOnlyCollection<DataProperty> UnmappedProperties {
      get { return _unmappedProperties.ReadOnlyValues;  }
    }

    internal void UpdateClientServerName(EntityProperty property) {
      var nc = MetadataStore.NamingConvention;
      if (!String.IsNullOrEmpty(property.Name)) {
        property.NameOnServer = nc.Test(property.Name, true);
      } else {
        property.Name = nc.Test(property.NameOnServer, false);
      }
    }
      
    internal void UpdateClientServerFkNames(EntityProperty property) {
      // TODO: add check for name roundtriping ( to see if ok)
      var nc = MetadataStore.NamingConvention;
      var navProp = property as NavigationProperty;
      if (navProp != null) {
        if (navProp._foreignKeyNames.Count > 0) {
          navProp._foreignKeyNamesOnServer = navProp._foreignKeyNames.Select(fkn => nc.Test(fkn, true)).ToList();
        } else {
          navProp._foreignKeyNames = navProp._foreignKeyNamesOnServer.Select(fkn => nc.Test(fkn, false)).ToList();
        }

        if (navProp._invForeignKeyNames.Count > 0) {
          navProp._invForeignKeyNamesOnServer = navProp._invForeignKeyNames.Select(fkn => nc.Test(fkn, true)).ToList();
        } else {
          navProp._invForeignKeyNames = navProp._invForeignKeyNamesOnServer.Select(fkn => nc.Test(fkn, false)).ToList();
        }
      }
    }

    protected DataPropertyCollection _dataProperties = new DataPropertyCollection();
    protected SafeList<DataProperty> _complexProperties = new SafeList<DataProperty>();
    protected SafeList<DataProperty> _unmappedProperties = new SafeList<DataProperty>();

  }


}
