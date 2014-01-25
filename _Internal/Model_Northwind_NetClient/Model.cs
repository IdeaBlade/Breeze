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
    public string PostalCode{
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
    public string PhotoPath{
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public int RowVersion {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }

  }

  public partial class Product : BaseEntity {
    public int ProductID {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    } 
    public string ProductName {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public int? SupplierID {
      get { return PropGet<int?>(); }
      set { PropSet(value); }
    }
    public int? CategoryID {
      get { return PropGet<int?>(); }
      set { PropSet(value); }
    }
    public string QuantityPerUnit {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public Nullable<decimal> UnitPrice {
      get { return PropGet<Nullable<decimal>>(); }
      set { PropSet(value); }
    }
    public Nullable<short> UnitsInStock {
      get { return PropGet<Nullable<short>>(); }
      set { PropSet(value); }
    }
    public Nullable<short> UnitsOnOrder {
      get { return PropGet<Nullable<short>>(); }
      set { PropSet(value); }
    }
    public Nullable<short> ReorderLevel {
      get { return PropGet<short>(); }
      set { PropSet(value); }
    }
    public bool Discontinued {
      get { return PropGet<bool>(); }
      set { PropSet(value); }
    }
    public DateTime? DiscontinuedDate {
      get { return PropGet<DateTime?>(); }
      set { PropSet(value); }
    }
    public int RowVersion {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }

    public Category Category {
      get { return PropGet<Category>(); }
      set { PropSet(value); }
    }

    //public NavigationSet<OrderDetail> OrderDetails {
    //  get;
    //  set;
    //}

    public Supplier Supplier {
      get { return PropGet<Supplier>(); }
      set { PropSet(value); }
    }
  }

  public partial class Region : BaseEntity {
    public int RegionID {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }
    public string RegionDescription {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public int RowVersion {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }
    public NavigationSet<Territory> Territories {
      get { return PropGet<NavigationSet<Territory>>(); }
      set { PropSet(value); }
    }

  }

  public partial class Role : BaseEntity {

    public long Id {
      get { return PropGet<long>(); }
      set { PropSet(value); }
    }
    public string Name {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Description {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public byte[] Ts {
      get { return PropGet<byte[]>(); }
      set { PropSet(value); }
    }
    public Nullable<RoleType> RoleType {
      get { return PropGet<RoleType?>(); }
      set { PropSet(value); }
    }

    public NavigationSet<UserRole> UserRoles {
      get { return PropGet<NavigationSet<UserRole>>(); }
      set { PropSet(value); }
    }

  }

  
  public enum RoleType {
    Guest = 0,
    Restricted = 1,
    Standard = 2,
    Admin = 3
  }



  public partial class Supplier : BaseEntity {

    public int SupplierID {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }
    public string CompanyName {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string ContactName {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string ContactTitle {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public Location Location {
      get { return PropGet<Location>(); }
      set { PropSet(value); }
    }
    public string Phone {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Fax {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string HomePage {
      get { return PropGet<string>(); }
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

  
  public partial class Location {
    public string Address { get; set; }
    public string City { get; set; }
    public string Region { get; set; }
    public string PostalCode { get; set; }
    public string Country { get; set; }
  }

  public partial class Territory : BaseEntity {
    public int TerritoryID {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }
    public string TerritoryDescription {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public int RegionID {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }
    public int RowVersion {
      get { return PropGet<int>(); }
      set { PropSet(value); }
    }

    public NavigationSet<EmployeeTerritory> EmployeeTerritories {
      get { return PropGet<NavigationSet<EmployeeTerritory>>(); }
      set { PropSet(value); }
    }
    public Region Region {
      get { return PropGet<Region>(); }
      set { PropSet(value); }
    }
    public NavigationSet<Employee> Employees {
      get { return PropGet<NavigationSet<Employee>>(); }
      set { PropSet(value); }
    }
  }

  public partial class User : BaseEntity {

    public long Id {
      get { return PropGet<long>(); }
      set { PropSet(value); }
    }
    public string UserName {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string UserPassword {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string FirstName {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string LastName {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public string Email {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public decimal RowVersion {
      get { return PropGet<decimal>(); }
      set { PropSet(value); }
    }
    public string CreatedBy {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public long CreatedByUserId {
      get { return PropGet<long>(); }
      set { PropSet(value); }
    }
    public DateTime CreatedDate {
      get { return PropGet<DateTime>(); }
      set { PropSet(value); }
    }
    public string ModifiedBy {
      get { return PropGet<string>(); }
      set { PropSet(value); }
    }
    public long ModifiedByUserId {
      get { return PropGet<long>(); }
      set { PropSet(value); }
    }
    public DateTime ModifiedDate {
      get { return PropGet<DateTime>(); }
      set { PropSet(value); }
    }
    public NavigationSet<UserRole> UserRoles {
      get { return PropGet<NavigationSet<UserRole>>(); }
      set { PropSet(value); }
    }

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

