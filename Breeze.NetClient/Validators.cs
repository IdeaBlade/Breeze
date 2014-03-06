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


  public class RequiredValidator : Validator {
    public RequiredValidator(bool? treatEmptyStringAsNull = null) : base() {
      LocalizedMessage = new LocalizedMessage(LocalizedKey, "{0} is a required field");
      TreatEmptyStringAsNull = treatEmptyStringAsNull.HasValue ? treatEmptyStringAsNull.Value : DefaultTreatEmptyStringAsNull;
    }

    public static bool DefaultTreatEmptyStringAsNull {
      get {
        return __defaultTreatEmptyStringAsNull;
      }
      set {
        __defaultTreatEmptyStringAsNull = value;
        Default = new RequiredValidator(value);
      }
    }

    public static RequiredValidator Default = new RequiredValidator(DefaultTreatEmptyStringAsNull);

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

    private static bool __defaultTreatEmptyStringAsNull;
  }

  public class MaxLengthValidator : Validator {
    public MaxLengthValidator(int maxLength) : base() {
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

  public class StringLengthValidator : Validator {
    public StringLengthValidator(int minLength, int maxLength) : base() {
      LocalizedMessage = new LocalizedMessage(LocalizedKey, "'{0}' must be between {1} and {2} character(s)");
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

  public class RangeValidator<T> : Validator where T:struct  {
    public RangeValidator(T min, T max, bool includeMinEndpoint = true, bool includeMaxEndpoint = true) : base() {
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

  public class Int32RangeValidator : RangeValidator<Int32> {
     public Int32RangeValidator(Int32 min, Int32 max, bool includeMinEndpoint = true, bool includeMaxEndpoint = true) 
       :base(min, max, includeMinEndpoint, includeMaxEndpoint) {
    }
  }

  #region Unused Validators
  //public class PrimitiveTypeValidator<T> : Validator {
  //  public PrimitiveTypeValidator(Type type) {
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
