namespace Breeze.Inspector {
    using System.Web.Http;
    using System.Web.Mvc;
    using System.Web.Routing;

    public class RouteConfig {
        public static void RegisterRoutes(RouteCollection routes) {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapHttpRoute(
                name:"Inspector",
                routeTemplate:"api/inspector/{action}/{filter}",
                defaults:new { controller = "Inspector", filter = UrlParameter.Optional }
                );

            //routes.MapHttpRoute(
            //    name:"DefaultApi",
            //    routeTemplate:"api/{controller}/{id}",
            //    defaults:new { id = RouteParameter.Optional }
            //    );

            routes.MapRoute(
                name:"Default",
                url:"{controller}/{action}/{id}",
                defaults:new { controller = "Home", action = "Index", id = UrlParameter.Optional }
                );
        }
    }
}