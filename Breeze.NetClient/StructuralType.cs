using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
    public String ShortName { get; internal set; }
    public String Namespace { get; internal set;}
    public dynamic Custom { get; set; }
    public List<String> Warnings { get; internal set; }

    internal abstract DataProperty AddDataProperty(DataProperty dp);

    public IEnumerable<DataProperty> DataProperties {
      get { return _dataProperties.AsEnumerable(); }
    }

    public IEnumerable<DataProperty> ComplexProperties {
      get { return _complexProperties.AsEnumerable(); }
    }

    public IEnumerable<DataProperty> UnmappedProperties {
      get { return _unmappedProperties.AsEnumerable(); }
    }

    protected DataPropertyCollection _dataProperties = new DataPropertyCollection();
    protected List<DataProperty> _complexProperties = new List<DataProperty>();
    protected List<DataProperty> _unmappedProperties = new List<DataProperty>(); 
  }


}
