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
      var vrNode = ((IJsonSerializable) vr).ToJNode(null);
      var vr2 = ValidationRule.FromJNode(vrNode);
      var vr3 = ValidationRule.FromJNode(vrNode);
      Assert.IsTrue(vr2 == vr3);

      var mlVr = new MaxLengthValidationRule(17);
      var mlVrNode = ((IJsonSerializable)mlVr).ToJNode(null);
      var mlVr2 = ValidationRule.FromJNode(mlVrNode);
      var mlVr3 = ValidationRule.FromJNode(mlVrNode);
      Assert.IsTrue(mlVr2 == mlVr3);
      
    }

    [TestMethod]
    public async Task LocalizedValidationMessage() {
      await _emTask;
      ValidationRule.RegisterRules(typeof(ValidationRule).Assembly);

      var vr = new RequiredValidationRule();
      var mt = vr.LocalizedMessage.MessageTemplate;
      Assert.IsTrue(!String.IsNullOrEmpty(mt));
      Assert.IsTrue(!mt.EndsWith("**"));
    }

    [TestMethod]
    public async Task RequiredProperty() {
      await _emTask;
      ValidationRule.RegisterRules(typeof(ValidationRule).Assembly);

      var emp = new Employee();
      var vr = new RequiredValidationRule();
      var dp = emp.EntityAspect.EntityType.GetDataProperty("LastName");
      var vc = new ValidationContext(emp, null, dp );
      var ves = vr.Validate(vc);
      Assert.IsTrue(ves.Any());
      var ve = ves.First();
      Assert.IsTrue(ve.Message.Contains("LastName") && ve.Message.Contains("required"));
      Assert.IsTrue(ve.Context.Instance == emp);
      Assert.IsTrue(ve.Rule == vr);
      Assert.IsTrue(ve.Key != null);
    }

  }
}
