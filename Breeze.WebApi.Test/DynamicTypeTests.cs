using System;
using System.Text;
using System.Collections.Generic;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Collections;
using System.Collections.ObjectModel;

namespace Breeze.WebApi.Test {


  [TestClass]
  public class DynamicTypeTests {

    [TestInitialize]
    public void Init() {

    }

    [TestMethod]
    public void Create1() {
      var propNames = new string[] { "LastName", "FirstName", "Age"};
      var propTypes = new Type[] {typeof (String), typeof (String), typeof (Int32)};
      var t1 = DynamicTypeInfo.FindOrCreate(propNames, propTypes);

      var t2 = DynamicTypeInfo.FindOrCreate(propNames, propTypes);
      Assert.IsTrue(t1 == t2);
    }



  }
}