namespace Breeze.Inspector.Controllers {
    using System.Linq;
    using System.Web.Http;
    using WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    [JsonFormatter, ODataActionFilter]
    public class InspectorController : ApiController {
        readonly EFContextProvider<InspectorContext> _contextProvider = 
            new EFContextProvider<InspectorContext>();

        [HttpGet]
        public string Metadata() {
            return _contextProvider.Metadata();
        }

        [HttpGet]
        public IQueryable<Inspector> Inspectors() {
            return _contextProvider.Context.Inspectors;
        }

        [HttpGet]
        public IQueryable<InspectionForm> Forms() {
            return _contextProvider.Context.Forms;
        }

        [HttpGet]
        public IQueryable<Job> Jobs() {
            return _contextProvider.Context.Jobs;
        }

        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle) {
            return _contextProvider.SaveChanges(saveBundle);
        }
    }
}