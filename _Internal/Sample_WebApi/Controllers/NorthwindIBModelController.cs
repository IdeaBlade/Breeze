// Only one of the next 3 should be uncommented.
#define CODEFIRST_PROVIDER 
// #define DATABASEFIRST_OLD
// #define DATABASEFIRST_NEW

using System;
using System.Net;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;

using System.Collections.Generic;

#if CODEFIRST_PROVIDER
using Models.NorthwindIB.CF;
#elif DATABASEFIRST_OLD
using Models.NorthwindIB.EDMX;
#elif DATABASEFIRST_NEW
using Models.NorthwindIB.EDMX_2012;
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


    public override bool BeforeSaveEntity(EntityInfo entityInfo) {
      // prohibit any additions of entities of type 'Role'
      if (entityInfo.Entity.GetType() == typeof(Role) && entityInfo.EntityState == EntityState.Added) {
        return false;
      } else {
        return true;
      }
    }

    public override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {
      return saveMap;
    }
      
  }

  public class NorthwindIBModelController : ApiController {


    NorthwindContextProvider ContextProvider = new NorthwindContextProvider();


    [AcceptVerbs("GET")]
    public String Metadata() {
      return ContextProvider.Metadata();
    }

    [AcceptVerbs("POST")]
    public SaveResult SaveChanges(JObject saveBundle) {
      return ContextProvider.SaveChanges(saveBundle);
    }

    #region standard queries

    [AcceptVerbs("GET")]
    public Customer  CustomerWithScalarResult() {
      return ContextProvider.Context.Customers.First();
    }

    [AcceptVerbs("GET")]
    public IQueryable<Customer> CustomersWithHttpError() {
      throw new HttpResponseException(HttpStatusCode.NotFound);
    }

    //[AcceptVerbs("GET")]
    //public IQueryable<Customer> CustomersWithHttpErrorResponse() {
    //  Not sure where to find CreateErrorResponse
    //  Request.CreateErrorResponse(HttpStatusCode.NotFound, "Couldn't find the resource");
    //}

    [AcceptVerbs("GET")]
    public IQueryable<Customer> Customers() {
      var custs = ContextProvider.Context.Customers;
      return custs;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Order> Orders() {
      var orders = ContextProvider.Context.Orders;
      return orders;
    }
    
    [AcceptVerbs("GET")]
    public IQueryable<Employee> Employees() {
      return ContextProvider.Context.Employees;
    }

    // [Queryable]
    [AcceptVerbs("GET")]
    public IQueryable<OrderDetail> OrderDetails() {
      return ContextProvider.Context.OrderDetails;
    }

    // [Queryable]
    [AcceptVerbs("GET")]
    public IQueryable<Product> Products() {
      return ContextProvider.Context.Products;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Region> Regions() {
      return ContextProvider.Context.Regions;
    }

    
    [AcceptVerbs("GET")]
    public IQueryable<Territory> Territories() {
      return ContextProvider.Context.Territories;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Category> Categories() {
      return ContextProvider.Context.Categories;
    }
    #endregion

    #region named queries

    [AcceptVerbs("GET")]
    public IQueryable<Object> CompanyNames() {
      var stuff = ContextProvider.Context.Customers.Select(c => c.CompanyName);
      return stuff;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Object> CompanyNamesAndIds() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID });
      return stuff;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Object> CompanyInfoAndOrders() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID, c.Orders });
      return stuff;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Object> TypeEnvelopes() {
      var stuff =this.GetType().Assembly.GetTypes()
        .Select(t => new {t.Assembly.FullName, t.Name, t.Namespace})
        .AsQueryable();
      return stuff;
    }


    [AcceptVerbs("GET")]
    public IQueryable<Customer> CustomersAndOrders() {
      var custs = ContextProvider.Context.Customers.Include("Orders");
      return custs;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Order> OrdersAndCustomers() {
      var orders = ContextProvider.Context.Orders.Include("Customer");
      return orders;
    }


    [AcceptVerbs("GET")]
    public IQueryable<Customer> CustomersStartingWithA() {
      var custs = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith("A"));
      return custs;
    }


    #endregion
  }

  

}