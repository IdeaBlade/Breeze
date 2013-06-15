using System;
using Zza.Model;

namespace Zza.Interfaces
{
    public interface ISaveDataProvider : IHasSaveMap
    {
        T GetExisting<T>(long id)
            where T : class, IHasIntId;
        T GetExisting<T>(Guid id)
            where T : class, IHasGuidId;
    }
}