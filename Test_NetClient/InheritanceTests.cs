using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Threading.Tasks;
using System.Linq;
using Breeze.Core;
using Breeze.NetClient;
using System.Collections.Generic;
using Foo;
using Inheritance.Models;

namespace Test_NetClient {

  [TestClass]
  public class InheritanceTests {

    private Task<EntityManager> _emTask = null;
    private EntityManager _em1;
    

    [TestInitialize]
    public void TestInitializeMethod() {
      _emTask = SetUpAsync();
    }

    public async Task<EntityManager> SetUpAsync() {
      MetadataStore.Instance.ProbeAssemblies(typeof(CreditCardTPC).Assembly);

      var serviceName = "http://localhost:7150/breeze/Inheritance/";
      
      if (MetadataStore.Instance.EntityTypes.Count == 0) {
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
    public async Task SimpleTPH() {
      await _emTask;
      var r = await QueryBillingBase<BillingDetailTPH>("BillingDetailTPH");
    }

    [TestMethod]
    public async Task SimpleTPT() {
      await _emTask;
      var r = await QueryBillingBase<BillingDetailTPT>("BillingDetailTPT");
    }

    [TestMethod]
    public async Task SimpleTPC() {
      await _emTask;
      var r = await QueryBillingBase<BillingDetailTPC>("BillingDetailTPC");
    }


    private async Task<IEnumerable<T>> QueryBillingBase<T>(String typeName) {
      var q0 = new EntityQuery<T>(typeName + "s").With(_em1);
      var r0 = await q0.Execute();
      Assert.IsTrue(r0.Count() > 0);
      Assert.IsTrue(r0.All(r => typeof(T).IsAssignableFrom(r.GetType())));
      return r0;
    }
    
    
  }
}

  
