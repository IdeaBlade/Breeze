using System.Web.Http;

[assembly: WebActivator.PreApplicationStartMethod(
    typeof(Breeze.Inspector.App_Start.BreezeConfig), "RegisterBreezePreStart")]
namespace Breeze.Inspector.App_Start {

    public class BreezeConfig
    {
        public static void RegisterBreezePreStart()
        {
            GlobalConfiguration.Configuration.Routes.MapHttpRoute(
                name: "Inspector",
                routeTemplate: "api/inspector/{action}/{filter}",
                defaults: new { controller = "Inspector", filter = RouteParameter.Optional }
                );
        }
    }
}