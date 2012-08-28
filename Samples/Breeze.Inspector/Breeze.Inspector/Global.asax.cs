namespace Breeze.Inspector {
    using System.Data.Entity;
    using System.Web;
    using System.Web.Http;
    using System.Web.Mvc;
    using System.Web.Optimization;
    using System.Web.Routing;
    using Breeze.WebApi;
    using Models;

    // Note: For instructions on enabling IIS6 or IIS7 classic mode, 
    // visit http://go.microsoft.com/?LinkId=9394801

    public class WebApiApplication : HttpApplication {
        protected void Application_Start() {
            AreaRegistration.RegisterAllAreas();

            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);

            // Use breeze's configuration of Json.Net JsonFormatter instead of the default
            GlobalConfiguration.Configuration.Formatters.Insert(0, JsonFormatter.Create());

            // Apply query parameters, expressed as OData URI query strings, 
            // to results of Web API controller methods that return IQueryable<T>
            GlobalConfiguration.Configuration.Filters.Add(new EFActionFilter());

            Database.SetInitializer(new InspectorContext.ContextInitializer());
            var context = new InspectorContext();
            context.Database.Initialize(true);
        }
    }
}