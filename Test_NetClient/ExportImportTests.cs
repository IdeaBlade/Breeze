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
    public async Task ExportMetadata() {
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
    public async Task ExportEntities() {
      await _emTask;

      var q = new EntityQuery<Foo.Customer>("Customers").Take(5);
      
      var results = await q.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var exportedEntities = _em1.ExportEntities();

      File.WriteAllText("c:/temp/emExport.txt", exportedEntities);
      
    }

    [TestMethod]
    public async Task ExportEntitiesWithChanges() {
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
    public async Task ExportSelectedEntitiesWithChanges() {
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
    public async Task ExportImportSelectedEntitiesWithChanges() {
      await _emTask;

      var q = new EntityQuery<Foo.Customer>("Customers").Take(5);

      var results = await q.Execute(_em1);

      Assert.IsTrue(results.Count() > 0);
      var custs = results.Take(2).ToList();
      custs.ForEach(c => c.City = "Paris");
      var emp1 = _em1.CreateEntity<Employee>();

      var exportedEntities = _em1.ExportEntities(new IEntity[] { custs[0], custs[1], emp1 }, false);

      var em2 = new EntityManager(_em1);
      em2.ImportEntities(exportedEntities);
      var importedEntities = em2.GetEntities();

      Assert.IsTrue(importedEntities.Count() == 3, "should have imported 3 entities");

    }


  }
}
