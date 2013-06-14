using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;

namespace Zza.Interfaces
{
    public class RulesEngine
    {
        private readonly List<Rule> _rules = new List<Rule>();

        public Rule AddRule(Rule rule)
        {
            _rules.Add(rule);
            return rule;
        }
        public DelegateRule<T> AddRule<T>(Action<Rule, T, OperationType, object, ICollection<RuleResult>> action, RuleType ruleType = RuleType.SaveRule)
        {
            var rule = new DelegateRule<T>(action, ruleType);
            return AddRule(rule) as DelegateRule<T>;
        }
        public bool RemoveRule(Rule rule)
        {
            return _rules.Remove(rule);
        }

        public IEnumerable<RuleResult> ExecuteSaveRules(EntityInfo entityInfo, object context)
        {  
            var targetObject = entityInfo.Entity;
            var objectType = targetObject.GetType();
            var ruleResults = new List<RuleResult>(); 
            OperationType op;
            switch (entityInfo.EntityState)
            {
                case EntityState.Added:    op = OperationType.Add; break;
                case EntityState.Modified: op = OperationType.Update; break;
                case EntityState.Deleted:  op = OperationType.Delete; break;
                default: throw new InvalidOperationException("No operation for this state");
            }

            foreach (var rule in _rules
                .Where(r => r.RuleType == RuleType.SaveRule &&
                    (r.ObjectType == null || r.ObjectType.IsAssignableFrom(objectType))))
                rule.Execute(targetObject, op, context, ruleResults);

            return ruleResults;
        }
    }

    public abstract class Rule
    {
        public abstract RuleType RuleType { get; }
        public abstract Type ObjectType { get; }
        public abstract void Execute(object targetObject, OperationType op, object context, ICollection<RuleResult> ruleResults);
    }

    public class DelegateRule<T> : Rule
    {
        private readonly Action<Rule, T, OperationType, object, ICollection<RuleResult>> _action;
        private readonly RuleType _ruleType;

        public DelegateRule(Action<Rule, T, OperationType, object, ICollection<RuleResult>> action, RuleType ruleType = RuleType.SaveRule)
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
        public override void Execute(object targetObject, OperationType op, object context, ICollection<RuleResult> ruleResults)
        {
            _action(this, (T)targetObject, op, context, ruleResults);
        }
    }
 
    public enum RuleType
    {
        QueryRule,
        SaveRule
    }

}