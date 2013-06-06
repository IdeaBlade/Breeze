using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;

[assembly: WebActivatorEx.PreApplicationStartMethod(
    typeof(NorthBreeze.App_Start.BreezeWebApiConfig), "RegisterBreezePreStart")]
namespace NorthBreeze.App_Start
{
    public static class BreezeWebApiConfig
    {
        public static void RegisterBreezePreStart()
        {
            GlobalConfiguration.Configuration.Routes.MapHttpRoute(
                name: "BreezeApi",
                routeTemplate: "breeze/{controller}/{action}"
            );
        }
    }
}