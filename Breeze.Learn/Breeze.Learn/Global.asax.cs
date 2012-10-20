using System;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;

namespace Breeze.Learn {

  // Note: For instructions on enabling IIS6 or IIS7 classic mode, 
  // visit http://go.microsoft.com/?LinkId=9394801
  public class MvcApplication : HttpApplication {
    protected void Application_Start() {
      AreaRegistration.RegisterAllAreas();

      FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
      RouteConfig.RegisterRoutes(RouteTable.Routes);

      BreezeConfig.RegisterBreeze();

      //// Todo database initializer (development only)
      //Database.SetInitializer(new TodoDatabaseInitializer());
    }

    protected void Session_Start(Object sender, EventArgs e) {
      Session["init"] = 0; //need to access session in order to get a consistent session id
    }
  }
}