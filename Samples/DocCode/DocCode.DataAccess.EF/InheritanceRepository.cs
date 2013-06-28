using System.Collections.Generic;
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

        #region Projects - self referencing base class

        public IEnumerable<ProjectBase> Projects
        {
            get { return getProjects(); }
        }
        public IEnumerable<SoftProject> SoftProjects
        {
            get { return getProjects().OfType<SoftProject>(); }
        }
        public IEnumerable<HardProject> HardProjects
        {
            get { return getProjects().OfType<HardProject>(); }
        } 

        // Faking data
        private static IEnumerable<ProjectBase> getProjects()
        {
            if (_projects != null) return _projects;

            _projects = new List<ProjectBase>();

            // Hard Projects
            var pro1 = new SoftProject { Id = 1, Name = "Soft Project 1", Observation = "Main" };
            var pro2 = new SoftProject { Id = 2, Name = "Soft Project 2", Observation = "Secondary" };

            // both children of proj1
            var pro3 = new SoftProject { Id = 3, Name = "Soft Project 3", ParentId = 1, Parent = pro1 };
            var pro4 = new SoftProject { Id = 4, Name = "Soft Project 4", ParentId = 1, Parent = pro1 };

            pro1.Children.Add(pro3);
            pro1.Children.Add(pro4);

            _projects.Add(pro1);
            _projects.Add(pro2);

            // Hard Projects
            var pro5 = new HardProject { Id = 2, Name = "Hard Project 5", Number = 42 };

            _projects.Add(pro5);

            return _projects;           
        }
        private static ICollection<ProjectBase> _projects;
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
