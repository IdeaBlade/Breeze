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

    [TestMethod]
    public async Task PartialSave() {
      await _emTask;

      var q = new EntityQuery<Customer>("Customers").Where(c => c.CompanyName.StartsWith("A"));
      var custsx = await q.Execute(_em1);
      var custs = custsx.ToList();
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
      var saveResult = await _em1.SaveChanges( new IEntity[] { custs[0], cust1, order1 });
      Assert.IsTrue(custs[1].EntityAspect.EntityState.IsModified());
      Assert.IsTrue(saveResult.Entities.Count == 3, "should have returned the correct number of entities");
      Assert.IsTrue(order1Key != order1.EntityAspect.EntityKey, "order1 entityKey should have changed");
      Assert.IsTrue(cust1Key != cust1.EntityAspect.EntityKey, "cust1 entityKey should have changed");
      Assert.IsTrue(order1.Customer == cust1, "cust attachment should be the same");
      Assert.IsTrue(cust1.Orders.Contains(order1), "order attachment should be the same");
      Assert.IsTrue(saveResult.KeyMappings[order1Key] == order1.EntityAspect.EntityKey, "keyMapping for order should be avail");
      Assert.IsTrue(saveResult.KeyMappings[cust1Key] == cust1.EntityAspect.EntityKey, "keyMapping for order should be avail");
      Assert.IsTrue(_em1.GetEntities<Customer>().Count() == custCount, "should be the same number of custs");
      Assert.IsTrue(order1.EntityAspect.EntityState.IsUnchanged());
      Assert.IsTrue(cust1.EntityAspect.EntityState.IsUnchanged());
      Assert.IsTrue(_em1.HasChanges(), "hasChanges should be true");
      Assert.IsTrue(_em1.GetChanges().Count() == custs.Count - 1, "should be some changes left");
    }

    [TestMethod]
    public async Task DeleteWithoutQuery() {
      await _emTask;

      var emp = new Employee();
      emp.FirstName = "Test Fn";
      emp.LastName = "Test Fn";
      _em1.AddEntity(emp);
      var sr = await _em1.SaveChanges();

      Assert.IsTrue(sr.Entities.Count == 1, "should have saved 1 entity");
      Assert.IsTrue(sr.Entities.First() == emp, "should be the same emp");
      var em2 = new EntityManager(_em1);
      em2.ImportEntities(_em1.ExportEntities());
      var sameEmp = (Employee) em2.GetEntities().First();
      Assert.IsTrue(emp.EntityAspect.EntityKey == sameEmp.EntityAspect.EntityKey, "should have the same key");
      sameEmp.EntityAspect.Delete();
      Assert.IsTrue(sameEmp.EntityAspect.EntityState.IsDeleted());
      var sr2 = await em2.SaveChanges();
      Assert.IsTrue(sr2.Entities.First() == sameEmp, "should still be the same emp");
      Assert.IsTrue(sameEmp.EntityAspect.EntityState.IsDetached());
      Assert.IsTrue(em2.GetEntities().Count() == 0, "should be no entities");

    }


    [TestMethod]
    public async Task PkUpdateError() {
      await _emTask;

      var q = new EntityQuery<Territory>().OrderByDescending(t => t.TerritoryID).Take(1);
      var terrs = await _em1.ExecuteQuery(q);
      Assert.IsTrue(terrs.Count() == 1, "count should be 1");
      var terr = terrs.First();
      terr.TerritoryID = terr.TerritoryID + 1;
      try {
        var sr = await _em1.SaveChanges();
        Assert.Fail("should not get here");
      } catch(SaveException e) {
        Assert.IsTrue(e.Message.Contains("part of the entity's key"), "message should mention entity's key");
      }

    }

    [TestMethod]
    public async Task ExceptionThrownOnServer() {
      await _emTask;

      //  ok(true, "Skipped test - OData does not support server interception or alt resources");

      var q = new EntityQuery<Order>().Take(1);
      var orders = await _em1.ExecuteQuery(q);
      var order = orders.First();
      order.Freight = order.Freight + .5m;
      var so = new SaveOptions("SaveAndThrow", tag: "SaveAndThrow");
      try {
        var sr = await _em1.SaveChanges(null, so);
        Assert.Fail("should not get here");
      } catch (SaveException se) {
        Assert.IsTrue(se.Message.Contains("Deliberately thrown"), "message should be correct");
      }
    }

    [TestMethod]
    public async Task Int32FkSetToNull() {
      await _emTask;

      //        ok(true, "N/A for Mongo - employeeId is not an integer on Mongo");
      var order = new Order() { EmployeeID = 1 };
      _em1.AddEntity(order);
      var sr = await _em1.SaveChanges();
      Assert.IsTrue(sr.Entities.Count == 1, "should have saved 1 entity");
      order.EmployeeID = null;
      var sr2 = await _em1.SaveChanges();
      Assert.IsTrue(sr.Entities.Count == 1, "should have again saved 1 entity");
      Assert.IsTrue(order.EmployeeID == null, "should be null");
      order.EntityAspect.EntityState = EntityState.Deleted;
      Assert.IsTrue(order.EntityAspect.EntityState.IsDeleted());
      var sr3 = await _em1.SaveChanges();
      Assert.IsTrue(sr.Entities.Count == 1, "should have again saved 1 entity");
      Assert.IsTrue(order.EntityAspect.EntityState.IsDetached());
    }

    [TestMethod]
    public async Task CaptureAddlSavesDoneOnServer() {
      await _emTask;

      //        ok(true, "Skipped test - OData does not support server interception or alt resources");
      //        ok(true, "N/A for Mongo - test not yet implemented - requires server side async call");
      var q = new EntityQuery<Category>().Where(c => c.CategoryName.StartsWith("Beverage")).Expand("Products");
      var r = await q.Execute(_em1);
      var category = r.First();
      var products = category.Products;
      var prices = products.Select(p => p.UnitPrice).ToList();
      category.CategoryName = MorphString(category.CategoryName);
      var so = new SaveOptions(tag: "increaseProductPrice");
      var sr = await _em1.SaveChanges(null, so);
      Assert.IsTrue(sr.Entities.Count == 13, "should have saved 13 entities + 1 category + 12 products");
      Assert.IsTrue(sr.Entities.OfType<Product>().Count() == 12, "should be 12 products");
      var ek = category.EntityAspect.EntityKey;
      var em2 = new EntityManager(_em1);
      

      var newPrices = products.Select(p => p.UnitPrice).ToList();
      Assert.IsTrue(!prices.SequenceEqual(newPrices), "prices should have changed");
    }

   
    //test("add UserRole", function () {
    //    if (testFns.DEBUG_MONGO) {
    //        ok(true, "TODO for Mongo - needs to be written specifically for Mongo - should succeed in Mongo");
    //        return;
    //    }

    //    var em = newEm();
    //    var roleId;
    //    var userId = 6;
    //    var p2 = breeze.Predicate.create("userId", "ne", userId);
    //    var p1 = breeze.Predicate.create("userRoles", "all", p2);

    //    var q = new EntityQuery("Roles").where(p1).take(1);
    //    stop();
    //    q.using(em).execute().then(function (data) {
    //        ok(data.results.length === 1, "should be one result");
    //        var role = data.results[0];
    //        roleId = role.getProperty("id");

    //        var newUserRole = em.createEntity('UserRole', {
    //            userId: userId,
    //            roleId: roleId
    //        });

    //        return em.saveChanges();
    //    }).then(function (sr) {
    //        ok(true, "save succeeded");
    //        var resultRole = sr.entities[0];
    //        var roleId2 = resultRole.getProperty("roleId");
    //        ok(roleId2 === roleId, "roleIds match");
    //        var userId2 = resultRole.getProperty("userId");
    //        ok(userId2 === userId, "userIds match");
            
    //        // delete entity
    //        resultRole.entityAspect.setDeleted();
    //        return em.saveChanges();
    //    }).then(function (sr) {
    //        ok(true, "delete succeeded");
    //    }).fail(function (e) {
    //        ok(false, "error on save: " + e.message);
    //    }).fail(testFns.handleFail).fin(start);

    //});


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
