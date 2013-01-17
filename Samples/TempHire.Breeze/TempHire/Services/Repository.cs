using System.Data.Entity;
using System.Linq;

namespace TempHire.Services
{
    public class Repository<T> : IRepository<T> where T : class
    {
        public Repository(DbContext context)
        {
            Context = context;
        }

        protected DbContext Context { get; private set; }

        public IQueryable<T> All()
        {
            return Context.Set<T>();
        }
    }
}