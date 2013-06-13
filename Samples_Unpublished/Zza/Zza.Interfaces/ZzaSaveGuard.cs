using System;
using System.Collections.Generic;
using System.Linq;
using Zza.Model;
using SaveMap = System.Collections.Generic.Dictionary<
                System.Type, 
                System.Collections.Generic.List<Breeze.WebApi.EntityInfo>>;

namespace Zza.Interfaces
{
    public class ZzaSaveGuard
    {
        public ZzaSaveGuard(Func<SaveMap, ISaveDataProvider> dataProviderFactory)
        {
            _dataProviderFactory = dataProviderFactory;
        }

        public SaveMap BeforeSaveEntities(SaveMap saveMap)
        {
            foreach (var key in saveMap.Keys)
            {
                if (typeof (ISaveable).IsAssignableFrom(key)) continue;
                //if (_saveableTypes.Contains(key)) continue; // if varied for some reason
                const string message = "not authorized to save a '{0}' type.";
                throw new SaveException(string.Format(message, key));
            }

            var rulesEngine = ZzaRulesEngine.Instance;
            var dataProvider = _dataProviderFactory(saveMap);

            foreach (var entityInfo in saveMap.Values.SelectMany(x => x))
            {
                var results = rulesEngine.ExecuteSaveRules(entityInfo, dataProvider).ToList();
                if (!results.Ok()) {
                    throw new SaveException(results.Errors()); 
                }
            }

            return saveMap;
        }

        private readonly Func<SaveMap, ISaveDataProvider> _dataProviderFactory;
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