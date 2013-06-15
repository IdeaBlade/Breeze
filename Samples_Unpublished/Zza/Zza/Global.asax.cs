using System;
using System.Web.Http;

namespace Zza
{
    public class Global : System.Web.HttpApplication
    {
        protected void Application_Start(object sender, EventArgs e)
        {
            // CORS enabled on this server
            GlobalConfiguration.Configuration.MessageHandlers.Add(
                new Breeze.WebApi.BreezeSimpleCorsHandler());

            WebApiConfig.Register(GlobalConfiguration.Configuration);
        }
    }
}