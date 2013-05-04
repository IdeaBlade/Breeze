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
      tableItems.Add(new TableItem("OrderDetail"));
      tableItems.Add(new TableItem("Product"));
      tableItems.Add(new TableItem("Region"));
      tableItems.Add(new TableItem("Supplier"));
      tableItems.Add(new TableItem("Category", "Categories"));
      tableItems.Add(new TableItem("Territory", "Territories"));
      tableItems.Add(new TableItem("EmployeeTerritory", "EmployeeTerritories"));
      tableItems.Add(new TableItem("User"));
      tableItems.Add(new TableItem("Role"));
      tableItems.Add(new TableItem("UserRole"));
      tableItems.Add(new TableItem("Comment"));
      // tableItems.Add(new TableItem("InternationalOrder"));
      // tableItems.Add(new TableItem("PreviousEmployee"));
      // tableItems.Add(new TableItem("TimeLimit"));
      dc.ConvertTables(tableItems);
      
      dc.UpdateFk("Customers", "CustomerID", "Orders", "CustomerID", true);
      dc.UpdateFk("Employees", "EmployeeID", "Orders", "EmployeeID", false);
      dc.UpdateFk("Employees", "EmployeeID", "Employees", "ReportsToEmployeeID", false);
      dc.UpdateFk("Employees", "EmployeeID", "EmployeeTerritories", "EmployeeID", true);
      dc.UpdateFk("Territories", "TerritoryID", "EmployeeTerritories", "TerritoryID", true);
      dc.UpdateFk("Products", "ProductID", "OrderDetails", "ProductID", true);
      dc.UpdateFk("Suppliers", "SupplierID", "Products", "SupplierID", true);
      dc.UpdateFk("Regions", "RegionID", "Territories", "RegionID", true);
      dc.UpdateFk("Categories", "CategoryID", "Products", "CategoryID", true);
      dc.UpdateFk("Roles", "Id", "UserRoles", "RoleId", true);
      dc.UpdateFk("Users", "Id", "UserRoles", "UserId", true);

      dc.ClearOldPk("EmployeeTerritories", "ID");
      dc.ClearOldPk("UserRoles", "Id");

      
      dc.MakeChildDoc("Orders", "OrderID", "OrderDetails", "OrderID", "OrderDetails");
    }


  }
}
