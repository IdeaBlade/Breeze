using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Threading.Tasks;
using System.Linq;
using Breeze.NetClient;
using System.Collections.Generic;

namespace Test_NetClient {
  [TestClass]
  public class QueryTests {
    String _serviceName;
    EntityManager _em1;
    [TestInitialize()]
    public void SetUp() {
      _serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";
      _em1 = new EntityManager(_serviceName);
    }

    [TestCleanup]
    public void TearDown() {
      
    }

    [TestMethod]
    public async Task InlineCount() {

      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C")) ;
      var q3 = q2.InlineCount();

      var r = await q3.Execute(_em1);

      var count = ((IHasInlineCount) r).InlineCount;
      
      Assert.IsTrue(r.Count() > 0);
      Assert.IsTrue(r.Count() == count, "counts should be the same");
      Assert.IsTrue(r.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
    }

    [TestMethod]
    public async Task InlineCount2() {

      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C")).Take(2);
      var q3 = q2.InlineCount();

      var r = await q3.Execute(_em1);

      var count = ((IHasInlineCount)r).InlineCount;

      Assert.IsTrue(r.Count() == 2);
      Assert.IsTrue(r.Count() < count, "counts should be the same");
      Assert.IsTrue(r.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
    }

    [TestMethod]
    public async Task WhereAnyOrderBy() {
      
      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C") && c.Orders.Any(o => o.Freight > 10));
      var q3 = q2.OrderBy(c => c.CompanyName).Skip(2);

      var r = await q3.Execute(_em1);

      Assert.IsTrue(r.Count() > 0);
      Assert.IsTrue(r.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
    }

    [TestMethod]
    public async Task WhereOrderByTake() {

      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C")) ;
      var q3 = q2.OrderBy(c => c.CompanyName).Take(2);
      var r = await q3.Execute(_em1);

      Assert.IsTrue(r.Count() == 2);
      Assert.IsTrue(r.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
    }

    [TestMethod]
    public async Task SelectAnonSimple() {

      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.Select(c => new { Orders = c.Orders });
      var r = await q3.Execute(_em1);

      Assert.IsTrue(r.Count() > 0);
      var ok = r.All(r1 => ( r1.Orders.Count() > 0 ) && r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every item of anon should contain a collection of Orders");
    }

    [TestMethod]
    public async Task SelectAnonComplex() {

      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.Select(c => new { c.CompanyName, c.Orders });
      var r = await q3.Execute(_em1);

      Assert.IsTrue(r.Count() > 0);
      var ok = r.All(r1 => (r1.Orders.Count() > 0) && r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every item of anon should contain a collection of Orders");
      ok = r.All(r1 => r1.CompanyName.Length > 0);
      Assert.IsTrue(ok, "anon type should have a populated company name");
    }

    [TestMethod]
    public async Task Expand() {

      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.Expand(c => c.Orders);
      var r = await q3.Execute(_em1);

      Assert.IsTrue(r.Count() > 0);
      var ok = r.All(r1 => 
        r1.GetType() == typeof(Foo.Customer) && 
        r1.Orders.Count() > 0 && 
        r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every Customer should contain a collection of Orders");
      ok = r.All(r1 => r1.CompanyName.Length > 0);
      Assert.IsTrue(ok, "and should have a populated company name");
    }

    [TestMethod]
    public async Task SelectIntoCustom() {

      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.Select(c => new Dummy() { CompanyName = c.CompanyName, Orders = c.Orders}  );
      var r = await q3.Execute(_em1);

      Assert.IsTrue(r.Count() > 0);
      var ok = r.All(r1 =>
        r1.GetType() == typeof(Dummy) &&
        r1.Orders.Count() > 0 &&
        r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every Dummy should contain a collection of Orders");
      ok = r.All(r1 => r1.CompanyName.Length > 0);
      Assert.IsTrue(ok, "and should have a populated company name");
    }

    public class Dummy {
      public String CompanyName;
      public IEnumerable<Foo.Order> Orders;
    }
    
  }
}

  
