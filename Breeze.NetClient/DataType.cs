using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

namespace Breeze.Metadata {
  
  [Flags]
  public enum DataTypeInfo {
    None = 0,
    IsNumeric = 1,
    IsInteger = 2,
    IsDate = 4
  }

  public class NumericDataType : DataType  {
    public NumericDataType(Type clrType, String fmtSuffix, bool isInteger) : base(clrType) {
      DefaultValue = Convert.ChangeType(0, clrType);
      FmtOData = (Object source) => FmtNumber(source, clrType, fmtSuffix);
      GetNext = () => GetNextValue(clrType);
      DataTypeInfo = DataTypeInfo.IsNumeric | (isInteger ? DataTypeInfo.IsInteger : DataTypeInfo.None);
    }
  }

  public class DataType {
    public DataType(Type clrType) {
      Name = clrType.Name;
      ClrType = clrType;
      All.Add(this);
    }
    public String Name { get; internal set; }
    public Type ClrType { get; internal set; }
    public Object DefaultValue { get; internal set; }
    public virtual Object Parse(Object val) { 
      if (val == null) return null;
      return Convert.ChangeType(val, ClrType);
    }
    public Func<Object, String> FmtOData { get; internal set; }
    public Func<Object> GetNext { get; internal set;}
    public DataTypeInfo DataTypeInfo { get; internal set; }
    public static List<DataType> All = new List<DataType>();   
    
    public static DataType String = new DataType(typeof(String)) {
        DefaultValue = "",
        FmtOData =  FmtString,
        GetNext =  null
    };

    public static DataType Int64 = new NumericDataType(typeof(Int64), "L", true);

    public static DataType Int32 = new NumericDataType(typeof(Int32), "", true);

    public static DataType Int16 = new NumericDataType(typeof(Int16), "", true);

    public static DataType Byte  = new NumericDataType(typeof(Byte), "", true);

    public static DataType Decimal = new NumericDataType(typeof(Decimal), "m", false);

    public static DataType Double = new NumericDataType(typeof(Double), "d", false);

    public static DataType Single = new NumericDataType(typeof(Single), "f", false);

    public static DataType DateTime = new DataType(typeof(DateTime)) {
      DefaultValue = new DateTime(1900, 1, 1),
      FmtOData = FmtDateTime,
      GetNext = null,
      DataTypeInfo = DataTypeInfo.IsDate
    };

    public static DataType DateTimeOffset = new DataType(typeof(DateTimeOffset)) {
      DefaultValue = new DateTimeOffset(1900, 1, 1,0,0,0, new TimeSpan()),
      FmtOData = FmtDateTime,
      DataTypeInfo = DataTypeInfo.IsDate
    };

    public static DataType Time = new DataType(typeof(TimeSpan)) {
      Name = "Time",
      DefaultValue = new TimeSpan(0),
      FmtOData = FmtTime,
    };

    public static DataType Boolean = new DataType(typeof(Boolean)) {
      DefaultValue = false,
      FmtOData = FmtBoolean,
    };

    public static DataType Guid = new DataType(typeof(Guid)) {
      DefaultValue = System.Guid.Empty,
      FmtOData = FmtGuid,
      GetNext = () => GetNextValue(typeof(Guid))
    };

    public static DataType Binary = new DataType(typeof(Byte[])) {
      Name = "Binary",
      DefaultValue = null,
      FmtOData = FmtBinary,
    };

    public static DataType Undefined = new DataType(typeof(Object)) {
      DefaultValue = null,
      FmtOData = FmtUndefined,
    };

    public static DataType FromName(String typeName) {
      var dataType = All.FirstOrDefault(dt => dt.Name == typeName);
      return dataType != null ? dataType : DataType.Undefined;
    }

    public static DataType FromEdmType(String typeName) {
      DataType dt = DataType.Undefined;        
      var parts = typeName.Split('.');
      if (parts.Length > 1) {
          var simpleName = parts[1];
          if (simpleName == "image") {
              // hack
              dt = DataType.Byte;
          } else if (parts.Length == 2) {
            dt = DataType.FromName(simpleName);
          } else {
              // enum
              // dt = DataType.Int32;
              dt = DataType.String;
          }
      }
      return dt;
    }
   

    protected static Object GetNextValue(Type t) {
      // TODO: implement this for numbers, guids and dateTimes
      return null;
    }



    protected static String FmtString(Object val) {
      if (val == null) return null;
      return "'" + ((String)val).Replace("'", "''") + "'";
    }

    protected static String FmtNumber(Object val, Type clrType, String fmtSuffix) {
      if (val == null) return null;
      var tmp = Convert.ChangeType(val, clrType);
      return tmp.ToString() + fmtSuffix;
    }

    protected static String FmtDateTime(Object val) {
      if (val == null) return null;
      var date = (DateTime) Convert.ChangeType(val, typeof(DateTime));
      var tmp = date.ToString("s", System.Globalization.CultureInfo.InvariantCulture);
      return "datetime'" + tmp + "'";
    }

    protected static String FmtDateTimeOffset(Object val) {
      if (val == null) return null;
      var date = (DateTimeOffset)Convert.ChangeType(val, typeof(DateTimeOffset));
      var tmp = date.ToString("s", System.Globalization.CultureInfo.InvariantCulture);
      return "datetimeoffset'" + tmp + "'";
    }

    protected static String FmtTime(Object val) {
      if (val == null) return null;
      var timeSpan = (TimeSpan)val;
      var tmp = XmlConvert.ToString(timeSpan);
      return "time'" + tmp + "'";
    }

    protected static String FmtGuid(Object val) {
      if (val == null) return null;
      var guid = (Guid)val;
      var tmp = guid.ToString();
      return "guid'" + tmp + "'";
    }

    protected static String FmtBoolean(Object val) {
      if (val == null) return null;
      var tmp  = (Boolean)val;
      return  tmp ? "true" : "false";
    }

    protected static String FmtBinary(Object val) {
      if (val == null) return null;
      var tmp = (Byte[])val;
      return "binary'" + tmp + "'";
    }

    protected static String FmtUndefined(Object val) {
      if (val == null) return null;
      return val.ToString();
    }


  }
}
