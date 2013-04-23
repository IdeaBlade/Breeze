using System;
using System.Web.Http;

// BreezeConfig is discovered and run during startup
// http://blogs.msdn.com/b/davidebb/archive/2010/10/11/light-up-your-nupacks-with-startup-code-and-webactivator.aspx
[assembly: WebActivator.PreApplicationStartMethod(
    typeof(Breeze.Learn.App_Start.BreezeConfig), "RegisterBreezePreStart")]
[assembly: WebActivator.PostApplicationStartMethod(
    typeof(Breeze.Learn.App_Start.BreezeConfig), "RegisterBreezePostStart")]

namespace Breeze.Learn.App_Start {
  public static class BreezeConfig {

    public static void RegisterBreezePreStart() {
      GlobalConfiguration.Configuration.Routes.MapHttpRoute(
          name: "BreezeApi",
          routeTemplate: "breeze/{controller}/{action}"
      );
    }

    public static void RegisterBreezePostStart() {
      // Use breeze configuration of Json.Net JsonFormatter instead of the default
      GlobalConfiguration.Configuration.Formatters.Insert(
          0, Breeze.WebApi.JsonFormatter.Create());

      // Apply query parameters, expressed as OData URI query strings, 
      // to results of Web API controller methods that return IQueryable<T>
      GlobalConfiguration.Configuration.Filters.Add(
          new Breeze.WebApi.ODataActionFilter());


    }
  }
}