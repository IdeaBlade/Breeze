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

    private String _serviceName;

    [TestInitialize]
    public void TestInitializeMethod() {
      _serviceName = "http://localhost:7150/breeze/Inheritance/";
    }

    [TestCleanup]
    public void TearDown() {
      
    }

    [TestMethod]
    public async Task SimpleTPH() {
      var em1 = await TestFns.NewEm(_serviceName);
      var r = await QueryBillingBase<BillingDetailTPH>(em1, "BillingDetailTPH");
    }

    [TestMethod]
    public async Task SimpleTPT() {
      var em1 = await TestFns.NewEm(_serviceName);
      var r = await QueryBillingBase<BillingDetailTPT>(em1, "BillingDetailTPT");
    }

    [TestMethod]
    public async Task SimpleTPC() {
      var em1 = await TestFns.NewEm(_serviceName);
      var r = await QueryBillingBase<BillingDetailTPC>(em1, "BillingDetailTPC");
    }


    private async Task<IEnumerable<T>> QueryBillingBase<T>(EntityManager em, String typeName) {
      var q0 = new EntityQuery<T>(typeName + "s").With(em);
      var r0 = await q0.Execute();
      Assert.IsTrue(r0.Count() > 0);
      Assert.IsTrue(r0.All(r => typeof(T).IsAssignableFrom(r.GetType())));
      return r0;
    }
    
    
  }
}

  
