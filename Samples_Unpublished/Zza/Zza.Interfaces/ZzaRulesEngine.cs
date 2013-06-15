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
            rulesEngine.AddRule(new DelegateRule<ISaveableWithIntId>(ValidateSaveableWithIntId));
            rulesEngine.AddRule(new DelegateRule<ISaveableWithGuidId>(ValidateSaveableWithGuidId));
            // Could add more type specific rules here
            return rulesEngine;
        }

        private static void ValidateSaveableWithIntId<T>(
            Rule rule, T current, OperationType op, object context, ICollection<RuleResult> results)
            where T : class, ISaveableWithIntId
        {
            var saveContext = (ZzaSaveContext)context;
            ICollection<string> emsg = new List<string>();
            if (op.IsAdded())
            {
                if (current.Id == 0)
                {
                    emsg.Add("new entity must have a valid, non-zero id");
                }
                current.StoreId = saveContext.UserStoreId;
                emsg = current.CanAdd(emsg);
                results.AddErrors(current, rule, emsg);
            }
            else
            {
                var existing = saveContext.DataProvider.GetExisting<T>(current.Id);
                emsg = ExistingEntityGuard(current, existing, saveContext.UserStoreId, emsg); 
                emsg = (op.IsUpdated()) ? current.CanUpdate(emsg) : current.CanDelete(emsg);
                results.AddErrors(current, rule, emsg);
            }
        }

        private static void ValidateSaveableWithGuidId<T>(
            Rule rule, T current, OperationType op, object context, ICollection<RuleResult> results)
            where T : class, ISaveableWithGuidId
        {
            var saveContext = (ZzaSaveContext)context;
            ICollection<string> emsg = new List<string>();
            if (op.IsAdded())
            {
                if (current.Id == Guid.Empty)
                {
                    emsg.Add("new entity must have a valid Guid id");
                }
                current.StoreId = saveContext.UserStoreId;
                emsg = current.CanAdd(emsg);
                results.AddErrors(current, rule, emsg);
            }
            else
            {
                var existing = saveContext.DataProvider.GetExisting<T>(current.Id);
                emsg = ExistingEntityGuard(current, existing, saveContext.UserStoreId, emsg);
                emsg = (op.IsUpdated()) ? current.CanUpdate(emsg) : current.CanDelete(emsg);
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

        internal static ICollection<RuleResult> AddErrors<T>(
            this ICollection<RuleResult> results, T entity, Rule rule, ICollection<string> messages)
        {
            return (messages.Count == 0 ) ? results :
                results.AddError(rule, GetEntityName(entity) + String.Join("; ", messages));
        }

        private static string GetEntityName<T>(T entity)
        {
            var id = String.Empty;
            var intEntity = entity as ISaveableWithIntId;
            if (intEntity != null)
            {
                id = " (" + intEntity.Id + ")";
            }
            else
            {
                var guidEntity = entity as ISaveableWithGuidId;
                if (guidEntity != null)
                {
                    id = " (" + guidEntity.Id + ")";
                }
            }
            return "'" + typeof(T).Name + id + "' ";
        }
    }
}
