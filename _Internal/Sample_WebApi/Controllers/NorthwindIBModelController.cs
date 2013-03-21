// Only one of the next 3 should be uncommented.
//#define CODEFIRST_PROVIDER 
//#define DATABASEFIRST_OLD
#define DATABASEFIRST_NEW
#define CLASS_ACTIONFILTER

using System;
using System.Net;
using System.Linq;
using System.Web.Http;
using System.Web.Http.OData;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using System.Web.Http.OData.Query;
using System.Collections.Generic;

#if CODEFIRST_PROVIDER
using Models.NorthwindIB.CF;
using Foo;
using System.ComponentModel.DataAnnotations;
#elif DATABASEFIRST_OLD
using Models.NorthwindIB.EDMX;
#elif DATABASEFIRST_NEW
using Models.NorthwindIB.EDMX_2012;
using System.Net.Http;
using System.Net.Http.Headers;
#endif

namespace Sample_WebApi.Controllers {


#if CODEFIRST_PROVIDER
  public class NorthwindContextProvider: EFContextProvider<NorthwindIBContext_CF>  {
    public NorthwindContextProvider() : base() { }
#elif DATABASEFIRST_OLD
  public class NorthwindContextProvider: EFContextProvider<NorthwindIBContext_EDMX>  {
    public NorthwindContextProvider() : base() { }
#elif DATABASEFIRST_NEW
  public class NorthwindContextProvider : EFContextProvider<NorthwindIBContext_EDMX_2012> {
    public NorthwindContextProvider() : base() { }
#endif


    protected override bool BeforeSaveEntity(EntityInfo entityInfo) {
      // prohibit any additions of entities of type 'Region'
      if (entityInfo.Entity.GetType() == typeof(Region) && entityInfo.EntityState == EntityState.Added) {
        var region = entityInfo.Entity as Region;
        return !region.RegionDescription.ToLowerInvariant().StartsWith("error");
        
        
      } else {
        if ((SaveOptions.Tag as String) == "freight update") {
          var order = entityInfo.Entity as Order;
          order.Freight = order.Freight + 1;
        } else if ((SaveOptions.Tag as String) == "freight update-ov") {
          var order = entityInfo.Entity as Order;
          order.Freight = order.Freight + 1;
          entityInfo.OriginalValuesMap["Freight"] = null;
        } else if ((SaveOptions.Tag as String) == "freight update-force") {
          var order = entityInfo.Entity as Order;
          order.Freight = order.Freight + 1;
          entityInfo.ForceUpdate = true;
        }
        return true;
      }
    }

    protected override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {
      return saveMap;
    }

  }

#if CLASS_ACTIONFILTER

  [BreezeController]
  public class NorthwindIBModelController : ApiController {

    NorthwindContextProvider ContextProvider = new NorthwindContextProvider();


    //[HttpGet]
    //public String Metadata() {
    //  return ContextProvider.Metadata();
    //}

    [HttpGet]
    public HttpResponseMessage Metadata() {
      return ContextProvider.MetadataAsJson();
    }

    [HttpPost]
    public SaveResult SaveChanges(JObject saveBundle) {
      var saveOptions = Breeze.WebApi.ContextProvider.ExtractSaveOptions(saveBundle);
      var tag = saveOptions.Tag as String;
      if (tag == "exit") {
        return new SaveResult() { Entities = new List<Object>(), KeyMappings = new List<KeyMapping>() };
      } else {
        return ContextProvider.SaveChanges(saveBundle);
      }
    }

    #region standard queries

    [HttpGet]
    // [BreezeQueryable]
    public IQueryable<Customer> Customers() {
      var custs = ContextProvider.Context.Customers;
      return custs;
    }

    [HttpGet]
    public IQueryable<Customer> CustomersStartingWith(string companyName) {
      var custs = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith(companyName));
      return custs;
    }



    [HttpGet]
    public Customer CustomerWithScalarResult() {
      return ContextProvider.Context.Customers.First();
    }

    [HttpGet]
    public IQueryable<Customer> CustomersWithHttpError() {
      throw new HttpResponseException(HttpStatusCode.NotFound);
    }

    [HttpGet]
    public IQueryable<Order> Orders() {
      var orders = ContextProvider.Context.Orders;
      return orders;
    }

    [HttpGet]
    public IQueryable<Employee> Employees() {
      return ContextProvider.Context.Employees;
    }

    [HttpGet]
    public IQueryable<Employee> EmployeesFilteredByCountryAndBirthdate(DateTime birthDate, string country) {
      return ContextProvider.Context.Employees.Where(emp => emp.BirthDate >= birthDate && emp.Country == country);
    }

    [HttpGet]
    public IQueryable<OrderDetail> OrderDetails() {
      return ContextProvider.Context.OrderDetails;
    }

    [HttpGet]
    public IQueryable<Product> Products() {
      return ContextProvider.Context.Products;
    }

    [HttpGet]
    public IQueryable<Supplier> Suppliers() {
      return ContextProvider.Context.Suppliers;
    }


    [HttpGet]
    public IQueryable<Region> Regions() {
      return ContextProvider.Context.Regions;
    }


    [HttpGet]
    public IQueryable<Territory> Territories() {
      return ContextProvider.Context.Territories;
    }

    [HttpGet]
    public IQueryable<Category> Categories() {
      return ContextProvider.Context.Categories;
    }

    [HttpGet]
    public IQueryable<Role> Roles() {
      return ContextProvider.Context.Roles;
    }


    [HttpGet]
    public IQueryable<TimeLimit> TimeLimits() {
      return ContextProvider.Context.TimeLimits;
    }

    #endregion

    #region named queries

    [HttpGet]
    public IQueryable<Object> CompanyNames() {
      var stuff = ContextProvider.Context.Customers.Select(c => c.CompanyName);
      return stuff;
    }

    [HttpGet]
    public IQueryable<Object> CompanyNamesAndIds() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID });
      return stuff;
    }

    [HttpGet]
    public IQueryable<Object> CustomersWithBigOrders() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { Customer = c, BigOrders = c.Orders.Where(o => o.Freight > 100) });
      return stuff;
    }



    [HttpGet]
    public IQueryable<Object> CompanyInfoAndOrders() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID, c.Orders });
      return stuff;
    }

    [HttpGet]
    public Object CustomersAndProducts() {
      var stuff = new {Customers = ContextProvider.Context.Customers.ToList(), Products = ContextProvider.Context.Products.ToList()};
      return stuff;
    }

    [HttpGet]
    public IQueryable<Object> TypeEnvelopes() {
      var stuff = this.GetType().Assembly.GetTypes()
        .Select(t => new { t.Assembly.FullName, t.Name, t.Namespace })
        .AsQueryable();
      return stuff;
    }


    [HttpGet]
    public IQueryable<Customer> CustomersAndOrders() {
      var custs = ContextProvider.Context.Customers.Include("Orders");
      return custs;
    }

    [HttpGet]
    public IQueryable<Order> OrdersAndCustomers() {
      var orders = ContextProvider.Context.Orders.Include("Customer");
      return orders;
    }


    [HttpGet]
    public IQueryable<Customer> CustomersStartingWithA() {
      var custs = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith("A"));
      return custs;
    }


    #endregion
  }

#else
  
  [JsonFormatter]
  public class NorthwindIBModelController : ApiController {
  
    NorthwindContextProvider ContextProvider = new NorthwindContextProvider();


    [HttpGet]
    public String Metadata() {
      return ContextProvider.Metadata();
    }

    [HttpPost]
    public SaveResult SaveChanges(JObject saveBundle) {
      var saveOptions = Breeze.WebApi.ContextProvider.ExtractSaveOptions(saveBundle);
      var tag = saveOptions.Tag as String;
      if (tag == "exit") {
        return new SaveResult() { Entities = new List<Object>(), KeyMappings = new List<KeyMapping>() };
      } else {
        return ContextProvider.SaveChanges(saveBundle);
      }
    }

    #region standard queries

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Customer> Customers() {
      var custs = ContextProvider.Context.Customers;
      return custs;
    }

    [HttpGet]
    public IQueryable<Customer> Customers2(ODataQueryOptions oDataQueryOptions) {
      var custs = ContextProvider.Context.Customers;
      var applied = oDataQueryOptions.ApplyTo(custs);
      return (IQueryable<Customer>) applied;
    }


    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Customer> CustomersStartingWith(string companyName) {
      var custs = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith(companyName));
      return custs;
    }

    [HttpGet]
    // [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public Customer CustomerWithScalarResult() {
      return ContextProvider.Context.Customers.First();
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Customer> CustomersWithHttpError() {
      throw new HttpResponseException(HttpStatusCode.NotFound);
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Order> Orders() {
      var orders = ContextProvider.Context.Orders;
      return orders;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Employee> Employees() {
      return ContextProvider.Context.Employees;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Employee> EmployeesFilteredByCountryAndBirthdate(DateTime birthDate, string country) {
      return ContextProvider.Context.Employees.Where(emp => emp.BirthDate >= birthDate && emp.Country == country);
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<OrderDetail> OrderDetails() {
      return ContextProvider.Context.OrderDetails;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Product> Products() {
      return ContextProvider.Context.Products;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Supplier> Suppliers() {
      return ContextProvider.Context.Suppliers;
    }


    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Region> Regions() {
      return ContextProvider.Context.Regions;
    }


    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Territory> Territories() {
      return ContextProvider.Context.Territories;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Category> Categories() {
      return ContextProvider.Context.Categories;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Role> Roles() {
      return ContextProvider.Context.Roles;
    }

#if ! DATABASEFIRST_OLD
    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<TimeLimit> TimeLimits() {
      return ContextProvider.Context.TimeLimits;
    }
#endif
    #endregion

    #region named queries

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Object> CompanyNames() {
      var stuff = ContextProvider.Context.Customers.Select(c => c.CompanyName);
      return stuff;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Object> CompanyNamesAndIds() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID });
      return stuff;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Object> CustomersWithBigOrders() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { Customer = c, BigOrders = c.Orders.Where(o => o.Freight > 100) });
      return stuff;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Object> CompanyInfoAndOrders() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID, c.Orders });
      return stuff;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Object> TypeEnvelopes() {
      var stuff = this.GetType().Assembly.GetTypes()
                      .Select(t => new {t.Assembly.FullName, t.Name, t.Namespace}).ToList();

      return stuff.AsQueryable();
    }
    
    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Customer> CustomersAndOrders() {
      var custs = ContextProvider.Context.Customers.Include("Orders");
      return custs;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Order> OrdersAndCustomers() {
      var orders = ContextProvider.Context.Orders.Include("Customer");
      return orders;
    }
    
    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Customer> CustomersStartingWithA() {
      var custs = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith("A"));
      return custs;
    }


    #endregion
  }

#endif  

}