using System;
using System.Linq;
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
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _repository.SaveChanges(saveBundle) as SaveResult;
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

        // ~/breeze/ZzaEf/reset - clears the current user's changes
        // ~/breeze/ZzaEf/reset/?options=fullreset - clear out all user changes; back to base state.
        [HttpPost]
        public string Reset(string options = "")
        {
            return _repository.Reset(options);
        }

        /// <summary>
        /// Get the repository UserStoreId from the current request
        /// </summary>
        private Guid GetUserStoreId()
        {
            try {
                var id = Request.Headers.GetValues("X-StoreId").First();
                return Guid.Parse(id);
            } catch {
                return Guid.Empty;
            }
        }

        private readonly IZzaRepository _repository;
    }
}