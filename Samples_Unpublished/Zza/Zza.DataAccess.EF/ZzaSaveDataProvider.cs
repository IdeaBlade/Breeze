using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;
using Zza.Interfaces;
using Zza.Model;

namespace Zza.DataAccess.EF
{
    internal class ZzaSaveDataProvider : ISaveDataProvider
    {
        public ZzaSaveDataProvider(Dictionary<Type, List<EntityInfo>> saveMap)
        {
            SaveMap = saveMap;
        }
        private ZzaContext _readContext;

        private ZzaContext ReadContext
        {
            get { return _readContext ?? (_readContext = new ZzaContext()); }
        }

        public Dictionary<Type, List<EntityInfo>> SaveMap { get; set; }

        public T GetExisting<T>(long id) where T : class, IHasIntId
        {
            var cached =
                ReadContext.ChangeTracker.Entries<T>().SingleOrDefault(e => e.Entity.Id == id);
            return (cached != null) ? cached.Entity :
                   ReadContext.Set<T>().SingleOrDefault(e => e.Id == id);
        }

        public T GetExisting<T>(Guid id) where T : class, IHasGuidId
        {
            var cached =
                 ReadContext.ChangeTracker.Entries<T>().SingleOrDefault(e => e.Entity.Id == id);
            return (cached != null) ? cached.Entity :
                   ReadContext.Set<T>().SingleOrDefault(e => e.Id == id);
        }
    }
}