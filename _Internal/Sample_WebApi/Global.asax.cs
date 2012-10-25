using System.Web.Http;
using System.Web.Mvc;
using System.Web.Routing;


namespace Sample_WebApi {
  // Note: For instructions on enabling IIS6 or IIS7 classic mode, 
  // visit http://go.microsoft.com/?LinkId=9394801

  public class WebApiApplication : System.Web.HttpApplication {
    protected void Application_Start() {
      AreaRegistration.RegisterAllAreas();

      FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
      RouteConfig.RegisterRoutes(RouteTable.Routes);

      // Use breeze's configuration of Json.Net JsonFormatter instead of the default
      GlobalConfiguration.Configuration.Formatters.Insert(0, Breeze.WebApi.JsonFormatter.Create());

      // Translate incoming query string into EF queries
      GlobalConfiguration.Configuration.Filters.Add(new Breeze.WebApi.ODataActionFilter());

    }

  }

}