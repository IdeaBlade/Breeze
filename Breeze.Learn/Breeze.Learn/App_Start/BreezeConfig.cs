using System.Web.Http;
using Breeze.WebApi;

namespace Breeze.Learn {
    
    public class BreezeConfig {
        public static void RegisterBreeze() {
            // Use breeze configuration of Json.Net JsonFormatter instead of the default
            GlobalConfiguration.Configuration.Formatters.Insert(
                0, JsonFormatter.Create());

            // Apply query parameters, expressed as OData URI query strings, 
            // to results of Web API controller methods that return IQueryable<T>
            GlobalConfiguration.Configuration.Filters.Add(
                new ODataActionFilter());
        }
    }
}