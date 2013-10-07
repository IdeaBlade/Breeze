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