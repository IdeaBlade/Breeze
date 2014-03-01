using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Threading.Tasks;
using System.Linq;
using Breeze.Core;
using Breeze.NetClient;
using System.Collections.Generic;
using Foo;

namespace Test_NetClient {

  [TestClass]
  public class LocalQueryTests {

    private Task<EntityManager> _emTask = null;
    private EntityManager _em1;
    

    [TestInitialize]
    public void TestInitializeMethod() {
      _emTask = SetUpAsync();
    }

    public async Task<EntityManager> SetUpAsync() {
      var serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";
      
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
    public async Task SimpleQuery() {
      await _emTask;
      var q = new EntityQuery<Customer>();

      var r0 = await _em1.ExecuteQuery(q);

      Assert.IsTrue(r0.Cast<Object>().Count() > 0);
      var r1 = q.ExecuteLocally(_em1);
      Assert.IsTrue(r0.Count() == r1.Count());
    }

    [TestMethod]
    public async Task WithOnlyExpand() {
      await _emTask;
      var q = new EntityQuery<Customer>().Take(3);
      var r0 = await _em1.ExecuteQuery(q);
      var q1 = new EntityQuery<Customer>().Expand("Orders");
      var r1 = q1.ExecuteLocally(_em1);
      Assert.IsTrue(r0.Count() == r1.Count());
      
    }

    [TestMethod]
    public async Task WhereAnyOrderBy() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers").Expand("Orders");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C") && c.Orders.Any(o => o.Freight > 10));
      var q3 = q2.OrderBy(c => c.City);
      var r = await q3.Execute(_em1);

      Assert.IsTrue(r.Count() > 0);
      Assert.IsTrue(r.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
      var rLocal = q3.ExecuteLocally(_em1);
      Assert.IsTrue(rLocal.Count() == r.Count());
      Assert.IsTrue(r.SequenceEqual(rLocal), "should be in the same order");
    }

    [TestMethod]
    public async Task WhereAnyOrderBy2() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      // just to fill up some extra custs
      var rBase = await q.Take(10).Execute(_em1);

      var q2 = q.Where(c => c.CompanyName.StartsWith("C") && c.Orders.Any(o => o.Freight > 10));
      var q3 = q2.OrderBy(c => c.City).Expand("Orders");
      var r = await q3.Execute(_em1);

      Assert.IsTrue(r.Count() > 0);
      Assert.IsTrue(r.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
      var rLocal = q3.ExecuteLocally(_em1);
      Assert.IsTrue(rLocal.Count() == r.Count());
      Assert.IsTrue(r.SequenceEqual(rLocal), "should be in the same order");
    }

    [TestMethod]
    public async Task GuidQuery() {
      await _emTask;

      var q = new EntityQuery<Customer>().Take(3);
      var r = await _em1.ExecuteQuery(q);
      Assert.IsTrue(r.Count() == 3, "should be no results");
      var q1 = new EntityQuery<Customer>().Where(c => c.CustomerID.Equals(Guid.NewGuid())); 
      var r1 = q1.ExecuteLocally(_em1);
      Assert.IsTrue(r1.Count() == 0);

    }

    [TestMethod]
    public async Task GuidQuery2() {
      await _emTask;

      var q = new EntityQuery<Customer>().Take(3);
      var r = await _em1.ExecuteQuery(q);
      Assert.IsTrue(r.Count() == 3, "should be no results");
      
      var q1 = new EntityQuery<Order>().Where(o => o.CustomerID == Guid.NewGuid()); // && true);
      var r1 = q1.ExecuteLocally(_em1);
      Assert.IsTrue(r1.Count() == 0);

    }


    [TestMethod]
    public async Task StartsWith() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers").Take(10);
      var results = await _em1.ExecuteQuery(q);

      var q1 = new EntityQuery<Customer>().Where(c => c.CompanyName.StartsWith("C")).Take(3);
      var r1 = await _em1.ExecuteQuery(q1);
      Assert.IsTrue(r1.Count() == 3);
      var r2 = _em1.ExecuteQueryLocally(q1);

      Assert.IsTrue(r1.Count() == r2.Count());

    }

    [TestMethod]
    public async Task StartsWithFetchStrategy() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers").Take(10);
      var results = await _em1.ExecuteQuery(q);

      var q1 = new EntityQuery<Customer>().Where(c => c.CompanyName.StartsWith("C")).Take(3);
      var r1 = await _em1.ExecuteQuery(q1);
      Assert.IsTrue(r1.Count() == 3);
      // var r2 = _em1.ExecuteQueryLocally(q1);
      var r2 = await _em1.ExecuteQuery(q1.With(FetchStrategy.FromLocalCache));

      Assert.IsTrue(r1.Count() == r2.Count());

    }

    [TestMethod]
    public async Task InlineCount() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.InlineCount();

      var r = await q3.Execute(_em1);

      var ilCount = ((IHasInlineCount)r).InlineCount;
      Assert.IsTrue(ilCount > 0);
      var r3 = q3.ExecuteLocally(_em1);
      Assert.IsTrue(r.Count() == r3.Count());
    }

    [TestMethod]
    public async Task InlineCount2() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C")).Take(2);
      var q3 = q2.InlineCount();

      var r = await q3.Execute(_em1);
      Assert.IsTrue(r.Count() == 2);
      var ilCount = ((IHasInlineCount)r).InlineCount;
      Assert.IsTrue(ilCount > 0);
      var r3 = q3.ExecuteLocally(_em1);
      Assert.IsTrue(r3.Count() == 2);
    }


    [TestMethod]
    public async Task WithEntityManager() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.OrderBy(c => c.CompanyName).Take(2);
      var r = await q3.With(_em1).Execute();

      Assert.IsTrue(r.Count() == 2);
      var r3 = q3.With(_em1).ExecuteLocally();
      Assert.IsTrue(r3.Count() == 2);

    }

    [TestMethod]
    public async Task WhereOrderByTake() {
      await _emTask;
      
      var q = new EntityQuery<Foo.Customer>("Customers");
      // to fill the cache
      var r = await _em1.ExecuteQuery(q.Take(5));

      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.OrderBy(c => c.CompanyName).Take(2);
      var r3 = await q3.Execute(_em1);

      Assert.IsTrue(r3.Count() == 2);
      Assert.IsTrue(r3.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
      var r3Local = q3.ExecuteLocally(_em1);
      Assert.IsTrue(r3Local.SequenceEqual(r3));
    }

    [TestMethod]
    public async Task AnonSelectEntity() {
      await _emTask;
      var q = new EntityQuery<Order>().Take(5);
      var r0 = await q.Execute(_em1);
      Assert.IsTrue(r0.Count() == 5);
      var q1 = new EntityQuery<Order>().Select(o => new { o.Customer }).Take(5);
      var r1 = await q1.Execute(_em1);
      Assert.IsTrue(r1.Count() == 5);
      var ok = r1.All(r => r.Customer.GetType() == typeof(Customer));
      Assert.IsTrue(ok);

      // This only works because we insure that the order exists in cache before the query
      var r1Local = q1.ExecuteLocally(_em1);
      
      Assert.IsTrue(r1Local.Count() == r1.Count());
      ok = r1Local.All(r => r.Customer.Orders.Count == 1);
      Assert.IsTrue(ok, "Order's per customer should be only one for now because that's all we cached");
      ok = r1Local.All(r => r.Customer.GetType() == typeof(Customer));
      Assert.IsTrue(ok );

    }

    [TestMethod]
    public async Task AnonSelectEntityCollection() {
      await _emTask;
      // precache the selected custs - needed to insure that local query works later.
      var q0 = new EntityQuery<Foo.Customer>("Customers")
        .Where(c => c.CompanyName.StartsWith("C"));
      var r0 = await q0.With(_em1).Execute();

      var q2 = q0.Select(c => new { Orders = c.Orders });
      var r2 = await q2.Execute(_em1);

      Assert.IsTrue(r2.Count() > 0);
      var ok = r2.All(r1 => (r1.Orders.Count() > 0) && r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every item of anon should contain a collection of Orders");
      var r3Local = q2.ExecuteLocally(_em1);
      Assert.IsTrue(r3Local.Count() == r2.Count());
      ok = r3Local.All(r1 => (r1.Orders.Count() > 0) && r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every item of anon should contain a collection of Orders again");

    }


    [TestMethod]
    public async Task SelectIntoCustom() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      await _em1.ExecuteQuery(q2.Expand("Orders")); // precache for later local query;

      var q3 = q2.Select(c => new Dummy() { CompanyName = c.CompanyName, Orders = c.Orders });
      var r3 = await q3.Execute(_em1);

      Assert.IsTrue(r3.Count() > 0);
      var ok = r3.All(r1 =>
        r1.GetType() == typeof(Dummy) &&
        r1.Orders.Count() > 0 &&
        r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every Dummy should contain a collection of Orders");
      ok = r3.All(r1 => r1.CompanyName.Length > 0);
      Assert.IsTrue(ok, "and should have a populated company name");
      var r3Local = _em1.ExecuteQueryLocally(q3);
      Assert.IsTrue(r3.Count() == r3Local.Count());
      ok = r3Local.All(r1 =>
        r1.GetType() == typeof(Dummy) &&
        r1.Orders.Count() > 0 &&
        r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every Dummy should contain a collection of Orders");
    }

    public class Dummy {
      public String CompanyName;
      public IEnumerable<Foo.Order> Orders;
    }


    [TestMethod]
    public async Task EntityKeyQuery() {
      await _emTask;
      var q = new EntityQuery<Customer>().Take(1);

      var r = await _em1.ExecuteQuery(q);
      var customer = r.First();
      var q1 = new EntityQuery<Customer>().Where(c => c.CustomerID == customer.CustomerID);
      var r1 = await _em1.ExecuteQuery(q1);
      Assert.IsTrue(r1.First() == customer);
      var ek = customer.EntityAspect.EntityKey;
      var q2 = ek.ToQuery();
      var r2 = await _em1.ExecuteQuery(q2);
      Assert.IsTrue(r2.Cast<Customer>().First() == customer);
      var r2Local = _em1.ExecuteQueryLocally((EntityQuery<Customer>)q2);
      Assert.IsTrue(r2Local.First() == customer);
    }
    
  }
}

  
