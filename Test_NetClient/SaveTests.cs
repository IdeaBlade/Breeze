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
    public async Task HasChangesChangedAfterSave() {
      await _emTask;

      var eventArgsList = new List<EntityManagerHasChangesChangedEventArgs>();
      _em1.HasChangesChanged += (s, e) => {
        eventArgsList.Add(e);
      };
      var emp = _em1.CreateEntity<Employee>();
      emp.FirstName = "Test Fn";
      emp.LastName = "Test Ln";
      Assert.IsTrue(eventArgsList.Count == 1);
      Assert.IsTrue(eventArgsList.Last().HasChanges);
      Assert.IsTrue(_em1.HasChanges());
      var sr1 = await _em1.SaveChanges();
      Assert.IsTrue(sr1.Entities.Count == 1);
      Assert.IsTrue(eventArgsList.Count == 2);
      Assert.IsTrue(!eventArgsList.Last().HasChanges);
      Assert.IsTrue(!_em1.HasChanges());
    }

    

    [TestMethod]
    public async Task SaveCustomersAndNewOrder() {
      await _emTask;

      var q = new EntityQuery<Customer>("Customers").Where(c => c.CompanyName.StartsWith("A"));
      var custs = await q.Execute(_em1);
      Assert.IsTrue(custs.Count() > 0, "should be some results");
      custs.ForEach(c => c.Fax = TestFns.MorphString(c.Fax));
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
      custs.ForEach(c => c.Fax = TestFns.MorphString(c.Fax));
      var saveResult = await _em1.SaveChanges();
      Assert.IsTrue(saveResult.Entities.Count == custs.Count());
      
    }

    [TestMethod]
    public async Task NullableProperty() {
      await _emTask;

      var emp = new Employee() { FirstName = "Test Joe", LastName = "Test Smith" , BirthDate = DateTime.Now };
      Assert.IsTrue(emp.BirthDate != null);
      _em1.AddEntity(emp);
      Assert.IsTrue(emp.BirthDate != null);
      emp.BirthDate = null;
      var sr = await _em1.SaveChanges(new IEntity[] { emp });
      Assert.IsTrue(sr.Entities.Count == 1);
      Assert.IsTrue(sr.Entities.First() == emp);
      Assert.IsTrue(emp.BirthDate == null);
      emp.EntityAspect.Delete();
      var sr2 = await _em1.SaveChanges();
      Assert.IsTrue(sr.Entities.Count == 1);
      Assert.IsTrue(_em1.GetEntities().Count() == 0);
    }

    [TestMethod]
    public async Task PartialSave() {
      await _emTask;

      var q = new EntityQuery<Customer>("Customers").Where(c => c.CompanyName.StartsWith("A"));
      var custsx = await q.Execute(_em1);
      var custs = custsx.ToList();
      Assert.IsTrue(custs.Count() > 0, "should be some results");
      custs.ForEach(c => c.Fax = TestFns.MorphString(c.Fax));
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
    public async Task UpdateProductActive() {
      await _emTask;
      await UpdateProduct(4);
    }

    [TestMethod]
    public async Task UpdateProductDiscontinued() {
      await _emTask;
      await UpdateProduct(4);
    }

    private async Task UpdateProduct(int productID) {
      //  ok(true, "TODO for Mongo - needs to be written specifically for Mongo - should succeed in Mongo");
      var q0 = new EntityQuery<Product>().Where(p => p.ProductID == productID);
      var r0 = await _em1.ExecuteQuery(q0);
      Assert.IsTrue(r0.Count() == 1, "should be 1 result");
      var prod = r0.First();
      prod.UnitsInStock = (short)(prod.UnitsInStock.HasValue ? prod.UnitsInStock.Value + 1 : 1);
      var sr0 = await _em1.SaveChanges();
      Assert.IsTrue(sr0.Entities.Count == 1);
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
      category.CategoryName = TestFns.MorphString(category.CategoryName);
      var so = new SaveOptions(tag: "increaseProductPrice");
      var sr = await _em1.SaveChanges(null, so);
      Assert.IsTrue(sr.Entities.Count == 13, "should have saved 13 entities + 1 category + 12 products");
      Assert.IsTrue(sr.Entities.OfType<Product>().Count() == 12, "should be 12 products");
      var ek = category.EntityAspect.EntityKey;
      var em2 = new EntityManager(_em1);
      var r2 = await em2.ExecuteQuery(ek.ToQuery<Category>().Expand("Products"));
      var cat2 = r2.First();
      var products2 = cat2.Products;

      var newPrices = products2.Select(p => p.UnitPrice).ToList();
      Assert.IsTrue(!prices.SequenceEqual(newPrices), "prices should have changed");
    }

    [TestMethod]
    public async Task CaptureAddlAddOnServer() {
      await _emTask;
      //        ok(true, "Skipped test - OData does not support server interception or alt resources");
      var supplier = new Supplier() { CompanyName = "CompName" };
      _em1.AddEntity(supplier);
      var sr = await _em1.SaveChanges(null, new SaveOptions(tag: "addProdOnServer"));
      Assert.IsTrue(sr.Entities.Count == 2, "should have saved two entities");
      Assert.IsTrue(supplier.Products.Count == 1, "supplier should have one product");
      Assert.IsTrue(supplier.Products.First().EntityAspect.EntityState.IsUnchanged(), "should be unchanged");
    }

    [TestMethod]
    public async Task OrderAndInternationalOrder() {
      await _emTask;
      //        ok(true, "N/A for Mongo - primary keys cannot be shared between collections");
      var order = new Order() {
        CustomerID = TestFns.WellKnownData.AlfredsID,
        EmployeeID = TestFns.WellKnownData.NancyEmployeeID,
        ShipName = "Test " + new DateTime().ToString()
      };
      _em1.AddEntity(order);
      var internationalOrder = new InternationalOrder() {
        OrderID = order.OrderID,
        Order = order,
        CustomsDescription = "rare, exotic birds"
      };
      Assert.IsTrue(internationalOrder.EntityAspect.EntityState.IsAdded(), "internationalOrder should be Added");
      var sr = await _em1.SaveChanges();
      Assert.IsTrue(sr.Entities.Count == 2, "should have saved 2 entities");
      Assert.IsTrue(order.OrderID == internationalOrder.OrderID);
      Assert.IsTrue(order.OrderID > 0);
      Assert.IsTrue(order.InternationalOrder == internationalOrder);

    }


    [TestMethod]
    public async Task InsertEntityWithMultipartKey() {
      await _emTask;
      //        ok(true, "N/A for Mongo - primary keys cannot be shared between collections");

      var product = CreateProduct(_em1);
      var sr = await _em1.SaveChanges();
      
      Assert.IsTrue(sr.Entities.Count == 1, "should have saved 1 entity");
      var order = CreateOrder(_em1);
      var orderDetail = CreateOrderDetail(_em1, order, product);
      var orderID = order.OrderID;
      var productID = product.ProductID;
      Assert.IsTrue(order.OrderID != 0);
      Assert.IsTrue(product.ProductID != 0);
      Assert.IsTrue(order.OrderID == orderDetail.OrderID);
      Assert.IsTrue(product.ProductID == orderDetail.ProductID);
      var sr1 = await _em1.SaveChanges();

      Assert.IsTrue(sr1.Entities.Count == 2, "should have saved 2 entities");
      Assert.IsTrue(order.OrderID != orderID);
      Assert.IsTrue(order.OrderID == orderDetail.OrderID);
      Assert.IsTrue(product.ProductID == orderDetail.ProductID);
      orderDetail.UnitPrice = 11m;
      var sr2 = await _em1.SaveChanges();

      Assert.IsTrue(sr2.Entities.Count == 1, "should have saved 1 entity");
    }

    [TestMethod]
    public async Task InsertEntityWithMultipartKey2() {
      await _emTask;
      
      var order = CreateOrder(_em1);
      var product = CreateProduct(_em1);
      var orderDetail = CreateOrderDetail(_em1, order, product);
      var orderID = order.OrderID;
      var productID = product.ProductID;
      Assert.IsTrue(order.OrderID != 0);
      Assert.IsTrue(product.ProductID != 0);
      Assert.IsTrue(order.OrderID == orderDetail.OrderID);
      Assert.IsTrue(product.ProductID == orderDetail.ProductID);
      var sr1 = await _em1.SaveChanges();

      Assert.IsTrue(sr1.Entities.Count == 3, "should have saved 3 entities");
      Assert.IsTrue(order.OrderID != orderID);
      Assert.IsTrue(product.ProductID != productID);
      Assert.IsTrue(order.OrderID == orderDetail.OrderID);
      Assert.IsTrue(product.ProductID == orderDetail.ProductID);
      orderDetail.UnitPrice = 11m;
      var sr2 = await _em1.SaveChanges();

      Assert.IsTrue(sr2.Entities.Count == 1, "should have saved 1 entity");
    }

    [TestMethod]
    public async Task SaveWithServerExit() {
      await _emTask;
      //  ok(true, "Skipped test - OData does not support server interception or alt resources");
      CreateParentAndChildren(_em1);
      var so = new SaveOptions("SaveWithExit", tag: "exit");
      var sr0 = await _em1.SaveChanges(so);
      Assert.IsTrue(sr0.Entities.Count == 0);
    }

    [TestMethod]
    public async Task SaveWithEntityErrorsException() {
      await _emTask;
      //        ok(true, "Skipped test - OData does not support server interception or alt resources");
      //        ok(true, "Skipped test - Mongo does not YET support server side validation");
      var twoCusts = CreateParentAndChildren(_em1);
      var so = new SaveOptions("SaveWithEntityErrorsException", tag: "entityErrorsException");
      try {
        var sr0 = await _em1.SaveChanges(so);
        Assert.Fail("should not get here");
      } catch (SaveException e) {
        Assert.IsTrue(e.EntityErrors.Count == 2, "should have two errors");
        var order1 = twoCusts.Cust1.Orders[0];
        Assert.IsTrue(order1.EntityAspect.ValidationErrors.Count == 1);
        var order2 = twoCusts.Cust1.Orders[1];
        Assert.IsTrue(order2.EntityAspect.ValidationErrors.Count == 1);
        Assert.IsTrue(order2.EntityAspect.ValidationErrors.First().Context.PropertyPath == "OrderID");
      } catch (Exception e) {
        Assert.Fail("should not get here - wrong exception");
      }
      // now save it properly
      var sr1 = await _em1.SaveChanges();
      Assert.IsTrue(sr1.Entities.Count == 4);
    }



    //test("save/mods with EntityErrorsException", function () {
    //    if (testFns.DEBUG_ODATA) {
    //        ok(true, "Skipped test - OData does not support server interception or alt resources");
    //        return;
    //    };

    //    if (testFns.DEBUG_MONGO) {
    //        ok(true, "Skipped test - Mongo does not YET support server side validation");
    //        return;
    //    };


    //    var em = newEm();
    //    var zzz = createParentAndChildren(em);
    //    var cust1 = zzz.cust1;
        
    //    stop();
    //    em.saveChanges().then(function (sr) {
    //        zzz.cust1.setProperty("contactName", "foo");
    //        zzz.cust2.setProperty("contactName", "foo");
    //        zzz.order1.setProperty("freight", 888.11);
    //        zzz.order2.setProperty("freight", 888.11);
    //        ok(zzz.cust1.entityAspect.entityState.isModified(), "cust1 should be modified");
    //        ok(zzz.order1.entityAspect.entityState.isModified(), "order1 should be modified");
    //        var so = new SaveOptions({ resourceName: "SaveWithEntityErrorsException", tag: "entityErrorsException" });
    //        return em.saveChanges(null, so);
    //    }).then(function(sr2) {
    //        ok(false, "should not get here");
    //    }).fail(function (e) {
    //        ok(e.entityErrors, "should have server errors");
    //        ok(e.entityErrors.length === 2, "2 order entities should have failed");
    //        ok(zzz.order1.entityAspect.getValidationErrors().length === 1);
    //        var order2Errs = zzz.order2.entityAspect.getValidationErrors();
    //        ok(order2Errs.length === 1, "should be 1 error for order2");
    //        ok(order2Errs[0].propertyName === "orderID", "errant property should have been 'orderID'");
    //        // now save it properly
    //        return em.saveChanges();
    //    }).then(function (sr) {
    //        ok(sr.entities.length === 4, "should have saved ok");
    //    }).fail(testFns.handleFail).fin(start);

    //});

    //test("save with client side validation error", function () {

    //    var em = newEm();
    //    var zzz = createParentAndChildren(em);
    //    var cust1 = zzz.cust1;
    //    cust1.setProperty("companyName", null);
    //    stop();
    //    em.saveChanges().then(function (sr) {
    //        ok(false, "should not get here");
    //    }).fail(function (e) {
    //        ok(e.entityErrors, "should be a  entityError");
    //        ok(e.entityErrors.length === 1, "should be only one error");
    //        ok(!e.entityErrors[0].isServerError, "should NOT be a server error");
    //        var errors = cust1.entityAspect.getValidationErrors();
    //        ok(errors[0].errorMessage === errors[0].errorMessage, "error message should appear on the cust");

    //    }).fin(start);
    //});

    //test("save with server side entity level validation error", function () {
    //    if (testFns.DEBUG_ODATA) {
    //        ok(true, "Skipped test - OData does not support server interception or alt resources");
    //        return;
    //    };

    //    if (testFns.DEBUG_MONGO) {
    //        ok(true, "Skipped test - Mongo does not YET support server side validation");
    //        return;
    //    };

    //    var em = newEm();
    //    var zzz = createParentAndChildren(em);
    //    var cust1 = zzz.cust1;
    //    cust1.setProperty("companyName", "error");
    //    stop();
    //    em.saveChanges().then(function(sr) {
    //        ok(false, "should not get here");
    //    }).fail(function (e) {
    //        ok(e.entityErrors, "should be a server error");
    //        ok(e.entityErrors.length === 1, "should be only one server error");
    //        var errors = cust1.entityAspect.getValidationErrors();
    //        ok(errors[0].errorMessage === e.entityErrors[0].errorMessage, "error message should appear on the cust");
    //    }).fin(start);
    //});

    //test("save with server side entity level validation error + repeat", function () {
    //    if (testFns.DEBUG_ODATA) {
    //        ok(true, "Skipped test - OData does not support server interception or alt resources");
    //        return;
    //    };

    //    if (testFns.DEBUG_MONGO) {
    //        ok(true, "Skipped test - Mongo does not YET support server side validation");
    //        return;
    //    };

    //    var em = newEm();
    //    var zzz = createParentAndChildren(em);
    //    var cust1 = zzz.cust1;
    //    cust1.setProperty("companyName", "error");
    //    stop();
    //    em.saveChanges().then(function (sr) {
    //        ok(false, "should not get here");
    //    }).fail(function (e) {
    //        ok(e.entityErrors, "should be a server error");
    //        ok(e.entityErrors.length === 1, "should be only one server error");
    //        var errors = cust1.entityAspect.getValidationErrors();
    //        ok(errors.length === 1, "should only be 1 error");
    //        ok(errors[0].errorMessage === e.entityErrors[0].errorMessage, "error message should appear on the cust");
    //        return em.saveChanges();
    //    }).fail(function(e2) {
    //        ok(e2.entityErrors, "should be a server error");
    //        ok(e2.entityErrors.length === 1, "should be only one server error");
    //       var errors = cust1.entityAspect.getValidationErrors();
    //       ok(errors.length === 1, "should only be 1 error");
    //       ok(errors[0].errorMessage === e2.entityErrors[0].errorMessage, "error message should appear on the cust");
    //    }).fin(start);
    //});
 
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

    private Order CreateOrder(EntityManager em) {
      var order = new Order();
      em.AddEntity(order);
      order.ShipName = "Test.NET_" + TestFns.RandomSuffix(7);
      return order;
    }

    private Product CreateProduct(EntityManager em) {
      var product = new Product();
      em.AddEntity(product);
      product.ProductName = "Test.NET_" + TestFns.RandomSuffix(7);
      return product;
    }

    private OrderDetail CreateOrderDetail(EntityManager em, Order order, Product product) {
      var od = new OrderDetail();
      var orderID = order.OrderID;
      var productID = product.ProductID;
      od.ProductID = productID;
      od.OrderID = orderID;
      od.Quantity = 1;
      od.UnitPrice = 3.14m;
      em.AddEntity(od);
      return od;
    }

    private TwoCusts CreateParentAndChildren(EntityManager em) {
      var cust1 = new Customer();
      cust1.CompanyName = "Test1_" + TestFns.RandomSuffix(8);
      cust1.City = "Oakland";
      cust1.RowVersion = 13;
      cust1.Fax = "510 999-9999";
      em.AddEntity(cust1);
      var cust2 = em.CreateEntity<Customer>();
      cust2.CompanyName = "Test2_" + TestFns.RandomSuffix(8);
      cust2.City = "Emeryville";
      cust2.RowVersion = 1;
      cust2.Fax = "510 888-8888";
      var order1 = new Order();
      order1.OrderDate = DateTime.Today;
      var order2 = em.CreateEntity<Order>();
      order1.OrderDate = DateTime.Today;
      cust1.Orders.Add(order1);
      cust1.Orders.Add(order2);
      Assert.IsTrue(cust1.Orders.Count == 2);
      Assert.IsTrue(cust2.Orders.Count == 0);
      return new TwoCusts() { Cust1 = cust1, Cust2 = cust2 };
    }

    public class TwoCusts {
      public Customer Cust1;
      public Customer Cust2;
    }

  }
}
