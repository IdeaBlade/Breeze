using System.Linq;
using System.Web.Http;

using Breeze.ContextProvider;
using Breeze.ContextProvider.EF6;
using Breeze.WebApi2;

using Newtonsoft.Json.Linq;

using Inheritance.Models;

namespace Inheritance.Controllers {
 
  [BreezeController]
  public class InheritanceController : ApiController {

    readonly EFContextProvider<InheritanceContext> _contextProvider =
        new EFContextProvider<InheritanceContext>();

    // ~/breeze/inheritance/Metadata 
    [HttpGet]
    public string Metadata() {
      return _contextProvider.Metadata();
    }

    // ~/breeze/inheritance/SaveChanges
    [HttpPost]
    public SaveResult SaveChanges(JObject saveBundle) {
      return _contextProvider.SaveChanges(saveBundle);
    }

    // ~/breeze/inheritance/accountTypes
    [HttpGet]
    public IQueryable<AccountType> AccountTypes() {
      return _contextProvider.Context.AccountTypes;
    }

    #region TPH

    // ~/breeze/inheritance/billingDetailsTPH
    [HttpGet]
    public IQueryable<BillingDetailTPH> BillingDetailTPHs() {
      return _contextProvider.Context.BillingDetailTPHs;
    }

    // ~/breeze/inheritance/bankAccountTPH
    [HttpGet]
    public IQueryable<BankAccountTPH> BankAccountTPHs() {
      return _contextProvider.Context.BillingDetailTPHs.OfType<BankAccountTPH>();
    }

    // ~/breeze/inheritance/creditCardsTPH
    [HttpGet]
    public IQueryable<CreditCardTPH> CreditCardTPHs() {
      return _contextProvider.Context.BillingDetailTPHs.OfType<CreditCardTPH>();
    }
    #endregion

    #region TPT

    // ~/breeze/inheritance/billingDetailsTPT
    [HttpGet]
    public IQueryable<BillingDetailTPT> BillingDetailTPTs() {
      return _contextProvider.Context.BillingDetailTPTs;
    }

    // ~/breeze/inheritance/bankAccountTPT
    [HttpGet]
    public IQueryable<BankAccountTPT> BankAccountTPTs() {
      return _contextProvider.Context.BillingDetailTPTs.OfType<BankAccountTPT>();
    }

    // ~/breeze/inheritance/creditCardsTPT
    [HttpGet]
    public IQueryable<CreditCardTPT> CreditCardTPTs() {
      return _contextProvider.Context.BillingDetailTPTs.OfType<CreditCardTPT>();
    }
    #endregion

    #region TPC

    // ~/breeze/inheritance/billingDetailsTPC
    [HttpGet]
    public IQueryable<BillingDetailTPC> BillingDetailTPCs() {
      return _contextProvider.Context.BillingDetailTPCs;
    }

    // ~/breeze/inheritance/bankAccountTPC
    [HttpGet]
    public IQueryable<BankAccountTPC> BankAccountTPCs() {
      return _contextProvider.Context.BillingDetailTPCs.OfType<BankAccountTPC>();
    }

    // ~/breeze/inheritance/creditCardsTPC
    [HttpGet]
    public IQueryable<CreditCardTPC> CreditCardTPCs() {
      return _contextProvider.Context.BillingDetailTPCs.OfType<CreditCardTPC>();
    }
    #endregion

    #region Purge/Reset

    // ~/breeze/inheritance//purge
    [HttpPost]
    public string Purge() {
      InheritanceDbInitializer.PurgeDatabase(_contextProvider.Context);
      return "purged";
    }

    // ~/breeze/inheritance//reset
    [HttpPost]
    public string Reset() {
      Purge();
      InheritanceDbInitializer.ResetDatabase(_contextProvider.Context);
      return "reset";
    }

    #endregion
  }
}