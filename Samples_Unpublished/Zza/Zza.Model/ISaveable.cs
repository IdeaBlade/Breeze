using System;
using System.Collections.Generic;

namespace Zza.Model
{
    /// <summary>
    /// Interface indicating that instances of this class may be saved;
    /// </summary>
    public interface ISaveable
    {
        Guid? StoreId { get; set; }
        ICollection<string> CanAdd(ICollection<string> errors);
        ICollection<string> CanDelete(ICollection<string> errors);
        ICollection<string> CanUpdate(ICollection<string> errors);
    }
}
