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

namespace Test_NetClient {

  [TestClass]
  public class MetadataExpImpTests {

    private Task<EntityManager> _emTask = null;
    private EntityManager _em1;
    private static MetadataStore __metadataStore;

    [TestInitialize]
    public void TestInitializeMethod() {
      // _emTask = SetUpAsync();
    }

    //public async Task<EntityManager> SetUpAsync() {
    //  var serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";

    //  if (__metadataStore == null) {
    //    _em1 = new EntityManager(serviceName);
    //    await _em1.FetchMetadata();
    //    __metadataStore = _em1.MetadataStore;
    //  } else {
    //    _em1 = new EntityManager(serviceName, __metadataStore);
    //  }
    //  return _em1;
    //  return null;
    //}

    [TestCleanup]
    public void TearDown() {
      
    }

    // create entity with complexType property
    [TestMethod]
    public async Task ExportMetadata() {
      var serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";
      var dataService = new DataService(serviceName);
      await MetadataStore.Instance.FetchMetadata(dataService);

      var metadata = MetadataStore.Instance.ExportMetadata();
      File.WriteAllText("c:/temp/metadata.txt", metadata);

      var ms = MetadataStore.Instance;

      MetadataStore.Clear();
      Assert.IsTrue(ms != MetadataStore.Instance);
      MetadataStore.Instance.ImportMetadata(metadata);
      var metadata2 = MetadataStore.Instance.ExportMetadata();
      
      
      File.WriteAllText("c:/temp/metadata2.txt", metadata2);
      Assert.IsTrue(metadata == metadata2);
    }

    

  }
}
