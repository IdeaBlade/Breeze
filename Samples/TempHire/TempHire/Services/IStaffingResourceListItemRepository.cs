using System.Linq;

namespace TempHire.Services
{
    public interface IStaffingResourceListItemRepository
    {
        IQueryable<object> All();
    }
}