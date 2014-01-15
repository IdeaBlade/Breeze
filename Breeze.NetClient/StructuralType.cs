using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

using System.Reflection;
using Breeze.Core;

namespace Breeze.Metadata {

  public class StructuralTypeCollection : KeyedCollection<String, StructuralType> {
    protected override String GetKeyForItem(StructuralType item) {
      return item.ShortName + ":#" + item.Namespace;
    }
  }

  public abstract class StructuralType {
    public StructuralType() {
      Warnings = new List<string>();
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
    public String ShortName { get; internal set; }
    public String Namespace { get; internal set;}
    public dynamic Custom { get; set; }
    public bool IsAbstract { get; internal set; }
    // TODO: determine if this is  still needed;
    public bool IsAnonymous { get; internal set; }
    public List<String> Warnings { get; internal set; }
    public abstract bool IsEntityType { get;  }
    public abstract IEnumerable<AbstractProperty> Properties { get; }
    public DataProperty GetDataProperty(String dpName) {
      return _dataProperties[dpName];
    }

    internal abstract DataProperty AddDataProperty(DataProperty dp); 

    public ReadOnlyCollection<DataProperty> DataProperties {
      get { return new ReadOnlyCollection<DataProperty>(_dataProperties);; }
    }

    public ReadOnlyCollection<DataProperty> ComplexProperties {
      get { return new ReadOnlyCollection<DataProperty>(_complexProperties); }
    }

    public ReadOnlyCollection<DataProperty> UnmappedProperties {
      get { return new ReadOnlyCollection<DataProperty>(_unmappedProperties); }
    }
      
    internal void UpdateClientServerNames(NamingConvention nc, AbstractProperty property) {
      // TODO: add check for name roundtriping ( to see if ok)
      if (!String.IsNullOrEmpty(property.Name)) {
        property.NameOnServer = nc.Test(property.Name, true);
      } else {
        property.Name = nc.Test(property.NameOnServer, false);
      }

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
    protected List<DataProperty> _complexProperties = new List<DataProperty>();
    protected List<DataProperty> _unmappedProperties = new List<DataProperty>();
    
  }


}
