using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using DocCode.DataAccess;
using Inheritance.Models;

namespace DocCode.Controllers 
{
    [BreezeController]
    public class InheritanceController : ApiController
    {
        // Todo: inject via an interface rather than "new" the concrete class
        readonly InheritanceRepository _repository = new InheritanceRepository();

        // ~/breeze/inheritance/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return _repository.Metadata;
        }

        // ~/breeze/inheritance/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _repository.SaveChanges(saveBundle);
        }

        // ~/breeze/inheritance/accountTypes
        [HttpGet]
        public IQueryable<AccountType> AccountTypes()
        {
            return _repository.AccountTypes;
        }

        #region Vehicles - a simple TPH model

        // ~/breeze/inheritance/Vehicles
        [HttpGet]
        public IQueryable<Vehicle> Vehicles()
        {
            return _repository.Vehicles;
        }
        // ~/breeze/inheritance/Vehicles
        [HttpGet]
        public IQueryable<Car> Cars()
        {
            return _repository.Cars;
        }
        // ~/breeze/inheritance/Vehicles
        [HttpGet]
        public IQueryable<Bus> Buses()
        {
            return _repository.Buses;
        }
        #endregion

        #region TPH

        // ~/breeze/inheritance/billingDetailTPHs
        [HttpGet]
        public IQueryable<BillingDetailTPH> BillingDetailTPHs()
        {
            return _repository.BillingDetailTPHs;
        }

        // ~/breeze/inheritance/bankAccountTPHs
        [HttpGet]
        public IQueryable<BankAccountTPH> BankAccountTPHs()
        {
            return _repository.BankAccountTPHs;
        }

        // ~/breeze/inheritance/creditCardTPHs
        [HttpGet]
        public IQueryable<CreditCardTPH> CreditCardTPHs()
        {
            return _repository.CreditCardTPHs;
        }

        // ~/breeze/inheritance/statusTPHs
        [HttpGet]
        public IQueryable<StatusTPH> StatusTPHs()
        {
            return _repository.StatusTPHs;
        }
        #endregion

        #region TPT

        // ~/breeze/inheritance/billingDetailTPTs
        [HttpGet]
        public IQueryable<BillingDetailTPT> BillingDetailTPTs()
        {
            return _repository.BillingDetailTPTs;
        }

        // ~/breeze/inheritance/bankAccountTPTs
        [HttpGet]
        public IQueryable<BankAccountTPT> BankAccountTPTs()
        {
            return _repository.BankAccountTPTs;
        }

        // ~/breeze/inheritance/creditCardTPTs
        [HttpGet]
        public IQueryable<CreditCardTPT> CreditCardTPTs()
        {
            return _repository.CreditCardTPTs;
        }

        // ~/breeze/inheritance/statusTPTs
        [HttpGet]
        public IQueryable<StatusTPT> StatusTPTs()
        {
            return _repository.StatusTPTs;
        }
        #endregion

        #region TPC

        // ~/breeze/inheritance/billingDetailTPCs
        [HttpGet]
        public IQueryable<BillingDetailTPC> BillingDetailTPCs()
        {
            return _repository.BillingDetailTPCs;
        }

        // ~/breeze/inheritance/bankAccountTPCs
        [HttpGet]
        public IQueryable<BankAccountTPC> BankAccountTPCs()
        {
            return _repository.BankAccountTPCs;
        }

        // ~/breeze/inheritance/creditCardTPCs
        [HttpGet]
        public IQueryable<CreditCardTPC> CreditCardTPCs()
        {
            return _repository.CreditCardTPCs;
        }
        #endregion

        #region Self referencing hierarchy

        [HttpGet]
        public System.Collections.Generic.ICollection<AClass> Projects()
        {
            return _repository.Projects();
        }

        #endregion
        
        #region Purge/Reset

        // ~/breeze/inheritance//purge
        [HttpPost]
        public string Purge()
        {
            return _repository.Purge();
        }

        // ~/breeze/inheritance//reset
        [HttpPost]
        public string Reset()
        {
            return _repository.Reset();
        }

        #endregion
    }
}