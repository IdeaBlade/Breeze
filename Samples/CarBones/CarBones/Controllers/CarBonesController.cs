using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using CarBones.Models;

namespace CarBones.Controllers
{
    [JsonFormatter, ODataActionFilter]
    public class CarBonesController : ApiController
    {
        readonly EFContextProvider<CarBonesContext> _contextProvider =
            new EFContextProvider<CarBonesContext>();

        [AcceptVerbs("GET")]
        public string Metadata()
        {
            return _contextProvider.Metadata();
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