using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;
using Zza.Interfaces;

namespace Zza.DataAccess.EF
{
    internal class SaveDataProvider : ISaveDataProvider
    {
        public SaveDataProvider(Dictionary<Type, List<EntityInfo>> saveMap, Guid storeId)
        {
            SaveMap = saveMap;
            StoreId = storeId;
        }
        private ZzaContext _readContext;

        private ZzaContext ReadContext
        {
            get { return _readContext ?? (_readContext = new ZzaContext()); }
        }

        public Dictionary<Type, List<EntityInfo>> SaveMap { get; set; }

        public Guid StoreId { get; private set; }

        public T GetExisting<T>(long id) where T : class, Model.ISaveable, Model.IHasIntId
        {
            return ReadContext.Set<T>().SingleOrDefault(e => e.Id == id);
        }

        public T GetExisting<T>(Guid id) where T : class, Model.ISaveable, Model.IHasGuidId
        {
            return ReadContext.Set<T>().SingleOrDefault(e => e.Id == id);
        }
    }
}