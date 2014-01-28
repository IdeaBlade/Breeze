using Breeze.NetClient;
using System.Collections.Generic;
using System.Linq;
using System.Windows;

namespace Sample_WPF.EF6 {
  /// <summary>
  /// Interaction logic for MainWindow.xaml
  /// </summary>
  public partial class MainWindow : Window {
    public MainWindow() {
      InitializeComponent();
      ExecuteQuery();
    }

    private async void ExecuteQuery() {
      var serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";
      var em = new EntityManager(serviceName);

      
      

      var query = "Employees";
      
      // var metadata = await client.FetchMetadata();

      var q = new EntityQuery<Foo.Customer>("Customers");
      var q2 = q.Where(c => c.CompanyName.StartsWith("C") && c.Orders.Any(o => o.Freight > 10));
      var q3 = q2.OrderBy(c => c.CompanyName).Skip(2);
      // var q3 = q2.Select(c => c.Orders); // fails
      // var q4 = q2.Select(c => new Dummy() { Orders = c.Orders}  );
      // var q4 = q2.Select(c => new { Orders = c.Orders });
      // var q4 = q3.Select(c => new { c.CompanyName, c.Orders });
      var x = await q3.Execute(em);
      //var q3 = q2.Expand(c => c.Orders);
      //var q4 = q3.OrderBy(c => c.CompanyName);
      //var zzz = q4.GetResourcePath();
      //var x = await q4.Execute(em);
      var addresses = x.Select(c => {
        var z = c.CompanyName;
        var cid = c.CustomerID;
        c.CompanyName = "Test123";
        return c.Address;
      }).ToList();
      
    }

    public class Dummy {
      public IEnumerable<Foo.Order> Orders;
    }

    public void OldCode() {

      // var metadata = await client.FetchMetadata();

      //var uri = new Uri(serviceName);
      //var Customers = new DataServiceContext(uri, DataServiceProtocolVersion.V3).CreateQuery<Foo.Customer>("Customers");
      //var q = (DataServiceQuery)Customers.Where(c => c.CompanyName.StartsWith("C") && c.Orders.Any(o => o.Freight > 10));
      //var s = q.RequestUri;
      //var s2 = s.AbsoluteUri.Replace(serviceName, "");
      //query = s2.Replace("()", "");

      //// var x = await client.ExecuteQuery(query, typeof(Object));
      //var x = await em.ExecuteQuery<Foo.Customer>(query);
      //var y = x;
    }

  }
}
