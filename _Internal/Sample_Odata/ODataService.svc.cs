
using System.Data.Services;
using System.Data.Services.Common;
using Models.NorthwindIB.CF;
using Models.NorthwindIB.EDMX;
using Models.NorthwindIB.EDMX_2012;
using System.ServiceModel;
using System;
using System.Web;

// MAKE SURE YOU SET the ODATA define before running any ODATA tests.

namespace Breeze_OData {
  // This attribute makes it possible to see errors on the client.
  [ServiceBehavior(IncludeExceptionDetailInFaults = true)]
  public class ODataService : DataService<NorthwindIBContext_CF> {

    // This method is called only once to initialize service-wide policies.
    public static void InitializeService(DataServiceConfiguration config) {
      // TODO: set rules to indicate which entity sets and service operations are visible, updatable, etc.
      // Examples:
      // config.SetEntitySetAccessRule("MyEntityset", EntitySetRights.AllRead);
      // config.SetServiceOperationAccessRule("MyServiceOperation", ServiceOperationRights.All);

      config.SetEntitySetAccessRule("Customers", EntitySetRights.All);
      config.SetEntitySetAccessRule("Orders", EntitySetRights.All);
      config.SetEntitySetAccessRule("Employees", EntitySetRights.All);
      config.SetEntitySetAccessRule("Products", EntitySetRights.All);
      config.SetEntitySetAccessRule("OrderDetails", EntitySetRights.All);
      config.SetEntitySetAccessRule("Categories", EntitySetRights.All);
      config.SetEntitySetAccessRule("Regions", EntitySetRights.All);
      config.SetEntitySetAccessRule("Territories", EntitySetRights.All);
      config.SetEntitySetAccessRule("Roles", EntitySetRights.All);
      config.SetEntitySetAccessRule("Suppliers", EntitySetRights.All);
      config.SetEntitySetAccessRule("Users", EntitySetRights.All);
      config.SetEntitySetAccessRule("TimeLimits", EntitySetRights.All);
      try {
        config.SetEntitySetAccessRule("Comments", EntitySetRights.All);
      } catch (Exception e) {
        var x = e;
      }

      // config.SetEntitySetAccessRule("CustomersAndOrders", EntitySetRights.All);
      config.DataServiceBehavior.MaxProtocolVersion = DataServiceProtocolVersion.V2;
      config.UseVerboseErrors = true;
    }

    protected override void OnStartProcessingRequest(ProcessRequestArgs args) {
      HttpContext.Current.Response.Cache.SetCacheability(HttpCacheability.NoCache);
      
      // HttpContext.Current.Response.AddHeader("Cache-control", "no-cache");
    }


    protected override void HandleException(HandleExceptionArgs args) {
      var x = args;
      base.HandleException(args);
    }

  }
}