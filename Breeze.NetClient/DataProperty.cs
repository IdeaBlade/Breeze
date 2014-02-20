using Breeze.Core;
using System;

namespace Breeze.NetClient {

  public class DataPropertyCollection : MapCollection<String, DataProperty> {
    protected override String GetKeyForItem(DataProperty item) {
      return item.Name;
    }

    
  }

  public class DataProperty : StructuralProperty, IJsonSerializable {
    public DataProperty() {

    }

    public DataProperty(DataProperty dp)
      : base(dp) {

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

    public DataProperty(JNode jNode) {
      Name = jNode.Get<String>("name");
      ComplexTypeName = jNode.Get<String>("complexTypeName");
      if (ComplexTypeName == null) {
        DataType = DataType.FromName(jNode.Get<String>("dataType"));
      }
      IsNullable = jNode.Get<bool>("isNullable", true);
      if (DataType != null) {
        DefaultValue = jNode.Get("defaultValue", DataType.ClrType);
      }
      IsPartOfKey = jNode.Get<bool>("isPartOfKey", false);
      IsUnmapped = jNode.Get<bool>("isUnmapped", false);
      IsAutoIncrementing = jNode.Get<bool>("isAutoIncrementing", false);
      ConcurrencyMode = (ConcurrencyMode)Enum.Parse(typeof(ConcurrencyMode), jNode.Get<String>("conncurrencyMode", ConcurrencyMode.None.ToString()));
      MaxLength = jNode.Get<int?>("maxLength");
      EnumTypeName = jNode.Get<String>("enumType");
      IsScalar = jNode.Get<bool>("isScalar", true);
    }


    JNode IJsonSerializable.ToJNode(Object config) {
      var jn = new JNode();
      jn.AddPrimitive("name", this.Name);
      jn.AddPrimitive("dataType", this.DataType != null ? this.DataType.Name : null); 
      jn.AddPrimitive("complexTypeName", this.ComplexType != null ? this.ComplexType.Name : null );
      jn.AddPrimitive("isNullable", this.IsNullable, true);
      jn.AddPrimitive("defaultValue", this.DefaultValue );
      jn.AddPrimitive("isPartOfKey", this.IsPartOfKey, false);
      jn.AddPrimitive("isUnmapped", this.IsUnmapped, false);
      jn.AddPrimitive("isAutoIncrementing", this.IsAutoIncrementing, false);
      jn.AddPrimitive("concurrencyMode", this.ConcurrencyMode == ConcurrencyMode.None ? null : this.ConcurrencyMode.ToString());
      jn.AddPrimitive("maxLength", this.MaxLength);
      // jo.AddArrayProperty("validators", this.Validators);
      jn.AddPrimitive("enumType", this.EnumTypeName);
      jn.AddPrimitive("isScalar", this.IsScalar, true);
      // jo.AddProperty("custom", this.Custom.ToJObject)
      return jn;
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
