using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;
using Zza.Model;

namespace Zza.Interfaces
{
    public interface ISaveDataProvider : IHasSaveMap
    {
        T GetExisting<T>(long id)
            where T : class, ISaveable, IHasIntId;
        T GetExisting<T>(Guid id)
            where T : class, ISaveable, IHasGuidId;
    }
}