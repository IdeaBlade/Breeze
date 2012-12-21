using System;
using System.Data.Entity;
using System.Linq;
using System.Web.Http;

using Breeze.WebApi;
using DocCode.Models;

using Newtonsoft.Json.Linq;

namespace DocCode.Controllers
{
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
    public IQueryable<Order> OrdersForProduct(int productID = 0)
    {
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
    public IQueryable<Order> OrdersAndDetails()
    {
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

    // Demonstrate a "View Entity" a selection of "safe" entity properties
    // UserPartial is not in Metadata and won't be client cached unless
    // you define metadata for it on the Breeze client
    [HttpGet]
    public IQueryable<UserPartial> Users()
    {
        // Todo: move this logic into a custom EFContextProvider
        return _contextProvider.Context.Users
            .Select(user => new UserPartial
                {
                    Id = user.Id,
                    UserName = user.UserName,
                    FirstName = user.FirstName,
                    LastName = user.LastName
                    // Even though this works, sending every user's roles seems unwise
                    // Roles = user.UserRoles.Select(ur => ur.Role)
                });
    }
    // Useful when need ONE user and its roles
    // Could further restrict to the authenticated user
    [HttpGet]
    public UserPartial GetUserById(int id)
    {
        // Todo: move this logic into a custom EFContextProvider
        return _contextProvider.Context.Users
            .Where(user => user.Id == id)
            .Select(user => new 
            {
                user.Id,
                user.UserName,
                user.FirstName,
                user.LastName,
                user.Email,
                user.UserRoles,
                Roles = user.UserRoles.Select(ur => ur.Role),
            })
            .ToList()
            .Select(user => new UserPartial
            {
                Id = user.Id,
                UserName = user.UserName,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                UserRoles = user.UserRoles,
                RoleNames = string.Join(",", user.Roles.Select(role => role.Name))
            })
            .FirstOrDefault();
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
    public object LookupsArray()
    {
        var regions = _contextProvider.Context.Regions;
        var territories = _contextProvider.Context.Territories;
        var categories = _contextProvider.Context.Categories;

        var lookups = new object[] {regions, territories, categories};
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
    public object Lookups()
    {
        var regions = _contextProvider.Context.Regions;
        var territories = _contextProvider.Context.Territories;
        var categories = _contextProvider.Context.Categories;

        var lookups = new {regions, territories, categories};
        return lookups;
    }
  }

}