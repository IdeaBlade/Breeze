//#define DBCONTEXT_PROVIDER 
// 
using System;
using System.Data;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;

using System.Collections.Generic;

#if DBCONTEXT_PROVIDER
using Models.NorthwindIB.CF;
#else
using Models.NorthwindIB.EDMX;
#endif


namespace Sample_WebApi.Controllers {

#if DBCONTEXT_PROVIDER
  public class NorthwindContextProvider: EFContextProvider<NorthwindIBContext_CF>  {
    public NorthwindContextProvider() : base() { }
#else 
  public class NorthwindContextProvider: EFContextProvider<NorthwindIBContext_EDMX>  {
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