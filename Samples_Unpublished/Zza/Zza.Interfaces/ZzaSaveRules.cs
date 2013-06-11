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

        public ZzaSaveRules(Func<IValidationDataProvider> dataProviderFactory)
        {
            _rulesEngine = new RulesEngine();
            _dataProviderFactory = dataProviderFactory;
            AddRules();
        }

        public Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap)
        {
            var dataProvider = _dataProviderFactory();
            dataProvider.SaveMap = saveMap;
            foreach (var entityInfo in saveMap.Values.SelectMany(x => x))
            {
                var results = _rulesEngine.ExecuteRules(entityInfo, RuleType.SaveRule, dataProvider).ToList();
                if (results.Ok())
                    continue;

                throw new Exception(results.Errors().First().Message);
            }

            return saveMap;
        }

        private void AddRules()
        {
            var authorizedTypes = new[]
                {
                    typeof(Customer), typeof(Order), typeof(OrderItem), typeof(OrderItemOption)
                };
            _rulesEngine.AddRule(new AuthorizeTypeRule(authorizedTypes, RuleType.SaveRule));

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
}