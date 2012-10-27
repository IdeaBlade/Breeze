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

        // ~/api/breezydevices/Metadata 
        [AcceptVerbs("GET")]
        public string Metadata()
        {
            return _contextProvider.Metadata();
        }

        // ~/api/breezydevices/SaveChanges
        [AcceptVerbs("POST")]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _contextProvider.SaveChanges(saveBundle);
        }

        // ~/api/breezydevices/people
        // ~/api/breezydevices/people?$filter=LastName%20startswith%20L&$orderby=LastName 
        [AcceptVerbs("GET")]
        public IQueryable<Person> People()
        {
            return _contextProvider.Context.People;
        }

        // ~/api/breezydevices/devices
        [AcceptVerbs("GET")]
        public IQueryable<Device> Devices()
        {
            return _contextProvider.Context.Devices;
        }
        // ~/api/breezydevices/reset
        [AcceptVerbs("POST")]
        public string Reset()
        {
            BreezyDevicesDatabaseInitializer
                .ResetDatabase(_contextProvider.Context);
            return "reset";
        }
    }
}