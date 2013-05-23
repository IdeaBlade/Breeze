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

        #region Vehicles - a simple TPH model

        public IQueryable<Vehicle> Vehicles
        {
            get { return Context.Vehicles; }
        }
        public IQueryable<Bus> Buses
        {
            get { return Context.Vehicles.OfType<Bus>(); }
        }
        public IQueryable<Car> Cars
        {
            get { return Context.Vehicles.OfType<Car>(); }
        }

        #endregion

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

        #region Self-referencing hierarchy
        public System.Collections.Generic.ICollection<AClass> Projects()
        {
            // Faking query result
            System.Collections.Generic.ICollection<AClass> projects =
                new System.Collections.Generic.List<AClass>();

            var pro1 = new AClass(); 
            var pro2 = new AClass(); 
            var pro3 = new AClass(); 
            var pro4 = new AClass();

            pro1.Id = 1; pro1.Name = "Project 1"; pro1.Observation = "Main";
            pro2.Id = 2; pro2.Name = "Project 2"; pro2.Observation = "Main";

            pro3.Id = 3; pro3.Name = "Sub Project 3"; 
                pro3.ParentId = 1; pro3.Parent = pro1;

            pro4.Id = 4; pro4.Name = "Sub Project 4";
                pro4.ParentId = 1; pro4.Parent = pro1;

            pro1.Children.Add(pro3);
            pro1.Children.Add(pro4);

            projects.Add(pro1);
            projects.Add(pro2);

            return projects;
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
