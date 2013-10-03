using System;
using System.Linq;
using System.Web.Http;

using Breeze.WebApi;
using Breeze.WebApi.EF;
using GridExample.Models;

using Newtonsoft.Json.Linq;

namespace GridExample.Controllers {

  [BreezeController]
  public class NorthwindController : ApiController {

    readonly EFContextProvider<NorthwindContext> _contextProvider =
        new EFContextProvider<NorthwindContext>();

    [HttpGet]
    public String Metadata() {
      return _contextProvider.Metadata();
    }

    [HttpPost]
    public SaveResult SaveChanges(JObject saveBundle) {
      return _contextProvider.SaveChanges(saveBundle);
    }

    [HttpGet]
    public IQueryable<Customer> Customers() {
      return _contextProvider.Context.Customers;
    }

    [HttpGet]
    public IQueryable<Customer> CustomersAndOrders() {
      var custs = _contextProvider.Context.Customers.Include("Orders");
      return custs;
    }
    [HttpGet]
    public IQueryable<Order> OrdersForProduct(int productID = 0) {
      System.Data.Entity.Infrastructure.DbQuery<Order> query = _contextProvider.Context.Orders;
      query = query.Include("Customer").Include("OrderDetails");
      return (productID == 0)
                 ? query
                 : query.Where(o => o.OrderDetails.Any(od => od.ProductID == productID));
    }
    [HttpGet]
    public IQueryable<Customer> CustomersStartingWithA() {
      var custs = _contextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith("A"));
      return custs;
    }

    [HttpGet]
    public IQueryable<Order> Orders() {
      return _contextProvider.Context.Orders;
    }

    [HttpGet]
    public IQueryable<Order> OrdersAndCustomers() {
      var orders = _contextProvider.Context.Orders.Include("Customer");
      return orders;
    }

    [HttpGet]
    public IQueryable<Order> OrdersAndDetails() {
      var orders = _contextProvider.Context.Orders
          .Include("OrderDetails");
      // should guard against pulling too much data by adding .Take(10)
      return orders;
    }

    [HttpGet]
    public IQueryable<Employee> Employees() {
      return _contextProvider.Context.Employees;
    }

    [HttpGet]
    public IQueryable<OrderDetail> OrderDetails() {
      return _contextProvider.Context.OrderDetails;
    }

    [HttpGet]
    public IQueryable<Product> Products() {
      return _contextProvider.Context.Products;
    }

    [HttpGet]
    public IQueryable<Region> Regions() {
      return _contextProvider.Context.Regions;
    }

    [HttpGet]
    public IQueryable<Territory> Territories() {
      return _contextProvider.Context.Territories;
    }



    /*********************************************************
     * Lookups: Two ways of sending a bag of diverse entities;
     *          no obvious advantage to one vs. the other
     ********************************************************/
    /// <summary>
    /// Query returing an array of the entity lists:
    /// Regions, Territories, and Categories.
    /// </summary>
    /// <returns>
    /// Returns an array, not an IQueryable. 
    /// Each array element is a different entity list.
    /// Note that the list elements arrive on the client
    /// as objects, not arrays, with properties
    /// such as '0', '1', '2' ... 
    /// See the DocCode:QueryTests (Projections) module.
    /// </returns>
    /// <remarks>
    /// N.B. Category is only available through lookup;
    /// it doesn't have its own query method.
    /// </remarks>
    [HttpGet]
    public object LookupsArray() {
      var regions = _contextProvider.Context.Regions;
      var territories = _contextProvider.Context.Territories;
      var categories = _contextProvider.Context.Categories;

      var lookups = new object[] { regions, territories, categories };
      return lookups;
    }
    /// <summary>
    /// Query returing a 1-element array with a lookups object whose 
    /// properties are all Regions, Territories, and Categories.
    /// </summary>
    /// <returns>
    /// Returns one object, not an IQueryable, 
    /// whose properties are "region", "territory", "category".
    /// The items arrive as arrays.
    /// </returns>
    /// <remarks>
    /// N.B. Category is only available through lookup;
    /// it doesn't have its own query method.
    /// </remarks>
    [HttpGet]
    public object Lookups() {
      var regions = _contextProvider.Context.Regions;
      var territories = _contextProvider.Context.Territories;
      var categories = _contextProvider.Context.Categories;

      var lookups = new { regions, territories, categories };
      return lookups;
    }
  }

}