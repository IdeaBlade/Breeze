using System.Linq;
using Breeze.WebApi;
using Inheritance.Models;
using Newtonsoft.Json.Linq;

namespace DocCode.DataAccess
{
    /// <summary>
    /// Repository (a "Unit of Work" really) of Inheritance models.
    /// </summary>
    public class InheritanceRepository
    {
        private readonly EFContextProvider<InheritanceContext>
            _contextProvider = new EFContextProvider<InheritanceContext>();

        private InheritanceContext Context { get { return _contextProvider.Context; } }

        public string Metadata
        {
            get {return _contextProvider.Metadata();}
        }

        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _contextProvider.SaveChanges(saveBundle);
        }

        public IQueryable<AccountType> AccountTypes
        {
            get { return Context.AccountTypes; }
        }

        #region TPH

        public IQueryable<BillingDetailTPH> BillingDetailTPHs
        {
            get { return Context.BillingDetailTPHs;}
        }

        public IQueryable<BankAccountTPH> BankAccountTPHs
        {
            get { return Context.BillingDetailTPHs.OfType<BankAccountTPH>(); }
        }

        public IQueryable<CreditCardTPH> CreditCardTPHs
        {
            get { return Context.BillingDetailTPHs.OfType<CreditCardTPH>();}
        }

        public IQueryable<StatusTPH> StatusTPHs
        {
            get { return Context.StatusTPHs; }
        }
        #endregion

        #region TPT

        public IQueryable<BillingDetailTPT> BillingDetailTPTs
        {
            get { return Context.BillingDetailTPTs; }
        }

        public IQueryable<BankAccountTPT> BankAccountTPTs
        {
            get { return Context.BillingDetailTPTs.OfType<BankAccountTPT>(); }
        }

        public IQueryable<CreditCardTPT> CreditCardTPTs
        {
            get { return Context.BillingDetailTPTs.OfType<CreditCardTPT>();}
        }

        public IQueryable<StatusTPT> StatusTPTs
        {
            get { return Context.StatusTPTs; }
        }
        #endregion

        #region TPC

        public IQueryable<BillingDetailTPC> BillingDetailTPCs
        {
            get { return Context.BillingDetailTPCs; }
        }

        public IQueryable<BankAccountTPC> BankAccountTPCs
        {
            get { return Context.BillingDetailTPCs.OfType<BankAccountTPC>(); }
        }

        public IQueryable<CreditCardTPC> CreditCardTPCs
        {
            get { return Context.BillingDetailTPCs.OfType<CreditCardTPC>(); }
        }
        #endregion

        #region Purge/Reset

        public string Purge()
        {
            InheritanceDbInitializer.PurgeDatabase(Context);
            return "purged";
        }

        public string Reset()
        {
            Purge();
            InheritanceDbInitializer.ResetDatabase(Context);
            return "reset";
        }

        #endregion

    }
}
