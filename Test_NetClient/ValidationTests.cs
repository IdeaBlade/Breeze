using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.NetClient;
using Breeze.Core;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Foo;
using System.Collections.Specialized;
using System.ComponentModel;

namespace Test_NetClient {

  [TestClass]
  public class ValidationTests {

    private Task<EntityManager> _emTask = null;
    private EntityManager _em1;
    

    [TestInitialize]
    public void TestInitializeMethod() {
      _emTask = SetUpAsync();
    }

    public async Task<EntityManager> SetUpAsync() {
      var serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";
      
      if ( MetadataStore.Instance.EntityTypes.Count == 0) {
        _em1 = new EntityManager(serviceName);
        await _em1.FetchMetadata();
      } else {
        _em1 = new EntityManager(serviceName);
      }
      return _em1;
      
    }

    [TestCleanup]
    public void TearDown() {
      
    }

    [TestMethod]
    public async Task Register() {
      await _emTask;
      ValidationRule.RegisterRules(typeof(ValidationRule).Assembly);

      var vr = new RequiredValidationRule();
      var vrNode = vr.ToJNode();
      var vr2 = ValidationRule.FromJNode(vrNode);
      var vr3 = ValidationRule.FromJNode(vrNode);
      Assert.IsTrue(vr2 == vr3);

      var mlVr = new MaxLengthValidationRule(17);
      var mlVrNode = mlVr.ToJNode();
      var mlVr2 = ValidationRule.FromJNode(mlVrNode);
      var mlVr3 = ValidationRule.FromJNode(mlVrNode);
      Assert.IsTrue(mlVr2 == mlVr3);

      
    }
    

  }
}
