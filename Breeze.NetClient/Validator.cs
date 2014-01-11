using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;


namespace Breeze.Metadata {

  public class ValidatorCollection : KeyedMap<String, Validator> {
    public ValidatorCollection() {

    }
    public ValidatorCollection(ValidatorCollection collection)
      : base(collection) {
    }
    protected override String GetKeyForItem(Validator item) {
      return item.Name;
    }
  }
  public class Validator {
    public String Name { get; protected set; }
  }
}
