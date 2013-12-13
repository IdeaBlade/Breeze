using Breeze.WebApi;
using Breeze.WebApi.NH;
using Models.NorthwindIB.NH;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;


namespace NorthBreeze.Controllers
{
    [BreezeNHController]
    public class NorthBreezeController : ApiController
    {
        private NorthwindContext northwind;

        protected override void Initialize(System.Web.Http.Controllers.HttpControllerContext controllerContext)
        {
            base.Initialize(controllerContext);
            northwind = new NorthwindContext();
        }


        [HttpGet]
        public String Metadata()
        {
            return northwind.Metadata();
        }

        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return northwind.SaveChanges(saveBundle);
            //var sqlContext = new NorthwindSqlContext();
            //return sqlContext.SaveChanges(saveBundle);
        }

        /// <summary>
        /// Query customers using NorthwindSqlContext.
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public IQueryable<Customer> SqlCustomers()
        {
            using (var sqlContext = new NorthwindSqlContext())
            {
                var custs = sqlContext.Customers();
                return custs.AsQueryable();
            }

        }

        [HttpGet]
        public IQueryable<Customer> SimilarCustomersGET([FromUri] Customer customer)
        {
            var list = new List<Customer> { customer };
            return list.AsQueryable();
        }

        [HttpPost]
        public IQueryable<Customer> SimilarCustomersPOST(Customer customer)
        {
            var list = new List<Customer> { customer };
            return list.AsQueryable();
        }

        [HttpGet]
        public IQueryable<Customer> Customers()
        {
            var custs = northwind.Customers;
            return custs;
        }

        [HttpGet]
        public IQueryable<Order> Orders()
        {
            var orders = northwind.Orders;
            return orders;
        }

        [HttpGet]
        public IQueryable<Order> OrdersTimes100()
        {
            // for testing really big payloads
            var orders = northwind.Orders.ToList();
            var list = new List<Order>(orders.Count * 100);
            for (int i = 0; i < 2; i++)
            {
                foreach(var order in orders)
                {
                    list.Add(CloneOrder(order, i));
                }
            }
            
            return list.AsQueryable<Order>();
        }

        private Order CloneOrder(Order order, int i)
        {
            var str = ("00" + i);
            str = str.Substring(str.Length - 2);
            var clone = new Order();
            clone.OrderID = order.OrderID * 100 + i;
            clone.CustomerID = order.CustomerID;
            clone.EmployeeID = order.EmployeeID;
            clone.Freight = order.Freight;
            clone.OrderDate = order.OrderDate;
            clone.RequiredDate = order.RequiredDate;
            clone.RowVersion = order.RowVersion;
            clone.ShipAddress = order.ShipAddress + str;
            clone.ShipCity = order.ShipCity + str;
            clone.ShipCountry = order.ShipCountry + str;
            clone.ShipName = order.ShipName + str;
            clone.ShippedDate = order.ShippedDate;
            clone.ShipPostalCode = order.ShipPostalCode + str;
            clone.ShipRegion = order.ShipRegion + str;
            return clone;
        }

        [HttpGet]
        public IQueryable<Employee> Employees()
        {
            return northwind.Employees;
        }

        [HttpGet]
        public IQueryable<Product> Products()
        {
            return northwind.Products;
        }

        [HttpGet]
        public IQueryable<Supplier> Suppliers()
        {
            return northwind.Suppliers;
        }

        [HttpGet]
        public IQueryable<Region> Regions()
        {
            return northwind.Regions;
        }

        [HttpGet]
        public IQueryable<Territory> Territories()
        {
            return northwind.Territories;
        }

        [HttpGet]
        public IQueryable<Category> Categories()
        {
            return northwind.Categories;
        }

        [HttpGet]
        public IQueryable<Role> Roles()
        {
            return northwind.Roles;
        }

        [HttpGet]
        public IQueryable<User> Users()
        {
            return northwind.Users;
        }

   }
}