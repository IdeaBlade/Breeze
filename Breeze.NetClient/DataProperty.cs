using Breeze.Core;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.NetClient {

  public class DataPropertyCollection : MapCollection<String, DataProperty> {
    protected override String GetKeyForItem(DataProperty item) {
      return item.Name;
    }

    
  }

  public class DataProperty : StructuralProperty, IJsonSerializable {
    public DataProperty() {

    }

    public DataProperty(DataProperty dp) : base(dp) {

      this.DataType = dp.DataType;
      this.DefaultValue = dp.DefaultValue;
      this.IsNullable = dp.IsNullable;
      this.IsPartOfKey = dp.IsPartOfKey;
      this.IsForeignKey = dp.IsForeignKey;
      this.ConcurrencyMode = dp.ConcurrencyMode;
      this.IsUnmapped = dp.IsUnmapped;
      this.IsAutoIncrementing = dp.IsAutoIncrementing;

      this.ComplexTypeName = dp.ComplexTypeName;
      this.ComplexType = dp.ComplexType;
      this.MaxLength = dp.MaxLength;
      this.EnumTypeName = dp.EnumTypeName;
      this.RawTypeName = dp.RawTypeName;
    }

    JObject IJsonSerializable.ToJObject() {
      var jo = new JObject();
      jo.AddProperty("name", this.Name);
      jo.AddProperty("dataType", (this.DataType != null && this.ComplexType == null) ? this.DataType.Name : null); // do not serialize complexTypename here
      jo.AddProperty("isNullable", this.IsNullable, true);
      jo.AddProperty("defaultValue", this.DefaultValue );
      jo.AddProperty("isPartOfKey", this.IsPartOfKey, false);
      jo.AddProperty("isUnmapped", this.IsUnmapped, false);
      jo.AddProperty("concurrencyMode", this.ConcurrencyMode == ConcurrencyMode.None ? null : this.ConcurrencyMode.ToString());
      jo.AddProperty("maxLength", this.MaxLength);
      // jo.AddArrayProperty("validators", this.Validators);
      jo.AddProperty("enumType", this.EnumTypeName);
      jo.AddProperty("isScalar", this.IsScalar, true);
      // jo.AddProperty("custom", this.Custom.ToJObject)
      return jo;
    }

    object IJsonSerializable.FromJObject(JObject jObject) {
      throw new NotImplementedException();
    }

    public DataType DataType { get; internal set; }
    public override Type ClrType {
      get {
        if (_clrType == null) {
          if (IsComplexProperty) {
            _clrType = ComplexType.ClrType;
          } else {
            var rawClrType = DataType.ClrType;
            _clrType = IsNullable ? TypeFns.GetNullableType(rawClrType) : rawClrType;
          }
        }
        return _clrType;
      }
    }
    private Type _clrType;
    
    public bool IsNullable { get; internal set; }
    // Not sure how this is set;
    public bool IsAutoIncrementing { get; internal set; }
    
    public bool IsPartOfKey { get; internal set; }
    public Object DefaultValue { get; internal set; }
    public ConcurrencyMode ConcurrencyMode { get; internal set; }
    public Int64? MaxLength { get; internal set; }

    public NavigationProperty InverseNavigationProperty { get; internal set; }
    public NavigationProperty RelatedNavigationProperty { get; internal set; } // only set if fk
    public bool IsForeignKey { get; internal set; } // may be set even if no RelatedNavigationProperty ( if unidirectional nav)
    public ComplexType ComplexType { get; internal set; }
    public String ComplexTypeName { get; internal set; }
    public String EnumTypeName { get; internal set; }
    public String RawTypeName { get; internal set; }

    public bool IsComplexProperty { get { return ComplexTypeName != null;}}
    public bool IsConcurrencyProperty { get { return ConcurrencyMode != ConcurrencyMode.None; } }
    public override bool IsDataProperty { get { return true; } }
    public override bool IsNavigationProperty { get { return false; } }
    
  }

  public enum ConcurrencyMode {
    None = 0,
    Fixed = 1
  }


}
