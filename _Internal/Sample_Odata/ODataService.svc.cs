using System.Data.Services;
using System.Data.Services.Common;
using Models.NorthwindIB.EDMX;

namespace Breeze_OData {
  public class ODataService : DataService<NorthwindIBContext_EDMX> {

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
      // config.SetEntitySetAccessRule("TimeLimits", EntitySetRights.All);


      // config.SetEntitySetAccessRule("CustomersAndOrders", EntitySetRights.All);
      config.DataServiceBehavior.MaxProtocolVersion = DataServiceProtocolVersion.V2;
    }

  }
}