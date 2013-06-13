using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;
using Zza.Interfaces;

namespace Zza.DataAccess.EF
{
    internal class ValidationDataProvider : IValidationDataProvider
    {
        private ZzaContext _readContext;

        private ZzaContext ReadContext
        {
            get { return _readContext ?? (_readContext = new ZzaContext()); }
        }

        public Dictionary<Type, List<EntityInfo>> SaveMap { get; set; }

        public EntityInfo GetEntityInfo(object targetObject)
        {
            return SaveMap.SelectMany(x => x.Value).FirstOrDefault(x => x.Entity == targetObject);
        }
    }
}