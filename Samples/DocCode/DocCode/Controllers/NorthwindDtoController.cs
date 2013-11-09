using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Controllers;
using Breeze.ContextProvider;
using Breeze.WebApi2;
using Newtonsoft.Json.Linq;
using DocCode.DataAccess;
using Northwind.DtoModels;

namespace DocCode.Controllers
{
    [BreezeController]
    public class NorthwindDtoController : ApiController
    {
        private readonly NorthwindDtoRepository _repository;

        public NorthwindDtoController() : this(null){}

        // Todo: inject via an interface rather than "new" the concrete class
        public NorthwindDtoController(NorthwindDtoRepository repository)
        {         
            _repository = repository ?? new NorthwindDtoRepository();
        }

        protected override void Initialize(HttpControllerContext controllerContext)
        {
            base.Initialize(controllerContext);
            _repository.UserSessionId = getUserSessionId();
        }

        // ~/breeze/northwindDto/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return _repository.Metadata;
        }

        // ~/breeze/northwindDto/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _repository.SaveChanges(saveBundle);
        }

        // ~/breeze/northwindDto/Customers
        [HttpGet]
        public IQueryable<Customer> Customers() {
            return _repository.Customers;
        }

        // ~/breeze/northwindDto/Customer/729de505-ea6d-4cdf-89f6-0360ad37bde7
        [HttpGet]
        public Customer Customer(Guid id)
        {
            return _repository.CustomerById(id);
        }

        // ~/breeze/northwindDto/Orders
        [HttpGet]
        public IQueryable<Order> Orders() {
            return _repository.Orders;
        }

        // ~/breeze/northwindDto/Products
        [HttpGet]
        public IQueryable<Product> Products() {
            return _repository.Products;
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