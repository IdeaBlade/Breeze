using System;
using System.Linq;
using System.Web.Http;

using Breeze.WebApi;
using DocCode.Models;

using Newtonsoft.Json.Linq;

namespace DocCode.Controllers
{
  [JsonFormatter, ODataActionFilter]
  public class NorthwindController : ApiController {

    readonly EFContextProvider<NorthwindContext> _contextProvider =
        new EFContextProvider<NorthwindContext>();

    [AcceptVerbs("GET")]
    public String Metadata() {
      return _contextProvider.Metadata();
    }

    [AcceptVerbs("POST")]
    public SaveResult SaveChanges(JObject saveBundle) {
      return _contextProvider.SaveChanges(saveBundle);
    }

    [AcceptVerbs("GET")]
    public IQueryable<Customer> Customers() {
      return _contextProvider.Context.Customers;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Customer> CustomersAndOrders() {
      var custs = _contextProvider.Context.Customers.Include("Orders");
      return custs;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Customer> CustomersStartingWithA() {
      var custs = _contextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith("A"));
      return custs;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Order> Orders() {
      return _contextProvider.Context.Orders;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Order> OrdersAndCustomers() {
      var orders = _contextProvider.Context.Orders.Include("Customer");
      return orders;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Order> OrdersAndDetails()
    {
        var orders = _contextProvider.Context.Orders
            .Include("OrderDetails");
            // should guard against pulling too much data by adding .Take(10)
        return orders;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Employee> Employees() {
      return _contextProvider.Context.Employees;
    }

    [AcceptVerbs("GET")]
    public IQueryable<OrderDetail> OrderDetails() {
      return _contextProvider.Context.OrderDetails;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Product> Products() {
      return _contextProvider.Context.Products;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Region> Regions() {
      return _contextProvider.Context.Regions;
    }

    [AcceptVerbs("GET")]
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
    /// Each item is a different entity list.
    /// The items arrive as objects, not arrays, with properties
    /// such as '0', '1', '2' ...
    /// </returns>
    /// <remarks>
    /// N.B. Category is only available through lookup;
    /// it doesn't have its own query method.
    /// </remarks>
    [AcceptVerbs("GET")]
    public IQueryable<object> LookupsArray()
    {
        var regions = _contextProvider.Context.Regions;
        var territories = _contextProvider.Context.Territories;
        // NB: Not exposed directly as a GET method
        var categories = _contextProvider.Context.Categories;

        var lookupArray = new object[] {regions, territories, categories};
        return lookupArray.AsQueryable();
    }
    /// <summary>
    /// Query returing a 1-element array with a lookups object whose 
    /// properties are all Regions, Territories, and Categories.
    /// </summary>
    /// <returns>
    /// Returns one object whose properties are
    /// "region", "territory", "category".
    /// The items arrive as arrays.
    /// </returns>
    /// <remarks>
    /// N.B. Category is only available through lookup;
    /// it doesn't have its own query method.
    /// </remarks>
    [AcceptVerbs("GET")]
    public IQueryable<object> LookupsObject()
    {
        var regions = _contextProvider.Context.Regions;
        var territories = _contextProvider.Context.Territories;
        // NB: Not exposed directly as a GET method
        var categories = _contextProvider.Context.Categories;

        var lookupArray = new object [] {new {regions, territories, categories}};
        return lookupArray.AsQueryable();
    }
  }

}