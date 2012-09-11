using System.Web.Http;
using System.Web.Mvc;
using System.Web.Routing;

namespace Sample_WebApi {
  public class RouteConfig {
    public static void RegisterRoutes(RouteCollection routes) {
      routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

      routes.MapHttpRoute(
          name: "NorthwindIBModel",
          routeTemplate: "api/NorthwindIBModel/{action}/{filter}",
          defaults: new { controller = "NorthwindIBModel", filter = UrlParameter.Optional }
      );


      //routes.MapHttpRoute(
      //    name: "DefaultApi",
      //    routeTemplate: "api/{controller}/{id}",
      //    defaults: new { id = RouteParameter.Optional }
      //);

      routes.MapRoute(
          name: "Default",
          url: "{controller}/{action}/{id}",
          defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
      );


    }
  }
}