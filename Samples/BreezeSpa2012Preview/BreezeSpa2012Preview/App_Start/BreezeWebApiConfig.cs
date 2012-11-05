using System.Web.Http;

[assembly: WebActivator.PreApplicationStartMethod(
    typeof(BreezeSpa2012Preview.App_Start.BreezeWebApiConfig), "RegisterBreezePreStart")]
namespace BreezeSpa2012Preview.App_Start {
  ///<summary>
  /// Inserts the Breeze Web API controller route at the front of all Web API routes
  ///</summary>
  ///<remarks>
  /// This class is discovered and run during startup; see
  /// http://blogs.msdn.com/b/davidebb/archive/2010/10/11/light-up-your-nupacks-with-startup-code-and-webactivator.aspx
  ///</remarks>
  public static class BreezeWebApiConfig {

    public static void RegisterBreezePreStart() {
      GlobalConfiguration.Configuration.Routes.MapHttpRoute(
          name: "BreezeTodoApi",
          routeTemplate: "api/BreezeTodo/{action}",
          defaults: new { controller = "BreezeTodo" }
      );
    }
  }
}