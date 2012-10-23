using System.Web.Mvc;

// BreezeConfig_ClientSample is discovered and run during startup
// http://blogs.msdn.com/b/davidebb/archive/2010/10/11/light-up-your-nupacks-with-startup-code-and-webactivator.aspx
[assembly: WebActivator.PreApplicationStartMethod(
    // Order = 2 because must run AFTER BreezeSampleConfig
    typeof($rootnamespace$.App_Start.BreezeConfig_ClientSample), "RegisterBreezePreStart", Order = 2)]

namespace $rootnamespace$.App_Start {
  public static class BreezeConfig_ClientSample {

    public static void RegisterBreezePreStart() {

      // Preempt standard default MVC page routing to go to Breeze Sample
      System.Web.Routing.RouteTable.Routes.MapRoute(
          name: "BreezeMvc",
          url: "{controller}/{action}/{id}",
          defaults: new
          {
              controller = "BreezeSampleShell",
              action = "Index",
              id = UrlParameter.Optional
          }
      );
    }
  }
}