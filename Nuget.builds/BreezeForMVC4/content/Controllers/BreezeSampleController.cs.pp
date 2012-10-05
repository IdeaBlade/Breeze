using System;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;

using MvcApplication1.Models;
namespace $rootnamespace$.Controllers {
  
    public class BreezeSampleController : ApiController {

        readonly EFContextProvider<BreezeSampleContext> _contextProvider =
            new EFContextProvider<BreezeSampleContext>();

        public BreezeSampleController()  {

        }

        [AcceptVerbs("GET")]
        public string Metadata() {
            return _contextProvider.Metadata();
        }
        
        [AcceptVerbs("POST")]
        public SaveResult SaveChanges(JObject saveBundle) {
            return _contextProvider.SaveChanges(saveBundle);
        }
        
        [AcceptVerbs("GET")]
        public IQueryable<BreezeSampleItem> Samples() {
            return _contextProvider.Context.SampleItems;
        }

    }
}