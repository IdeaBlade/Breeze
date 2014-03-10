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
  public class ComplexTypeTests {

    private Task<EntityManager> _emTask = null;
    private EntityManager _em1;

    [TestInitialize]
    public void TestInitializeMethod() {
      _emTask = SetUpAsync();
    }

    public async Task<EntityManager> SetUpAsync() {
      var serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";

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
    public async Task CheckDefaultValues() {
      await _emTask;

      var supplier = _em1.CreateEntity<Supplier>();
      var companyName = supplier.CompanyName;
      var location = supplier.Location;

      Assert.IsTrue(location.GetType() == typeof(Location));
      var city = location.City;
    
    }

    
    [TestMethod]
    public async Task AttachEntityWithComplexPropsSet() {
      await _emTask;

      var supplier = new Supplier();
      supplier.CompanyName = "Test1";
      supplier.Location = new Location() { City = "Seattle", PostalCode = "11111" };
      _em1.AttachEntity(supplier);
      Assert.IsTrue(supplier.EntityAspect.IsAttached);
      Assert.IsTrue(supplier.CompanyName == "Test1" && supplier.Location.City == "Seattle" && supplier.Location.PostalCode == "11111");
      Assert.IsTrue(supplier.Location.ComplexAspect.Parent == supplier, "parent should be set");
      Assert.IsTrue(supplier.Location.ComplexAspect.ParentEntityProperty.Name == "Location", "parentEntityProperty should be set");
    }



    [TestMethod]
    public async Task SetSimple() {
      await _emTask;

      var supplier = _em1.CreateEntity<Supplier>();
      
      supplier.Location.City = "San Francisco";
      var location = supplier.Location;
      location.PostalCode = "91333";

      Assert.IsTrue(supplier.Location == location, "ref should be the same");
      Assert.IsTrue(supplier.Location.City == "San Francisco", "city should be set");
      Assert.IsTrue(supplier.Location.PostalCode == "91333", "postal code should be set");
      Assert.IsTrue(supplier.Location.ComplexAspect.Parent == supplier, "parent should be set");
      Assert.IsTrue(supplier.Location.ComplexAspect.ParentEntityProperty.Name == "Location", "parentEntityProperty should be set");
    }

    [TestMethod]
    public async Task AssignComplexObject() {
      await _emTask;

      var supplier = _em1.CreateEntity<Supplier>();
      // set in ctor.
      Assert.IsTrue(supplier.Location.Country == "USA", "Country should be set");
      var initLocation = supplier.Location;
      supplier.Location.City = "San Francisco";
      Assert.IsTrue(supplier.Location.City == "San Francisco", "city should be set");
      var newLocation = new Location();
      newLocation.City = "Seatle";
      supplier.Location = newLocation;
      Assert.IsTrue(supplier.Location == initLocation, "location ref should not have changed");
      Assert.IsTrue(supplier.Location.City == "Seatle", "city should have changed");
      Assert.IsTrue(supplier.Location.ComplexAspect.Parent == supplier, "parent should be set");
      Assert.IsTrue(supplier.Location.ComplexAspect.ParentEntityProperty.Name == "Location", "parentEntityProperty should be set");
    }

    [TestMethod]
    public async Task AssignComplexObjectWithInitializer() {
      await _emTask;

      var supplier = _em1.CreateEntity<Supplier>();
      var initLocation = supplier.Location;
      supplier.Location.City = "San Francisco";
      Assert.IsTrue(supplier.Location.City == "San Francisco", "city should be set");
      var newLocation = new Location() { City = "Seattle", PostalCode = "11111" };
      supplier.Location = newLocation;
      Assert.IsTrue(supplier.Location == initLocation, "location ref should not have changed");
      Assert.IsTrue(supplier.Location.City == "Seattle", "city should have changed");
      Assert.IsTrue(supplier.Location.ComplexAspect.Parent == supplier, "parent should be set");
      Assert.IsTrue(supplier.Location.ComplexAspect.ParentEntityProperty.Name == "Location", "parentEntityProperty should be set");
    }

    [TestMethod]
    public async Task QueryEntityWithComplexProp() {
      await _emTask;

      var q = new EntityQuery<Supplier>().Where(s => s.CompanyName.StartsWith("P"));
      var suppliers = await _em1.ExecuteQuery(q);
      Assert.IsTrue(suppliers.Count() > 0, "should be some suppliers");
      Assert.IsTrue(suppliers.All(s => s.Location != null));
      var supplier = suppliers.First();
      Assert.IsTrue(supplier.Location.ComplexAspect.Parent == supplier, "parent should be set");
      Assert.IsTrue(supplier.Location.ComplexAspect.ParentEntityProperty.Name == "Location", "parentEntityProperty should be set");
    }

    [TestMethod]
    public async Task SetComplexSubProp() {
      await _emTask;

      var q = new EntityQuery<Supplier>().Where(s => s.CompanyName.StartsWith("P"));
      var suppliers = await _em1.ExecuteQuery(q);
      Assert.IsTrue(suppliers.Count() > 0, "should be some suppliers");
      

      suppliers.ForEach(s => s.Location.Region = "Foo");
      Assert.IsTrue(suppliers.All(s => s.EntityAspect.EntityState.IsModified()), "should have been modified");
      suppliers.All(s => s.Location.Region == "Foo");
      var supplier = suppliers.First();
      Assert.IsTrue(supplier.Location.ComplexAspect.Parent == supplier, "parent should be set");
      Assert.IsTrue(supplier.Location.ComplexAspect.ParentEntityProperty.Name == "Location", "parentEntityProperty should be set");
    }

    [TestMethod]
    public async Task SetComplexPropWithNewInstance() {
      await _emTask;

      var q = new EntityQuery<Supplier>().Where(s => s.CompanyName.StartsWith("P"));
      var suppliers = await _em1.ExecuteQuery(q);
      Assert.IsTrue(suppliers.Count() > 0, "should be some suppliers");

      var newLocation = new Location() { City = "Phoenix", PostalCode = "11111" };
      suppliers.ForEach(s => s.Location = newLocation);
      Assert.IsTrue(suppliers.All(s => s.Location != newLocation), "refs should NOT be the same");
      Assert.IsTrue(suppliers.All(s => s.Location.StructuralEquals(newLocation)), "but values should be the same");
      Assert.IsTrue(suppliers.All(s => s.EntityAspect.EntityState.IsModified()), "should have been modified");
      suppliers.All(s => s.Location.City == "Phoenix");
      var supplier = suppliers.First();
      Assert.IsTrue(supplier.Location.ComplexAspect.Parent == supplier, "parent should be set");
      Assert.IsTrue(supplier.Location.ComplexAspect.ParentEntityProperty.Name == "Location", "parentEntityProperty should be set");
    }

    [TestMethod]
    public async Task ErrorOnSetComplexPropWithNull() {
      await _emTask;

      var q = new EntityQuery<Supplier>().Where(s => s.CompanyName.StartsWith("P")).Take(2);
      var suppliers = await _em1.ExecuteQuery(q);
      Assert.IsTrue(suppliers.Count() > 0, "should be some suppliers");
      // var newLocation = new Location() { City = "Phoenix", PostalCode = "11111" };
      try {
        suppliers.ForEach(s => s.Location = null);
        Assert.Fail("shouldn't get here");
      } catch (Exception e) {
        Assert.IsTrue(e.Message.ToLower().Contains("complextype"), "message should mention complextype");
      }
    }

    [TestMethod]
    public async Task SetComplexPropWithAnotherComplexProp() {
      await _emTask;

      var q = new EntityQuery<Supplier>().Where(s => s.CompanyName.StartsWith("P")).Take(2);
      var suppliers = await _em1.ExecuteQuery(q);
      Assert.IsTrue(suppliers.Count() > 0, "should be some suppliers");
      var supplierList = suppliers.ToList();
      var s0 = supplierList[0];
      var s1 = supplierList[1];
      s0.Location.City = "asdfasdf";
      Assert.IsTrue(!s0.Location.StructuralEquals(s1.Location), "should not be equal");
      s0.Location = s1.Location;
      Assert.IsTrue(s0.Location.StructuralEquals(s1.Location), "should be equal");
      
    }

    [TestMethod]
    public async Task RejectChanges() {
      await _emTask;

      var q = new EntityQuery<Supplier>().Where(s => s.CompanyName.StartsWith("P")).Take(2);
      var suppliers = await _em1.ExecuteQuery(q);
      Assert.IsTrue(suppliers.Count() > 0, "should be some suppliers");
      var s0 = suppliers.First();
      var s1 = suppliers.ElementAt(1);
      var origCity = s0.Location.City;
      s0.Location.City = "bar";
      s0.Location.Country = "Foo";
      Assert.IsTrue(s0.EntityAspect.EntityState.IsModified(), "should be modified");
      Assert.IsTrue(s0.Location.City == "bar", "should have changed value");
      s0.EntityAspect.RejectChanges();
      Assert.IsTrue(s0.EntityAspect.EntityState.IsUnchanged(), "should be unchanged");
      Assert.IsTrue(s0.Location.City != origCity, "should be back to original value");

    }


    [TestMethod]
    public async Task QueryByComplexProp() {
      await _emTask;

      var q = new EntityQuery<Supplier>().Where(c => c.Location.City.StartsWith("P") && c.CompanyName != null);
      // var q = new EntityQuery<Supplier>().Where(c => c.CompanyName.StartsWith("P") && c.Location.City != null && c.Location.Address != null);

      var x = q.GetResourcePath();
      var suppliers = await _em1.ExecuteQuery(q);

      Assert.IsTrue(suppliers.Count() > 0, "should have returned some suppliers");
      // Assert.IsTrue(suppliers.All(s => s.Location.City != null && s.Location.Address != null));
      Assert.IsTrue(suppliers.All(s => s.Location.City.StartsWith("P") && s.CompanyName != null), "should match query");
    }

    [TestMethod]
    public async Task EntityAndPropertyChangedEvents() {
      await _emTask;

      var newLocation = new Location() { City = "Bar", Country = "Foo" };
      var q = new EntityQuery<Supplier>().Where(s => s.CompanyName.StartsWith("P")).Take(2);

      var suppliers = await _em1.ExecuteQuery(q);
      Assert.IsTrue(suppliers.Count() > 0, "should have returned some suppliers");

      var supp0 = suppliers.First();
      List<EntityChangedEventArgs> entityChangedList = new List<EntityChangedEventArgs>();
      List<PropertyChangedEventArgs> propChangedList = new List<PropertyChangedEventArgs>();
      List<PropertyChangedEventArgs> aspectPropChangedList = new List<PropertyChangedEventArgs>();
      _em1.EntityChanged += (s, e) => {
        entityChangedList.Add(e);
      };
      ((INotifyPropertyChanged)supp0).PropertyChanged += (s, e) => {
        propChangedList.Add(e);
      };
      supp0.EntityAspect.PropertyChanged += (s, e) => {
        aspectPropChangedList.Add(e);
      };

      supp0.Location.City = "xxxxx";
      var lastEc = entityChangedList.Last();
      Assert.IsTrue(lastEc.EntityAspect == supp0.EntityAspect, "ec should have been fired");
      Assert.IsTrue(entityChangedList[0].Action == EntityAction.PropertyChange && entityChangedList[0].Entity == supp0);
      Assert.IsTrue(entityChangedList[1].Action == EntityAction.EntityStateChange && entityChangedList[1].Entity == supp0);

      Assert.IsTrue(aspectPropChangedList.Count == 2, "2 aspects should have changed"); // isChanged and EntityState.

      Assert.IsTrue(propChangedList.Count == 1);
      Assert.IsTrue(propChangedList[0].PropertyName == "Location");
      entityChangedList.Clear();
      propChangedList.Clear();
      aspectPropChangedList.Clear();
      supp0.Location.City = "city-1";
      supp0.Location.Address = "address-1";
      Assert.IsTrue(entityChangedList.Count == 2, "should be 2 entity changed events");
      Assert.IsTrue(propChangedList.Count == 2, "should be 2 propChanged events");
      Assert.IsTrue(aspectPropChangedList.Count == 0, "no more EntityAspect changes");
    }

    [TestMethod]
    public async Task OriginalValues() {
      await _emTask;

      var q = new EntityQuery<Foo.Supplier>("Suppliers").Where(s => s.CompanyName.StartsWith("P"));

      var suppliers = await q.Execute(_em1);
      suppliers.ForEach((s, i) => s.Location.Address = "Foo:" + s.Location.Address);
      Assert.IsTrue(suppliers.All(s => s.EntityAspect.EntityState.IsModified()));
      Assert.IsTrue(suppliers.All(s => s.EntityAspect.OriginalValuesMap.Count() == 0), "supplier originalValuesMap should be empty");
      suppliers.ForEach(s => {
        var location = s.Location;
        Assert.IsTrue(location.Address.StartsWith("Foo"), "address should start with 'Foo'");
        Assert.IsTrue(location.ComplexAspect.OriginalValuesMap.ContainsKey("Address"), "ComplexAspect originalValues should contain address");
        var oldAddress = (String) location.ComplexAspect.OriginalValuesMap["Address"];
        if (oldAddress == null) {
          Assert.IsTrue(location.Address == "Foo:", "should have a null old address");
        } else {
          Assert.IsTrue(location.Address.Substring(4) == oldAddress, "should have the right old address");
        }
      });
    }

    [TestMethod]
    public async Task SaveModifiedCpOnly() {
      await _emTask;

      var q0 = EntityQuery.From<Supplier>().Where(s => s.CompanyName.StartsWith("P"));
      var r0 = await q0.With(_em1).Execute();
      Assert.IsTrue(r0.Count() > 0);
      var supplier = r0.First();
      var val = "foo-" + TestFns.RandomSuffix(5);
      var oldVal = supplier.Location.PostalCode;
      Assert.IsTrue(val != oldVal);
      supplier.Location.PostalCode = val;
      var sr = await _em1.SaveChanges();
      Assert.IsTrue(sr.Entities.Count == 1);
      _em1.Clear();
      var q1 = new EntityQuery<Supplier>().Where(s => s.Location.PostalCode == val);
      var r1 = await q1.Execute(_em1);
      Assert.IsTrue(r1.Count() == 1);


    }

    [TestMethod]
    public async Task SaveModifiedCpAndNonCp() {
      await _emTask;

      var q0 = EntityQuery.From<Supplier>().Where(s => s.CompanyName.StartsWith("P"));
      var r0 = await q0.With(_em1).Execute();
      Assert.IsTrue(r0.Count() > 0);
      var supplier = r0.First();
      var val = "foo-" + TestFns.RandomSuffix(5);
      var oldVal = supplier.Location.PostalCode;
      Assert.IsTrue(val != oldVal);
      supplier.Location.PostalCode = val;
      var oldCompanyName = supplier.CompanyName;
      supplier.CompanyName = TestFns.MorphString(supplier.CompanyName);
      var newCompanyName = supplier.CompanyName;
      var sr = await _em1.SaveChanges();
      Assert.IsTrue(sr.Entities.Count == 1);
      var _em2 = new EntityManager(_em1);
      var q1 = new EntityQuery<Supplier>().Where(s => s.Location.PostalCode == val);
      var r1 = await q1.Execute(_em2);
      Assert.IsTrue(r1.Count() == 1);
      Assert.IsTrue(r1.First().CompanyName == newCompanyName, "should have changed the companyName");

    }

    [TestMethod]
    public async Task SaveAdded() {
      await _emTask;

      var supplier = new Supplier();
      supplier.CompanyName = "Test-" + TestFns.RandomSuffix(5);
      var companyName = supplier.CompanyName;
      supplier.Location = new Location() { Region = "USA", Address = "123 Main Street", City = "San Diego", PostalCode = "12345" } ;
      _em1.AddEntity(supplier);
      
      var sr = await _em1.SaveChanges();
      Assert.IsTrue(sr.Entities.Count == 1);
      var ek = sr.Entities.First().EntityAspect.EntityKey;

      var _em2 = new EntityManager(_em1);
      var q1 = ek.ToQuery<Supplier>();
      var r1 = await q1.Execute(_em2);
      Assert.IsTrue(r1.Count() == 1);
      Assert.IsTrue(r1.First().CompanyName == companyName, "should have set the companyName");
      Assert.IsTrue(r1.First().Location.City == "San Diego");
      Assert.IsTrue(r1.First().Location.PostalCode == "12345");

    }

    [TestMethod]
    public async Task DeleteTestEntities() {
      await _emTask;

      var supplier = new Supplier();
      supplier.CompanyName = "Test-" + TestFns.RandomSuffix(5);
      var companyName = supplier.CompanyName;
      supplier.Location = new Location() { Region = "USA", Address = "123 Main Street", City = "San Diego", PostalCode = "12345" };
      _em1.AddEntity(supplier);

      var sr = await _em1.SaveChanges();

      Assert.IsTrue(sr.Entities.Count ==1);
      var q1 = new EntityQuery<Supplier>().Where(s => s.CompanyName.StartsWith("Test"));
      var r1 = await _em1.ExecuteQuery(q1);
      Assert.IsTrue(r1.Count() > 0);
      r1.ForEach(r => r.EntityAspect.Delete());
      var sr2 = await _em1.SaveChanges();
      Assert.IsTrue(sr2.Entities.Count == r1.Count());
      Assert.IsTrue(_em1.GetEntities().Count() == 0);
      var r2 = await _em1.ExecuteQuery(q1);
      Assert.IsTrue(r2.Count() == 0);
    }

    [TestMethod]
    public async Task ValidationErrorsChanged() {
      await _emTask;

      var supplier = new Supplier();
      _em1.AddEntity(supplier);
      var valErrors = supplier.EntityAspect.ValidationErrors;
      var errors = new List<DataErrorsChangedEventArgs>();
      ((INotifyDataErrorInfo)supplier).ErrorsChanged += (se, e) => {
        errors.Add(e);
      };
      var s = "very long involved value";
      s = s + s + s + s + s + s + s + s + s + s + s + s + s;
      supplier.CompanyName = s;
      Assert.IsTrue(errors.Last().PropertyName == "CompanyName");
      Assert.IsTrue(valErrors.Count == 1);
      var location = supplier.Location;
      location.City = s;
      Assert.IsTrue(errors.Last().PropertyName == "Location.City", "location.city should have been the propertyName");
      Assert.IsTrue(errors.Count == 2);
      Assert.IsTrue((String) valErrors.Last().Context.PropertyValue == "Location.City");
      location.City = "much shorter";
      Assert.IsTrue(errors.Last().PropertyName == "Location.City", "location.city should have changed again");
      Assert.IsTrue(errors.Count == 3);
      Assert.IsTrue(valErrors.Count == 1);
    }
    
    
    //test("validate Entity", function () {
    //    var em = newEm();
    //    var supplierType = em.metadataStore.getEntityType("Supplier");
    //    var supplier1 = supplierType.createEntity();
    //    em.addEntity(supplier1);
    //    var errs;
    //    var s = "long value long value";
    //    s = s + s + s + s + s + s + s + s + s + s + s + s;
    //    supplier1.setProperty("companyName", s);
    //    clearAndRevalidate(supplier1, 1); // companyName
        
    //    var location = supplier1.getProperty("location");
    //    location.setProperty("city", s);
    //    clearAndRevalidate(supplier1, 2); // companyName, city

    //    location.setProperty("city", "much shorter");
    //    clearAndRevalidate(supplier1, 1); // companyName

    //});
    
    //test("validate property", function () {
    //    var em = newEm();
    //    var supplierType = em.metadataStore.getEntityType("Supplier");
    //    var supplier1 = supplierType.createEntity();
    //    em.attachEntity(supplier1);
    //    var errs;
    //    var s = "long value long value";
    //    s = s + s + s + s + s + s + s + s + s + s + s + s;
    //    supplier1.setProperty("companyName", s);
    //    supplier1.entityAspect.clearValidationErrors();
    //    supplier1.entityAspect.validateProperty("companyName");
    //    errs = supplier1.entityAspect.getValidationErrors();
    //    ok(errs.length == 1, "should be 1 error");
        
    //    var location = supplier1.getProperty("location");
    //    location.setProperty("city", s);
    //    supplier1.entityAspect.clearValidationErrors();
    //    supplier1.entityAspect.validateProperty("location.city");
    //    errs = supplier1.entityAspect.getValidationErrors();
    //    ok(errs.length == 1, "should be 1 error");
        
    //    supplier1.entityAspect.clearValidationErrors();
    //    supplier1.entityAspect.validateProperty("location");
    //    errs = supplier1.entityAspect.getValidationErrors();
    //    ok(errs.length == 1, "should be 1 error");

    //    location.setProperty("city", "much shorter");
    //    supplier1.entityAspect.clearValidationErrors();
    //    supplier1.entityAspect.validateProperty("location.city");
    //    errs = supplier1.entityAspect.getValidationErrors();
    //    ok(errs.length == 0, "should be no errors");

    //});
    
    //function clearAndRevalidate(entity, count) {
    //    var errs = entity.entityAspect.getValidationErrors();
    //    ok(errs.length == count, "should be " + count + " errors"); 
    //    entity.entityAspect.clearValidationErrors();
    //    errs = entity.entityAspect.getValidationErrors();
    //    ok(errs.length == 0, "should be no errors");
    //    entity.entityAspect.validateEntity();
    //    errs = entity.entityAspect.getValidationErrors();
    //    ok(errs.length == count, "should be " + count + " errors");
    //}

    //  create an entity (that has a complex type).
    //  Make a change to a string property of the complex type of the entity created. "test"
    //  save changes (accepting all changes).
    //  reload from db/remote source the same entity.
    //  make changes to the same string property of the complex type. "testED"
    //  Call manager.RevertChanges()..

    //test("rejectChanges after save of new entity", function () {
    //    var em = newEm();
    //    var locationType = em.metadataStore.getEntityType("Location");
    //    var supplier = em.createEntity("Supplier", { companyName: "Test1" });
    //    var location = supplier.getProperty("location");
    //    location.setProperty("city", "LA")
    //    stop();
    //    em.saveChanges().then(function (sr) {
    //        var saved = sr.entities;
    //        ok(saved.length === 1, "should have saved one record");
    //        location = supplier.getProperty("location");
    //        ok(location.getProperty("city") === "LA", "location.city should be 'LA'");
    //        return em.fetchEntityByKey(supplier.entityAspect.getKey());
    //    }).then(function (fr) {
    //        supplier2 = fr.entity;
    //        ok(supplier === supplier2, "should be the same supplier");
    //        location = supplier.getProperty("location");
    //        location.setProperty("city", "FOOO");
    //        supplier.entityAspect.rejectChanges();
    //        ok(location.getProperty("city") === "LA", "location.city should be 'LA'");
    //    }).fail(testFns.handleFail).fin(start);
    //});

  }
}
