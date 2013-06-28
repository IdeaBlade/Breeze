using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;
using Zza.Model;
using SaveMap = System.Collections.Generic.Dictionary<
                System.Type, 
                System.Collections.Generic.List<Breeze.WebApi.EntityInfo>>;

namespace Zza.Interfaces
{
    public class ZzaSaveGuard
    {
        public ZzaSaveGuard(Func<IZzaSaveDataProvider> dataProviderFactory, Guid storeId)
        {
            _dataProviderFactory = dataProviderFactory;
            _storeId = storeId;
        }

        public SaveMap BeforeSaveEntities(SaveMap saveMap)
        {
            if (_storeId == Guid.Empty)
            {
               throw new InvalidOperationException("Invalid save attempt"); 
            }
            foreach (var key in saveMap.Keys)
            {
                if (typeof (ISaveable).IsAssignableFrom(key)) continue;
                //if (_saveableTypes.Contains(key)) continue; // if varied for some reason
                const string message = "not authorized to save a '{0}' type.";
                throw new SaveException(string.Format(message, key));
            }

            var rulesEngine = ZzaRulesEngine.Instance;
            var dataProvider = _dataProviderFactory();
            var context = new ZzaSaveContext(_storeId, dataProvider, saveMap);

            foreach (var entityInfo in saveMap.Values.SelectMany(x => x))
            {
                context.EntityInfo = entityInfo;
                var results = rulesEngine.ExecuteSaveRules(entityInfo, context).ToList();
                if (!results.Ok()) {
                    throw new SaveException(results.Errors()); 
                }
            }

            return saveMap;
        }

        private readonly Guid _storeId;
        private readonly Func<IZzaSaveDataProvider> _dataProviderFactory;
    }

    public class ZzaSaveContext
    {
        public ZzaSaveContext(Guid storeId, IZzaSaveDataProvider dataProvider, SaveMap saveMap)
        {
            UserStoreId = storeId;
            DataProvider = dataProvider;
            SaveMap = saveMap;
        }
        public EntityInfo EntityInfo { get; internal set; }
        public SaveMap SaveMap { get; private set; }
        public Guid UserStoreId { get; private set; }
        public IZzaSaveDataProvider DataProvider { get; private set; }
    }

    public class SaveException : Exception
    {
        public SaveException(IEnumerable<RuleResult> errors)
            : this(errors.First())
        {
            Errors = errors;
        }

        public SaveException(RuleResult error)
            : this(error.Message)
        {
            FirstError = error;
            if (Errors == null) { Errors = new[] { error }; }
        }

        public SaveException(string errorMessage) : base(errorMessage) { }

        public IEnumerable<RuleResult> Errors { get; private set; }
        public RuleResult FirstError { get; private set; }
    }
}