using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;
using System.Resources;
using System.Reflection;
using Breeze.NetClient.Core;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using Newtonsoft.Json.Linq;
using System.Globalization;

namespace Breeze.NetClient {


  public class RequiredValidationRule : ValidationRule {
    public RequiredValidationRule(bool treatEmptyStringAsNull = true) : base() {
      LocalizedMessage = new LocalizedMessage(LocalizedKey, "{0} is a required field");
      TreatEmptyStringAsNull = treatEmptyStringAsNull;
    }

    protected override bool ValidateCore(ValidationContext context) {
      var value = context.PropertyValue;
      if (value == null) return false;
      if (value.GetType() == typeof(String) && String.IsNullOrEmpty((String)value) && TreatEmptyStringAsNull) {
        return false;
      }
      return true;
    }

    public override String GetErrorMessage(ValidationContext context) {
      return LocalizedMessage.Format(context.DisplayName);
    }

    public bool TreatEmptyStringAsNull {
      get;
      private set;
    }
  }

  public class MaxLengthValidationRule : ValidationRule {
    public MaxLengthValidationRule(int maxLength) : base() {
      LocalizedMessage = new LocalizedMessage(LocalizedKey, "'{0}' must be {1} character(s) or less");
      MaxLength = maxLength;
    }

    protected override bool ValidateCore(ValidationContext context) {
      var value = context.PropertyValue;
      if (value == null) return true;
      return ((String)value).Length <= MaxLength;
    }

    public override String GetErrorMessage(ValidationContext context) {
      return LocalizedMessage.Format(context.DisplayName, MaxLength);
    }

    public int MaxLength { get; private set; }
  }

  public class StringLengthValidationRule : ValidationRule {
    public StringLengthValidationRule(int minLength, int maxLength) : base() {
      LocalizedMessage = new LocalizedMessage(LocalizedKey, "'{0}' must be betwee {1} and {2} character(s)");
      MinLength = minLength;
      MaxLength = maxLength;
    }

    protected override bool ValidateCore(ValidationContext context) {
      var value = context.PropertyValue;
      if (value == null) return true;
      var length = ((String) value).Length;
      return length <= MaxLength & length >= MinLength;
    }

    public override String GetErrorMessage(ValidationContext context) {
      return LocalizedMessage.Format(context.DisplayName, MinLength, MaxLength);
    }

    public int MinLength { get; private set; }
    public int MaxLength { get; private set; }
  }

  public class RangeValidationRule<T> : ValidationRule where T:struct  {
    public RangeValidationRule(T min, T max, bool includeMinEndpoint = true, bool includeMaxEndpoint = true) : base() {
      LocalizedMessage = new LocalizedMessage(LocalizedKey, "'{0}' must be {1} {2} and {3} {4}");
      Min = min;
      Max = max;
      IncludeMinEndpoint = includeMinEndpoint;
      IncludeMaxEndpoint = includeMinEndpoint;
    }

    protected override bool ValidateCore(ValidationContext context) {
      var val = context.PropertyValue;
      T value = (T)Convert.ChangeType(val, typeof(T), CultureInfo.CurrentCulture);

      bool ok = true;

      if (IncludeMinEndpoint) {
        ok = Comparer<T>.Default.Compare(value, Min) >= 0;
      } else {
        ok = Comparer<T>.Default.Compare(value, Min) > 0;
      }
      
      if (!ok) return false;

      if (IncludeMaxEndpoint) {
        ok = (Comparer<T>.Default.Compare(value, Max) <= 0);
      } else {
        ok = (Comparer<T>.Default.Compare(value, Max) < 0);
      }

      return ok;
    }

    public override String GetErrorMessage(ValidationContext context) {
      var minPhrase = IncludeMinEndpoint ? ">=" : ">";
      var maxPhrase = IncludeMaxEndpoint ? "<=" : "<";
      return LocalizedMessage.Format(context.DisplayName, minPhrase, Min, maxPhrase, Max);
    }

    public T Min {
      get;
      private set;
    }

    public bool IncludeMinEndpoint {
      get;
      private set;
    }

    public T Max {
      get;
      private set;
    }

    public bool IncludeMaxEndpoint {
      get;
      private set;
    }

  }

  public class Int32RangeValidationRule : RangeValidationRule<Int32> {
     public Int32RangeValidationRule(Int32 min, Int32 max, bool includeMinEndpoint = true, bool includeMaxEndpoint = true) 
       :base(min, max, includeMinEndpoint, includeMaxEndpoint) {
    }
  }

  #region Unused Rules
  //public class PrimitiveTypeValidationRule<T> : ValidationRule {
  //  public PrimitiveTypeValidationRule(Type type) {
  //    ValidationType = type;
  //  }

  //  protected override bool ValidateCore(ValidationContext context) {
  //    var value = context.PropertyValue;
  //    if (value == null) return true;
  //    if (value.GetType() == ValidationType) return true;
  //    return true;
  //  }

  //  public override String GetErrorMessage(ValidationContext context) {
  //    return FormatMessage("'{0}' value is not of type: {1}.", context.DisplayName, ValidationType.Name);
  //  }

  //  public Type ValidationType { get; private set; }
  //}
  #endregion
}
