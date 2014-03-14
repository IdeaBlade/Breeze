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
  public class EntityManagerTests {

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
    public async Task GetChanges() {
      await _emTask;

      var customer = new Customer();
      var q = new EntityQuery<Customer>().Take(2);
      var custs = await q.Execute(_em1);
      custs.First().City = "XXX";
      var q2 = new EntityQuery<Employee>().Take(3);
      var emps = await q2.Execute(_em1);
      emps.Take(2).ForEach(emp => emp.LastName = "XXX");
      var newCust1 = _em1.CreateEntity<Customer>();
      var newEmp1 = _em1.CreateEntity<Employee>();
      var changedEntities = _em1.GetChanges();
      Assert.IsTrue(changedEntities.Count() == 5, "should be 5 changes");
      var changedCusts = _em1.GetChanges(typeof(Customer));
      Assert.IsTrue(changedCusts.Count() == 2, "should be 2 changed custs");
      var changedEmps = _em1.GetChanges(typeof(Employee));
      Assert.IsTrue(changedEmps.Count() == 3, "should be 3 changed emps");
      var changedEntities2 = _em1.GetChanges(typeof(Employee), typeof(Customer));
      Assert.IsTrue(changedEntities2.Count() == 5, "should be 5 changes");


    }

    [TestMethod]
    public async Task HasChangesChangedAfterSave() {
      await _emTask;

      var hccArgs = new List<EntityManagerHasChangesChangedEventArgs>();
      _em1.HasChangesChanged += (s, e) => {
        hccArgs.Add(e);
      };

      var emp = new Employee() { FirstName = "Test_Fn", LastName = "Test_Ln" };

      _em1.AddEntity(emp);
      Assert.IsTrue(hccArgs.Count == 1);
      Assert.IsTrue(hccArgs.Last().HasChanges == true);
      Assert.IsTrue(_em1.HasChanges());
      var sr = await _em1.SaveChanges();
      Assert.IsTrue(sr.Entities.Count == 1);
      Assert.IsTrue(hccArgs.Count == 2);
      Assert.IsTrue(hccArgs.Last().HasChanges == false);
      Assert.IsTrue(_em1.HasChanges() == false);
    }

    [TestMethod]
    public async Task LoadNavigationPropertyNonscalar() {
      await _emTask;
      TestFns.RunInWpfSyncContext( async () =>  {
        var q0 = new EntityQuery<Customer>().Where(c => c.Orders.Any()).Take(3);
        var r0 = await q0.Execute(_em1);
        // Task.WaitAll(r0.Select(c => c.EntityAspect.LoadNavigationProperty("Orders")).ToArray());
        await Task.WhenAll(r0.Select(c => c.EntityAspect.LoadNavigationProperty("Orders")));
        Assert.IsTrue(r0.All(c => c.Orders.Count() > 0));
      });
    }

    [TestMethod]
    public async Task LoadNavigationPropertyScalar() {
      await _emTask;
      TestFns.RunInWpfSyncContext(async () => {
        var q0 = new EntityQuery<Order>().Where(o => o.Customer != null).Take(3);
        var r0 = await q0.Execute(_em1);
        // Task.WaitAll(r0.Select(o => o.EntityAspect.LoadNavigationProperty("Customer")).ToArray());
        await Task.WhenAll(r0.Select(o => o.EntityAspect.LoadNavigationProperty("Customer")));
        Assert.IsTrue(r0.All(o => o.Customer != null));
      });
    }
    

  }
}
