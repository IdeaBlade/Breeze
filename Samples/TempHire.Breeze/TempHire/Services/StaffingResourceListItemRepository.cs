using System.Data.Entity;
using System.Linq;
using DomainModel;

namespace TempHire.Services
{
    public class StaffingResourceListItemRepository : Repository<StaffingResource>, IStaffingResourceListItemRepository
    {
        public StaffingResourceListItemRepository(DbContext context) : base(context)
        {
        }

        public new IQueryable<object> All()
        {
            return base.All()
                       .Select(x => new
                           {
                               StaffingResource = x,
                               PrimaryAddress = x.Addresses.FirstOrDefault(a => a.Primary),
                               PrimaryPhoneNumber = x.PhoneNumbers.FirstOrDefault(p => p.Primary)
                           })
                       .Select(x => new
                           {
                               x.StaffingResource.Id,
                               FullName =
                                        !(x.StaffingResource.MiddleName == null ||
                                          x.StaffingResource.MiddleName.Trim() == string.Empty)
                                            ? x.StaffingResource.FirstName.Trim() + " " +
                                              x.StaffingResource.MiddleName.Trim() +
                                              " " + x.StaffingResource.LastName.Trim()
                                            : x.StaffingResource.FirstName.Trim() + " " +
                                              x.StaffingResource.LastName.Trim(),
                               x.PrimaryAddress.Address1,
                               x.PrimaryAddress.Address2,
                               x.PrimaryAddress.City,
                               State = x.PrimaryAddress.State.ShortName,
                               x.PrimaryAddress.Zipcode,
                               PhoneNumber = "(" + x.PrimaryPhoneNumber.AreaCode + ") " + x.PrimaryPhoneNumber.Number
                           });
        }
    }
}