// Only one of the next 4 should be uncommented.
#define CODEFIRST_PROVIDER 
//#define DATABASEFIRST_OLD
//#define DATABASEFIRST_NEW
//#define NHIBERNATE

using System.Web.Http;
// using System.Web.Mvc;
using System.Web.Routing;

#if CODEFIRST_PROVIDER
using Models.NorthwindIB.CF;
using Foo;
using System.ComponentModel.DataAnnotations;
#elif DATABASEFIRST_OLD
ERROR - DOESNT EXIST FOR EF6
#elif DATABASEFIRST_NEW
using Models.NorthwindIB.EDMX_2012;
#endif

namespace Sample_WebApi2 {
  // Note: For instructions on enabling IIS6 or IIS7 classic mode, 
  // visit http://go.microsoft.com/?LinkId=9394801

  public class WebApiApplication : System.Web.HttpApplication {
    protected void Application_Start() {

      // May be needed later when OData model builder is "fixed" and supports fks.

      //var modelBuilder = new System.Web.Http.OData.Builder.ODataConventionModelBuilder();
      //modelBuilder.EntitySet<Customer>("Customers");
      //modelBuilder.EntitySet<Order>("Orders");
      //modelBuilder.EntitySet<OrderDetail>("OrderDetails");
      //modelBuilder.EntitySet<Employee>("Employees");
      //modelBuilder.EntitySet<Product>("Products");
      //modelBuilder.EntitySet<Category>("Categories");
      //modelBuilder.EntitySet<Region>("Regions");
      //modelBuilder.EntitySet<Territory>("Territories");
      //modelBuilder.EntitySet<Role>("Roles");
      //modelBuilder.EntitySet<Supplier>("Suppliers");
      //modelBuilder.EntitySet<User>("Users");
      //modelBuilder.EntitySet<TimeLimit>("TimeLimits");

      //var model = modelBuilder.GetEdmModel();
      //GlobalConfiguration.Configuration.Routes.MapODataRoute(
      //  routeName: "OData",
      //  routePrefix: "odata",
      //  model: model);

      // standard Breeze routing

      var routes = GlobalConfiguration.Configuration.Routes;
      

      routes.MapHttpRoute(
           name: "SampleApi",
           routeTemplate: "breeze/{controller}/{action}"
       );


     
    }



  }

}