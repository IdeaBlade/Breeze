using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using Zza.DataAccess.EF;
using Zza.Interfaces;
using Zza.Model;

namespace Zza.Controllers 
{
    [BreezeController]
    public class ZzaEfController : ApiController
    {
        public ZzaEfController() : this(null){}
        public ZzaEfController(IZzaRepository repository)
        {
            _repository = repository ?? new ZzaRepository();
        }

        protected override void Initialize(System.Web.Http.Controllers.HttpControllerContext controllerContext)
        {
            Request = controllerContext.Request;// HUH? Why necessary?
            _repository.UserStoreId = GetUserStoreId();
        }

        // ~/breeze/ZzaEf/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return _repository.Metadata;
        }

        // ~/breeze/ZzaEf/SaveChanges
        [HttpPost]
        public HttpResponseMessage  SaveChanges(JObject saveBundle)
        {
            try
            {
                var result = _repository.SaveChanges(saveBundle) as SaveResult;
                return Request.CreateResponse(HttpStatusCode.OK, result);
            }
            catch (ValidationException ex) { return ValidationError(ex); } // EF
            catch (SaveException ex) { return ValidationError(ex); } // SaveGuard
            // Unknown exceptions become 500 - Internal Server Error
        }

        private HttpResponseMessage ValidationError(Exception ex)
        {
            return Request.CreateErrorResponse(HttpStatusCode.BadRequest, ex); 
        }

        // ~/breeze/ZzaEf/Customers
        [HttpGet]
        public IQueryable<Customer> Customers()
        {
            return _repository.Customers;
        }

        // ~/breeze/ZzaEf/Orders
        [HttpGet]
        public IQueryable<Order> Orders()
        {
            return _repository.Orders;
        }

        // ~/breeze/ZzaEf/Lookups
        /// <summary>
        /// Get a reference object whose properties
        /// are the Zza reference collections.
        /// </summary>
        /// <returns>
        /// Returns one object, not an IQueryable, 
        /// whose properties are "OrderStatuses", "Products", 
        /// "ProductOptions", "ProductSizes".
        /// </returns>
        [HttpGet]
        public object Lookups()
        {
            return _repository.Lookups;
        }

        #region Individual reference collections
        // Don't use. Should get all at once with Lookups
        [HttpGet]
        public IQueryable<OrderStatus> OrderStatuses()
        {
            return _repository.OrderStatuses;
        }
        [HttpGet]
        public IQueryable<Product> Products()
        {
            return _repository.Products;
        }
        [HttpGet]
        public IQueryable<ProductOption> ProductOptions()
        {
            return _repository.ProductOptions;
        }
        [HttpGet]
        public IQueryable<ProductSize> ProductSizes()
        {
            return _repository.ProductSizes;
        }
        #endregion

        /// <summary>
        /// Get the repository UserStoreId from the current request
        /// </summary>
        private Guid GetUserStoreId()
        {
            try {
                var id = Request.Headers.GetValues("X-UserSessionId").First();
                return Guid.Parse(id);
            } catch {
                return Guid.Empty;
            }
        }

        private readonly IZzaRepository _repository;
    }
}