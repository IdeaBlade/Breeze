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
using System.IO;
using System.Reflection;
using Newtonsoft.Json.Linq;
using System.Dynamic;
using System.Net.Http;

namespace Test_NetClient {

  [TestClass]
  public class SaveTests {

    // TODO: need Exp/Imp tests with Complex type changes.

    private Task<EntityManager> _emTask = null;
    private EntityManager _em1;

    [TestInitialize]
    public void TestInitializeMethod() {
      _emTask = SetUpAsync();
    }

    public async Task<EntityManager> SetUpAsync() {
      var serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";
      MetadataStore.Instance.ProbeAssemblies(new Assembly[] { typeof(Order).Assembly });
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
    public async Task SaveCustomersAndNewOrder() {
      await _emTask;

      var q = new EntityQuery<Customer>("Customers").Where(c => c.CompanyName.StartsWith("A"));
      var custs = await q.Execute(_em1);
      Assert.IsTrue(custs.Count() > 0, "should be some results");
      custs.ForEach(c => c.Fax = MorphString(c.Fax));
      var cust1 = _em1.CreateEntity<Customer>();
      cust1.CompanyName = "Test001";
      var cust1Key = cust1.EntityAspect.EntityKey;
      var order1 = _em1.CreateEntity<Order>();
      var order1Key = order1.EntityAspect.EntityKey;

      order1.Customer = cust1;
      var custCount = _em1.GetEntities<Customer>().Count();
      Assert.IsTrue(_em1.HasChanges(), "hasChanges should be true");
      Assert.IsTrue(_em1.GetChanges().Count() > 0, "should have changes");
      var saveResult = await _em1.SaveChanges();
      Assert.IsTrue(saveResult.Entities.Count == custs.Count() + 2, "should have returned the correct number of entities");
      Assert.IsTrue(order1Key != order1.EntityAspect.EntityKey, "order1 entityKey should have changed");
      Assert.IsTrue(cust1Key != cust1.EntityAspect.EntityKey, "cust1 entityKey should have changed");
      Assert.IsTrue(order1.Customer == cust1, "cust attachment should be the same");
      Assert.IsTrue(cust1.Orders.Contains(order1), "order attachment should be the same");
      Assert.IsTrue(saveResult.KeyMappings[order1Key] == order1.EntityAspect.EntityKey, "keyMapping for order should be avail");
      Assert.IsTrue(saveResult.KeyMappings[cust1Key] == cust1.EntityAspect.EntityKey, "keyMapping for order should be avail");
      Assert.IsTrue(saveResult.EntityErrors.Count == 0, "should be no errors");
      Assert.IsTrue(_em1.GetEntities<Customer>().Count() == custCount, "should be the same number of custs");
      Assert.IsTrue(order1.EntityAspect.EntityState.IsUnchanged());
      Assert.IsTrue(cust1.EntityAspect.EntityState.IsUnchanged());
      Assert.IsTrue(_em1.HasChanges() == false, "hasChanges should be false");
      Assert.IsTrue(_em1.GetChanges().Count() == 0, "should be no changes left");
    }
    
    [TestMethod]
    public async Task SaveModifiedCustomers() {
      await _emTask;

      var q = new EntityQuery<Customer>("Customers").Where(c => c.CompanyName.StartsWith("A"));
      var custs = await q.Execute(_em1);
      Assert.IsTrue(custs.Count() > 0, "should be some results");
      custs.ForEach(c => c.Fax = MorphString(c.Fax));
      var saveResult = await _em1.SaveChanges();
      Assert.IsTrue(saveResult.Entities.Count == custs.Count());
      
    }

    private String MorphString(String val) {
      var suffix = "__";
      if (String.IsNullOrEmpty(val)) {
        return suffix;
      } else {
        if (val.EndsWith(suffix)) {
          val = val.Substring(0, val.Length - 2);
        } else {
          val = val + suffix;
        }
      }
      return val;
    }
    
    
  }
}
