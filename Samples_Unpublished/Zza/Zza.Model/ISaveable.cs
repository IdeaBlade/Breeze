using System;

namespace Zza.Model
{
    /// <summary>
    /// Interface indicating that instances of this class may be saved;
    /// </summary>
    public interface ISaveable
    {
        Guid? StoreId { get; set; }
        string CanAdd();
    }
}
