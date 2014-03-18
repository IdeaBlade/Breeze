using Breeze.NetClient;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Inheritance.Models {
  #region interfaces

  public interface IBillingDetail {
    int Id { get; set; }
    DateTime CreatedAt { get; set; }
    string Owner { get; set; }
    string Number { get; set; }

    // "InheritanceModel" makes it easier to test for the received type
    string InheritanceModel { get; set; } // "TPH", "TPT", "TPC"
  }

  public interface IBankAccount : IBillingDetail {
    string BankName { get; set; }
    string Swift { get; set; }
    int AccountTypeId { get; set; }
    AccountType AccountType { get; set; }
  }

  public interface ICreditCard : IBillingDetail {
    int AccountTypeId { get; set; }
    AccountType AccountType { get; set; } // FKA “CardType”
    string ExpiryMonth { get; set; }
    string ExpiryYear { get; set; }
  }

  public interface IDeposit {
    int Id { get; set; }
    int BankAccountId { get; set; }
    float Amount { get; set; }
    DateTime Deposited { get; set; }
  }

  public class AccountType : EntityBase {
    public int Id { get; set; }
    public string Name { get; set; }
  }

  ///<summary>
  /// Base class for that might have business logic.
  /// Is invisible to EF and metadata because it has no mapped properties
  /// </summary>
  public class EntityBase : BaseEntity {
    // Methods are invisible
    public void DoNothing() { }

    // Internals are invisible to EF and JSON.NET by default
    internal DateTime InternalDate { get; set; }

    // Marked [NotMapped] and therefore invisible to EF.
    // It won't be in metadata but it will be serialized to the client!
    //[NotMapped]
    public int UnmappedInt { get; set; }

    // Hidden from both EF and the client
    //[NotMapped, JsonIgnore]
    public string HiddenString { get; set; }
  }

  #endregion

  #region TPH

  public abstract class BillingDetailTPH : EntityBase, IBillingDetail {
    public int Id {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public DateTime CreatedAt {
      get { return GetValue<DateTime>(); }
      set { SetValue(value); }
    }
    public string Owner {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Number {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public int AccountTypeId {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public AccountType AccountType {
      get { return GetValue<AccountType>(); }
      set { SetValue(value); }
    }
    public string InheritanceModel {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
  }

  public class BankAccountTPH : BillingDetailTPH, IBankAccount {
    public string BankName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Swift {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public NavigationSet<DepositTPH> Deposits {
      get { return GetValue<NavigationSet<DepositTPH>>(); }
      set { SetValue(value); }
    }
  }

  public class CreditCardTPH : BillingDetailTPH, ICreditCard {
    public string ExpiryMonth {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ExpiryYear {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
  }

  public class DepositTPH : EntityBase, IDeposit {
    public int Id {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public int BankAccountId {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public BankAccountTPH BankAccount {
      get { return GetValue<BankAccountTPH>(); }
      set { SetValue(value); }
    }
    public float Amount {
      get { return GetValue<float>(); }
      set { SetValue(value); }
    }
    public DateTime Deposited {
      get { return GetValue<DateTime>(); }
      set { SetValue(value); }
    }
  }

  #endregion

  #region TPT

  public abstract class BillingDetailTPT : EntityBase, IBillingDetail {
    public int Id {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public DateTime CreatedAt {
      get { return GetValue<DateTime>(); }
      set { SetValue(value); }
    }
    public string Owner {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Number {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public int AccountTypeId {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public AccountType AccountType {
      get { return GetValue<AccountType>(); }
      set { SetValue(value); }
    }
    public string InheritanceModel {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
  }

  public class BankAccountTPT : BillingDetailTPT, IBankAccount {
    public string BankName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Swift {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public NavigationSet<DepositTPT> Deposits {
      get { return GetValue<NavigationSet<DepositTPT>>(); }
      set { SetValue(value); }
    }
  }

  public class CreditCardTPT : BillingDetailTPT, ICreditCard {
    public string ExpiryMonth {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ExpiryYear {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
  }

  public class DepositTPT : EntityBase, IDeposit {
    public int Id {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public int BankAccountId {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public BankAccountTPT BankAccount {
      get { return GetValue<BankAccountTPT>(); }
      set { SetValue(value); }
    }
    public float Amount {
      get { return GetValue<float>(); }
      set { SetValue(value); }
    }
    public DateTime Deposited {
      get { return GetValue<DateTime>(); }
      set { SetValue(value); }
    }
  }
  #endregion

  #region TPC

  public abstract class BillingDetailTPC : EntityBase, IBillingDetail {
    public int Id {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public DateTime CreatedAt {
      get { return GetValue<DateTime>(); }
      set { SetValue(value); }
    }
    public string Owner {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Number {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string InheritanceModel {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
  }

  public class BankAccountTPC : BillingDetailTPC, IBankAccount {
    public string BankName {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string Swift {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public int AccountTypeId {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public AccountType AccountType {
      get { return GetValue<AccountType>(); }
      set { SetValue(value); }
    }
    public NavigationSet<DepositTPC> Deposits {
      get { return GetValue<NavigationSet<DepositTPC>>(); }
      set { SetValue(value); }
    }
  }

  public class CreditCardTPC : BillingDetailTPC, ICreditCard {
    public int AccountTypeId {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public AccountType AccountType {
      get { return GetValue<AccountType>(); }
      set { SetValue(value); }
    }
    public string ExpiryMonth {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
    public string ExpiryYear {
      get { return GetValue<string>(); }
      set { SetValue(value); }
    }
  }

  public class DepositTPC : EntityBase, IDeposit {
    public int Id {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public int BankAccountId {
      get { return GetValue<int>(); }
      set { SetValue(value); }
    }
    public BankAccountTPC BankAccount {
      get { return GetValue<BankAccountTPC>(); }
      set { SetValue(value); }
    }
    public float Amount {
      get { return GetValue<float>(); }
      set { SetValue(value); }
    }
    public DateTime Deposited {
      get { return GetValue<DateTime>(); }
      set { SetValue(value); }
    }
  }
  #endregion

}