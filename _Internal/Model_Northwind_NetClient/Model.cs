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
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public string CategoryName {
      get { return GetValue<String>(); }
      set { SetValue(value); }
    }
    public string Description {
      get { return GetValue<String>(); }
      set { SetValue(value); }
    }
    public byte[] Picture {
      get { return GetValue<byte[]>(); }
      set { SetValue(value); }
    }
    public int RowVersion {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }

    public NavigationSet<Product> Products {
      get { return GetValue<NavigationSet<Product>>(); }
      set { SetValue(value); }
    }
  }


  public partial class Customer : BaseEntity {

    public System.Guid CustomerID {
      get { return GetValue<System.Guid>(); }
      set { SetValue(value); }
    }
    public string CustomerID_OLD {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string CompanyName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ContactName  {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ContactTitle  {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Address  {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string City  {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Region {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string PostalCode {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Country {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Phone  {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Fax {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public int? RowVersion  {
      get { return GetValue<int?>(); }
      set { SetValue(value); }
    }

    public NavigationSet<Order> Orders {
      get { return GetValue<NavigationSet<Order>>(); }
    }

  }


  public partial class Employee :BaseEntity {
    public int EmployeeID {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public string LastName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string FirstName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Title {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string TitleOfCourtesy {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public DateTime? BirthDate {
      get { return GetValue<DateTime?>(); }
      set { SetValue(value); }
    }
    public DateTime? HireDate {
      get { return GetValue<DateTime?>(); }
      set { SetValue(value); }
    }
    public string Address {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string City {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Region {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string PostalCode {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Country {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string HomePhone {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Extension {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public byte[] Photo {
      get { return GetValue<byte[]>(); }
      set { SetValue(value); }
    }
    public string Notes {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string PhotoPath {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public int? ReportsToEmployeeID {
      get { return GetValue<int?>(); }
      set { SetValue(value); }
    }
    public int RowVersion {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public String FullName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }

    public NavigationSet<Employee> DirectReports {
      get { return GetValue<NavigationSet<Employee>>(); }
      set { SetValue(value); }
    }
    public Employee Manager {
      get { return GetValue<Employee>(); }
      set { SetValue(value); }
    }
    public NavigationSet<EmployeeTerritory> EmployeeTerritories {
      get { return GetValue<NavigationSet<EmployeeTerritory>>(); }
      set { SetValue(value); }
    }
    public NavigationSet<Order> Orders {
      get { return GetValue<NavigationSet<Order>>(); }
      set { SetValue(value); }
    }
    public NavigationSet<Territory> Territories {
      get { return GetValue<NavigationSet<Territory>>(); }
      set { SetValue(value); }
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
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public Nullable<System.Guid> CustomerID {
      get { return GetValue<Nullable<System.Guid>>(); }
      set { SetValue(value); }
    }
    public int? EmployeeID {
      get { return GetValue<int?>(); }
      set { SetValue(value); }
    }
    public DateTime? OrderDate {
      get { return GetValue<DateTime?>(); }
      set { SetValue(value); }
    }
    public DateTime? RequiredDate {
      get { return GetValue<DateTime?>(); }
      set { SetValue(value); }
    }
    public DateTime? ShippedDate {
      get { return GetValue<DateTime?>(); }
      set { SetValue(value); }
    }
    public decimal? Freight {
      get { return GetValue<decimal?>(); }
      set { SetValue(value); }
    }
    public string ShipName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ShipAddress {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ShipCity {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ShipRegion {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ShipPostalCode {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ShipCountry {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public int RowVersion {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }

    public Customer Customer {
      get { return GetValue<Customer>(); }
      set { SetValue(value); }
    }
    public Employee Employee {
      get { return GetValue<Employee>(); }
      set { SetValue(value); }
    }
    public NavigationSet<OrderDetail> OrderDetails {
      get { return GetValue<NavigationSet<OrderDetail>>(); }
      set { SetValue(value); }
    }
    public InternationalOrder InternationalOrder {
      get { return GetValue<InternationalOrder>(); }
      set { SetValue(value); }
    }

  }

  public partial class OrderDetail : BaseEntity {
    public int OrderID {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public int ProductID {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public decimal UnitPrice {
      get { return GetValue<decimal>(); }
      set { SetValue(value); }
    }
    public short Quantity {
      get { return GetValue<short>(); }
      set { SetValue(value); }
    }
    public float Discount {
      get { return GetValue<float>(); }
      set { SetValue(value); }
    }
    public int RowVersion {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }

    public Order Order {
      get { return GetValue<Order>(); }
      set { SetValue(value); }
    }
    public Product Product {
      get { return GetValue<Product>(); }
      set { SetValue(value); }
    }

  }

  public partial class PreviousEmployee : BaseEntity {


    public int EmployeeID {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public string LastName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string FirstName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Title {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string TitleOfCourtesy {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public DateTime? BirthDate {
      get { return GetValue<DateTime?>(); }
      set { SetValue(value); }
    }
    public DateTime? HireDate {
      get { return GetValue<DateTime?>(); }
      set { SetValue(value); }
    }
    public string Address {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string City {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Region {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string PostalCode{
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Country {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string HomePhone {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Extension {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public byte[] Photo {
      get { return GetValue<byte[]>(); }
      set { SetValue(value); }
    }
    public string Notes {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string PhotoPath{
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public int RowVersion {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }

  }

  public partial class Product : BaseEntity {
    public int ProductID {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    } 
    public string ProductName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public int? SupplierID {
      get { return GetValue<int?>(); }
      set { SetValue(value); }
    }
    public int? CategoryID {
      get { return GetValue<int?>(); }
      set { SetValue(value); }
    }
    public string QuantityPerUnit {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public Nullable<decimal> UnitPrice {
      get { return GetValue<Nullable<decimal>>(); }
      set { SetValue(value); }
    }
    public Nullable<short> UnitsInStock {
      get { return GetValue<Nullable<short>>(); }
      set { SetValue(value); }
    }
    public Nullable<short> UnitsOnOrder {
      get { return GetValue<Nullable<short>>(); }
      set { SetValue(value); }
    }
    public Nullable<short> ReorderLevel {
      get { return GetValue<short>(); }
      set { SetValue(value); }
    }
    public bool Discontinued {
      get { return GetValue<bool>(); }
      set { SetValue(value); }
    }
    public DateTime? DiscontinuedDate {
      get { return GetValue<DateTime?>(); }
      set { SetValue(value); }
    }
    public int RowVersion {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }

    public Category Category {
      get { return GetValue<Category>(); }
      set { SetValue(value); }
    }

    //public NavigationSet<OrderDetail> OrderDetails {
    //  get;
    //  set;
    //}

    public Supplier Supplier {
      get { return GetValue<Supplier>(); }
      set { SetValue(value); }
    }
  }

  public partial class Region : BaseEntity {
    public int RegionID {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public string RegionDescription {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public int RowVersion {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public NavigationSet<Territory> Territories {
      get { return GetValue<NavigationSet<Territory>>(); }
      set { SetValue(value); }
    }

  }

  public partial class Role : BaseEntity {

    public long Id {
      get { return GetValue<long>(); }
      set { SetValue(value); }
    }
    public string Name {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Description {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public byte[] Ts {
      get { return GetValue<byte[]>(); }
      set { SetValue(value); }
    }
    public Nullable<RoleType> RoleType {
      get { return GetValue<RoleType?>(); }
      set { SetValue(value); }
    }

    public NavigationSet<UserRole> UserRoles {
      get { return GetValue<NavigationSet<UserRole>>(); }
      set { SetValue(value); }
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
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public string CompanyName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ContactName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ContactTitle {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public Location Location {
      get { return GetValue<Location>(); }
      set { SetValue(value); }
    }
    public string Phone {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Fax {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string HomePage {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public int RowVersion {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }

    public NavigationSet<Product> Products {
      get { return GetValue<NavigationSet<Product>>(); }
      set { SetValue(value); }
    }
  }
  
  public partial class Location : BaseComplexObject {
    public Location() {
      Country = "USA";
    }
    public string Address {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string City {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Region {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string PostalCode {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Country {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
  }

  public partial class Territory : BaseEntity {
    public int TerritoryID {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public string TerritoryDescription {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public int RegionID {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public int RowVersion {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }

    public NavigationSet<EmployeeTerritory> EmployeeTerritories {
      get { return GetValue<NavigationSet<EmployeeTerritory>>(); }
      set { SetValue(value); }
    }
    public Region Region {
      get { return GetValue<Region>(); }
      set { SetValue(value); }
    }
    public NavigationSet<Employee> Employees {
      get { return GetValue<NavigationSet<Employee>>(); }
      set { SetValue(value); }
    }
  }

  public partial class User : BaseEntity {

    public long Id {
      get { return GetValue<long>(); }
      set { SetValue(value); }
    }
    public string UserName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string UserPassword {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string FirstName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string LastName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Email {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public decimal RowVersion {
      get { return GetValue<decimal>(); }
      set { SetValue(value); }
    }
    public string CreatedBy {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public long CreatedByUserId {
      get { return GetValue<long>(); }
      set { SetValue(value); }
    }
    public DateTime CreatedDate {
      get { return GetValue<DateTime>(); }
      set { SetValue(value); }
    }
    public string ModifiedBy {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public long ModifiedByUserId {
      get { return GetValue<long>(); }
      set { SetValue(value); }
    }
    public DateTime ModifiedDate {
      get { return GetValue<DateTime>(); }
      set { SetValue(value); }
    }
    public NavigationSet<UserRole> UserRoles {
      get { return GetValue<NavigationSet<UserRole>>(); }
      set { SetValue(value); }
    }

  }


  public partial class UserRole : BaseEntity {

    public long ID {
      get { return GetValue<long>(); }
      set { SetValue(value); }
    }
    public long UserId {
      get { return GetValue<long>(); }
      set { SetValue(value); }
    }
    public long RoleId {
      get { return GetValue<long>(); }
      set { SetValue(value); }
    }

    public Role Role {
      get { return GetValue<Role>(); }
      set { SetValue(value); }
    }
    public User User {
      get { return GetValue<User>(); }
      set { SetValue(value); }
    }
  }

  public partial class InternationalOrder : BaseEntity {

    public int OrderID {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public string CustomsDescription {
      get { return GetValue<String>(); }
      set { SetValue(value); }
    }
    public decimal ExciseTax {
      get { return GetValue<decimal>(); }
      set { SetValue(value); }
    }
    public int RowVersion {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public Order Order {
      get { return GetValue<Order>(); }
      set { SetValue(value); }
    }

  }

  public partial class TimeLimit : BaseEntity {

    public int Id {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public System.TimeSpan MaxTime {
      get { return GetValue<TimeSpan>(); }
      set { SetValue(value); }
    }
    public Nullable<System.TimeSpan> MinTime {
      get { return GetValue<TimeSpan?>(); }
      set { SetValue(value); }
    }
    public int? TimeGroupId {
      get { return GetValue<int?>(); }
      set { SetValue(value); }
    }

    public TimeGroup TimeGroup {
      get { return GetValue<TimeGroup>(); }
      set { SetValue(value); }
    }
  }


  public partial class TimeGroup : BaseEntity {

    public int Id {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public string Comment {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }

    public NavigationSet<TimeLimit> TimeLimits {
      get { return GetValue<NavigationSet<TimeLimit>>(); }
      set { SetValue(value); }
    }
    
  }


  public partial class Comment : BaseEntity {
    public DateTime CreatedOn {
      get { return GetValue<DateTime>(); }
      set { SetValue(value); }
    }
    public byte SeqNum {
      get { return GetValue<byte>(); }
      set { SetValue(value); }
    }
    public string Comment1 {
      get { return GetValue<String>(); }
      set { SetValue(value); }
    }

  }

  public partial class Geospatial : BaseEntity {

    public Geospatial() {

      //this.Geometry1 = GeometryPolygon.FromText("POLYGON ((30 10, 10 20, 20 40, 40 40, 30 10))");
      //this.Geography1 = Geography.FromText("MULTIPOINT(-122.360 47.656, -122.343 47.656)", 4326);
      // this.Geometry1 = DbGeometry.FromText("GEOMETRYCOLLECTION(POINT(4 6),LINESTRING(4 6,7 10)");

    }
    public int Id {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public Geometry Geometry1 {
      get { return GetValue<Geometry>(); }
      set { SetValue(value); }
    }
    public Geography Geography1 {
      get { return GetValue<Geography>(); }
      set { SetValue(value); }
    }
  }

  public partial class UnusualDate : BaseEntity {
    public int Id {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public DateTimeOffset CreationDate {
      get { return GetValue<DateTimeOffset>(); }
      set { SetValue(value); }
    }
    public DateTime ModificationDate {
      get { return GetValue<DateTime>(); }
      set { SetValue(value); }
    }
    public Nullable<DateTimeOffset> CreationDate2 {
      get { return GetValue<DateTimeOffset?>(); }
      set { SetValue(value); }
    }
    public DateTime? ModificationDate2 {
      get { return GetValue<DateTime?>(); }
      set { SetValue(value); }
    }
  }


}

