using System;
using System.Linq;
using System.Web.Http;

using Breeze.WebApi;
using Breeze.WebApi.EF;
using Breeze.Learn.Models;

using Newtonsoft.Json.Linq;

namespace Breeze.Learn.Controllers {
  [BreezeController]
  public class NorthwindController : ApiController {

    readonly EFContextProvider<NorthwindContext> ContextProvider =
        new EFContextProvider<NorthwindContext>();

    [AcceptVerbs("GET")]
    public String Metadata() {
      return ContextProvider.Metadata();
    }

    [AcceptVerbs("POST")]
    public SaveResult SaveChanges(JObject saveBundle) {
      return ContextProvider.SaveChanges(saveBundle);
    }

    [AcceptVerbs("GET")]
    public IQueryable<Customer> Customers() {
      return ContextProvider.Context.Customers;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Customer> CustomersAndOrders() {
      var custs = ContextProvider.Context.Customers.Include("Orders");
      return custs;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Customer> CustomersStartingWithA() {
      var custs = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith("A"));
      return custs;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Order> Orders() {
      return ContextProvider.Context.Orders;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Order> OrdersAndCustomers() {
      var orders = ContextProvider.Context.Orders.Include("Customer");
      return orders;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Order> OrdersAndDetails() {
      var orders = ContextProvider.Context.Orders
          .Include("OrderDetails");
      // should guard against pulling too much data by adding .Take(10)
      return orders;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Employee> Employees() {
      return ContextProvider.Context.Employees;
    }

    [AcceptVerbs("GET")]
    public IQueryable<OrderDetail> OrderDetails() {
      return ContextProvider.Context.OrderDetails;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Product> Products() {
      return ContextProvider.Context.Products;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Category> Categories() {
      return ContextProvider.Context.Categories;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Region> Regions() {
      return ContextProvider.Context.Regions;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Territory> Territories() {
      return ContextProvider.Context.Territories;
    }
  }

}