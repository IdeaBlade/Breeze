using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Threading.Tasks;
using System.Linq;
using Breeze.NetClient;

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
    public async Task AnyOrderByAnd() {
      

      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C") && c.Orders.Any(o => o.Freight > 10));
      var q3 = q2.OrderBy(c => c.CompanyName).Skip(2);

      var r = await q3.Execute(_em1);

      Assert.IsTrue(r.Count() > 0);
      Assert.IsTrue(r.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
    }

    [TestMethod]
    public async Task OrderByTake() {

      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C")) ;
      var q3 = q2.OrderBy(c => c.CompanyName).Take(2);
      var r = await q3.Execute(_em1);

      Assert.IsTrue(r.Count() == 2);
      Assert.IsTrue(r.All(r1 => r1.GetType() == typeof(Foo.Customer)), "should all get customers");
    }

    [TestMethod]
    public async Task AnonSimple() {

      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C"));
      var q3 = q2.Select(c => new { Orders = c.Orders });
      var r = await q3.Execute(_em1);

      Assert.IsTrue(r.Count() > 0);
      var ok = r.All(r1 => ( r1.Orders.Count() > 0 ) && r1.Orders.All(o => o.GetType() == typeof(Foo.Order)));
      Assert.IsTrue(ok, "every item of anon should contain a collection of Orders");
    }

    [TestMethod]
    public async Task AnonComplex() {

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
    
    
  }
}

  
