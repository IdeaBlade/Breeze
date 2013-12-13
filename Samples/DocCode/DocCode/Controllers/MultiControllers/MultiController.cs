using System.Web.Http;
using Breeze.ContextProvider;
using Breeze.WebApi2;
using Newtonsoft.Json.Linq;

namespace DocCode.Controllers.MultiControllers
{
    [BreezeController]
    public class MultiController : MultiBaseController
    {
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
    }
}