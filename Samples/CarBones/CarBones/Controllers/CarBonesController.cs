using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Breeze.WebApi.EF;
using CarBones.Models;
using Newtonsoft.Json.Linq;

namespace CarBones.Controllers
{
    [BreezeController]
    public class CarBonesController : ApiController
    {
        readonly EFContextProvider<CarBonesContext> _contextProvider =
            new EFContextProvider<CarBonesContext>();

        // ~/breeze/CarBones/metadata
        [HttpGet]
        public string Metadata()
        {
            return _contextProvider.Metadata();
        }

        // ~/breeze/CarBones/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _contextProvider.SaveChanges(saveBundle);
        }

        // ~/breeze/CarBones/cars
        [HttpGet]
        public IQueryable<Car> Cars()
        {
            return _contextProvider.Context.Cars;
        }

        [HttpGet]
        public IQueryable<Option> Options()
        {
            return _contextProvider.Context.Options;
        }
    }
}