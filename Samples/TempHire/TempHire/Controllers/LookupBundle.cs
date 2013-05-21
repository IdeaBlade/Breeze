using System.Collections.Generic;
using DomainModel;

namespace TempHire.Controllers
{
    public class LookupBundle
    {
        public IEnumerable<AddressType> AddressTypes { get; set; }
        public IEnumerable<PhoneNumberType> PhoneNumberTypes { get; set; }
        public IEnumerable<RateType> RateTypes { get; set; }
        public IEnumerable<State> States { get; set; }
    }
}