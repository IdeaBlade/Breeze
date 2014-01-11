using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.Metadata {

  public class DataPropertyCollection : KeyedMap<String, DataProperty> {
    protected override String GetKeyForItem(DataProperty item) {
      return item.Name;

    }
  }

  public class DataProperty : AbstractProperty {
    public DataProperty() {

    }

    public DataProperty(DataProperty dp) : base(dp) {
      
      this.ConcurrencyMode = dp.ConcurrencyMode;
      this.ComplexTypeName = dp.ComplexTypeName;
      this.DataType = dp.DataType;
      this.DefaultValue = dp.DefaultValue;
      this.EnumType = dp.EnumType;
      this.IsNullable = dp.IsNullable;
      this.IsPartOfKey = dp.IsPartOfKey;
      this.IsUnmapped = dp.IsUnmapped;

      this.MaxLength = dp.MaxLength;
      this.RawTypeName = dp.RawTypeName;
    }

    public Type DataType { get; internal set; }
    
    public bool IsNullable { get; internal set; }
    public bool IsUnmapped { get; internal set; }
    public bool IsPartOfKey { get; internal set; }
    public Object DefaultValue { get; internal set; }
    public ConcurrencyMode ConcurrencyMode { get; internal set; }
    public int? MaxLength { get; internal set; }
    
    public String ComplexTypeName { get; set; }
    public Type EnumType { get; set; }
    public String RawTypeName { get; internal set; }

    public bool IsComplexProperty { get { return ComplexTypeName != null;}}
    public override bool IsDataProperty { get { return false; } }
    public override bool IsNavigationProperty { get { return true; } }
    
  }

  public enum ConcurrencyMode {
    None = 1,
    Fixed = 2
  }


}
