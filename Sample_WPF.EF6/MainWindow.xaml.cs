using Breeze.NetClient;
using System;
using System.Collections.Generic;
using System.Data.Services.Client;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using System.Data.Services.Client;
using System.Data.Services.Common;

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
      var client = new WebApi();

      var serviceName = "http://localhost:7150/breeze/NorthwindIBModel/";
      var query = "Employees";
      client.Initialize(serviceName);
      var metadata = await client.FetchMetadata();
      var uri = new Uri(serviceName);

      
      var Customers = new DataServiceContext(uri, DataServiceProtocolVersion.V3).CreateQuery<Foo.Customer>("Customers");
      var q = (DataServiceQuery) Customers.Where(c => c.CompanyName.StartsWith("C") && c.Country == "USA" && c.Orders.Any(o => o.Freight > 100));
      var s = q.RequestUri;

      var x = await client.ExecuteQuery(query, typeof(Object));
      var y = x;
    }


  }
}
