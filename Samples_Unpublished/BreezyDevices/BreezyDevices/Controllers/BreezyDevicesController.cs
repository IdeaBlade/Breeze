using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using BreezyDevices.Models;
using Newtonsoft.Json.Linq;

namespace BreezyDevices.Controllers
{
    [JsonFormatter, ODataActionFilter]
    public class BreezyDevicescontroller : ApiController
    {
        readonly EFContextProvider<BreezyDevicesContext> _contextProvider =
            new EFContextProvider<BreezyDevicesContext>();

        // ~/breeze/breezydevices/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return _contextProvider.Metadata();
        }

        // ~/breeze/breezydevices/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _contextProvider.SaveChanges(saveBundle);
        }

        // ~/breeze/breezydevices/people
        // ~/breeze/breezydevices/people?$filter=LastName%20startswith%20L&$orderby=LastName 
        [HttpGet]
        public IQueryable<Person> People()
        {
            return _contextProvider.Context.People;
        }

        // ~/breeze/breezydevices/devices
        [HttpGet]
        public IQueryable<Device> Devices()
        {
            return _contextProvider.Context.Devices;
        }
        // ~/breeze/breezydevices/reset
        [HttpPost]
        public string Reset()
        {
            BreezyDevicesDatabaseInitializer
                .ResetDatabase(_contextProvider.Context);
            return "reset";
        }
    }
}