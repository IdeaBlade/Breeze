namespace Breeze.Inspector.Controllers {
    using System.Linq;
    using System.Web.Http;
    using WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    public class InspectorController : ApiController {
        readonly EFContextProvider<InspectorContext> contextProvider = 
            new EFContextProvider<InspectorContext>();

        [AcceptVerbs("GET")]
        public string Metadata() {
            return contextProvider.Metadata();
        }

        [AcceptVerbs("GET")]
        public IQueryable<Inspector> Inspectors() {
            return contextProvider.Context.Inspectors;
        }

        [AcceptVerbs("GET")]
        public IQueryable<InspectionForm> Forms() {
            return contextProvider.Context.Forms;
        }

        [AcceptVerbs("GET")]
        public IQueryable<Job> Jobs() {
            return contextProvider.Context.Jobs;
        }

        [AcceptVerbs("POST")]
        public SaveResult SaveChanges(JObject saveBundle) {
            return contextProvider.SaveChanges(saveBundle);
        }
    }
}