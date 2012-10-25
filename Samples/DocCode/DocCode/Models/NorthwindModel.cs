using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Runtime.Serialization;

// ReSharper disable InconsistentNaming

namespace DocCode.Models
{

  #region Category class

  [DataContract(IsReference = true)]
  public class Category {

    [DataMember]
    public int CategoryID {get;set;}

    [DataMember]
    public string CategoryName {get;set;}

    [DataMember]
    public string Description {get;set;}

    [DataMember]
    public byte[] Picture {get;set;}

    [DataMember]
    public int RowVersion {get;set;}

    /** Navigation properties **/

    [DataMember]
    [InverseProperty("Category")]
    public ICollection<Product> Products {get;set;}

  }
  #endregion Category class

  #region Customer class

  [DataContract(IsReference=true)]
  public class Customer {

    [DataMember]
    public Guid CustomerID { get; internal set; }

    [DataMember]
    [MaxLength(5)]
    public string CustomerID_OLD { get; set;}

    [DataMember]
    [Required, MaxLength(40)]
    public string CompanyName { get; set; }

    [DataMember]
    [MaxLength(30)]
    public string ContactName { get; set;}

    [DataMember]
    [MaxLength(30)]
    public string ContactTitle { get; set; }

    [DataMember]
    [MaxLength(60)]
    public string Address { get; set; }

    [DataMember]
    [MaxLength(15)]
    public string City { get; set; }

    [DataMember]
    [MaxLength(15)]
    public string Region { get; set; }

    [DataMember]
    [MaxLength(10)]
    public string PostalCode { get; set; }

    [DataMember]
    [MaxLength(15)]
    public string Country { get; set; }

    [DataMember]
    [MaxLength(24)]
    public string Phone { get; set; }

    [DataMember]
    [MaxLength(24)]
    public string Fax { get; set; }

    [DataMember]
    [ConcurrencyCheck]
    public int? RowVersion { get; set; }

    /*** Navigation Properties ***/

    [DataMember]
    [InverseProperty("Customer")]
    public ICollection<Order> Orders { get; set; }
    
  }
  #endregion Customer class

  #region Employee class

  [DataContract(IsReference=true)]
  public class Employee {

    [DataMember]
    public int EmployeeID {get; set;}

    [DataMember]
    [Required, MaxLength(30)]
    public string LastName {get; set;}

    [DataMember]
    [Required, MaxLength(30)]
    public string FirstName {get; set;}

    [DataMember]
    [MaxLength(30)]
    public string Title {get; set;}

    [DataMember]
    [MaxLength(25)]    
    public string TitleOfCourtesy {get; set;}

    [DataMember]
    public DateTime? BirthDate {get; set;}

    [DataMember]
    public DateTime? HireDate {get; set;}

    [DataMember]
    [MaxLength(60)]
    public string Address {get; set;}

    [DataMember]
    [MaxLength(15)]
    public string City {get; set;}

    [DataMember]
    [MaxLength(15)]
    public string Region {get; set;}

    [DataMember]
    [MaxLength(10)]
    public string PostalCode {get; set;}

    [DataMember]
    [MaxLength(15)]
    public string Country {get; set;}

    [DataMember]
    [MaxLength(24)]
    public string HomePhone {get; set;}

    [DataMember]
    [MaxLength(4)]
    public string Extension {get; set;}

    [DataMember]
    public byte[] Photo {get; set;}

    [DataMember]
    public string Notes {get; set;}

    [DataMember]
    [MaxLength(255)]
    public string PhotoPath {get; set;}

    [DataMember]
    public int? ReportsToEmployeeID {get; set;}

    [DataMember]
    public int RowVersion {get; set;}

    /*** Navigation properties ***/

    [DataMember]
    [InverseProperty("Manager")]
    public ICollection<Employee> DirectReports {get; set;}

    [DataMember]
    [ForeignKey("ReportsToEmployeeID")]
    [InverseProperty("DirectReports")]
    public Employee Manager {get; set;}

    [DataMember]
    [InverseProperty("Employee")]
    public ICollection<EmployeeTerritory> EmployeeTerritories {get;set;}

    [DataMember]
    [InverseProperty("Employee")]
    public ICollection<Order> Orders {get; set;}

    [DataMember]
    [InverseProperty("Employees")]
    public ICollection<Territory> Territories {get;set;}

  }
  #endregion Employee class

  #region EmployeeTerritory class

  [DataContract(IsReference = true)]
  public class EmployeeTerritory {

    [DataMember]
    public int ID {get;set;}

    [DataMember]
    public int EmployeeID {get;set;}

    [DataMember]
    public int TerritoryID {get;set;}

    [DataMember]
    public int RowVersion {get;set;}

    /** Navigation properties **/

    [DataMember]
    [ForeignKey("EmployeeID")]
    [InverseProperty("EmployeeTerritories")]
    public Employee Employee {get;set;}

    [DataMember]
    [ForeignKey("TerritoryID")]
    [InverseProperty("EmployeeTerritories")]
    public Territory Territory {get;set;}

  }
  #endregion EmployeeTerritory class

  #region Order class

  [DataContract(IsReference=true)]
  public class Order {

    [DataMember]
    public int OrderID {get; set;}

    [DataMember]
    public Guid? CustomerID {get; set;}

    [DataMember]
    public int? EmployeeID {get; set;}

    [DataMember]
    public DateTime? OrderDate {get; set;}

    [DataMember]
    public DateTime? RequiredDate {get; set;}

    [DataMember]
    public DateTime? ShippedDate {get; set;}

    [DataMember]
    public decimal? Freight {get; set;}

    [DataMember]
    [MaxLength(40)]
    public string ShipName {get; set;}

    [DataMember]
    [MaxLength(60)]
    public string ShipAddress {get; set;}

    [DataMember]
    [MaxLength(15)]
    public string ShipCity {get; set;}

    [DataMember]
    [MaxLength(15)]
    public string ShipRegion {get; set;}

    [DataMember]
    [MaxLength(10)]
    public string ShipPostalCode {get; set;}

    [DataMember]
    [MaxLength(15)]
    public string ShipCountry {get; set;}

    [DataMember]
    public int RowVersion {get; set;}

    /*** Navigation Properties ***/

    [DataMember]
    [ForeignKey("CustomerID")]
    [InverseProperty("Orders")]
    public Customer Customer {get; set;}

    [DataMember]
    [ForeignKey("EmployeeID")]
    [InverseProperty("Orders")]
    public Employee Employee {get; set;}

    [DataMember]
    [InverseProperty("Order")]
    public ICollection<OrderDetail> OrderDetails {get; set;}

    [DataMember]
    [InverseProperty("Order")]
    public InternationalOrder InternationalOrder {get;set;}

  }
  #endregion Order class

  #region OrderDetail class

  [DataContract(IsReference=true)]
  public class OrderDetail {

    [DataMember]
    public int OrderID {get; set;}

    [DataMember]
    public int ProductID {get; set;}

    [DataMember]
    public decimal UnitPrice {get; set;}

    [DataMember]
    public short Quantity {get; set;}

    [DataMember]
    public float Discount {get; set;}

    [DataMember]
    public int RowVersion {get; set;}

    [DataMember]
    [ForeignKey("OrderID")]
    [InverseProperty("OrderDetails")]
    public Order Order {get; set;}

    [DataMember]
    [ForeignKey("ProductID")]
    // disabled navigation from Product to OrderDetails
    //[InverseProperty("OrderDetails")] 
    public Product Product {get;set;}

  }
  #endregion OrderDetail class

  #region PreviousEmployee class

  [DataContract(IsReference = true)]
  public class PreviousEmployee {

      [DataMember]
      public int EmployeeID { get; set; }

      [DataMember]
      [Required, MaxLength(30)]
      public string LastName { get; set; }

      [DataMember]
      [Required, MaxLength(30)]
      public string FirstName { get; set; }

      [DataMember]
      [MaxLength(30)]
      public string Title { get; set; }

      [DataMember]
      [MaxLength(25)]
      public string TitleOfCourtesy { get; set; }

      [DataMember]
      public DateTime? BirthDate { get; set; }

      [DataMember]
      public DateTime? HireDate { get; set; }

      [DataMember]
      [MaxLength(60)]
      public string Address { get; set; }

      [DataMember]
      [MaxLength(15)]
      public string City { get; set; }

      [DataMember]
      [MaxLength(15)]
      public string Region { get; set; }

      [DataMember]
      [MaxLength(10)]
      public string PostalCode { get; set; }

      [DataMember]
      [MaxLength(15)]
      public string Country { get; set; }

      [DataMember]
      [MaxLength(24)]
      public string HomePhone { get; set; }

      [DataMember]
      [MaxLength(4)]
      public string Extension { get; set; }

      [DataMember]
      public byte[] Photo { get; set; }

      [DataMember]
      public string Notes { get; set; }

      [DataMember]
      [MaxLength(255)]
      public string PhotoPath { get; set; }

      [DataMember]
      public int? ReportsToEmployeeID { get; set; }

      [DataMember]
      public int RowVersion { get; set; }

    /*** Navigation properties (none) ***/

  }
  #endregion PreviousEmployee class

  #region Product class

  [DataContract(IsReference = true)]
  public class Product {

    [DataMember]

    public int ProductID {get;set;}

    [DataMember]
    [MaxLength(40)]
    public string ProductName {get;set;}

    [DataMember]
    public int? SupplierID {get;set;}

    [DataMember]
    public int? CategoryID {get;set;}

    [DataMember]
    public string QuantityPerUnit {get;set;}

    [DataMember]
    public decimal? UnitPrice {get;set;}

    [DataMember]
    public short? UnitsInStock {get;set;}

    [DataMember]
    public short? UnitsOnOrder {get;set;}

    [DataMember]
    public short? ReorderLevel {get;set;}

    [DataMember]
    [DefaultValue(false)]
    public bool Discontinued {get;set;}

    [DataMember]
    public DateTime? DiscontinuedDate {get;set;}

    [DataMember]
    public int RowVersion {get;set;}

    /** Navigation properties **/

    [DataMember]
    [ForeignKey("CategoryID")]
    [InverseProperty("Products")]
    public Category Category {get;set;}

    // Disable the navigation from Product to OrderDetails
    // Retain navigation from OrderDetails to Product
    //[DataMember]
    //[InverseProperty("Product")]
    //public ICollection<OrderDetail> OrderDetails {get;set;}

    [DataMember]
    [ForeignKey("SupplierID")]
    [InverseProperty("Products")]
    public Supplier Supplier {get;set;}

  }
  #endregion Product class

  #region Region class

  [DataContract(IsReference = true)]
  [Table("Region", Schema = "dbo")]
  public class Region {

    #region Data Properties

    [Key]
    [DataMember]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [Column("RegionID")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="Region_RegionID")]
    public int RegionID {
      get;
      set;
    }

    [DataMember]
    [Column("RegionDescription")]
    [MaxLength(50)]
    [Required]
    // [IbVal.StringLengthVerifier(MaxValue=50, IsRequired=true, ErrorMessageResourceName="Region_RegionDescription")]
    public string RegionDescription {
      get;
      set;
    }

    [DataMember]
    [Column("RowVersion")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="Region_RowVersion")]
    public int RowVersion {
      get;
      set;
    }
    #endregion Data Properties

    #region Navigation properties

    [DataMember]
    [InverseProperty("Region")]
    public ICollection<Territory> Territories {
      get;
      set;
    }
    #endregion Navigation properties

  }
  #endregion Region class

  #region Role class

  [DataContract(IsReference = true)]
  [Table("Role", Schema = "dbo")]
  public class Role {

    #region Data Properties

    [Key]
    [DataMember]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("Id")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="Role_Id")]
    public long Id {
      get;
      set;
    }

    [DataMember]
    [Column("Name")]
    // [IbVal.StringLengthVerifier(MaxValue=50, IsRequired=true, ErrorMessageResourceName="Role_Name")]
    [MaxLength(50)]
    [Required]
    public string Name {
      get;
      set;
    }

    [DataMember]
    [Column("Description")]
    // [IbVal.StringLengthVerifier(MaxValue=2000, IsRequired=false, ErrorMessageResourceName="Role_Description")]
    [MaxLength(2000)]
    public string Description {
      get;
      set;
    }
    #endregion Data Properties

    #region Navigation properties

    [DataMember]
    [InverseProperty("Role")]
    public ICollection<UserRole> UserRoles {
      get;
      set;
    }
    #endregion Navigation properties

  }
  #endregion Role class

  #region Supplier class

  [DataContract(IsReference = true)]
  public class Supplier {

      [DataMember]
      public int SupplierID { get; set; }

    [DataMember]
    [Required, MaxLength(40)]
    public string CompanyName {get; set;}

    [DataMember]
    [MaxLength(30)]
    public string ContactName {get; set;}

    [DataMember]
    [MaxLength(30)]
    public string ContactTitle {get; set;}

    [DataMember]
    [MaxLength(60)]
    public string Address {get; set;}

    [DataMember]
    [MaxLength(15)]
    public string City {get; set;}

    [DataMember]
    [MaxLength(15)]
    public string Region {get; set;}

    [DataMember]
    [MaxLength(10)]
    public string PostalCode {get; set;}

    [DataMember]
    [MaxLength(15)]
    public string Country {get; set;}

    [DataMember]
    [MaxLength(24)]
    public string Phone {get; set;}

    [DataMember]
    [MaxLength(24)]
    public string Fax {get; set;}

    [DataMember]
    public string HomePage {get; set;}

    [DataMember]
    public int RowVersion  {get; set;}

    /** Navigation properties **/

    [DataMember]
    [InverseProperty("Supplier")]
    public ICollection<Product> Products {get; set;}

  }
  #endregion Navigation properties

  #region Territory class

  [DataContract(IsReference = true)]
  [Table("Territory", Schema = "dbo")]
  public class Territory {

    #region Data Properties

    [Key]
    [DataMember]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [Column("TerritoryID")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="Territory_TerritoryID")]
    public int TerritoryID {
      get;
      set;
    }

    [DataMember]
    [Column("TerritoryDescription")]
    // [IbVal.StringLengthVerifier(MaxValue=50, IsRequired=true, ErrorMessageResourceName="Territory_TerritoryDescription")]
    [MaxLength(50)]
    [Required]
    public string TerritoryDescription {
      get;
      set;
    }

    [DataMember]
    // [ForeignKey("Region")]
    [Column("RegionID")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="Territory_RegionID")]
    public int RegionID {
      get;
      set;
    }

    [DataMember]
    [Column("RowVersion")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="Territory_RowVersion")]
    public int RowVersion {
      get;
      set;
    }
    #endregion Data Properties

    #region Navigation properties

    [DataMember]
    [InverseProperty("Territory")]
    public ICollection<EmployeeTerritory> EmployeeTerritories {
      get;
      set;
    }

    [DataMember]
    [ForeignKey("RegionID")]
    [InverseProperty("Territories")]
    public Region Region {
      get;
      set;
    }

    [DataMember]
    [InverseProperty("Territories")]
    public ICollection<Employee> Employees {
      get;
      set;
    }
    #endregion Navigation properties

  }
  #endregion Territory class

  #region User class

  [DataContract(IsReference = true)]
  [Table("User", Schema = "dbo")]
  public class User {

    [Key]
    [DataMember]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("Id")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="User_Id")]
    public long Id {
      get;
      set;
    }

    [DataMember]
    [Column("UserName")]
    // [IbVal.StringLengthVerifier(MaxValue=100, IsRequired=true, ErrorMessageResourceName="User_UserName")]
    [MaxLength(100)]
    public string UserName {
      get;
      set;
    }

    [DataMember]
    [Column("UserPassword")]
    // [IbVal.StringLengthVerifier(MaxValue=200, IsRequired=false, ErrorMessageResourceName="User_UserPassword")]
    [MaxLength(200)]
    public string UserPassword {
      get;
      set;
    }

    [DataMember]
    [Column("FirstName")]
    // [IbVal.StringLengthVerifier(MaxValue=100, IsRequired=true, ErrorMessageResourceName="User_FirstName")]
    [MaxLength(100)]
    public string FirstName {
      get;
      set;
    }

    [DataMember]
    [Column("LastName")]
    // [IbVal.StringLengthVerifier(MaxValue=100, IsRequired=true, ErrorMessageResourceName="User_LastName")]
    [MaxLength(100)]
    public string LastName {
      get;
      set;
    }

    [DataMember]
    [Column("Email")]
    // [IbVal.StringLengthVerifier(MaxValue=100, IsRequired=true, ErrorMessageResourceName="User_Email")]
    [MaxLength(100)]
    public string Email {
      get;
      set;
    }

    [DataMember]
    [Column("RowVersion")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="User_RowVersion")]
    public decimal RowVersion {
      get;
      set;
    }

    [DataMember]
    [Column("CreatedBy")]
    // [IbVal.StringLengthVerifier(MaxValue=100, IsRequired=true, ErrorMessageResourceName="User_CreatedBy")]
    [MaxLength(100)]
    public string CreatedBy {
      get;
      set;
    }

    [DataMember]
    [Column("CreatedByUserId")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="User_CreatedByUserId")]
    public long CreatedByUserId {
      get;
      set;
    }

    [DataMember]
    [Column("CreatedDate")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="User_CreatedDate")]
    public DateTime CreatedDate {
      get;
      set;
    }

    [DataMember]
    [Column("ModifiedBy")]
    // [IbVal.StringLengthVerifier(MaxValue=100, IsRequired=true, ErrorMessageResourceName="User_ModifiedBy")]
    [MaxLength(100)]
    public string ModifiedBy {
      get;
      set;
    }

    [DataMember]
    [Column("ModifiedByUserId")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="User_ModifiedByUserId")]
    public long ModifiedByUserId {
      get;
      set;
    }

    [DataMember]
    // [IbEm.ConcurrencyStrategy(IbEm.ConcurrencyStrategy.Client)]
    [Column("ModifiedDate")]
    [ConcurrencyCheck]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="User_ModifiedDate")]
    public DateTime ModifiedDate {
      get;
      set;
    }

    /** Navigation properties **/

    [DataMember]
    [InverseProperty("User")]
    public ICollection<UserRole> UserRoles {
      get;
      set;
    }
  }
  #endregion User class

  #region UserRole class

  /// <summary>The auto-generated UserRole class. </summary>
  [DataContract(IsReference = true)]
  [Table("UserRole", Schema = "dbo")]
  public class UserRole {

    #region Data Properties

    /// <summary>Gets or sets the ID. </summary>
    [Key]
    [DataMember]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ID")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="UserRole_ID")]
    public long ID {
      get;
      set;
    }

    /// <summary>Gets or sets the UserId. </summary>
    [DataMember]
    // [ForeignKey("User")]
    [Column("UserId")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="UserRole_UserId")]
    public long UserId {
      get;
      set;
    }

    /// <summary>Gets or sets the RoleId. </summary>
    [DataMember]
    // [ForeignKey("Role")]
    [Column("RoleId")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="UserRole_RoleId")]
    public long RoleId {
      get;
      set;
    }
    #endregion Data Properties

    #region Navigation properties

    /// <summary>Gets or sets the Role. </summary>
    [DataMember]
    [ForeignKey("RoleId")]
    [InverseProperty("UserRoles")]
    public Role Role {
      get;
      set;
    }

    /// <summary>Gets or sets the User. </summary>
    [DataMember]
    [ForeignKey("UserId")]
    [InverseProperty("UserRoles")]
    public User User {
      get;
      set;
    }
    #endregion Navigation properties

  }
  #endregion UserRole class

  #region InternationalOrder class

  /// <summary>The auto-generated InternationalOrder class. </summary>
  [DataContract(IsReference = true)]
  [Table("InternationalOrder", Schema = "dbo")]
  public class InternationalOrder {

    #region Data Properties

    /// <summary>Gets or sets the OrderID. </summary>
    [Key]
    [DataMember]
    // [ForeignKey("Order")]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [Column("OrderID")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="InternationalOrder_OrderID")]
    public int OrderID {
      get;
      set;
    }

    /// <summary>Gets or sets the CustomsDescription. </summary>
    [DataMember]
    [Column("CustomsDescription")]
    // [IbVal.StringLengthVerifier(MaxValue=100, IsRequired=true, ErrorMessageResourceName="InternationalOrder_CustomsDescription")]
    [MaxLength(100)]
    public string CustomsDescription {
      get;
      set;
    }

    /// <summary>Gets or sets the ExciseTax. </summary>
    [DataMember]
    [Column("ExciseTax")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="InternationalOrder_ExciseTax")]
    public decimal ExciseTax {
      get;
      set;
    }

    /// <summary>Gets or sets the RowVersion. </summary>
    [DataMember]
    [Column("RowVersion")]
    // [IbVal.RequiredValueVerifier( ErrorMessageResourceName="InternationalOrder_RowVersion")]
    public int RowVersion {
      get;
      set;
    }
    #endregion Data Properties

    #region Navigation properties

    /// <summary>Gets or sets the Order. </summary>
    [DataMember]
    [ForeignKey("OrderID")]
    [InverseProperty("InternationalOrder")]
    [Required]
    public Order Order {
      get;
      set;
    }
    #endregion Navigation properties

  }
  #endregion InternationalOrder class
}
