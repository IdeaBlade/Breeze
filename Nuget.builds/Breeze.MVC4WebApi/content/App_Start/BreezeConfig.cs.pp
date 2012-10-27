using System.Web.Http;

// BreezeConfig is discovered and run during startup
// http://blogs.msdn.com/b/davidebb/archive/2010/10/11/light-up-your-nupacks-with-startup-code-and-webactivator.aspx
[assembly: WebActivator.PreApplicationStartMethod(
    typeof($rootnamespace$.App_Start.BreezeConfig), "RegisterBreezePreStart")]
namespace $rootnamespace$.App_Start {
  public static class BreezeConfig {

    public static void RegisterBreezePreStart() {
      GlobalConfiguration.Configuration.Routes.MapHttpRoute(
          name: "BreezeApi",
          routeTemplate: "api/{controller}/{action}"
      );
    }
  }
}