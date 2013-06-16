using System;
using System.Collections.Generic;
using Zza.Model;

namespace Zza.Interfaces
{
    public class ZzaRulesEngine : RulesEngine
    {
        static ZzaRulesEngine()
        {
            Instance = ZzaRules.AddRules(new ZzaRulesEngine());
        }

        public static RulesEngine Instance { get; internal set; }

    }

    public static class ZzaRules {

        public static ZzaRulesEngine AddRules(ZzaRulesEngine rulesEngine)
        {
            rulesEngine.AddRule(new DelegateRule<ISaveable>(ValidateSaveable));
            // Add type specific rules as needed
            return rulesEngine;
        }
        private static void ValidateSaveable<T>(
            Rule rule, T current, OperationType op, object context, ICollection<RuleResult> results)
            where T : ISaveable
        {
            var saveContext = (ZzaSaveContext)context;
            var dataProvider = saveContext.DataProvider;
            ICollection<string> emsg = new List<string>();
            if (op.IsAdded())
            {
                current.StoreId = saveContext.UserStoreId;
                emsg = current.CanAdd(emsg);
                results.AddErrors(current, rule, emsg);
            }
            else
            {
                emsg = (op.IsUpdated()) ? current.CanUpdate(emsg) : current.CanDelete(emsg);
                var existing = (ISaveable) dataProvider.GetExisting(current);
                emsg = ExistingEntityGuard(current, existing, saveContext.UserStoreId, emsg);
                results.AddErrors(current, rule, emsg);
            }
        }

        private static ICollection<string> ExistingEntityGuard(
            ISaveable current, ISaveable existing, Guid userStoreId, ICollection<string> emsg)
        {
            if (existing == null)
            {
                emsg.Add("entity not found");
                return emsg;
            }
            var origStoreId = existing.StoreId;
            if (origStoreId == null || origStoreId == Guid.Empty)
            {
                emsg.Add("changes to an original entity may not be saved");
            }
            if (origStoreId != userStoreId || current.StoreId != origStoreId)
            {
                emsg.Add("you may only change entities created within your own user session");
            }
            return emsg;
        }

        internal static ICollection<RuleResult> AddErrors(
            this ICollection<RuleResult> results, object entity, Rule rule, ICollection<string> messages)
        {
            return (messages.Count == 0 ) ? results :
                results.AddError(rule, GetEntityName(entity) + String.Join("; ", messages));
        }

        private static string GetEntityName(object entity)
        {
            return "'" + entity.GetType().Name + "' ";
        }
    }
}
