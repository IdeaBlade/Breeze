using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;

namespace Models.NorthwindIB.EDMX {
  
  [AttributeUsage(AttributeTargets.Property)]
  public class CustomValidator : ValidationAttribute {
    public override Boolean IsValid(Object value) {
      try {
        var val = (string)value;
        if (!string.IsNullOrEmpty(val) && val.StartsWith("Error")) {
          ErrorMessage = "{0} equal the word 'Error'";
          return false;
        }
        return true;
      } catch (Exception e) {
        var x = e;
        return false;
      }
    }
  }

  [MetadataType(typeof(CustomerMetaData))]
  public partial class Customer {
    
  }


  public class CustomerMetaData {

    
    [CustomValidator]
    public string ContactName {
      get;
      set;
    }



  }
}
