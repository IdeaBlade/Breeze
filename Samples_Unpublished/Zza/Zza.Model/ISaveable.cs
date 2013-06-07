using System;

namespace Zza.Model
{
    /// <summary>
    /// Marker interface indicating that instances of this class may be saved;
    /// </summary>
    public interface ISaveable
    {
        Guid? StoreId { get; set; }
    }
}
