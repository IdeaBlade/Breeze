namespace Inheritance.Controllers
{
    using System.Linq;
    using System.Web.Http;
    using Breeze.WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    [BreezeController]
    public class InheritanceController : ApiController
    {
        readonly EFContextProvider<InheritanceContext> _contextProvider =
            new EFContextProvider<InheritanceContext>();

        // ~/breeze/inheritance/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return _contextProvider.Metadata();
        }

        // ~/breeze/inheritance/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _contextProvider.SaveChanges(saveBundle);
        }

        // ~/breeze/inheritance/accountTypes
        [HttpGet]
        public IQueryable<AccountType> AccountTypes()
        {
            return _contextProvider.Context.AccountTypes;
        }

        #region TPH

        // ~/breeze/inheritance/billingDetailTPHs
        [HttpGet]
        public IQueryable<BillingDetailTPH> BillingDetailTPHs()
        {
            return _contextProvider.Context.BillingDetailTPHs;
        }

        // ~/breeze/inheritance/bankAccountTPHs
        [HttpGet]
        public IQueryable<BankAccountTPH> BankAccountTPHs()
        {
            return _contextProvider.Context.BillingDetailTPHs.OfType<BankAccountTPH>();
        }

        // ~/breeze/inheritance/creditCardTPHs
        [HttpGet]
        public IQueryable<CreditCardTPH> CreditCardTPHs()
        {
            return _contextProvider.Context.BillingDetailTPHs.OfType<CreditCardTPH>();
        }

        // ~/breeze/inheritance/statusTPHs
        [HttpGet]
        public IQueryable<StatusTPH> StatusTPHs()
        {
            return _contextProvider.Context.StatusTPHs;
        }
        #endregion

        #region TPT

        // ~/breeze/inheritance/billingDetailTPTs
        [HttpGet]
        public IQueryable<BillingDetailTPT> BillingDetailTPTs()
        {
            return _contextProvider.Context.BillingDetailTPTs;
        }

        // ~/breeze/inheritance/bankAccountTPTs
        [HttpGet]
        public IQueryable<BankAccountTPT> BankAccountTPTs()
        {
            return _contextProvider.Context.BillingDetailTPTs.OfType<BankAccountTPT>();
        }

        // ~/breeze/inheritance/creditCardTPTs
        [HttpGet]
        public IQueryable<CreditCardTPT> CreditCardTPTs()
        {
            return _contextProvider.Context.BillingDetailTPTs.OfType<CreditCardTPT>();
        }

        // ~/breeze/inheritance/statusTPTs
        [HttpGet]
        public IQueryable<StatusTPT> StatusTPTs()
        {
            return _contextProvider.Context.StatusTPTs;
        }
        #endregion

        #region TPC

        // ~/breeze/inheritance/billingDetailTPCs
        [HttpGet]
        public IQueryable<BillingDetailTPC> BillingDetailTPCs()
        {
            return _contextProvider.Context.BillingDetailTPCs;
        }

        // ~/breeze/inheritance/bankAccountTPCs
        [HttpGet]
        public IQueryable<BankAccountTPC> BankAccountTPCs()
        {
            return _contextProvider.Context.BillingDetailTPCs.OfType<BankAccountTPC>();
        }

        // ~/breeze/inheritance/creditCardTPCs
        [HttpGet]
        public IQueryable<CreditCardTPC> CreditCardTPCs()
        {
            return _contextProvider.Context.BillingDetailTPCs.OfType<CreditCardTPC>();
        }
        #endregion

        #region Purge/Reset

        // ~/breeze/inheritance//purge
        [HttpPost]
        public string Purge()
        {
            InheritanceDbInitializer.PurgeDatabase(_contextProvider.Context);
            return "purged";
        }

        // ~/breeze/inheritance//reset
        [HttpPost]
        public string Reset()
        {
            Purge();
            InheritanceDbInitializer.ResetDatabase(_contextProvider.Context);
            return "reset";
        }

        #endregion
    }
}