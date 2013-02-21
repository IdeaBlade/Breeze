using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using TempHire.Services;

namespace TempHire.Controllers
{
    [BreezeController]
    public class DefaultController : ApiController
    {
        private readonly UnitOfWork _unitOfWork = new UnitOfWork();

        // ~/api/Metadata
        [HttpGet]
        public string Metadata()
        {
            return _unitOfWork.Metadata();
        }

        // ~/api/Lookups
        [HttpGet]
        public LookupBundle Lookups()
        {
            return new LookupBundle
            {
                AddressTypes = _unitOfWork.AddressTypes.All().ToList(),
                PhoneNumberTypes = _unitOfWork.PhoneNumberTypes.All().ToList(),
                RateTypes = _unitOfWork.RateTypes.All().ToList(),
                States = _unitOfWork.States.All().ToList()
            };
        }

        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _unitOfWork.Commit(saveBundle);
        }
    }
}