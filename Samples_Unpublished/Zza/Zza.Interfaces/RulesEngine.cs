using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;

namespace Zza.Interfaces
{
    public class RulesEngine
    {
        private readonly List<Rule> _rules = new List<Rule>();

        public void AddRule(Rule rule)
        {
            _rules.Add(rule);
        }

        public bool RemoveRule(Rule rule)
        {
            return _rules.Remove(rule);
        }

        public IEnumerable<RuleResult> ExecuteRules(EntityInfo entityInfo, RuleType ruleType, object userData)
        {
            var ruleResults = new List<RuleResult>();
            var targetObject = entityInfo.Entity;
            var objectType = targetObject.GetType();
            foreach (var rule in _rules
                .Where(r => r.RuleType == ruleType &&
                    (r.ObjectType == null || r.ObjectType == objectType)))
                rule.Execute(targetObject, entityInfo.EntityState, userData, ruleResults);

            return ruleResults;
        }
    }

    public abstract class Rule
    {
        public abstract RuleType RuleType { get; }
        public abstract Type ObjectType { get; }
        public abstract void Execute(object targetObject, EntityState operationType, object userData, ICollection<RuleResult> ruleResults);
    }

    public class AuthorizeTypeRule : Rule
    {
        private readonly Type[] _authorizedTypes;
        private readonly RuleType _ruleType;

        public AuthorizeTypeRule(Type[] authorizedTypes, RuleType ruleType)
        {
            _authorizedTypes = authorizedTypes;
            _ruleType = ruleType;
        }

        public override RuleType RuleType
        {
            get { return _ruleType; }
        }

        public override Type ObjectType
        {
            get { return null; }
        }

        public override void Execute(object targetObject, EntityState operationType, object userData, ICollection<RuleResult> ruleResults)
        {
            var objectType = targetObject.GetType();
            if (_authorizedTypes.Contains(objectType))
            {
                ruleResults.Add(new RuleResult(this, RuleResultType.Info, "Type is authorized"));
                return;
            }

            const string message = "not authorized to save a '{0}' type.";
            ruleResults.Add(new RuleResult(this, RuleResultType.Error,
                                               string.Format(message, objectType)));
        }
    }

    public class DelegateRule<T> : Rule
    {
        private readonly Action<Rule, T, EntityState, object, ICollection<RuleResult>> _action;
        private readonly RuleType _ruleType;

        public DelegateRule(Action<Rule, T, EntityState, object, ICollection<RuleResult>> action, RuleType ruleType)
        {
            _action = action;
            _ruleType = ruleType;
        }
        public override RuleType RuleType
        {
            get { return _ruleType; }
        }
        public override Type ObjectType
        {
            get { return typeof(T); }
        }
        public override void Execute(object targetObject, EntityState operationType, object userData, ICollection<RuleResult> ruleResults)
        {
            _action(this, (T)targetObject, operationType, userData, ruleResults);
        }
    }

    public class RuleResult
    {
        public RuleResult(Rule rule, RuleResultType resultType, string message)
        {
            Rule = rule;
            ResultType = resultType;
            Message = message;
        }

        public Rule Rule { get; private set; }
        public RuleResultType ResultType { get; private set; }
        public string Message { get; private set; }

        public bool Ok
        {
            get { return ResultType != RuleResultType.Error; }
        }

        public bool Warning
        {
            get { return ResultType == RuleResultType.Warning; }
        }

        public bool Error
        {
            get { return ResultType == RuleResultType.Error; }
        }
    }

    public static class RuleResultFns
    {
        public static bool Ok(this IEnumerable<RuleResult> results)
        {
            return results.All(x => x.Ok);
        }

        public static bool Error(this IEnumerable<RuleResult> results)
        {
            return results.Any(x => x.Error);
        }

        public static IEnumerable<RuleResult> Errors(this IEnumerable<RuleResult> results)
        {
            return results.Where(x => x.ResultType == RuleResultType.Error);
        }

        public static IEnumerable<RuleResult> Warnings(this IEnumerable<RuleResult> results)
        {
            return results.Where(x => x.ResultType == RuleResultType.Warning);
        }

        public static IEnumerable<RuleResult> Infos(this IEnumerable<RuleResult> results)
        {
            return results.Where(x => x.ResultType == RuleResultType.Info);
        }
    }

    public enum RuleResultType
    {
        Error,
        Warning,
        Info
    };

    public enum RuleType
    {
        QueryRule,
        SaveRule
    }

}