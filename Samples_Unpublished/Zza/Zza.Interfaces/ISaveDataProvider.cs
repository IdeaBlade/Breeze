using System;
using Zza.Model;

namespace Zza.Interfaces
{
    public interface ISaveDataProvider : IHasSaveMap
    {
        Guid StoreId { get; }
        T GetExisting<T>(long id)
            where T : class, ISaveable, IHasIntId;
        T GetExisting<T>(Guid id)
            where T : class, ISaveable, IHasGuidId;
    }
}