using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.NetClient {

  public class DataPropertyCollection : KeyedMap<String, DataProperty> {
    protected override String GetKeyForItem(DataProperty item) {
      return item.Name;

    }
  }

  public class DataProperty : EntityProperty {
    public DataProperty() {

    }

    public DataProperty(DataProperty dp) : base(dp) {
      
      this.ConcurrencyMode = dp.ConcurrencyMode;
      this.ComplexTypeName = dp.ComplexTypeName;
      this.ComplexType = dp.ComplexType;
      this.DataType = dp.DataType;
      this.DefaultValue = dp.DefaultValue;
      this.EnumTypeName = dp.EnumTypeName;
      this.IsNullable = dp.IsNullable;
      this.IsPartOfKey = dp.IsPartOfKey;
      this.IsUnmapped = dp.IsUnmapped;

      this.MaxLength = dp.MaxLength;
      this.RawTypeName = dp.RawTypeName;
    }

    public DataType DataType { get; internal set; }
    
    public bool IsNullable { get; internal set; }
    // Not sure how this is set;
    public bool IsAutoIncrementing { get; internal set; }
    
    public bool IsPartOfKey { get; internal set; }
    public Object DefaultValue { get; internal set; }
    public ConcurrencyMode ConcurrencyMode { get; internal set; }
    public Int64? MaxLength { get; internal set; }

    public NavigationProperty InverseNavigationProperty { get; internal set; }
    public NavigationProperty RelatedNavigationProperty { get; internal set; } // only set if fk
    public ComplexType ComplexType { get; internal set; }
    public String ComplexTypeName { get; internal set; }
    public String EnumTypeName { get; internal set; }
    public String RawTypeName { get; internal set; }

    public bool IsComplexProperty { get { return ComplexTypeName != null;}}
    public bool IsForeignKey { get { return RelatedNavigationProperty != null; } }
    public bool IsConcurrencyProperty { get { return ConcurrencyMode != ConcurrencyMode.None; } }
    public override bool IsDataProperty { get { return true; } }
    public override bool IsNavigationProperty { get { return false; } }
    
  }

  public enum ConcurrencyMode {
    None = 0,
    Fixed = 1
  }


}
