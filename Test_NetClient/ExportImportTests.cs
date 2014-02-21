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
      Assert.IsTrue(custs.All(c => c.City == "London"), "city should still be Londen after import");
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
      // Assert.IsTrue(custs.All(c => c.EntityAspect.GetValue("City", EntityVersion.Original) != "Paris"), "city original value should NOT be Paris");
      Assert.IsTrue(allEntities.OfType<Customer>().Count() == 5, "should only be the original 5 custs");
      Assert.IsTrue(allEntities.OfType<Employee>().Count() == 4, "should be 4 emps (2 + 2) ");
      Assert.IsTrue(allEntities.OfType<Customer>().Count(c => c.EntityAspect.EntityState.IsModified()) == 2, "should only be 2 modified customers");
      Assert.IsTrue(allEntities.OfType<Employee>().All(c => c.EntityAspect.EntityState.IsAdded()));
      Assert.IsTrue(impResult.ImportedEntities.Count == 4, "should have only imported 4 entities");
      Assert.IsTrue(impResult.TempKeyMap.All(kvp => kvp.Key != kvp.Value), "imported entities should not have same key values");
    }
  }
}
