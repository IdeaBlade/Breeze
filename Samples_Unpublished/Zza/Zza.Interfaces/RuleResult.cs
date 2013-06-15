using System.Collections.Generic;
using System.Linq;
namespace Zza.Interfaces
{

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

    public enum RuleResultType
    {
        Error,
        Warning,
        Info
    };

    public static class RuleResultExtensions
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

        public static ICollection<RuleResult> AddError(this ICollection<RuleResult> results, Rule rule, string message)
        {
            var result = new RuleResult(rule, RuleResultType.Error, message);
            results.Add(result);
            return results;
        }
        public static ICollection<RuleResult> AddWarning(this ICollection<RuleResult> results, Rule rule, string message)
        {
            var result = new RuleResult(rule, RuleResultType.Warning, message);
            results.Add(result);
            return results;
        }
        public static ICollection<RuleResult> AddInfo(this ICollection<RuleResult> results, Rule rule, string message)
        {
            var result = new RuleResult(rule, RuleResultType.Info, message);
            results.Add(result);
            return results;
        }
    }
}
