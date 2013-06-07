using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Breeze.Nhibernate.WebApi;
using Breeze.WebApi;
using Zza.Model;
using Newtonsoft.Json.Linq;

namespace Zza.DataAccess.NH
{
    /// <summary>
    /// Repository (a "Unit of Work" really) of Zza models.
    /// </summary>
    public class ZzaRepository
    {
        private readonly ZzaContext _context = new ZzaContext();

        private ZzaContext Context { get { return _context; } }

        public string Metadata
        {
            get { return _context.Metadata(); }
        }

        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _context.SaveChanges(saveBundle);
        }

        public IQueryable<Customer> Customers
        {
            get { return Context.Customers; }
        }

    }
}
