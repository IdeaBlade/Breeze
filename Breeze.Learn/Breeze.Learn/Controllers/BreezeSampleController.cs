using System;
using System.Linq;
using System.Web.Http;
using Newtonsoft.Json.Linq;

using Breeze.WebApi;

using Breeze.Learn.Models;
namespace Breeze.Learn.Controllers {
  
    public class BreezeSampleController : ApiController {

        readonly EFContextProvider<BreezeSampleContext> _contextProvider =
            new EFContextProvider<BreezeSampleContext>();

        [AcceptVerbs("GET")]
        public string Metadata() {
            return _contextProvider.Metadata();
        }
        
        [AcceptVerbs("POST")]
        public SaveResult SaveChanges(JObject saveBundle) {
            return _contextProvider.SaveChanges(saveBundle);
        }
        
        [AcceptVerbs("GET")]
        public IQueryable<BreezeSampleTodoItem> Todos() {
            return _contextProvider.Context.Todos;
        }

    }
}