using System;
using System.Linq;
using System.Web.Http;
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
        public NorthwindController()
        {
            // Todo: inject via an interface rather than "new" the concrete class
            _repository = new NorthwindRepository();
        }

        private NorthwindRepository Repository
        {
            get { return PrepareRepository(); }
        }

        // ~/breeze/northwind/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return Repository.Metadata;
        }

        // ~/breeze/northwind/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return Repository.SaveChanges(saveBundle);
        }

        [HttpGet]
        public IQueryable<Customer> Customers() {
            return Repository.Customers;
        }

        [HttpGet]
        public IQueryable<Customer> CustomersAndOrders()
        {
            return Repository.CustomersAndOrders;
        }

        [HttpGet]
        public IQueryable<Order> OrdersForProduct(int productID = 0)
        {
            return Repository.OrdersForProduct(productID);
        }

        [HttpGet]
        public IQueryable<Customer> CustomersStartingWithA()
        {
            return Repository.CustomersStartingWithA;
        }

        [HttpGet]
        public IQueryable<Order> Orders() {
            return Repository.Orders;
        }

        [HttpGet]
        public IQueryable<Order> OrdersAndCustomers() {
            return Repository.OrdersAndCustomers;
        }

        [HttpGet]
        // should guard against pulling too much data with limiting Queryable, e.g.
        //[Queryable(MaxTop = 10)]
        public IQueryable<Order> OrdersAndDetails()
        {
            return Repository.OrdersAndDetails;
        }

        [HttpGet]
        public IQueryable<Employee> Employees() {
            return Repository.Employees;
        }

        [HttpGet]
        public IQueryable<OrderDetail> OrderDetails() {
            return Repository.OrderDetails;
        }

        [HttpGet]
        public IQueryable<Product> Products() {
            return Repository.Products;
        }

        [HttpGet]
        public IQueryable<Region> Regions() {
            return Repository.Regions;
        }

        [HttpGet]
        public IQueryable<Territory> Territories() {
            return Repository.Territories;
        }

        // Demonstrate a "View Entity" a selection of "safe" entity properties
        // UserPartial is not in Metadata and won't be client cached unless
        // you define metadata for it on the Breeze client
        [HttpGet]
        public IQueryable<UserPartial> UserPartials()
        {
            return Repository.UserPartials;
        }

        // Useful when need ONE user and its roles
        // Could further restrict to the authenticated user
        [HttpGet]
        public UserPartial GetUserById(int id)
        {
            return Repository.GetUserById(id);
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
            var regions = Repository.Regions;
            var territories = Repository.Territories;
            var categories = Repository.Categories;

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
            var regions = Repository.Regions;
            var territories = Repository.Territories;
            var categories = Repository.Categories;

            var lookups = new { regions, territories, categories };
            return lookups;
        }

        // ~/breeze/northwind/reset - clears the current user's changes
        // ~/breeze/Northwind/reset/?options=fullreset - clear out all user changes; back to base state.
        [HttpPost]
        public string Reset(string options = "")
        {
            return Repository.Reset(options);
        }


        /// <summary>
        /// Prepare repository for the current request
        /// </summary>
        /// <remarks>
        /// Sets the repo's UserSessionId from value in the request header
        /// </remarks>
        private NorthwindRepository PrepareRepository()
        {
            var userSessionId = Guid.Empty;
            try
            {
                var usi = Request.Headers.GetValues("X-UserSessionId").FirstOrDefault();
                userSessionId = Guid.Parse(usi ?? String.Empty);
            }
            // ReSharper disable EmptyGeneralCatchClause
            catch (Exception e) { /* Let repository deal with it*/}
            // ReSharper restore EmptyGeneralCatchClause
            _repository.UserSessionId = userSessionId;
            return _repository;
        }
    }
}