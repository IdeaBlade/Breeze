using System.Linq;

namespace TempHire.Services
{
    public interface IRepository<out T>
    {
        IQueryable<T> All();
    }
}