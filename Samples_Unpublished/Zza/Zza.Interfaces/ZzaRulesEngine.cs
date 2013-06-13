namespace Zza.Interfaces
{
    public class ZzaRulesEngine : RulesEngine
    {
        static ZzaRulesEngine()
        {
            Instance = new ZzaRulesEngine().AddRules();
        }
        public static RulesEngine Instance { get; internal set; }

        private ZzaRulesEngine AddRules()
        {
            // Copy stuff from ZzaEntitySaveGuard
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
            return this;
        }
    }
}
