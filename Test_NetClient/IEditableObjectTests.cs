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
  public class IEditableObjectTests {

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
    public async Task IEditableObjectNeverAttached() {
      await _emTask;

      var customer = new Customer();
      
      Assert.IsTrue(customer.EntityAspect.EntityState.IsDetached());
      ((IEditableObject)customer).BeginEdit();
      try {
        customer.City = "Foo";
      } finally {
        ((IEditableObject)customer).EndEdit();
      }
      Assert.IsTrue(customer.City == "Foo");
      ((IEditableObject)customer).BeginEdit();
      try {
        customer.City = "Bar";
      } finally {
        ((IEditableObject)customer).CancelEdit();
      }
      Assert.IsTrue(customer.City == "Foo");

    }

    [TestMethod]
    public async Task IEditableObjectAttachedUnchanged() {
      await _emTask;

      var customer = new Customer();
      _em1.AttachEntity(customer);

      Assert.IsTrue(customer.EntityAspect.EntityState.IsUnchanged());
      ((IEditableObject)customer).BeginEdit();
      try {
        customer.City = "Foo";
        Assert.IsTrue(customer.EntityAspect.EntityState.IsModified());
      } finally {
        ((IEditableObject)customer).EndEdit();
      }
      Assert.IsTrue(customer.City == "Foo");
      Assert.IsTrue(customer.EntityAspect.EntityState.IsModified());
      customer.EntityAspect.AcceptChanges();
      Assert.IsTrue(customer.EntityAspect.EntityState.IsUnchanged());
      ((IEditableObject)customer).BeginEdit();
      try {
        customer.City = "Bar";
        Assert.IsTrue(customer.EntityAspect.EntityState.IsModified());
      } finally {
        ((IEditableObject)customer).CancelEdit();
      }
      Assert.IsTrue(customer.City == "Foo");
      Assert.IsTrue(customer.EntityAspect.EntityState.IsUnchanged());
    }

    [TestMethod]
    public async Task IEditableObjectAttachedModified() {
      await _emTask;

      var customer = new Customer();
      _em1.AttachEntity(customer);

      Assert.IsTrue(customer.EntityAspect.EntityState.IsUnchanged());
      ((IEditableObject)customer).BeginEdit();
      try {
        customer.City = "Foo";
      } finally {
        ((IEditableObject)customer).EndEdit();
      }
      Assert.IsTrue(customer.City == "Foo");
      Assert.IsTrue(customer.EntityAspect.EntityState.IsModified());
      ((IEditableObject)customer).BeginEdit();
      try {
        customer.City = "Bar";
      } finally {
        ((IEditableObject)customer).CancelEdit();
      }
      Assert.IsTrue(customer.City == "Foo");
      Assert.IsTrue(customer.EntityAspect.EntityState.IsModified());
    }

    [TestMethod]
    public async Task IEditableObjectOnDetached() {
      await _emTask;

      var customer = _em1.CreateEntity<Customer>(EntityState.Unchanged);
      customer.EntityAspect.Detach();
      Assert.IsTrue(customer.EntityAspect.EntityState.IsDetached());
      ((IEditableObject)customer).BeginEdit();
      try {
        customer.City = "Foo";
      } finally {
        ((IEditableObject)customer).EndEdit();
      }
      Assert.IsTrue(customer.City == "Foo");
      ((IEditableObject)customer).BeginEdit();
      try {
        customer.City = "Bar";
      } finally {
        ((IEditableObject)customer).CancelEdit();
      }
      Assert.IsTrue(customer.City == "Foo");

    }

    [TestMethod]
    public async Task IEditableObjectOnDeleted() {
      await _emTask;

      var customer = _em1.CreateEntity<Customer>(EntityState.Unchanged);
      // customer.EntityAspect.SetModified();  // otherwise delete will detach it.
      customer.EntityAspect.Delete();
      Assert.IsTrue(customer.EntityAspect.EntityState.IsDeleted());
      ((IEditableObject)customer).BeginEdit();
      try {
        customer.City = "Foo";
      } finally {
        ((IEditableObject)customer).EndEdit();
      }
      Assert.IsTrue(customer.City == "Foo");
      ((IEditableObject)customer).BeginEdit();
      try {
        customer.City = "Bar";
      } finally {
        ((IEditableObject)customer).CancelEdit();
      }
      Assert.IsTrue(customer.City == "Foo");

    }

  }
}
