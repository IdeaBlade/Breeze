using System.Web.Http;

[assembly: WebActivator.PreApplicationStartMethod(
    typeof(Todo.App_Start.BreezeConfig), "RegisterBreezePreStart")]
namespace Todo.App_Start {
  public static class BreezeConfig {

    public static void RegisterBreezePreStart() {
      GlobalConfiguration.Configuration.Routes.MapHttpRoute(
          name: "BreezeApi",
          routeTemplate: "api/{controller}/{action}"
      );
    }
  }
}