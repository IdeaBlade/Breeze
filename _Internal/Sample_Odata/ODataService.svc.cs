using System.Data.Services;
using System.Data.Services.Common;

namespace Breeze_OData {
  public class ODataService : DataService<NorthwindIBEntities> {

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


      // config.SetEntitySetAccessRule("CustomersAndOrders", EntitySetRights.All);
      config.DataServiceBehavior.MaxProtocolVersion = DataServiceProtocolVersion.V2;
    }

  }
}