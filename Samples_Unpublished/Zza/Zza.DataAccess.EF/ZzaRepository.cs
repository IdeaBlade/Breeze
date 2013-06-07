using System.Linq;
using Breeze.WebApi;
using Zza.Model;
using Newtonsoft.Json.Linq;

namespace Zza.DataAccess.EF
{
    /// <summary>
    /// Repository (a "Unit of Work" really) of Zza models.
    /// </summary>
    public class ZzaRepository
    {
        private readonly EFContextProvider<ZzaContext>
            _contextProvider = new EFContextProvider<ZzaContext>();

        private ZzaContext Context { get { return _contextProvider.Context; } }

        public string Metadata
        {
            get {return _contextProvider.Metadata();}
        }

        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _contextProvider.SaveChanges(saveBundle);
        }

        public IQueryable<Customer> Customers
        {
            get { return Context.Customers; }
        }

    }
}
