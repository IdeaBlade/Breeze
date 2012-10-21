using System;
using System.Web.Http;

[assembly: WebActivator.PreApplicationStartMethod(
    typeof(BreezyDevices.App_Start.BreezeConfig), "RegisterBreezePreStart")]
[assembly: WebActivator.PostApplicationStartMethod(
    typeof(BreezyDevices.App_Start.BreezeConfig), "RegisterBreezePostStart")]

namespace BreezyDevices.App_Start {
  public static class BreezeConfig {

    public static void RegisterBreezePreStart() {
      GlobalConfiguration.Configuration.Routes.MapHttpRoute(
          name: "BreezeApi",
          routeTemplate: "api/{controller}/{action}"
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

      // DEVELOPMENT ONLY: initialize the database
      System.Data.Entity.Database.SetInitializer(
          new Models.BreezyDevicesDatabaseInitializer());

    }
  }
}