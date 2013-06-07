using System;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using Zza.DataAccess.EF;
using Zza.Model;

namespace Zza.Controllers 
{
    [BreezeController]
    public class ZzaEfController : ApiController
    {
        private readonly ZzaRepository _repository;

        public ZzaEfController() : this(null){}
        public ZzaEfController(ZzaRepository repository)
        {
            _repository = repository ?? new ZzaRepository();
        }

        private ZzaRepository Repository
        {
            get { return PrepareRepository(); }
        }

        // ~/breeze/ZzaEf/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return Repository.Metadata;
        }

        // ~/breeze/ZzaEf/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return Repository.SaveChanges(saveBundle);
        }

        // ~/breeze/ZzaEf/Customers
        [HttpGet]
        public IQueryable<Customer> Customers()
        {
            return Repository.Customers;
        }

        // ~/breeze/ZzaEf/Orders
        [HttpGet]
        public IQueryable<Order> Orders()
        {
            return Repository.Orders;
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
            return Repository.Lookups;
        }
        [HttpGet]

        #region Individual reference collections
        // Don't use. Should get all at once with Lookups

        public IQueryable<OrderStatus> OrderStatuses()
        {
            return Repository.OrderStatuses;
        }
        [HttpGet]
        public IQueryable<Product> Products()
        {
            return Repository.Products;
        }
        [HttpGet]
        public IQueryable<ProductOption> ProductOptions()
        {
            return Repository.ProductOptions;
        }
        [HttpGet]
        public IQueryable<ProductSize> ProductSizes()
        {
            return Repository.ProductSizes;
        }
        #endregion

        // ~/breeze/ZzaEf/reset - clears the current user's changes
        // ~/breeze/ZzaEf/reset/?options=fullreset - clear out all user changes; back to base state.
        [HttpPost]
        public string Reset(string options = "")
        {
            return Repository.Reset(options);
        }

        /// <summary>
        /// Prepare repository for the current request
        /// </summary>
        /// <remarks>
        /// Sets the repo's StoreId from value in the request header
        /// </remarks>
        private ZzaRepository PrepareRepository()
        {
            try
            {
                var id = Request.Headers.GetValues("X-StoreId").First();
                _repository.StoreId = Guid.Parse(id);
            }
            // ReSharper disable EmptyGeneralCatchClause
            catch { /* Let repository deal with it*/}
            // ReSharper restore EmptyGeneralCatchClause
            return _repository;
        }
    }
}