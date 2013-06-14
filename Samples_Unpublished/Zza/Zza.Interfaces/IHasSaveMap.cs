using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;
using Zza.Model;

namespace Zza.Interfaces
{
    public interface IHasSaveMap
    {
        Dictionary<Type, List<EntityInfo>> SaveMap { get; }
    }

    public static class IHasSaveMapExtensions
    {
        public static EntityInfo GetCurrent<T>(this IHasSaveMap provider, long id) 
            where T : class, ISaveable, ISaveableWithIntId
        {
            var type = typeof(T);
            List<EntityInfo> infos;
            provider.SaveMap.TryGetValue(type, out infos);
            return infos == null
                       ? null
                       : infos.SingleOrDefault(info => id == ((T)info.Entity).Id);
        }

        public static EntityInfo GetCurrent<T>(this IHasSaveMap provider, Guid id) 
            where T : class, ISaveable, ISaveableWithGuidId
        {
            var type = typeof(T);
            List<EntityInfo> infos;
            provider.SaveMap.TryGetValue(type, out infos);
            return infos == null
                       ? null
                       : infos.SingleOrDefault(info => id == ((T)info.Entity).Id);
        }

        public static EntityInfo GetEntityInfo(
            this IHasSaveMap provider, object targetObject)
        {
            return provider.SaveMap
                .SelectMany(x => x.Value)
                .FirstOrDefault(x => x.Entity == targetObject);
        }
    }
}