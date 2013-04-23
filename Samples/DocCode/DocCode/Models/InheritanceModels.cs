// Inheritance test models inspired by Morteza Manavi's posts on EF inheritance
//http://weblogs.asp.net/manavi/archive/2010/12/24/inheritance-mapping-strategies-with-entity-framework-code-first-ctp5-part-1-table-per-hierarchy-tph.aspx
using System;
using System.Collections.Generic;

// ReSharper disable InconsistentNaming

namespace Inheritance.Models
{
    #region interfaces

    public interface IBillingDetail
    {
        int Id { get; set; }
        string inheritanceModel { get; set; } // "TPH", "TPT", "TPC"
        DateTime CreatedAt { get; set; }
        string Owner { get; set; }
        string Number { get; set; }
    }

    public interface IBankAccount : IBillingDetail
    {
        string BankName { get; set; }
        string Swift { get; set; }
        int AccountTypeId { get; set; }
        AccountType AccountType { get; set; }
    }

    public interface ICreditCard : IBillingDetail
    {
        int AccountTypeId { get; set; }
        AccountType AccountType { get; set; } // FKA “CardType”
        string ExpiryMonth { get; set; }
        string ExpiryYear { get; set; }
    }

    public class AccountType
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }

    public interface IDeposit
    {
        int Id { get; set; }
        int BankAccountId { get; set; }
        float Amount { get; set; }
        DateTime Deposited { get; set; }
    }

    #endregion

    #region TPH

    public abstract class BillingDetailTPH : IBillingDetail
    {
        public int Id { get; set; }
        public string inheritanceModel { get; set; }
        public DateTime CreatedAt { get; set;  }
        public string Owner { get; set; }
        public string Number { get; set; }
        public int AccountTypeId { get; set; }
        public AccountType AccountType { get; set; }

    }

    public class BankAccountTPH : BillingDetailTPH, IBankAccount
    {
        public string BankName { get; set; }
        public string Swift { get; set; }
        public ICollection<DepositTPH> Deposits { get; set; }
    }

    public class CreditCardTPH : BillingDetailTPH, ICreditCard
    {
        public string ExpiryMonth { get; set; }
        public string ExpiryYear { get; set; }
    }

    public class DepositTPH : IDeposit
    {
        public int Id { get; set; }
        public int BankAccountId { get; set; }
        public BankAccountTPH BankAccount { get; set; }
        public float Amount { get; set; }
        public DateTime Deposited { get; set; }
    }

    #endregion

    #region TPT

    public abstract class BillingDetailTPT : IBillingDetail
    {
        public int Id { get; set; }
        public string inheritanceModel { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Owner { get; set; }
        public string Number { get; set; }
        public int AccountTypeId { get; set; }
        public AccountType AccountType { get; set; }
    }

    public class BankAccountTPT : BillingDetailTPT, IBankAccount
    {
        public string BankName { get; set; }
        public string Swift { get; set; }
        public ICollection<DepositTPT> Deposits { get; set; }
    }

    public class CreditCardTPT : BillingDetailTPT, ICreditCard
    {
        public string ExpiryMonth { get; set; }
        public string ExpiryYear { get; set; }
    }

    public class DepositTPT : IDeposit
    {
        public int Id { get; set; }
        public int BankAccountId { get; set; }
        public BankAccountTPT BankAccount { get; set; }
        public float Amount { get; set; }
        public DateTime Deposited { get; set; }
    }
    #endregion

    #region TPC

    public abstract class BillingDetailTPC : IBillingDetail
    {
        public int Id { get; set; }
        public string inheritanceModel { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Owner { get; set; }
        public string Number { get; set; }
    }

    public class BankAccountTPC : BillingDetailTPC, IBankAccount
    {
        public string BankName { get; set; }
        public string Swift { get; set; }
        public int AccountTypeId { get; set; }
        public AccountType AccountType { get; set; }
        public ICollection<DepositTPC> Deposits { get; set; }
    }

    public class CreditCardTPC : BillingDetailTPC, ICreditCard
    {
        public int AccountTypeId { get; set; }
        public AccountType AccountType { get; set; }
        public string ExpiryMonth { get; set; }
        public string ExpiryYear { get; set; }
    }

    public class DepositTPC : IDeposit
    {
        public int Id { get; set; }
        public int BankAccountId { get; set; }
        public BankAccountTPC BankAccount { get; set; }
        public float Amount { get; set; }
        public DateTime Deposited { get; set; }
    }
    #endregion

}