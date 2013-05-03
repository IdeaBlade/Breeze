using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Linq;
using System.Text;

using MongoDB.Bson;
using MongoDB.Driver;

using MongoDB.Driver.Builders;
using MongoDB.Driver.GridFS;
using MongoDB.Driver.Linq;


using System.Reflection;

namespace BuildDb {
  internal class Program {
    private static void Main(string[] args) {
      InitializeDb();
    }

    private static void InitializeDb() {

      var sqlConnectionstring = ConfigurationManager.ConnectionStrings["NorthwindIB"].ToString();
      var mongoConnectionString = "mongodb://localhost/?safe=true;w=1;wtimeout=30s";
      var dc = new DatabaseConverter(sqlConnectionstring, mongoConnectionString, "NorthwindIB");

      var tableItems = new List<TableItem>();
      tableItems.Add(new TableItem("Customer"));
      tableItems.Add(new TableItem("Order"));
      tableItems.Add(new TableItem("Employee"));
      dc.ConvertTables(tableItems);
      
      dc.UpdateFk("Customers", "CustomerID", "Orders", "CustomerID", true);
      dc.UpdateFk("Employees", "EmployeeID", "Orders", "EmployeeID", false);
      dc.UpdateFk("Employees", "EmployeeID", "Employees", "ReportsToEmployeeID", true);

    }


  }
}
