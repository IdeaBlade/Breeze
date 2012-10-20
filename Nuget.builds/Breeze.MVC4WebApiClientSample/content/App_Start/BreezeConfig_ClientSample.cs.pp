using System.Web.Mvc;

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