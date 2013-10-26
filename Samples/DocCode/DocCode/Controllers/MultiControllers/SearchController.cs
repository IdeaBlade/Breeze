using System;
using System.Data.Entity;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi2;
using Northwind.Models;

namespace DocCode.Controllers.MultiControllers
{
    /// <summary>
    /// Action controller dedicated to searches of various entity types
    /// by a single string parameter which the server matches against a variety of types.
    /// </summary>
    /// <remarks>
    /// The methods returning IQueryable can be further constrained
    /// </remarks>
    [BreezeController]
    public class SearchController : MultiBaseController
    {
        //GET ~/multi/search/customers/        // all orders
        //GET ~/multi/search/customers/alf     // company name
        //GET ~/multi/search/orders/alf/?$filter=OrderDate le datetime'1997-12-31'
        //GET ~/multi/search/customers/germany // country
        [HttpGet]
        public IQueryable<Customer> Customers(string searchText) {
            return (string.IsNullOrWhiteSpace(searchText)) ?
                Repository.Customers :
                Repository.Customers.Where(c => 
                    c.CompanyName.Contains(searchText) ||
                    c.ContactName.Contains(searchText) ||
                    c.ContactTitle.Contains(searchText)||
                    c.Address.Contains(searchText)||
                    c.City.Contains(searchText) ||
                    c.Country.StartsWith(searchText));
        }

        //GET ~/multi/search/orders/alf
        //GET ~/multi/search/orders/germany
        //GET ~/multi/search/orders/nancy
        [HttpGet]
        public IQueryable<Order> Orders(string searchText)
        {
            if (string.IsNullOrWhiteSpace(searchText))
            {
                throw new InvalidOperationException("must provide some search value");
            }
            return Repository.Orders
                .Where(o =>
                    o.ShipName.Contains(searchText) ||
                    o.ShipAddress.Contains(searchText) ||
                    o.ShipCity.Contains(searchText) ||
                    o.ShipCountry.StartsWith(searchText) ||
                    o.Customer.CompanyName.Contains(searchText) ||
                    o.Employee.FirstName.Contains(searchText) ||
                    o.Employee.LastName.Contains(searchText))
                .Include("OrderDetails");
        }

        //GET ~/multi/search/employees/nancy
        //GET ~/multi/search/employees/Seattle
        [HttpGet]
        public IQueryable<Employee> Employees(string searchText)
        {
            return (string.IsNullOrWhiteSpace(searchText)) ?
                Repository.Employees :
                Repository.Employees.Where(e =>
                    e.FirstName.Contains(searchText) ||
                    e.LastName.Contains(searchText) ||
                    e.Address.Contains(searchText)||
                    e.City.Contains(searchText) ||
                    e.Country.StartsWith(searchText));
        }

        //GET ~/multi/search/products/          // all products
        //GET ~/multi/search/products/chai      // product name
        //GET ~/multi/search/products/beverages // category
        //GET ~/multi/search/products/exotic    // supplier
        [HttpGet]
        public IQueryable<Product> Products(string searchText)
        {
            return (string.IsNullOrWhiteSpace(searchText)) ?
                Repository.Products :
                Repository.Products.Where(p =>
                    p.ProductName.Contains(searchText) ||
                    p.Category.CategoryName.Contains(searchText) ||
                    p.Supplier.CompanyName.Contains(searchText));
        }

    }
}