using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data;

using Breeze.NetClient;
using System.Spatial;

namespace Foo {

  public partial class Category : BaseEntity {

    public int CategoryID {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }
    public string CategoryName {
      get { return PropGet<String>(); }
      set { PropSet(value); }
    }
    public string Description {
      get { return PropGet<String>(); }
      set { PropSet(value); }
    }
    public byte[] Picture {
      get { return PropGet<byte[]>(); }
      set { PropSet(value); }
    }
    public int RowVersion {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }

    public NavigationSet<Product> Products {
      get { return PropGet<NavigationSet<Product>>(); }
      set { PropSet(value); }
    }
  }


  public partial class Customer : BaseEntity {

    public System.Guid CustomerID {
      get { return PropGet<System.Guid>(); }
      set { PropSet(value); }
    }
    public string CustomerID_OLD {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string CompanyName {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string ContactName  {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string ContactTitle  {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Address  {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string City  {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Region {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string PostalCode {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Country {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Phone  {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Fax {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public int? RowVersion  {
      get { return PropGet<int?>(); }
      set { PropSet(value); }
    }

    public NavigationSet<Order> Orders {
      get { return PropGet<NavigationSet<Order>>(); }
      set { PropSet(value); }
    }

  }


  public partial class Employee :BaseEntity {
    public int EmployeeID {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }
    public string LastName {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string FirstName {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Title {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string TitleOfCourtesy {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public DateTime? BirthDate {
      get { return PropGet<DateTime?>(); }
      set { PropSet(value); }
    }
    public DateTime? HireDate {
      get { return PropGet<DateTime?>(); }
      set { PropSet(value); }
    }
    public string Address {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string City {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Region {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string PostalCode {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Country {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string HomePhone {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Extension {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public byte[] Photo {
      get { return PropGet<byte[]>(); }
      set { PropSet(value); }
    }
    public string Notes {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string PhotoPath {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public int? ReportsToEmployeeID {
      get { return PropGet<int?>(); }
      set { PropSet(value); }
    }
    public int RowVersion {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }
    public String FullName {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }

    public NavigationSet<Employee> DirectReports {
      get { return PropGet<NavigationSet<Employee>>(); }
      set { PropSet(value); }
    }
    public Employee Manager {
      get { return PropGet<Employee>(); }
      set { PropSet(value); }
    }
    public NavigationSet<EmployeeTerritory> EmployeeTerritories {
      get { return PropGet<NavigationSet<EmployeeTerritory>>(); }
      set { PropSet(value); }
    }
    public NavigationSet<Order> Orders {
      get { return PropGet<NavigationSet<Order>>(); }
      set { PropSet(value); }
    }
    public NavigationSet<Territory> Territories {
      get { return PropGet<NavigationSet<Territory>>(); }
      set { PropSet(value); }
    }

  }

  public partial class EmployeeTerritory : BaseEntity {

    public int ID { get; set; }
    public int EmployeeID { get; set; }
    public int TerritoryID { get; set; }
    public int RowVersion { get; set; }
    public Employee Employee { get; set; }
    public Territory Territory { get; set; }

  }
  public partial class Order : BaseEntity {

    public int OrderID {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }
    public Nullable<System.Guid> CustomerID {
      get { return PropGet<Nullable<System.Guid>>(); }
      set { PropSet(value); }
    }
    public int? EmployeeID {
      get { return PropGet<int?>(); }
      set { PropSet(value); }
    }
    public DateTime? OrderDate {
      get { return PropGet<DateTime?>(); }
      set { PropSet(value); }
    }
    public DateTime? RequiredDate {
      get { return PropGet<DateTime?>(); }
      set { PropSet(value); }
    }
    public DateTime? ShippedDate {
      get { return PropGet<DateTime?>(); }
      set { PropSet(value); }
    }
    public decimal? Freight {
      get { return PropGet<decimal?>(); }
      set { PropSet(value); }
    }
    public string ShipName {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string ShipAddress {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string ShipCity {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string ShipRegion {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string ShipPostalCode {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string ShipCountry {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public int RowVersion {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }

    public Customer Customer {
      get { return PropGet<Customer>(); }
      set { PropSet(value); }
    }
    public Employee Employee {
      get { return PropGet<Employee>(); }
      set { PropSet(value); }
    }
    public NavigationSet<OrderDetail> OrderDetails {
      get { return PropGet<NavigationSet<OrderDetail>>(); }
      set { PropSet(value); }
    }
    public InternationalOrder InternationalOrder {
      get { return PropGet<InternationalOrder>(); }
      set { PropSet(value); }
    }

  }

  public partial class OrderDetail : BaseEntity {
    public int OrderID {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }
    public int ProductID {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }
    public decimal UnitPrice {
      get { return PropGet<decimal>(); }
      set { PropSet(value); }
    }
    public short Quantity {
      get { return PropGet<short>(); }
      set { PropSet(value); }
    }
    public float Discount {
      get { return PropGet<float>(); }
      set { PropSet(value); }
    }
    public int RowVersion {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }

    public Order Order {
      get { return PropGet<Order>(); }
      set { PropSet(value); }
    }
    public Product Product {
      get { return PropGet<Product>(); }
      set { PropSet(value); }
    }

  }

  public partial class PreviousEmployee : BaseEntity {


    public int EmployeeID { get; set; }
    public string LastName { get; set; }
    public string FirstName { get; set; }
    public string Title { get; set; }
    public string TitleOfCourtesy { get; set; }
    public DateTime? BirthDate { get; set; }
    public DateTime? HireDate { get; set; }
    public string Address { get; set; }
    public string City { get; set; }
    public string Region { get; set; }
    public string PostalCode { get; set; }
    public string Country { get; set; }
    public string HomePhone { get; set; }
    public string Extension { get; set; }
    public byte[] Photo { get; set; }
    public string Notes { get; set; }
    public string PhotoPath { get; set; }
    public int RowVersion { get; set; }

  }

  public partial class Product : BaseEntity {
    public int ProductID { get; set; }
    public string ProductName { get; set; }
    public int? SupplierID { get; set; }
    public int? CategoryID { get; set; }
    public string QuantityPerUnit { get; set; }
    public Nullable<decimal> UnitPrice { get; set; }
    public Nullable<short> UnitsInStock { get; set; }
    public Nullable<short> UnitsOnOrder { get; set; }
    public Nullable<short> ReorderLevel { get; set; }
    public bool Discontinued { get; set; }
    public DateTime? DiscontinuedDate { get; set; }
    public int RowVersion { get; set; }

    public Category Category { get; set; }

    //public NavigationSet<OrderDetail> OrderDetails {
    //  get;
    //  set;
    //}

    public Supplier Supplier { get; set; }
  }

  public partial class Region : BaseEntity {
    public int RegionID { get; set; }
    public string RegionDescription { get; set; }
    public int RowVersion { get; set; }
    public NavigationSet<Territory> Territories { get; set; }

  }

  public partial class Role : BaseEntity {

    public long Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public byte[] Ts { get; set; }
    public Nullable<RoleType> RoleType { get; set; }

    public NavigationSet<UserRole> UserRoles { get; set; }

  }

  
  public enum RoleType {
    Guest = 0,
    Restricted = 1,
    Standard = 2,
    Admin = 3
  }



  public partial class Supplier : BaseEntity {

    public int SupplierID { get; set; }
    public string CompanyName { get; set; }
    public string ContactName { get; set; }
    public string ContactTitle { get; set; }
    public Location Location { get; set; }
    public string Phone { get; set; }
    public string Fax { get; set; }
    public string HomePage { get; set; }
    public int RowVersion { get; set; }

    public NavigationSet<Product> Products { get; set; }

    
  }

  
  public partial class Location {
    public string Address { get; set; }
    public string City { get; set; }
    public string Region { get; set; }
    public string PostalCode { get; set; }
    public string Country { get; set; }
  }

  public partial class Territory : BaseEntity {
    public int TerritoryID { get; set; }
    public string TerritoryDescription { get; set; }
    public int RegionID { get; set; }
    public int RowVersion { get; set; }

    public NavigationSet<EmployeeTerritory> EmployeeTerritories { get; set; }
    public Region Region { get; set; }
    public NavigationSet<Employee> Employees { get; set; }
  }

  public partial class User : BaseEntity {

    public long Id { get; set; }
    public string UserName { get; set; }
    public string UserPassword { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public decimal RowVersion { get; set; }
    public string CreatedBy { get; set; }
    public long CreatedByUserId { get; set; }
    public DateTime CreatedDate { get; set; }
    public string ModifiedBy { get; set; }
    public long ModifiedByUserId { get; set; }
    public DateTime ModifiedDate { get; set; }
    public NavigationSet<UserRole> UserRoles { get; set; }

  }


  public partial class UserRole : BaseEntity {

    public long ID { get; set; }
    public long UserId { get; set; }
    public long RoleId { get; set; }

    public Role Role { get; set; }
    public User User { get; set; }
  }

  public partial class InternationalOrder : BaseEntity {

    public int OrderID { get; set; }
    public string CustomsDescription { get; set; }
    public decimal ExciseTax { get; set; }
    public int RowVersion { get; set; }
    public Order Order { get; set; }

  }

  public partial class TimeLimit : BaseEntity {

    public int Id { get; set; }
    public System.TimeSpan MaxTime { get; set; }
    public Nullable<System.TimeSpan> MinTime { get; set; }
    public int? TimeGroupId { get; set; }

    public TimeGroup TimeGroup { get; set; }
  }


  public partial class TimeGroup : BaseEntity {

    public int Id { get; set; }
    public string Comment { get; set; }

    public NavigationSet<TimeLimit> TimeLimits { get; set; }
    
  }


  public partial class Comment : BaseEntity {
    public DateTime CreatedOn { get; set; }
    public byte SeqNum { get; set; }
    public string Comment1 { get; set; }

  }

  public partial class Geospatial : BaseEntity {

    public Geospatial() {

      //this.Geometry1 = GeometryPolygon.FromText("POLYGON ((30 10, 10 20, 20 40, 40 40, 30 10))");
      //this.Geography1 = Geography.FromText("MULTIPOINT(-122.360 47.656, -122.343 47.656)", 4326);
      // this.Geometry1 = DbGeometry.FromText("GEOMETRYCOLLECTION(POINT(4 6),LINESTRING(4 6,7 10)");

    }
    public int Id { get; set; }
    public Geometry Geometry1 { get; set; }
    public Geography Geography1 { get; set; }
  }

  public partial class UnusualDate : BaseEntity {
    public int Id { get; set; }
    public DateTimeOffset CreationDate { get; set; }
    public DateTime ModificationDate { get; set; }
    public Nullable<DateTimeOffset> CreationDate2 { get; set; }
    public DateTime? ModificationDate2 { get; set; }
  }


}

