using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

// ReSharper disable InconsistentNaming

namespace DocCode.Models
{
  #region Category class
 
  public class Category {

    public int CategoryID {get;set;}
    public string CategoryName {get;set;}
    public string Description {get;set;}
    public byte[] Picture {get;set;}
    public int RowVersion {get;set;}
    public ICollection<Product> Products {get;set;}

  }
  #endregion Category class

  #region Customer class
  public class Customer {

    public Guid CustomerID { get; internal set; }

    [MaxLength(5)]
    public string CustomerID_OLD { get; set;}

    [Required, MaxLength(40)]
    public string CompanyName { get; set; }

    [MaxLength(30)]
    public string ContactName { get; set;}

    [MaxLength(30)]
    public string ContactTitle { get; set; }

    [MaxLength(60)]
    public string Address { get; set; }

    [MaxLength(15)]
    public string City { get; set; }

    [MaxLength(15)]
    public string Region { get; set; }

    [MaxLength(10)]
    public string PostalCode { get; set; }

    [MaxLength(15)]
    public string Country { get; set; }

    [MaxLength(24)]
    public string Phone { get; set; }

    [MaxLength(24)]
    public string Fax { get; set; }

    [ConcurrencyCheck]
    public int? RowVersion { get; set; }

    public ICollection<Order> Orders { get; set; }
    
  }
  #endregion Customer class

  #region Employee class

  public class Employee {
 
    public int EmployeeID {get; set;}
    
    [Required, MaxLength(30)]
    public string LastName {get; set;}
    
    [Required, MaxLength(30)]
    public string FirstName {get; set;}
    
    [MaxLength(30)]
    public string Title {get; set;}
    
    [MaxLength(25)]    
    public string TitleOfCourtesy {get; set;}
    
    public DateTime? BirthDate {get; set;}
    
    public DateTime? HireDate {get; set;}
    
    [MaxLength(60)]
    public string Address {get; set;}
    
    [MaxLength(15)]
    public string City {get; set;}
  
    [MaxLength(15)]
    public string Region {get; set;}
   
    [MaxLength(10)]
    public string PostalCode {get; set;}
    
    [MaxLength(15)]
    public string Country {get; set;}
    
    [MaxLength(24)]
    public string HomePhone {get; set;}
    
    [MaxLength(4)]
    public string Extension {get; set;}
    
    public byte[] Photo {get; set;}
   
    public string Notes {get; set;}
    
    [MaxLength(255)]
    public string PhotoPath {get; set;}
    
    public int? ReportsToEmployeeID {get; set;}
    
    public int RowVersion {get; set;}
   
    [InverseProperty("Manager")]
    public ICollection<Employee> DirectReports {get; set;}
    
    [ForeignKey("ReportsToEmployeeID")]
    [InverseProperty("DirectReports")]
    public Employee Manager {get; set;}
    
    [InverseProperty("Employee")]
    public ICollection<EmployeeTerritory> EmployeeTerritories {get;set;}
    
    [InverseProperty("Employee")]
    public ICollection<Order> Orders {get; set;}
    
    [InverseProperty("Employees")]
    public ICollection<Territory> Territories {get;set;}

  }
  #endregion Employee class

  #region EmployeeTerritory class
 
  public class EmployeeTerritory {
    
    public int ID {get;set;}   
    public int EmployeeID {get;set;}    
    public int TerritoryID {get;set;}    
    public int RowVersion {get;set;}
    
    [ForeignKey("EmployeeID")]
    [InverseProperty("EmployeeTerritories")]
    public Employee Employee {get;set;}
   
    [ForeignKey("TerritoryID")]
    [InverseProperty("EmployeeTerritories")]
    public Territory Territory {get;set;}

  }
  #endregion EmployeeTerritory class

  #region Order class

  public class Order {
    
    public int OrderID {get; set;}
    public Guid? CustomerID {get; set;}    
    public int? EmployeeID {get; set;}    
    public DateTime? OrderDate {get; set;}    
    public DateTime? RequiredDate {get; set;}    
    public DateTime? ShippedDate {get; set;}    
    public decimal? Freight {get; set;}
    
    [MaxLength(40)]
    public string ShipName {get; set;}

    [MaxLength(60)]
    public string ShipAddress {get; set;}
    
    [MaxLength(15)]
    public string ShipCity {get; set;}
    
    [MaxLength(15)]
    public string ShipRegion {get; set;}

    [MaxLength(10)]
    public string ShipPostalCode {get; set;}
    
    [MaxLength(15)]
    public string ShipCountry {get; set;}
    
    public int RowVersion {get; set;}

    [ForeignKey("CustomerID")]
    [InverseProperty("Orders")]
    public Customer Customer {get; set;}
    
    [ForeignKey("EmployeeID")]
    [InverseProperty("Orders")]
    public Employee Employee {get; set;}

    [InverseProperty("Order")]
    public ICollection<OrderDetail> OrderDetails {get; set;}
    
    [InverseProperty("Order")]
    public InternationalOrder InternationalOrder {get;set;}

  }
  #endregion Order class

  #region OrderDetail class

  public class OrderDetail {
    
    public int OrderID {get; set;}    
    public int ProductID {get; set;}    
    public decimal UnitPrice {get; set;}    
    public short Quantity {get; set;}    
    public float Discount {get; set;}    
    public int RowVersion {get; set;}
    
    [ForeignKey("OrderID")]
    [InverseProperty("OrderDetails")]
    public Order Order {get; set;}
    
    [ForeignKey("ProductID")]
    // disabled navigation from Product to OrderDetails
    //[InverseProperty("OrderDetails")] 
    public Product Product {get;set;}

  }
  #endregion OrderDetail class

  #region PreviousEmployee class
 
  public class PreviousEmployee {
      
      public int EmployeeID { get; set; }
      
      [Required, MaxLength(30)]
      public string LastName { get; set; }

      [Required, MaxLength(30)]
      public string FirstName { get; set; }
      
      [MaxLength(30)]
      public string Title { get; set; }

      [MaxLength(25)]
      public string TitleOfCourtesy { get; set; }
      
      public DateTime? BirthDate { get; set; }
      
      public DateTime? HireDate { get; set; }

      [MaxLength(60)]
      public string Address { get; set; }

      [MaxLength(15)]
      public string City { get; set; }
      
      [MaxLength(15)]
      public string Region { get; set; }
      
      [MaxLength(10)]
      public string PostalCode { get; set; }
      
      [MaxLength(15)]
      public string Country { get; set; }
      
      [MaxLength(24)]
      public string HomePhone { get; set; }
      
      [MaxLength(4)]
      public string Extension { get; set; }
      
      public byte[] Photo { get; set; }

      public string Notes { get; set; }
      
      [MaxLength(255)]
      public string PhotoPath { get; set; }

      public int? ReportsToEmployeeID { get; set; }
      
      public int RowVersion { get; set; }

  }
  #endregion PreviousEmployee class

  #region Product class
 
  public class Product {    

    public int ProductID {get;set;}
    
    [MaxLength(40)]
    public string ProductName {get;set;}
    
    public int? SupplierID {get;set;}    
    public int? CategoryID {get;set;}    
    public string QuantityPerUnit {get;set;}    
    public decimal? UnitPrice {get;set;}    
    public short? UnitsInStock {get;set;}    
    public short? UnitsOnOrder {get;set;}    
    public short? ReorderLevel {get;set;}
    
    [DefaultValue(false)]
    public bool Discontinued {get;set;}

    public DateTime? DiscontinuedDate {get;set;}    
    public int RowVersion {get;set;}

    [ForeignKey("CategoryID")]
    [InverseProperty("Products")]
    public Category Category {get;set;}

    // Disable the navigation from Product to OrderDetails
    // Retain navigation from OrderDetails to Product
    //
    //[InverseProperty("Product")]
    //public ICollection<OrderDetail> OrderDetails {get;set;}
    
    [ForeignKey("SupplierID")]
    [InverseProperty("Products")]
    public Supplier Supplier {get;set;}

  }
  #endregion Product class

  #region Region class
 
  public class Region {

    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public int RegionID { get; set; }

    [Required, MaxLength(50)]
    public string RegionDescription { get; set; }

    public int RowVersion { get; set; }

    [InverseProperty("Region")]
    public ICollection<Territory> Territories { get; set; }

  }
  #endregion Region class

  #region Role class
  public class Role {

    public long Id { get; set; }

    [Required, MaxLength(50)]
    public string Name { get; set; }
    
    [MaxLength(2000)]
    public string Description { get; set; }

    [InverseProperty("Role")]
    public ICollection<UserRole> UserRoles { get; set; }

  }
  #endregion Role class

  #region Supplier class

  public class Supplier {

    public int SupplierID { get; set; }

    [Required, MaxLength(40)]
    public string CompanyName {get; set;}
    
    [MaxLength(30)]
    public string ContactName {get; set;}
    
    [MaxLength(30)]
    public string ContactTitle {get; set;}
    
    [MaxLength(60)]
    public string Address {get; set;}
    
    [MaxLength(15)]
    public string City {get; set;}
    
    [MaxLength(15)]
    public string Region {get; set;}
    
    [MaxLength(10)]
    public string PostalCode {get; set;}

    [MaxLength(15)]
    public string Country {get; set;}

    [MaxLength(24)]
    public string Phone {get; set;}
    
    [MaxLength(24)]
    public string Fax {get; set;}

    public string HomePage {get; set;}
    
    public int RowVersion  {get; set;}

    [InverseProperty("Supplier")]
    public ICollection<Product> Products {get; set;}

  }
  #endregion Supplier Class

  #region Territory class

  public class Territory {

    public int TerritoryID { get; set; }

    [Required, MaxLength(50)]
    public string TerritoryDescription { get; set; }

    public int RegionID { get; set; }
    public int RowVersion { get; set; }

    [InverseProperty("Territory")]
    public ICollection<EmployeeTerritory> EmployeeTerritories { get; set; }
    
    [ForeignKey("RegionID")]
    [InverseProperty("Territories")]
    public Region Region { get; set; }

    [InverseProperty("Territories")]
    public ICollection<Employee> Employees { get; set; }

  }
  #endregion Territory class

  #region User class

  public class User {

    public long Id { get; set; }
    
    [MaxLength(100)]
    public string UserName { get; set; }

    [MaxLength(200)]
    public string UserPassword { get; set; }

    [MaxLength(100)]
    public string FirstName { get; set; }

    [MaxLength(100)]
    public string LastName { get; set; }

    [MaxLength(100)]
    public string Email { get; set; }

    public decimal RowVersion { get; set; }

    [MaxLength(100)]
    public string CreatedBy { get; set; }

    public long CreatedByUserId { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(100)]
    public string ModifiedBy { get; set; }

    public long ModifiedByUserId { get; set; }

    [ConcurrencyCheck]
    public DateTime ModifiedDate { get; set; }

    [InverseProperty("User")]
    public ICollection<UserRole> UserRoles { get; set; }

  }
  #endregion User class

  #region UserRole class

  public class UserRole {

    public long ID { get; set; }

    public long UserId { get; set; }

    public long RoleId { get; set; }

    [ForeignKey("RoleId")]
    [InverseProperty("UserRoles")]
    public Role Role { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("UserRoles")]
    public User User { get; set; }

  }
  #endregion UserRole class

  #region InternationalOrder class

  public class InternationalOrder {

    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public int OrderID { get; set; }

    [MaxLength(100)]
    public string CustomsDescription { get; set; }

    public decimal ExciseTax { get; set; }

    public int RowVersion { get; set; }
    
    [ForeignKey("OrderID")]
    [InverseProperty("InternationalOrder")]
    [Required]
    public Order Order { get; set; }

  }
  #endregion InternationalOrder class
}
