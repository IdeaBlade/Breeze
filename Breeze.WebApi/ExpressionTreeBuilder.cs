using System;
using Irony.Parsing;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Collections.Generic;
using System.Xml;

namespace Breeze.WebApi {


  public class ExpressionTreeBuilder {

    public ExpressionTreeBuilder() {
      var grammer = new ODataFilterGrammar();
      _parser = new Parser(grammer);

    }

    public Expression Parse(Type rootType, String source) {
      var parseTree = _parser.Parse(source);
      if (parseTree == null || parseTree.Root == null) {
        throw new Exception("Unable to parse: " + source);
      }
      var expr = ParseTreeVisitor.Parse(rootType, parseTree.Root);

      return expr;
    }

    private Parser _parser;

  }

  internal class ParseTreeVisitor {

    public ParseTreeVisitor(Type rootType) {
      _rootType = rootType;
      _paramExpr = Expression.Parameter(rootType, "x");
    }

    public static LambdaExpression Parse(Type rootType, ParseTreeNode node) {
      var visitor = new ParseTreeVisitor(rootType);
      var expr = visitor.VisitNode(node);
      var lambdaExpr = Expression.Lambda(expr, visitor._paramExpr);
      return lambdaExpr;
    }

    protected virtual Expression VisitNode(ParseTreeNode node) {
      if (node == null) return null;
      var nodes = node.ChildNodes;
      Expression targetExpr, searchExpr, startExpr, lengthExpr;
      String methodName;
      switch (node.Term.Name) {
        case "BinaryExpr": {
            var leftExpr = VisitNode(nodes[0]);
            var operatorName = nodes[1].Token.ValueString;
            var rightExpr = VisitNode(nodes[2]);
            return VisitBinary(node, operatorName, leftExpr, rightExpr);
          }
        case "UnaryExpr": {
            var operatorName = nodes[0].Token.ValueString.ToLower();
            targetExpr = VisitNode(nodes[1]);
            return VisitUnary(node, targetExpr, operatorName);
          }
        case "MemberExpr": {
            targetExpr = _paramExpr;
            ParameterExpression paramExpr;
            nodes[0].ChildNodes.ForEach(n => {
              var name = n.Term.Name;
              if (name == "Identifier") {
                if (_lambdaVarMap.TryGetValue(n.Token.ValueString, out paramExpr)) {
                  targetExpr = paramExpr;
                } else {
                  targetExpr = VisitMemberExpr(n, targetExpr, n.Token.ValueString);
                }
              } else if (name == "AnyMethodCallExpr" || name == "AllMethodCallExpr") {
                methodName = n.ChildNodes[0].Token.ValueString;
                var lambdaExprNode = n.ChildNodes[1];
                var lambdaVariableName = lambdaExprNode.ChildNodes[0].Token.ValueString;
                var exprNode = lambdaExprNode.ChildNodes[1];
                var itemType = TypeFns.GetElementType(targetExpr.Type);
                paramExpr = Expression.Parameter(itemType, lambdaVariableName);
                _lambdaVarMap.Add(lambdaVariableName, paramExpr);
                var lambdaSubExpr = VisitNode(exprNode);
                var lambdaExpr = Expression.Lambda(lambdaSubExpr, paramExpr);
                targetExpr = VisitAnyAll(n, targetExpr, methodName, lambdaExpr);
              } else {
                throw new Exception("Unable to process node: " + n.Term.Name);
              }
            });
            return targetExpr;
          }
        case "StringLiteral":
        case "NumberLiteral": {
            return VisitSimpleLiteral(node, node.Token.Value);
          }  
        case "Constant": {
            return VisitConstant(node, node.Token.ValueString);
          }
        case "DateTimeLiteral": {
            return VisitDateTimeLiteral(node, node.Token.ValueString);
          }
        case "TimeLiteral": {
            return VisitTimeLiteral(node, node.Token.ValueString);
          }
        case "GuidLiteral": {
            return VisitGuidLiteral(node, node.Token.ValueString);
          }
        case "DateTimeOffsetLiteral": {
            return VisitDateTimeOffsetLiteral(node, node.Token.ValueString);
          }
        case "SubstringOfMethodCallExpr": {
            searchExpr = VisitNode(nodes[1]);
            targetExpr = VisitNode(nodes[2]);
            return VisitSubstringOf(node, targetExpr, searchExpr);
          }
        case "StartsWithMethodCallExpr": {
            targetExpr = VisitNode(nodes[1]);
            searchExpr = VisitNode(nodes[2]);
            return VisitStartsWith(node, targetExpr, searchExpr);
          }
        case "EndsWithMethodCallExpr": {
            targetExpr = VisitNode(nodes[1]);
            searchExpr = VisitNode(nodes[2]);
            return VisitEndsWith(node, targetExpr, searchExpr);
          }
        case "IndexOfMethodCallExpr": {
            targetExpr = VisitNode(nodes[1]);
            searchExpr = VisitNode(nodes[2]);
            return VisitIndexOf(node, targetExpr, searchExpr);
          }
        case "Substring1MethodCallExpr": {
            targetExpr = VisitNode(nodes[1]);
            startExpr = VisitNode(nodes[2]);
            return VisitSubstring1(node, targetExpr, startExpr);
          }
        case "Substring2MethodCallExpr": {
            targetExpr = VisitNode(nodes[1]);
            startExpr = VisitNode(nodes[2]);
            lengthExpr = VisitNode(nodes[3]);
            return VisitSubstring2(node, targetExpr, startExpr, lengthExpr);
          }
        case "ConcatMethodCallExpr": {
            var expr1 = VisitNode(nodes[1]);
            var expr2 = VisitNode(nodes[2]);
            return VisitConcat(node, expr1, expr2);
          }
        case "ReplaceMethodCallExpr": {
            targetExpr = VisitNode(nodes[1]);
            var findExpr = VisitNode(nodes[2]);
            var replaceExpr = VisitNode(nodes[3]);
            return VisitReplace(node, targetExpr, findExpr, replaceExpr);
          }

        case "LengthMethodCallExpr": {
            targetExpr = VisitNode(nodes[1]);
            return VisitLength(node, targetExpr);
          }
        case "TrimMethodCallExpr": {
            targetExpr = VisitNode(nodes[1]);
            return VisitTrim(node, targetExpr);
          }
        case "ToLowerMethodCallExpr": {
            targetExpr = VisitNode(nodes[1]);
            return VisitToLower(node, targetExpr);
          }
        case "ToUpperMethodCallExpr": {
            targetExpr = VisitNode(nodes[1]);
            return VisitToUpper(node, targetExpr);
          }
        case "SecondMethodCallExpr":
        case "MinuteMethodCallExpr":
        case "HourMethodCallExpr":
        case "DayMethodCallExpr":
        case "MonthMethodCallExpr":
        case "YearMethodCallExpr": {
            methodName = nodes[0].Token.ValueString.ToLower();
            targetExpr = VisitNode(nodes[1]);
            return VisitDatePart(node, targetExpr, methodName);
          }
        case "RoundMethodCallExpr":
        case "FloorMethodCallExpr":
        case "CeilingMethodCallExpr": {
            methodName = nodes[0].Token.ValueString.ToLower();
            targetExpr = VisitNode(nodes[1]);
            return VisitMath(node, targetExpr, methodName);
          }
        default: throw new Exception("Unknown Expression type: " + node.Term.Name);

      }
    }

    protected virtual Expression VisitUnary(ParseTreeNode node, Expression targetExpr, String operatorName) {
      if (operatorName == "not") {
        return Expression.Not(targetExpr);
      } else if (operatorName == "-") {
        return Expression.Negate(targetExpr);
      } else {
        throw new Exception("Unable to recognize operator: " + operatorName);
      }
    }

    protected virtual Expression VisitBinary(ParseTreeNode node, String operatorName, Expression leftExpr, Expression rightExpr) {
      Tuple<ExpressionType, OperatorType> tuple;
      if (!__expressionTypeMap.TryGetValue(operatorName, out tuple)) {
        throw new Exception("Unable to locate ExpressionType for: " + operatorName);
      }

      CoerceTypes(operatorName, ref leftExpr, ref rightExpr);
      return Expression.MakeBinary(tuple.Item1, leftExpr, rightExpr);
    }

    private void CoerceTypes(string operatorName, ref Expression leftExpr, ref Expression rightExpr) {
      if (leftExpr.Type != rightExpr.Type) {
        var leftType = TypeFns.GetNonNullableType(leftExpr.Type);
        var rightType = TypeFns.GetNonNullableType(rightExpr.Type);
        if (leftType == typeof (String)) {
          ConvertExpr(ref rightExpr, ref leftExpr);
        } else if (rightType == typeof (String)) {
          ConvertExpr(ref leftExpr, ref rightExpr);
        } else if (TypeFns.IsNumericType(leftType) && TypeFns.IsNumericType(rightType)) {
          var leftIx = NumericTypes.IndexOf(leftType);
          var rightIx = NumericTypes.IndexOf(rightType);
          if (leftIx < rightIx) {
            ConvertExpr(ref leftExpr,ref rightExpr);
          } else {
            ConvertExpr(ref rightExpr, ref leftExpr);
          }
        } else {
          throw new Exception("Unable to perform operation: " + operatorName + "on types:"
                              + leftExpr.Type + ", " + rightExpr.Type);
        }
      }
    }

    // coerce fromExpr to toExpr type
    // but also convert both to nonnullable types.
    private void ConvertExpr(ref Expression fromExpr, ref Expression toExpr) {
      var constExpr = fromExpr as ConstantExpression;
      var toType = TypeFns.GetNonNullableType(toExpr.Type);
      if (constExpr != null) {
        var newValue = Convert.ChangeType(constExpr.Value, toType);
        fromExpr = Expression.Constant(newValue);
      } else {
        fromExpr = Expression.Convert(fromExpr, toType);
      }
      if (TypeFns.IsNullableType(toExpr.Type)) {
        toExpr = Expression.Convert(toExpr, toType);
      } 
    }


    protected virtual Expression VisitMemberExpr(ParseTreeNode node, Expression targetExpr, String memberName) {
      var targetType = targetExpr.Type;
      var member = targetType.GetMember(memberName).FirstOrDefault();
      if (member == null) {
        throw new Exception("Unable to locate member: " + memberName);
      }
      return Expression.MakeMemberAccess(targetExpr, member);
    }

    protected virtual Expression VisitSimpleLiteral(ParseTreeNode node, Object value) {
      return Expression.Constant(value);
    }

    protected virtual Expression VisitConstant(ParseTreeNode node, String value) {
      if (value == "true") {
        return Expression.Constant(true);
      } else if (value == "false") {
        return Expression.Constant(false);
      } else if (value == "null") {
        return Expression.Constant(null);
      } else {
        throw new Exception("Unable to process constant: " + value);
      }
    }

    protected virtual Expression VisitDateTimeLiteral(ParseTreeNode node, String value) {
      var dateTime = XmlConvert.ToDateTime(value, XmlDateTimeSerializationMode.Unspecified);
      return Expression.Constant(dateTime);
    }

    protected virtual Expression VisitDateTimeOffsetLiteral(ParseTreeNode node, String value) {
      var dtOffset = XmlConvert.ToDateTimeOffset(value);
      return Expression.Constant(dtOffset);
    }

    protected virtual Expression VisitTimeLiteral(ParseTreeNode node, String value) {
      var ts = XmlConvert.ToTimeSpan(value);
      return Expression.Constant(ts);
    }

    protected virtual Expression VisitGuidLiteral(ParseTreeNode node, String value) {
      var guid = XmlConvert.ToGuid(value);
      return Expression.Constant(guid);
    }

    protected virtual Expression VisitSubstringOf(ParseTreeNode node, Expression targetExpr, Expression searchExpr) {
      return Expression.Call(targetExpr, ContainsMethod, new[] { searchExpr });
    }

    protected virtual Expression VisitSubstring1(ParseTreeNode node, Expression targetExpr, Expression startExpr) {
      return Expression.Call(targetExpr, Substring1Method, new[] { startExpr });
    }

    protected virtual Expression VisitSubstring2(ParseTreeNode node, Expression targetExpr, Expression startExpr, Expression lengthExpr) {
      return Expression.Call(targetExpr, Substring2Method, new[] { startExpr, lengthExpr });
    }

    protected virtual Expression VisitConcat(ParseTreeNode node, Expression expr1, Expression expr2) {
      return Expression.Call(ConcatMethod, expr1, expr2 );
    }

    protected virtual Expression VisitReplace(ParseTreeNode node, Expression targetExpr, Expression findExpr, Expression replaceExpr) {
      return Expression.Call(targetExpr, ReplaceMethod, new[] { findExpr, replaceExpr});
    }

    protected virtual Expression VisitEndsWith(ParseTreeNode node, Expression targetExpr, Expression searchExpr) {
      return Expression.Call(targetExpr, EndsWithMethod, new[] { searchExpr });
    }

    protected virtual Expression VisitStartsWith(ParseTreeNode node, Expression targetExpr, Expression searchExpr) {
      return Expression.Call(targetExpr, StartsWithMethod, new[] { searchExpr });
    }

    protected virtual Expression VisitIndexOf(ParseTreeNode node, Expression targetExpr, Expression searchExpr) {
      return Expression.Call(targetExpr, IndexOfMethod, new[] { searchExpr });
    }

    protected virtual Expression VisitToLower(ParseTreeNode node, Expression targetExpr) {
      return Expression.Call(targetExpr, ToLowerMethod);
    }

    protected virtual Expression VisitTrim(ParseTreeNode node, Expression targetExpr) {
      return Expression.Call(targetExpr, TrimMethod);
    }

    protected virtual Expression VisitToUpper(ParseTreeNode node, Expression targetExpr) {
      return Expression.Call(targetExpr, ToUpperMethod);
    }

    protected virtual Expression VisitLength(ParseTreeNode node, Expression targetExpr) {
      return Expression.MakeMemberAccess(targetExpr, LengthProperty);
    }

    protected virtual Expression VisitDatePart(ParseTreeNode node, Expression targetExpr, String methodName) {
      PropertyInfo propInfo;
      if (!__dateMethodMap.TryGetValue(methodName, out propInfo)) {
        throw new Exception("Unable to locate a date property for: " + methodName);
      }
      return Expression.MakeMemberAccess(targetExpr, propInfo);
    }

    protected virtual Expression VisitMath(ParseTreeNode node, Expression targetExpr, String methodName) {
      Tuple<MethodInfo, MethodInfo> tpl;
      if (!__mathMethodMap.TryGetValue(methodName, out tpl)) {
        throw new Exception("Unable to locate a Math property for: " + methodName);
      }
      var methodInfo = targetExpr.Type == typeof(double) ? tpl.Item2 : tpl.Item1;
      return Expression.Call(methodInfo, targetExpr);
    }

    protected virtual Expression VisitAnyAll(ParseTreeNode node, Expression targetExpr, String methodName, Expression lambdaExpr) {
      var targetType = targetExpr.Type;
      var itemType = TypeFns.GetElementType(targetType);
      MethodInfo methodInfo;
      if (methodName == "any") {
        methodInfo = TypeFns.GetMethodByExample((IEnumerable<String> s) => s.Any(s1 => s1.Any()), itemType);
      } else {
        methodInfo = TypeFns.GetMethodByExample((IEnumerable<String> s) => s.All(s1 => s1.Any()), itemType);
      }
      return Expression.Call(methodInfo, targetExpr, lambdaExpr);
    }

    private static MethodInfo ContainsMethod = TypeFns.GetMethodByExample((String s) => s.Contains(""));
    private static MethodInfo StartsWithMethod = TypeFns.GetMethodByExample((String s) => s.StartsWith(""));
    private static MethodInfo EndsWithMethod = TypeFns.GetMethodByExample((String s) => s.EndsWith(""));
    private static MethodInfo IndexOfMethod = TypeFns.GetMethodByExample((String s) => s.IndexOf(""));
    private static MethodInfo Substring1Method = TypeFns.GetMethodByExample((String s) => s.Substring(1));
    private static MethodInfo Substring2Method = TypeFns.GetMethodByExample((String s) => s.Substring(1, 2));
    private static MethodInfo TrimMethod = TypeFns.GetMethodByExample((String s) => s.Trim());
    private static MethodInfo ToUpperMethod = TypeFns.GetMethodByExample((String s) => s.ToUpper());
    private static MethodInfo ToLowerMethod = TypeFns.GetMethodByExample((String s) => s.ToLower());
    private static MethodInfo ConcatMethod = TypeFns.GetMethodByExample((String s1, String s2) => String.Concat(s1, s2));
    private static MethodInfo ReplaceMethod = TypeFns.GetMethodByExample((String s) => s.Replace("xxxx","y"));

    private static MemberInfo LengthProperty = typeof(String).GetProperty("Length");

    private static List<Type> NumericTypes = TypeFns.NumericTypes.ToList();

    private static Dictionary<String, PropertyInfo> MakeDateMethodMap() {
      var parts = new string[] { "Second", "Minute", "Hour", "Day", "Month", "Year" };
      return parts.ToDictionary(p => p.ToLower(), p => typeof(DateTime).GetProperty(p));
    }

    private static Dictionary<String, Tuple<MethodInfo, MethodInfo>> MakeMathMethodMap() {
      var parts = new string[] { "Floor", "Ceiling", "Round" };
      return parts.ToDictionary(p => p.ToLower(), p => Tuple.Create(
          typeof(Math).GetMethod(p, new[] { typeof(decimal) }),
          typeof(Math).GetMethod(p, new[] { typeof(double) })
          ));
    }


    private static Dictionary<String, Tuple<ExpressionType, OperatorType>> MakeExpressionTypeMap() {
      var map = new Dictionary<String, Tuple<ExpressionType, OperatorType>>();
      map["eq"] = Tuple.Create(ExpressionType.Equal, OperatorType.Any);
      map["ne"] = Tuple.Create(ExpressionType.NotEqual, OperatorType.Any);
      map["lt"] = Tuple.Create(ExpressionType.LessThan, OperatorType.Numeric);
      map["le"] = Tuple.Create(ExpressionType.LessThanOrEqual, OperatorType.Numeric);
      map["gt"] = Tuple.Create(ExpressionType.GreaterThan, OperatorType.Numeric);
      map["ge"] = Tuple.Create(ExpressionType.GreaterThanOrEqual, OperatorType.Numeric);
      map["and"] = Tuple.Create(ExpressionType.AndAlso, OperatorType.Boolean);
      map["or"] = Tuple.Create(ExpressionType.OrElse, OperatorType.Boolean);
      map["add"] = Tuple.Create(ExpressionType.Add, OperatorType.Numeric);
      map["sub"] = Tuple.Create(ExpressionType.Subtract, OperatorType.Numeric);
      map["mul"] = Tuple.Create(ExpressionType.Multiply, OperatorType.Numeric);
      map["div"] = Tuple.Create(ExpressionType.Divide, OperatorType.Numeric);
      map["mod"] = Tuple.Create(ExpressionType.Modulo, OperatorType.Numeric);
      return map;
    }

    private Type _rootType;
    private ParameterExpression _paramExpr;
    private Dictionary<String, ParameterExpression> _lambdaVarMap = new Dictionary<string, ParameterExpression>();
    private static Dictionary<String, Tuple<ExpressionType, OperatorType>> __expressionTypeMap = MakeExpressionTypeMap();
    private static Dictionary<String, PropertyInfo> __dateMethodMap = MakeDateMethodMap();
    private static Dictionary<String, Tuple<MethodInfo, MethodInfo>> __mathMethodMap = MakeMathMethodMap();

  };

  public enum OperatorType {
    Numeric = 1,
    String = 2,
    Boolean = 4,
    Any = 7
  }


}
