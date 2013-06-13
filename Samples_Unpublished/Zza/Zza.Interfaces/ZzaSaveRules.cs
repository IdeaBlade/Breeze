using System;
using System.Collections.Generic;
using System.Linq;
using Zza.Model;
using SaveMap = System.Collections.Generic.Dictionary<
                System.Type, 
                System.Collections.Generic.List<Breeze.WebApi.EntityInfo>>;

namespace Zza.Interfaces
{
    public class ZzaSaveRules
    {
        public ZzaSaveRules(Func<SaveMap, ISaveDataProvider> dataProviderFactory)
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

            var rulesEngine = RulesEngine;
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

        private RulesEngine RulesEngine {
            get {
               
                if (_rulesEngine != null) return _rulesEngine;
                _rulesEngine = new RulesEngine();

                // EXAMPLE FROM MARCEL
                //_rulesEngine.AddRule(new DelegateRule<Order>((rule, order, userData, results) =>
                //    {
                //        var dataProvider = (ValidationDataProvider) userData;
                //        if (!dataProvider.CurrentPatient.Eligibility)
                //        {
                //            results.Add(new RuleResult(rule, RuleResultType.Error,
                //                                       "Access denied: Current patient is ineligible"));
                //            return;
                //        }

                //        order.OrderDate = DateTime.Today;

                //        if (order.PatientId != UserContext.CurrentPatientId)
                //            results.Add(new RuleResult(rule, RuleResultType.Error,
                //                                       "Access denied: Order is not associated with current patient"));

                //        if (order.TotalCost != dataProvider.GetOrderTotal(order.Id))
                //            results.Add(new RuleResult(rule, RuleResultType.Error,
                //                                       "Order total does not match the sum of orderItems"));
                //    }, RuleType.SaveRule));
                return _rulesEngine;
            }
        }

        private RulesEngine _rulesEngine;
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