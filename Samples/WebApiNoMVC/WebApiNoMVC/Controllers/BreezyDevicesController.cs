using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using WebApiNoMVC.Models;
using Newtonsoft.Json.Linq;

namespace WebApiNoMVC.Controllers
{
    [JsonFormatter, ODataActionFilter]
    public class BreezyDevicesController : ApiController
    {
        readonly EFContextProvider<BreezyDevicesContext> _contextProvider =
            new EFContextProvider<BreezyDevicesContext>();

        // ~/api/breezydevices/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return _contextProvider.Metadata();
        }

        // ~/api/breezydevices/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _contextProvider.SaveChanges(saveBundle);
        }

        // ~/api/breezydevices/people
        // ~/api/breezydevices/people?$filter=LastName%20startswith%20L&$orderby=LastName 
        [HttpGet]
        public IQueryable<Person> People()
        {
            return _contextProvider.Context.People;
        }

        // ~/api/breezydevices/devices
        [HttpGet]
        public IQueryable<Device> Devices()
        {
            return _contextProvider.Context.Devices;
        }
        // ~/api/breezydevices/reset
        [HttpPost]
        public string Reset()
        {
            BreezyDevicesDatabaseInitializer
                .ResetDatabase(_contextProvider.Context);
            return "reset";
        }
    }
}