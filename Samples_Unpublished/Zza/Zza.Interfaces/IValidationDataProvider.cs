using System;
using System.Collections.Generic;
using Breeze.WebApi;

namespace Zza.Interfaces
{
    public interface IValidationDataProvider
    {
        Dictionary<Type, List<EntityInfo>> SaveMap { get; set; }
        EntityInfo GetEntityInfo(object targetObject);
    }
}