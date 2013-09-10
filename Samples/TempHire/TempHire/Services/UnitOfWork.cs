using Breeze.WebApi;
using Breeze.WebApi.EF;
using DomainModel;
using Newtonsoft.Json.Linq;

namespace TempHire.Services
{
    public class UnitOfWork
    {
        private readonly EFContextProvider<TempHireDbContext> _contextProvider;

        public UnitOfWork()
        {
            _contextProvider = new EFContextProvider<TempHireDbContext>();

            StaffingResources = new Repository<StaffingResource>(_contextProvider.Context);
            Addresses = new Repository<Address>(_contextProvider.Context);
            AddressTypes = new Repository<AddressType>(_contextProvider.Context);
            PhoneNumbers = new Repository<PhoneNumber>(_contextProvider.Context);
            PhoneNumberTypes = new Repository<PhoneNumberType>(_contextProvider.Context);
            Rates = new Repository<Rate>(_contextProvider.Context);
            RateTypes = new Repository<RateType>(_contextProvider.Context);
            Skills = new Repository<Skill>(_contextProvider.Context);
            States = new Repository<State>(_contextProvider.Context);
            WorkExperienceItems = new Repository<WorkExperienceItem>(_contextProvider.Context);

            StaffingResourceListItems = new StaffingResourceListItemRepository(_contextProvider.Context);
        }

        public IRepository<StaffingResource> StaffingResources { get; private set; }
        public IRepository<Address> Addresses { get; private set; }
        public IRepository<AddressType> AddressTypes { get; private set; }
        public IRepository<PhoneNumber> PhoneNumbers { get; private set; }
        public IRepository<PhoneNumberType> PhoneNumberTypes { get; private set; }
        public IRepository<Rate> Rates { get; private set; }
        public IRepository<RateType> RateTypes { get; private set; }
        public IRepository<Skill> Skills { get; private set; }
        public IRepository<State> States { get; private set; }
        public IRepository<WorkExperienceItem> WorkExperienceItems { get; private set; }

        public IStaffingResourceListItemRepository StaffingResourceListItems { get; private set; }

        public SaveResult Commit(JObject changeSet)
        {
            return _contextProvider.SaveChanges(changeSet);
        }
    }
}