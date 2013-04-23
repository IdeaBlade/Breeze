using System.Web.Http;
using TempHire.App_Start;
using WebActivator;

[assembly: PreApplicationStartMethod(
    typeof(BreezeWebApiConfig), "RegisterBreezePreStart")]

namespace TempHire.App_Start
{
    /// <summary>
    ///     Inserts the Breeze Web API controller route at the front of all Web API routes
    /// </summary>
    /// <remarks>
    ///     This class is discovered and run during startup; see
    ///     http://blogs.msdn.com/b/davidebb/archive/2010/10/11/light-up-your-nupacks-with-startup-code-and-webactivator.aspx
    /// </remarks>
    public static class BreezeWebApiConfig
    {
        public static void RegisterBreezePreStart()
        {
            GlobalConfiguration.Configuration.Routes.MapHttpRoute(
                name: "Default",
                routeTemplate: "breeze/{action}",
                defaults: new {Controller = "Default"}
                );

            GlobalConfiguration.Configuration.Routes.MapHttpRoute(
                name: "Module",
                routeTemplate: "breeze/{controller}/{action}"
                );
        }
    }
}