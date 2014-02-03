using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Threading.Tasks;
using System.Linq;
using Breeze.Core;
using Breeze.NetClient;
using System.Collections.Generic;

namespace Test_NetClient {

  [TestClass]
  public class QueryTests {

    private Task<EntityManager> _emTask = null;
    private EntityManager _em1;
    private static MetadataStore __metadataStore;

    [TestInitialize]
    public void TestInitializeMethod() {
      _emTask = SetUpAsync();
    }

    public async Task<EntityManager> SetUpAsync() {
      var serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";
      
      if (__metadataStore == null) {
        _em1 = new EntityManager(serviceName);
        await _em1.FetchMetadata();
        __metadataStore = _em1.MetadataStore;
      } else {
        _em1 = new EntityManager(serviceName);
      }
      return _em1;
      
    }

    [TestCleanup]
    public void TearDown() {
      
    }

    [TestMethod]
    public async Task NonGenericQuery() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C")).Take(3);
      var q3 = (EntityQuery)q2;

      var results = await _em1.ExecuteQuery(q3);

      Assert.IsTrue(results.Cast<Object>().Count() == 3);
      
    }

    [TestMethod]
    public async Task InlineCount() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C")) ;
      var q3 = q2.InlineCount();

      var results = await q3.Execute(_em1);

      var count = ((IHasInlineCount) results).InlineCount;
      
      Assert.IsTrue(results.Count() > 0);
      Assert.IsTrue(results.Count() == count, "counts should be the same");
      Assert.IsTrue(results.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
    }

    [TestMethod]
    public async Task InlineCount2() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C")).Take(2);
      var q3 = q2.InlineCount();

      var results = await q3.Execute(_em1);

      var count = ((IHasInlineCount)results).InlineCount;

      Assert.IsTrue(results.Count() == 2);
      Assert.IsTrue(results.Count() < count, "counts should be the same");
      Assert.IsTrue(results.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
    }

    [TestMethod]
    public async Task WhereAnyOrderBy() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C") && c.Orders.Any(o => o.Freight > 10));
      var q3 = q2.OrderBy(c => c.CompanyName).Skip(2);

      var results = await q3.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      Assert.IsTrue(results.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
      var cust = results.First();
      var companyName = cust.CompanyName;
      var custId = cust.CustomerID;
      var orders = cust.Orders;
    }

    [TestMethod]
    public async Task WithOverwriteChanges() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C")) ;
      var q3 = q2.OrderBy(c => c.CompanyName).Take(2);
      var results = await q3.Execute(_em1);

      Assert.IsTrue(results.Count() == 2);
      results.ForEach(r => {
        r.City = "xxx";
        r.CompanyName = "xxx";
      });
      var results2 = await q3.With(MergeStrategy.OverwriteChanges).Execute(_em1);
      // contents of results2 should be exactly the same as results
      Assert.IsTrue(results.Count() == 2);

    }

    [TestMethod]
    public async Task WithEntityManager() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.OrderBy(c => c.CompanyName).Take(2);
      var results = await q3.With(_em1).Execute();

      Assert.IsTrue(results.Count() == 2);
      
    }

    [TestMethod]
    public async Task WhereOrderByTake() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.OrderBy(c => c.CompanyName).Take(2);
      var results = await q3.Execute(_em1);

      Assert.IsTrue(results.Count() == 2);
      Assert.IsTrue(results.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
    }

    [TestMethod]
    public async Task SelectAnonWithEntityCollection() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.Select(c => new { Orders = c.Orders });
      var results = await q3.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var ok = results.All(r1 => ( r1.Orders.Count() > 0 ) && r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every item of anon should contain a collection of Orders");
    }

    [TestMethod]
    public async Task SelectAnonWithScalarAndEntityCollection() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.Select(c => new { c.CompanyName, c.Orders});
      var results = await q3.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var ok = results.All(r1 => (r1.Orders.Count() > 0) && r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every item of anon should contain a collection of Orders");
      ok = results.All(r1 => r1.CompanyName.Length > 0);
      Assert.IsTrue(ok, "anon type should have a populated company name");
      
    }

    [TestMethod]
    public async Task SelectAnonWithScalarEntity() {
      await _emTask;
      var q = new EntityQuery<Foo.Order>("Orders");
      var q2 = q.Where(c => c.Freight > 500);
      var q3 = q2.Select(c => new { c.Customer, c.Freight });
      var results = await q3.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var ok = results.All(r1 => r1.Freight > 500);
      Assert.IsTrue(ok, "anon type should the right freight");
      ok = results.All(r1 => r1.Customer.GetType() == typeof(Foo.Customer));
      Assert.IsTrue(ok, "anon type should have a populated 'Customer'");
    }

    [TestMethod]
    public async Task SelectAnonWithScalarSelf() {
      Assert.Inconclusive("OData doesn't support this kind of query (I think)");
      return;

      // Pretty sure this is an issue with OData not supporting this syntax.
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.Select(c => new { c.CompanyName, Customer = c });
      var results = await q3.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var ok = results.All(r1 => r1.CompanyName.Length > 0);
      Assert.IsTrue(ok, "anon type should have a populated company name");
      ok = results.All(r1 => r1.Customer.GetType() == typeof(Foo.Customer));
      Assert.IsTrue(ok, "anon type should have a populated 'Customer'");
    }

    [TestMethod]
    public async Task ExpandNonScalar() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.Expand(c => c.Orders);
      var results = await q3.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var ok = results.All(r1 => 
        r1.GetType() == typeof(Foo.Customer) && 
        r1.Orders.Count() > 0 && 
        r1.Orders.All(o => o.GetType() == typeof(Foo.Order)) &&
        r1.Orders.All(o => o.Customer == r1));
      Assert.IsTrue(ok, "every Customer should contain a collection of Orders");
      ok = results.All(r1 => r1.CompanyName.Length > 0);
      Assert.IsTrue(ok, "and should have a populated company name");
    }

    [TestMethod]
    public async Task ExpandScalar() {
      await _emTask;
      var q = new EntityQuery<Foo.Order>("Orders");
      var q2 = q.Where(o => o.Freight > 500);
      var q3 = q2.Expand(o => o.Customer);
      var results = await q3.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var ok = results.All(r1 =>
        r1.GetType() == typeof(Foo.Order) &&
        r1.Customer.GetType() == typeof(Foo.Customer));
      Assert.IsTrue(ok, "every Order should have a customer");
      ok = results.All(r1 => r1.Freight > 500);
      Assert.IsTrue(ok, "and should have the right freight");
    }

    [TestMethod]
    public async Task SelectIntoCustom() {
      await _emTask;
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.Select(c => new Dummy() { CompanyName = c.CompanyName, Orders = c.Orders}  );
      var results = await q3.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var ok = results.All(r1 =>
        r1.GetType() == typeof(Dummy) &&
        r1.Orders.Count() > 0 &&
        r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every Dummy should contain a collection of Orders");
      ok = results.All(r1 => r1.CompanyName.Length > 0);
      Assert.IsTrue(ok, "and should have a populated company name");
    }

    public class Dummy {
      public String CompanyName;
      public IEnumerable<Foo.Order> Orders;
    }
    
  }
}

  
