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

    private String _serviceName;

    [TestInitialize]
    public void TestInitializeMethod() {
      _serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";
    }

    [TestCleanup]
    public void TearDown() {
      
    }

    [TestMethod]
    public async Task IEditableObjectNeverAttached() {
      var em1 = await TestFns.NewEm(_serviceName);

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
      var em1 = await TestFns.NewEm(_serviceName);

      var customer = new Customer();
      em1.AttachEntity(customer);

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
      var em1 = await TestFns.NewEm(_serviceName);

      var customer = new Customer();
      em1.AttachEntity(customer);

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
      var em1 = await TestFns.NewEm(_serviceName);

      var customer = em1.CreateEntity<Customer>(EntityState.Unchanged);
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
      var em1 = await TestFns.NewEm(_serviceName);

      var customer = em1.CreateEntity<Customer>(EntityState.Unchanged);
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
