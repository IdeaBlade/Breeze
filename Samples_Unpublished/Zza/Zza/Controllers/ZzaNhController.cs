using System;
using Breeze.WebApi;
using Breeze.WebApi.NH;
using Newtonsoft.Json.Linq;
using System.Linq;
using System.Web.Http;
using Zza.DataAccess.NH;
using Zza.Interfaces;
using Zza.Model;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.ComponentModel.DataAnnotations;

namespace Zza.Controllers 
{
    [BreezeNHController]
    public class ZzaNhController : ApiController
    {
        // Todo: inject via an interface rather than "new" the concrete class
        readonly ZzaRepository _repository = new ZzaRepository();

        // ~/breeze/ZzaNh/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return _repository.Metadata;
        }

        // ~/breeze/ZzaNh/SaveChanges
        [HttpPost]
        public HttpResponseMessage SaveChanges(JObject saveBundle)
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
            return Request.CreateErrorResponse(HttpStatusCode.Forbidden, ex);
        }

        // ~/breeze/ZzaNh/Customers
        [HttpGet]
        public IQueryable<Customer> Customers()
        {
            return _repository.Customers;
        }

        // ~/breeze/ZzaNh/Orders
        [HttpGet]
        public IQueryable<Order> Orders()
        {
            return _repository.Orders;
        }

        // ~/breeze/ZzaNh/Lookups
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

    }
}