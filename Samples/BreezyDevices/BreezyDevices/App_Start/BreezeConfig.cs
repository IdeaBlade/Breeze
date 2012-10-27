using System.Web.Http;

[assembly: WebActivator.PreApplicationStartMethod(
    typeof(BreezyDevices.App_Start.BreezeConfig), "RegisterBreezePreStart")]
namespace BreezyDevices.App_Start {
  public static class BreezeConfig {

    public static void RegisterBreezePreStart() {
      GlobalConfiguration.Configuration.Routes.MapHttpRoute(
          name: "BreezeApi",
          routeTemplate: "api/{controller}/{action}"
      );
    }
  }
}