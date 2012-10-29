using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using CarBones.Models;
using Newtonsoft.Json.Linq;

namespace CarBones.Controllers
{
    [JsonFormatter, ODataActionFilter]
    public class CarBonesController : ApiController
    {
        readonly EFContextProvider<CarBonesContext> _contextProvider =
            new EFContextProvider<CarBonesContext>();

        // ~/api/CarBones/metadata
        [AcceptVerbs("GET")]
        public string Metadata()
        {
            return _contextProvider.Metadata();
        }

        // ~/api/CarBones/SaveChanges
        [AcceptVerbs("POST")]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _contextProvider.SaveChanges(saveBundle);
        }

        [AcceptVerbs("GET")]
        public IQueryable<Car> Cars()
        {
            return _contextProvider.Context.Cars;
        }

        [AcceptVerbs("GET")]
        public IQueryable<Option> Options()
        {
            return _contextProvider.Context.Options;
        }
    }
}