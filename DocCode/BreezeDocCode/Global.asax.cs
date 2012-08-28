using System.Web;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Routing;

namespace BreezeDocCode {

    // For instructions on enabling IIS6 or IIS7 classic mode, 
    // visit http://go.microsoft.com/?LinkId=9394801
    public class MvcApplication : HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();

            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);

            // Use breeze configuration of Json.Net JsonFormatter instead of the default
            GlobalConfiguration.Configuration.Formatters.Insert(
                0, Breeze.WebApi.JsonFormatter.Create());

            // Apply query parameters, expressed as OData URI query strings, 
            // to results of Web API controller methods that return IQueryable<T>
            GlobalConfiguration.Configuration.Filters.Add(
                new Breeze.WebApi.EFActionFilter());

            System.Data.Entity.Database.SetInitializer(
                new Todo.Models.TodoDatabaseInitializer());
        }
    }
}