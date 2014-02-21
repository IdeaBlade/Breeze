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

namespace Test_NetClient {

  [TestClass]
  public class ExportImportTests {

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

    // create entity with complexType property
    [TestMethod]
    public async Task ExpMetadata() {
      await _emTask;

      var metadata = MetadataStore.Instance.ExportMetadata();
      File.WriteAllText("c:/temp/metadata.txt", metadata);

      var ms = MetadataStore.Instance;

      MetadataStore.__Reset();
      Assert.IsTrue(ms != MetadataStore.Instance);
      
      MetadataStore.Instance.ImportMetadata(metadata);
      var metadata2 = MetadataStore.Instance.ExportMetadata();

      File.WriteAllText("c:/temp/metadata2.txt", metadata2);
      Assert.IsTrue(metadata == metadata2);
    }

    [TestMethod]
    public async Task ExpEntities() {
      await _emTask;

      var q = new EntityQuery<Foo.Customer>("Customers").Take(5);
      
      var results = await q.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var exportedEntities = _em1.ExportEntities();

      File.WriteAllText("c:/temp/emExport.txt", exportedEntities);
      
    }

    [TestMethod]
    public async Task ExpEntitiesWithChanges() {
      await _emTask;

      var q = new EntityQuery<Foo.Customer>("Customers").Take(5);

      var results = await q.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var custs = results.Take(2);
      custs.ForEach(c => c.City = "Paris");
      var emp1 = _em1.CreateEntity<Employee>();

      var exportedEntities = _em1.ExportEntities();

      File.WriteAllText("c:/temp/emExportWithChanges.txt", exportedEntities);

    }

    [TestMethod]
    public async Task ExpSelectedEntitiesWithChanges() {
      await _emTask;

      var q = new EntityQuery<Foo.Customer>("Customers").Take(5);

      var results = await q.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var custs = results.Take(2).ToList();
      custs.ForEach(c => c.City = "Paris");
      var emp1 = _em1.CreateEntity<Employee>();

      var exportedEntities = _em1.ExportEntities(new IEntity[] { custs[0], custs[1], emp1 }, false);

      File.WriteAllText("c:/temp/emExportWithChanges.txt", exportedEntities);

    }

    [TestMethod]
    public async Task ExpImpSelectedEntitiesWithChanges() {
      await _emTask;

      var q = new EntityQuery<Foo.Customer>("Customers").Take(5);

      var results = await q.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var custs = results.Take(2).ToList();
      custs.ForEach(c => c.City = "Paris");
      var emp1 = _em1.CreateEntity<Employee>();
      var emp2 = _em1.CreateEntity<Employee>();

      var exportedEntities = _em1.ExportEntities(new IEntity[] { custs[0], custs[1], emp1, emp2 }, false);

      var em2 = new EntityManager(_em1);
      var impResult = em2.ImportEntities(exportedEntities);
      var allEntities = em2.GetEntities();

      Assert.IsTrue(impResult.ImportedEntities.Count == 4, "should have imported 4 entities");
      Assert.IsTrue(impResult.TempKeyMap.Count == 2);
      Assert.IsTrue(impResult.TempKeyMap.All(kvp => kvp.Key == kvp.Value), "imported entities should have same key values");
      Assert.IsTrue(allEntities.Count() == 4, "should have 4 entities in cache");
      Assert.IsTrue(em2.GetEntities<Customer>().All(c => c.EntityAspect.EntityState.IsModified()));
      Assert.IsTrue(em2.GetEntities<Employee>().All(c => c.EntityAspect.EntityState.IsAdded()));
      
    }

    [TestMethod]
    public async Task ExpImpTempKeyCollision() {
      await _emTask;

      var q = new EntityQuery<Foo.Customer>("Customers").Take(5);

      var results = await q.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var custs = results.Take(2).ToList();
      custs.ForEach(c => c.City = "Paris");
      var emp1 = _em1.CreateEntity<Employee>();
      var emp2 = _em1.CreateEntity<Employee>();

      var exportedEntities = _em1.ExportEntities(new IEntity[] { custs[0], custs[1], emp1, emp2 }, false);

      custs.ForEach(c => c.City = "London");
      // custs1 and 2 shouldn't be imported because of default preserveChanges
      // emps1 and 2 should cause the creation of NEW emps with new temp ids;
      // tempKeys should cause creation of new entities;
      var impResult = _em1.ImportEntities(exportedEntities);
      var allEntities = _em1.GetEntities();

      Assert.IsTrue(allEntities.Count() == 9, "should have 9 entities in the cache");
      Assert.IsTrue(allEntities.OfType<Customer>().Count() == 5, "should only be the original 5 custs");
      Assert.IsTrue(allEntities.OfType<Employee>().Count() == 4, "should be 4 emps (2 + 2) ");
      Assert.IsTrue(allEntities.OfType<Customer>().Count(c => c.EntityAspect.EntityState.IsModified()) == 2, "should only be 2 modified customers");
      Assert.IsTrue(allEntities.OfType<Employee>().All(c => c.EntityAspect.EntityState.IsAdded()));
      Assert.IsTrue(impResult.ImportedEntities.Count == 2, "should have only imported 2 entities");
      Assert.IsTrue(custs.All(c => c.City == "London"), "city should still be London after import");
      Assert.IsTrue(custs.All(c => c.EntityAspect.OriginalValuesMap["City"] != "London"), "original city should not be London");
      Assert.IsTrue(impResult.TempKeyMap.All(kvp => kvp.Key != kvp.Value), "imported entities should not have same key values");
    }
  

    [TestMethod]
    public async Task ExpImpTempKeyCollisionOverwrite() {
      await _emTask;

      var q = new EntityQuery<Foo.Customer>("Customers").Take(5);

      var results = await q.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var custs = results.Take(2).ToList();
      custs.ForEach(c => c.City = "Paris");
      var emp1 = _em1.CreateEntity<Employee>();
      var emp2 = _em1.CreateEntity<Employee>();

      var exportedEntities = _em1.ExportEntities(new IEntity[] { custs[0], custs[1], emp1, emp2 }, false);

      custs.ForEach(c => c.City = "London");

      // custs1 and 2 shouldn't be imported because of default preserveChanges
      // emps1 and 2 should cause the creation of NEW emps with new temp ids;
      // tempKeys should cause creation of new entities;
      var impResult = _em1.ImportEntities(exportedEntities, new ImportOptions(MergeStrategy.OverwriteChanges));
      var allEntities = _em1.GetEntities();

      Assert.IsTrue(allEntities.Count() == 9, "should have 9 entities in the cache");

      Assert.IsTrue(custs.All(c => c.City == "Paris"), "city should be Paris after import");
      Assert.IsTrue(custs.All(c => c.EntityAspect.OriginalValuesMap["City"] != "Paris"), "original city should not be Paris");
      Assert.IsTrue(allEntities.OfType<Customer>().Count() == 5, "should only be the original 5 custs");
      Assert.IsTrue(allEntities.OfType<Employee>().Count() == 4, "should be 4 emps (2 + 2) ");
      Assert.IsTrue(allEntities.OfType<Customer>().Count(c => c.EntityAspect.EntityState.IsModified()) == 2, "should only be 2 modified customers");
      Assert.IsTrue(allEntities.OfType<Employee>().All(c => c.EntityAspect.EntityState.IsAdded()));
      Assert.IsTrue(impResult.ImportedEntities.Count == 4, "should have only imported 4 entities");
      Assert.IsTrue(impResult.TempKeyMap.All(kvp => kvp.Key != kvp.Value), "imported entities should not have same key values");
    }

    [TestMethod]
    public async Task ExpImpTempKeyRelatedFixup() {
      await _emTask;

      var q = new EntityQuery<Foo.Employee>("Employees").Take(3);

      var results = await q.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var emp1 = new Employee();
      var order1 = new Order();
      var order2 = new Order();
      _em1.AddEntity(emp1);
      emp1.Orders.Add(order1);
      emp1.Orders.Add(order2);

      var exportedEntities = _em1.ExportEntities(null, false);

      // custs1 and 2 shouldn't be imported because of default preserveChanges
      // emps1 and 2 should cause the creation of NEW emps with new temp ids;
      // tempKeys should cause creation of new entities;
      var impResult = _em1.ImportEntities(exportedEntities);
      var allEntities = _em1.GetEntities();

      Assert.IsTrue(allEntities.Count() == 9, "should have 9 (3 orig, 3 added, 3 imported (new) entities in the cache");
      
      Assert.IsTrue(allEntities.OfType<Order>().Count() == 4, "should be 4 orders (2 + 2)");
      Assert.IsTrue(allEntities.OfType<Employee>().Count() == 5, "should be 5 emps (3 + 1 + 1) ");
      Assert.IsTrue(allEntities.OfType<Employee>().Count(c => c.EntityAspect.EntityState.IsAdded()) == 2, "should only be 2 added emps");
      Assert.IsTrue(allEntities.OfType<Order>().All(c => c.EntityAspect.EntityState.IsAdded()));
      Assert.IsTrue(impResult.ImportedEntities.Count == 6, "should have imported 6 entities - 3 orig + 3 new");
      Assert.IsTrue(impResult.ImportedEntities.OfType<Order>().Count() == 2, "should have imported 2 orders");
      Assert.IsTrue(impResult.ImportedEntities.OfType<Employee>().Count( e => e.EntityAspect.EntityState.IsAdded()) == 1, "should have imported 1 added emp");
      Assert.IsTrue(impResult.ImportedEntities.OfType<Employee>().Count( e => e.EntityAspect.EntityState.IsUnchanged()) == 3, "should have imported 3 unchanged emps");
      Assert.IsTrue(impResult.TempKeyMap.Count == 3, "tempKeyMap should be of length 3");
      Assert.IsTrue(impResult.TempKeyMap.All(kvp => kvp.Key != kvp.Value), "imported entities should not have same key values");
      var newOrders = impResult.ImportedEntities.OfType<Order>();
      var newEmp = impResult.ImportedEntities.OfType<Employee>().First(e => e.EntityAspect.EntityState.IsAdded());
      Assert.IsTrue(newOrders.All(no => no.EmployeeID == newEmp.EmployeeID), "should have updated order empId refs");

    }
  }
}
