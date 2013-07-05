using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Controllers;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using DocCode.DataAccess;
using Northwind.Models;

namespace DocCode.Controllers
{
    [BreezeController]
    public class NorthwindController : ApiController
    {
        private readonly NorthwindRepository _repository;

        public NorthwindController() : this(null){}

        // Todo: inject via an interface rather than "new" the concrete class
        public NorthwindController(NorthwindRepository repository)
        {         
            _repository = repository ?? new NorthwindRepository();
        }

        protected override void Initialize(HttpControllerContext controllerContext)
        {
            base.Initialize(controllerContext);
            _repository.UserSessionId = getUserSessionId();
        }

        // ~/breeze/northwind/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return _repository.Metadata;
        }

        // ~/breeze/northwind/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _repository.SaveChanges(saveBundle);
        }

        [HttpGet]
        public IQueryable<Customer> Customers() {
            return _repository.Customers;
        }

        [HttpGet]
        public IQueryable<Customer> CustomersAndOrders()
        {
            return _repository.CustomersAndOrders;
        }

        [HttpGet]
        [BreezeQueryable]
        public HttpResponseMessage CustomersAsHRM()
        {
            return Request.CreateResponse(HttpStatusCode.OK, _repository.Customers);
        }

        [HttpGet]
        public IQueryable<Order> OrdersForProduct(int productID = 0)
        {
            return _repository.OrdersForProduct(productID);
        }

        [HttpGet]
        public IQueryable<Customer> CustomersStartingWithA()
        {
            return _repository.CustomersStartingWithA;
        }

        // "withParameters" example
        [HttpGet]
        public IQueryable<Customer> CustomersStartingWith(string companyName)
        {
            var custs = _repository.Customers.Where(c => c.CompanyName.StartsWith(companyName));
            return custs;
        }

        [HttpGet]
        public IQueryable<Order> Orders() {
            return _repository.Orders;
        }

        [HttpGet]
        public IQueryable<Order> OrdersAndCustomers() {
            return _repository.OrdersAndCustomers;
        }

        [HttpGet]
        // should guard against pulling too much data with limiting Queryable, e.g.
        //[Queryable(MaxTop = 10)]
        public IQueryable<Order> OrdersAndDetails()
        {
            return _repository.OrdersAndDetails;
        }

        [HttpGet]
        public IQueryable<Employee> Employees() {
            return _repository.Employees;
        }

        [HttpGet]
        public IQueryable<OrderDetail> OrderDetails() {
            return _repository.OrderDetails;
        }

        [HttpGet]
        public IQueryable<Product> Products() {
            return _repository.Products;
        }

        [HttpGet]
        public IQueryable<Region> Regions() {
            return _repository.Regions;
        }

        [HttpGet]
        public IQueryable<Territory> Territories() {
            return _repository.Territories;
        }

        // Demonstrate a "View Entity" a selection of "safe" entity properties
        // UserPartial is not in Metadata and won't be client cached unless
        // you define metadata for it on the Breeze client
        [HttpGet]
        public IQueryable<UserPartial> UserPartials()
        {
            return _repository.UserPartials;
        }

        // Useful when need ONE user and its roles
        // Could further restrict to the authenticated user
        [HttpGet]
        public UserPartial GetUserById(int id)
        {
            return _repository.GetUserById(id);
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
            var regions = _repository.Regions;
            var territories = _repository.Territories;
            var categories = _repository.Categories;

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
        public object Lookups()
        {
            var regions = _repository.Regions;
            var territories = _repository.Territories;
            var categories = _repository.Categories;

            var lookups = new { regions, territories, categories };
            return lookups;
        }

        // ~/breeze/northwind/reset - clears the current user's changes
        // ~/breeze/Northwind/reset/?options=fullreset - clear out all user changes; back to base state.
        [HttpPost]
        public string Reset(string options = "")
        {
            return _repository.Reset(options);
        }

        /// <summary>
        /// Get the UserSessionId from value in the request header
        /// </summary>
        private Guid getUserSessionId()
        {
            try
            {
                var id = Request.Headers.GetValues("X-UserSessionId").First();
                return Guid.Parse(id);
            }
            catch  {
                return Guid.Empty;
            }
        }
    }
}