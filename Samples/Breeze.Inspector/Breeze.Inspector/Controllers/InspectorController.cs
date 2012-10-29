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

        [AcceptVerbs("GET")]
        public string Metadata() {
            return _contextProvider.Metadata();
        }

        [AcceptVerbs("GET")]
        public IQueryable<Inspector> Inspectors() {
            return _contextProvider.Context.Inspectors;
        }

        [AcceptVerbs("GET")]
        public IQueryable<InspectionForm> Forms() {
            return _contextProvider.Context.Forms;
        }

        [AcceptVerbs("GET")]
        public IQueryable<Job> Jobs() {
            return _contextProvider.Context.Jobs;
        }

        [AcceptVerbs("POST")]
        public SaveResult SaveChanges(JObject saveBundle) {
            return _contextProvider.SaveChanges(saveBundle);
        }
    }
}