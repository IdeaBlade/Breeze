using System;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi2;
using Northwind.Models;

namespace DocCode.Controllers.MultiControllers
{
    /// <summary>
    /// Customers controller of the controller-per-type variety.
    /// </summary>
    [BreezeController]
    public class CustomersController : MultiBaseController
    {
        //GET ~/multi/customers
        [HttpGet]
        public IQueryable<Customer> Customers() { // doesn't matter what you call it
            return Repository.Customers;
        }

        //GET ~/multi/customers/5f1d825c-61d5-4ed8-8ad5-d0c547897dd3
        [HttpGet]
        public Customer Customer(Guid id) // doesn't matter what you call it
        {
            return Repository.Customers.FirstOrDefault(c => c.CustomerID == id);
        }
    }
}