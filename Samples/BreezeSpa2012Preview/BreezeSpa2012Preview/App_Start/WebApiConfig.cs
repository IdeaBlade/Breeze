using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;

namespace BreezeSpa2012Preview
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            config.Routes.MapHttpRoute(
                name: "DefaultApi",
                routeTemplate: "api/{controller}/{id}",
                defaults: new { id = RouteParameter.Optional }
            );

            // Disabled because interferes with Breeze ODataActionFilter
            // Not needed by the SPA Template sample
            // Todo: insulate ODataActionFilter so app can enable this feature for other controllers
            //config.EnableQuerySupport();
        }
    }
}