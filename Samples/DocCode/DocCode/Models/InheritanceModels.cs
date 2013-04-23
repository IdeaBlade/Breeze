// Inheritance test models inspired by Morteza Manavi's posts on EF inheritance
//http://weblogs.asp.net/manavi/archive/2010/12/24/inheritance-mapping-strategies-with-entity-framework-code-first-ctp5-part-1-table-per-hierarchy-tph.aspx
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

// ReSharper disable InconsistentNaming

namespace Inheritance.Models
{
    #region interfaces

    public interface IBillingDetail
    {
        int Id { get; set; }
        string inheritanceModel { get; set; }
        DateTime CreatedAt { get; set; }
        string Owner { get; set; }
        string Number { get; set; }
    }

    public interface IBankAccount : IBillingDetail
    {
        string BankName { get; set; }
        string Swift { get; set; }
    }

    public interface ICreditCard : IBillingDetail
    {
        int CardType { get; set; }
        string ExpiryMonth { get; set; }
        string ExpiryYear { get; set; }
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
    }

    public class BankAccountTPH : BillingDetailTPH, IBankAccount
    {
        public string BankName { get; set; }
        public string Swift { get; set; }
    }

    public class CreditCardTPH : BillingDetailTPH, ICreditCard
    {
        public int CardType { get; set; }
        public string ExpiryMonth { get; set; }
        public string ExpiryYear { get; set; }
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
    }

    public class BankAccountTPT : BillingDetailTPT, IBankAccount
    {
        public string BankName { get; set; }
        public string Swift { get; set; }
    }

    public class CreditCardTPT : BillingDetailTPT, ICreditCard
    {
        public int CardType { get; set; }
        public string ExpiryMonth { get; set; }
        public string ExpiryYear { get; set; }
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
    }

    public class CreditCardTPC : BillingDetailTPC, ICreditCard
    {
        public int CardType { get; set; }
        public string ExpiryMonth { get; set; }
        public string ExpiryYear { get; set; }
    }

    #endregion
}