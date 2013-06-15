using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Zza.Model
{
    public abstract class Saveable : ISaveable
    {
        [JsonIgnore]
        public virtual Guid? StoreId { get; set; }
        public virtual ICollection<string> CanAdd(ICollection<string> errors) { return errors; }
        public virtual ICollection<string> CanDelete(ICollection<string> errors) { return errors; }
        public virtual ICollection<string> CanUpdate(ICollection<string> errors) { return errors; }
    }
}
