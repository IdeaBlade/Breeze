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
  public class ValidationTests {

    private string _serviceName;
   

    [TestInitialize]
    public void TestInitializeMethod() {
      _serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";
    }

    [TestCleanup]
    public void TearDown() {
      
    }


    [TestMethod]
    public async Task INotifyDataErrorInfo() {
      var em1 = await TestFns.NewEm(_serviceName);

      var emp = new Employee();
      var inde = (INotifyDataErrorInfo)emp;
      Assert.IsTrue(!inde.HasErrors);
      var eventArgsList = new List<DataErrorsChangedEventArgs>();
      inde.ErrorsChanged += (s, e) => {
        eventArgsList.Add(e);
      };
      
      em1.AttachEntity(emp);
      Assert.IsTrue(eventArgsList.Count == 2); // firstName, lastName
      // magicString
      var fnErrors = inde.GetErrors(EntityAspect.AllErrors).Cast<ValidationError>();
      Assert.IsTrue(fnErrors.Count() == 2);
      Assert.IsTrue(fnErrors.All(err => err.Context.PropertyPath == "LastName" || err.Context.PropertyPath == "FirstName"));
      fnErrors = inde.GetErrors("FirstName").Cast<ValidationError>();
      Assert.IsTrue(fnErrors.Count() == 1);
      Assert.IsTrue(inde.HasErrors);
      
      emp.FirstName = "test";
      Assert.IsTrue(eventArgsList.Count == 3); 
      fnErrors = inde.GetErrors(EntityAspect.AllErrors).Cast<ValidationError>();
      Assert.IsTrue(fnErrors.Count() == 1);
      fnErrors = inde.GetErrors("FirstName").Cast<ValidationError>();
      Assert.IsTrue(fnErrors.Count() == 0);
      Assert.IsTrue(inde.HasErrors);

      emp.FirstName = "a very long name that exceeds the valid length of the field" + ".".PadRight(40);
      Assert.IsTrue(eventArgsList.Count == 4);
      fnErrors = inde.GetErrors(EntityAspect.AllErrors).Cast<ValidationError>();
      Assert.IsTrue(fnErrors.Count() == 2);
      fnErrors = inde.GetErrors("FirstName").Cast<ValidationError>();
      Assert.IsTrue(fnErrors.Count() == 1);
      Assert.IsTrue(inde.HasErrors);
      
      emp.FirstName = "xxx";
      emp.LastName = "yyy";
      Assert.IsTrue(eventArgsList.Count == 6);
      fnErrors = inde.GetErrors(EntityAspect.AllErrors).Cast<ValidationError>();
      Assert.IsTrue(fnErrors.Count() == 0);
      fnErrors = inde.GetErrors("FirstName").Cast<ValidationError>();
      Assert.IsTrue(fnErrors.Count() == 0);
      Assert.IsTrue(!inde.HasErrors);
    }

    [TestMethod]
    public async Task FindOrCreateFromJson() {
      var em1 = await TestFns.NewEm(_serviceName);

      var vr = new RequiredValidator();
      var vrNode = ((IJsonSerializable) vr).ToJNode(null);
      var vr2 = Validator.FindOrCreate(vrNode);
      var vr3 = Validator.FindOrCreate(vrNode);
      Assert.IsTrue(vr2 == vr3);

      var mlVr = new MaxLengthValidator(17);
      var mlVrNode = ((IJsonSerializable)mlVr).ToJNode(null);
      var mlVr2 = Validator.FindOrCreate(mlVrNode);
      var mlVr3 = Validator.FindOrCreate(mlVrNode);
      Assert.IsTrue(mlVr2 == mlVr3);
      
    }

    [TestMethod]
    public async Task InternValidators() {
      var em1 = await TestFns.NewEm(_serviceName);

      var vr2 = new RequiredValidator().Intern();
      var vr3 = new RequiredValidator().Intern();
      Assert.IsTrue(vr2 == vr3);
      Assert.IsTrue(vr2.Equals(vr3));

      var mlVr2 = new MaxLengthValidator(17).Intern();
      var mlVr3 = new MaxLengthValidator(17).Intern();
      Assert.IsTrue(mlVr2 == mlVr3);
      Assert.IsTrue(mlVr2.Equals(mlVr3));

      var slVr2 = new StringLengthValidator(3, 12).Intern();
      var slVr3 = new StringLengthValidator(3, 12).Intern();
      Assert.IsTrue(slVr2 == slVr3);
      Assert.IsTrue(slVr2.Equals(slVr3));

    }

    [TestMethod]
    public async Task LocalizedValidationMessage() {
      var em1 = await TestFns.NewEm(_serviceName);

      var vr = new RequiredValidator();
      var mt = vr.LocalizedMessage.Message;
      Assert.IsTrue(!String.IsNullOrEmpty(mt));
      Assert.IsTrue(vr.LocalizedMessage.IsLocalized);
    }

    [TestMethod]
    public async Task RequiredProperty() {
      var em1 = await TestFns.NewEm(_serviceName);
      
      var emp = new Employee();
      var vr = new RequiredValidator();
      var dp = emp.EntityAspect.EntityType.GetDataProperty("LastName");
      var vc = new ValidationContext(emp, dp, null);
      var ve = vr.Validate(vc);
      Assert.IsTrue(ve != null);
      Assert.IsTrue(ve.Message.Contains("LastName") && ve.Message.Contains("required"));
      Assert.IsTrue(ve.Context.Entity == emp);
      Assert.IsTrue(ve.Validator == vr);
      Assert.IsTrue(ve.Key != null);
    }

    [TestMethod]
    public async Task RequiredProperty2() {
      var em1 = await TestFns.NewEm(_serviceName);

      var emp = new Employee();
      var dp = emp.EntityAspect.EntityType.GetDataProperty("LastName");
      var ves = emp.EntityAspect.ValidateProperty(dp);

      Assert.IsTrue(ves.Count() > 0);
      var ve = ves.First();
      Assert.IsTrue(ve.Message.Contains("LastName") && ve.Message.Contains("required"));
      Assert.IsTrue(ve.Context.Entity == emp);
      Assert.IsTrue(ve.Validator == new RequiredValidator().Intern(), "validator should a requiredValdator");
      Assert.IsTrue(ve.Key != null);
    }

    [TestMethod]
    public async Task EntireEntity() {
      var em1 = await TestFns.NewEm(_serviceName);

      var emp = new Employee();

      var ves = emp.EntityAspect.Validate();

      Assert.IsTrue(ves.Count() > 0);
      
      Assert.IsTrue(ves.Any(ve => ve.Message.Contains("LastName") && ve.Message.Contains("required")));
      Assert.IsTrue(ves.All(ve => ve.Context.Entity == emp));
      Assert.IsTrue(ves.Any(ve => ve.Validator == new RequiredValidator().Intern()), "validator should a requiredValdator");
      Assert.IsTrue(ves.All(ve => ve.Key != null));
    }

    [TestMethod]
    public async Task OnAttach() {
      var em1 = await TestFns.NewEm(_serviceName);

      var emp = new Employee();

      Assert.IsTrue(!emp.EntityAspect.GetValidationErrors().Any(), "should not be any validation errors");
      em1.AddEntity(emp);
      var ves = emp.EntityAspect.GetValidationErrors();
      Assert.IsTrue(ves.Any(), "should be some now");

      Assert.IsTrue(ves.Any(ve => ve.Message.Contains("LastName") && ve.Message.Contains("required")));
      Assert.IsTrue(ves.All(ve => ve.Context.Entity == emp));
      Assert.IsTrue(ves.Any(ve => ve.Validator == new RequiredValidator().Intern()), "validator should a requiredValdator");
      Assert.IsTrue(ves.All(ve => ve.Key != null));
    }

    [TestMethod]
    public async Task ChangeMessageString() {
      var em1 = await TestFns.NewEm(_serviceName);

      var emp = new Employee();
      var vr = new RequiredValidator().WithMessage("{0} is bad");
      var dp = emp.EntityAspect.EntityType.GetDataProperty("LastName");
      var vc = new ValidationContext(emp, dp, null);
      var ve = vr.Validate(vc);
      Assert.IsTrue(ve != null);
      Assert.IsTrue(ve.Message.Contains("LastName") && ve.Message.Contains("bad"));
      Assert.IsTrue(ve.Context.Entity == emp);
      Assert.IsTrue(ve.Validator == vr);
      Assert.IsTrue(ve.Key != null);
    }

    [TestMethod]
    public async Task ChangeMessageResourceType() {
      var em1 = await TestFns.NewEm(_serviceName);

      var emp = new Employee();
      var vr = new RequiredValidator().WithMessage(typeof(Model_Northwind_NetClient.CustomMessages1));
      var dp = emp.EntityAspect.EntityType.GetDataProperty("LastName");
      var vc = new ValidationContext(emp, dp, null);
      var ve = vr.Validate(vc);
      Assert.IsTrue(ve != null);
      Assert.IsTrue(ve.Message.Contains("LastName") && ve.Message.Contains("required") && ve.Message.Contains("CUSTOM 1"));
      Assert.IsTrue(ve.Context.Entity == emp);
      Assert.IsTrue(ve.Validator == vr);
      Assert.IsTrue(ve.Key != null);
    }

    [TestMethod]
    public async Task ChangeMessageBaseAndAssembly() {
      var em1 = await TestFns.NewEm(_serviceName);

      var emp = new Employee();
      var vr = new RequiredValidator().WithMessage("Model_Northwind_NetClient.CustomMessages2", typeof(Employee).Assembly);
      var dp = emp.EntityAspect.EntityType.GetDataProperty("LastName");
      var vc = new ValidationContext(emp, dp, null);
      var ve = vr.Validate(vc);
      Assert.IsTrue(ve != null);
      Assert.IsTrue(ve.Message.Contains("LastName") && ve.Message.Contains("required") && ve.Message.Contains("CUSTOM 2"));
      Assert.IsTrue(ve.Context.Entity == emp);
      Assert.IsTrue(ve.Validator == vr);
      Assert.IsTrue(ve.Key != null);
    }

    [TestMethod]
    public async Task CustomPropertyValidator() {
      var em1 = await TestFns.NewEm(_serviceName);

      var custType = MetadataStore.Instance.GetEntityType(typeof(Customer));
      var countryProp = custType.GetDataProperty("Country");
      try {
        countryProp.Validators.Add(new CountryIsUsValidator());
        var cust = new Customer();
        var valErrors = cust.EntityAspect.ValidationErrors;
        Assert.IsTrue(valErrors.Count == 0);
        cust.CompanyName = "Test";
        cust.Country = "Germany";
        em1.AttachEntity(cust);
        Assert.IsTrue(valErrors.Count == 1);
        Assert.IsTrue(valErrors.First().Message.Contains("must start with"));
      } finally {
        countryProp.Validators.Remove(new CountryIsUsValidator());
      }
    }

    public class CountryIsUsValidator : Validator {
      public CountryIsUsValidator()
        : base() {
        LocalizedMessage = new LocalizedMessage("{0} must start with the 'US', '{1}' is not valid ");
      }

      protected override bool ValidateCore(ValidationContext context) {
        var value = (String)context.PropertyValue;
        if (value == null) return true;
        return value.StartsWith("US");
      }

      public override string GetErrorMessage(ValidationContext validationContext) {
        return LocalizedMessage.Format(validationContext.Property.DisplayName, validationContext.PropertyValue);
      }
    }

    
    //test("custom entity validation - register validator", function () {
    //    var ms = MetadataStore.importMetadata(testFns.metadataStore.exportMetadata());
    //    var em = TestFns.NewEm(ms);
    //    var custType = ms.getEntityType("Customer");

    //    var zipCodeValidatorFactory = createZipCodeValidatorFactory();
    //    var zipCodeValidator = zipCodeValidatorFactory();
    //    custType.validators.push(zipCodeValidator);

    //    var msSerialized = em.metadataStore.exportMetadata();

    //    Validator.register(zipCodeValidator);
    //    var newMetadata = MetadataStore.importMetadata(msSerialized);
    //    var em2 = TestFns.NewEm(newMetadata);
    //    var custType2 = newMetadata.getEntityType("Customer");
    //    var cust1 = custType2.createEntity();
    //    cust1.setProperty("companyName", "Test1Co");
    //    cust1.setProperty("country", "GER");
    //    em2.attachEntity(cust1);
    //    ok(!cust1.entityAspect.hasValidationErrors, "should not have val errors");
    //    var valErrors = cust1.entityAspect.getValidationErrors();
    //    ok(valErrors.length === 0, "length should be 0");
    //    cust1.setProperty("country", "USA");
    //    valErrors = cust1.entityAspect.getValidationErrors();
    //    ok(!cust1.entityAspect.hasValidationErrors, "should not have val errors 2");
    //    ok(valErrors.length === 0, "length should be 0");
    //    var isOk = cust1.entityAspect.validateEntity();
    //    ok(!isOk, "validateEntity should have returned false");
    //    ok(cust1.entityAspect.hasValidationErrors, "should now have val errors");
    //    valErrors = cust1.entityAspect.getValidationErrors();
    //    ok(valErrors.length === 1, "length should be 0");
    //});
    

  }
}
