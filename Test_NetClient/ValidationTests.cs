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
    public async Task FindOrCreateFromJson() {
      await _emTask;
      Validator.RegisterValidators(typeof(Validator).Assembly);

      var vr = new RequiredValidator();
      var vrNode = ((IJsonSerializable) vr).ToJNode(null);
      var vr2 = Validator.FindOrCreate(vrNode);
      var vr3 = Validator.FindOrCreate(vrNode);
      Assert.IsTrue(vr2 == vr3);

      var mlVr = new MaxLengthValidator(17);
      var mlVrNode = ((IJsonSerializable)mlVr).ToJNode(null);
      var mlVr2 = Validator.FindOrCreate(mlVrNode);
      var mlVr3 = Validator.FindOrCreate(mlVrNode);
      Assert.IsTrue(mlVr2 == mlVr3);
      
    }

    [TestMethod]
    public async Task FindOrCreateFromParams() {
      await _emTask;
      Validator.RegisterValidators(typeof(Validator).Assembly);

      var vr2 = Validator.FindOrCreate<RequiredValidator>(true);
      var vr3 = Validator.FindOrCreate<RequiredValidator>(true);
      Assert.IsTrue(vr2 == vr3);


      var mlVr2 = Validator.FindOrCreate<MaxLengthValidator>(17);
      var mlVr3 = Validator.FindOrCreate<MaxLengthValidator>(17);
      Assert.IsTrue(mlVr2 == mlVr3);

      var slVr2 = Validator.FindOrCreate<StringLengthValidator>(3, 12);
      var slVr3 = Validator.FindOrCreate<StringLengthValidator>(3, 12);
      Assert.IsTrue(slVr2 == slVr3);

    }

    [TestMethod]
    public async Task LocalizedValidationMessage() {
      await _emTask;
      Validator.RegisterValidators(typeof(Validator).Assembly);

      var vr = new RequiredValidator();
      var mt = vr.LocalizedMessage.Message;
      Assert.IsTrue(!String.IsNullOrEmpty(mt));
      Assert.IsTrue(vr.LocalizedMessage.WasLocalized);
    }

    [TestMethod]
    public async Task RequiredProperty() {
      await _emTask;
      Validator.RegisterValidators(typeof(Validator).Assembly);

      var emp = new Employee();
      var vr = new RequiredValidator();
      var dp = emp.EntityAspect.EntityType.GetDataProperty("LastName");
      var vc = new ValidationContext(emp, null, dp );
      var ves = vr.Validate(vc);
      Assert.IsTrue(ves.Any());
      var ve = ves.First();
      Assert.IsTrue(ve.Message.Contains("LastName") && ve.Message.Contains("required"));
      Assert.IsTrue(ve.Context.Instance == emp);
      Assert.IsTrue(ve.Validator == vr);
      Assert.IsTrue(ve.Key != null);
    }

  }
}
