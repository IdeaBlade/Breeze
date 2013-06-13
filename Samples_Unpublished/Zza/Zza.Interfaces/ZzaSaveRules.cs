using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;
using Zza.Model;

namespace Zza.Interfaces
{
    public class ZzaSaveRules
    {
        private readonly RulesEngine _rulesEngine;
        private readonly Func<IValidationDataProvider> _dataProviderFactory;
        private readonly Type[] _saveableTypes;

        public ZzaSaveRules(Func<IValidationDataProvider> dataProviderFactory)
        {
            _rulesEngine = new RulesEngine();
            _dataProviderFactory = dataProviderFactory; 
            _saveableTypes = new[] {
                    typeof(Customer), typeof(Order), typeof(OrderItem), typeof(OrderItemOption) 
                };
            AddRules();
        }

        public Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap)
        {
            var dataProvider = _dataProviderFactory();
            dataProvider.SaveMap = saveMap;

            foreach (var key in saveMap.Keys)
            {
                if (_saveableTypes.Contains(key)) continue;
                const string message = "not authorized to save a '{0}' type.";
                throw new SaveException(string.Format(message, key));
            }

            foreach (var entityInfo in saveMap.Values.SelectMany(x => x))
            {
                var results = _rulesEngine.ExecuteRules(entityInfo, RuleType.SaveRule, dataProvider).ToList();
                if (results.Ok()) continue;

                throw new SaveException(results.Errors());
            }

            return saveMap;
        }

        private void AddRules()
        {
            // EXAMPLE
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

        }
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