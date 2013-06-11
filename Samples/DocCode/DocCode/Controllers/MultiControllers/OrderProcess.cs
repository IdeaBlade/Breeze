using System;
using System.Data.Entity;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Northwind.Models;

namespace DocCode.Controllers.MultiControllers
{
    /// <summary>
    /// Controller dedicated to the Order Processing application feature
    /// </summary>
    /// <remarks>
    /// Provides actions API for several types involved in order processing
    /// </remarks>
    [BreezeController]
    public class OrderProcessController : MultiBaseController
    {
        //GET ~/multi/orderprocess/customers
        [HttpGet]
        public IQueryable<Customer> Customers() {
            return Repository.Customers;
        }
        //GET ~/multi/orderprocess/customer/5f1d825c-61d5-4ed8-8ad5-d0c547897dd3
        [HttpGet]
        public Customer Customer(Guid id)
        {
            return Repository.Customers.FirstOrDefault(c => c.CustomerID == id);
        }

        //GET ~/multi/orderprocess/orders
        [HttpGet]
        public IQueryable<Order> Orders()
        {
            return Repository.Orders.Include("OrderDetails");
        }
        [HttpGet]
        //GET ~/multi/orderprocess/order/10248
        public Order Order(int id)
        {
            return Repository.Orders
                .Include("OrderDetails")
                .FirstOrDefault(o => o.OrderID == id);
        }

        //GET ~/multi/orderprocess/products
        [HttpGet]
        public IQueryable<Product> Products()
        {
            return Repository.Products;
        }
        //GET ~/multi/orderprocess/product/1
        [HttpGet]
        public Product Product(int id)
        {
            return Repository.Products.FirstOrDefault(p => p.ProductID == id);
        }

        //GET ~/multi/orderprocess/employees
        [HttpGet]
        public IQueryable<Employee> SalesReps()
        {
            return Repository.Employees;
        }
        //GET ~/multi/orderprocess/salesrep/1
        [HttpGet]
        public Employee SalesRep(int id)
        {
            return Repository.Employees.FirstOrDefault(e => e.EmployeeID == id);
        }
    }
}