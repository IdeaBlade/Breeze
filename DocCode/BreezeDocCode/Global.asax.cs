using System.Web;
using System.Web.Mvc;
using System.Web.Routing;
//using System.Web.Optimization;

namespace BreezeDocCode {

    // For instructions on enabling IIS6 or IIS7 classic mode, 
    // visit http://go.microsoft.com/?LinkId=9394801
    public class MvcApplication : HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();

            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            //BundleConfig.RegisterBundles(BundleTable.Bundles); // not using in this sample

            BreezeConfig.RegisterBreeze();

            // DEMO: Initialize the Todo sample database
            System.Data.Entity.Database.SetInitializer(
                new Todo.Models.TodoDatabaseInitializer());
        }
    }
}