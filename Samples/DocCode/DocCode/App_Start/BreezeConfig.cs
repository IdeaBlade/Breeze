using System.Web.Http;

[assembly: WebActivator.PreApplicationStartMethod(
    typeof(DocCode.App_Start.BreezeConfig), "RegisterBreezePreStart")]
namespace DocCode.App_Start {
  public static class BreezeConfig {

    public static void RegisterBreezePreStart() {
      GlobalConfiguration.Configuration.Routes.MapHttpRoute(
          name: "BreezeApi",
          routeTemplate: "api/{controller}/{action}"
      );
    }
  }
}