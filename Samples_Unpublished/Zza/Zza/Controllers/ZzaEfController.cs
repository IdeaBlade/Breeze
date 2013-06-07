using System.Collections.Generic;
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
        // Todo: inject via an interface rather than "new" the concrete class
        readonly ZzaRepository _repository = new ZzaRepository();

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
            return _repository.SaveChanges(saveBundle);
        }

        // ~/breeze/ZzaEf/Customers
        [HttpGet]
        public IQueryable<Customer> Customers()
        {
            return _repository.Customers;
        }

    }
}