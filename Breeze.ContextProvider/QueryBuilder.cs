using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;


namespace Breeze.ContextProvider {
  
  /// <summary>
  /// Used to build up a Queryable.
  /// </summary>
  /// <remarks>
  /// Remember to add it to the Filters for your configuration
  /// </remarks>
  public class QueryBuilder  {   
    
    public static Func<IQueryable, IQueryable> BuildSelectFunc(Type elementType, List<String> selectClauses) {
      var propSigs = selectClauses.Select(sc => new PropertySignature(elementType, sc)).ToList();
      var dti = DynamicTypeInfo.FindOrCreate(propSigs.Select(ps => ps.Name), propSigs.Select(ps => ps.ReturnType));
      var lambdaExpr = CreateNewLambda(dti, propSigs);
      var method = TypeFns.GetMethodByExample((IQueryable<String> q) => q.Select(s => s.Length), elementType, dti.DynamicType);
      var func = BuildIQueryableFunc(elementType, method, lambdaExpr);
      return func;
    }

    private static LambdaExpression CreateNewLambda(DynamicTypeInfo dti, IEnumerable<PropertySignature> selectors) {
      var paramExpr = Expression.Parameter(selectors.First().InstanceType, "t");
      // cannot create a NewExpression on a dynamic type becasue of EF restrictions
      // so we always create a MemberInitExpression with bindings ( i.e. a new Foo() { a=1, b=2 } instead of new Foo(1,2);
      var newExpr = Expression.New(dti.DynamicEmptyConstructor);
      var propertyExprs = selectors.Select(s => s.BuildMemberExpression(paramExpr));
      var dynamicProperties = dti.DynamicType.GetProperties();
      var bindings = dynamicProperties.Zip(propertyExprs, (prop, expr) => Expression.Bind(prop, expr));
      var memberInitExpr = Expression.MemberInit(newExpr, bindings.Cast<MemberBinding>());
      var newLambda = Expression.Lambda(memberInitExpr, paramExpr);
      return newLambda;
    }



    // TODO: Check if the ThenBy portion of this works
    public static Func<IQueryable, IQueryable> BuildOrderByFunc(bool isThenBy, Type elementType, string obc) {
      var parts = obc.Trim().Replace("  ", " ").Split(' ');
      var propertyPath = parts[0];
      bool isDesc = parts.Length > 1 && parts[1] == "desc";
      var paramExpr = Expression.Parameter(elementType, "o");
      Expression nextExpr = paramExpr;
      var propertyNames = propertyPath.Split('/').ToList();
      propertyNames.ForEach(pn => {
        var nextElementType = nextExpr.Type;
        var propertyInfo = nextElementType.GetProperty(pn);
        if (propertyInfo == null) {
          throw new Exception("Unable to locate property: " + pn + " on type: " + nextElementType.ToString());
        }
        nextExpr = Expression.MakeMemberAccess(nextExpr, propertyInfo);
      });
      var lambdaExpr = Expression.Lambda(nextExpr, paramExpr);
      
      var orderByMethod = GetOrderByMethod(isThenBy, isDesc, elementType, nextExpr.Type);

      var baseType = isThenBy ? typeof (IOrderedQueryable<>) : typeof (IQueryable<>);
      var func = BuildIQueryableFunc(elementType, orderByMethod, lambdaExpr, baseType);
      return func;
    }

    private static MethodInfo GetOrderByMethod(bool isThenBy, bool isDesc, Type elementType, Type nextExprType) {
      MethodInfo orderByMethod;
      if (isThenBy) {
        orderByMethod = isDesc
                          ? TypeFns.GetMethodByExample(
                            (IOrderedQueryable<String> q) => q.ThenByDescending(s => s.Length),
                            elementType, nextExprType)
                          : TypeFns.GetMethodByExample(
                            (IOrderedQueryable<String> q) => q.ThenBy(s => s.Length),
                            elementType, nextExprType);
      } else {
        orderByMethod = isDesc
                          ? TypeFns.GetMethodByExample(
                            (IQueryable<String> q) => q.OrderByDescending(s => s.Length),
                            elementType, nextExprType)
                          : TypeFns.GetMethodByExample(
                            (IQueryable<String> q) => q.OrderBy(s => s.Length),
                            elementType, nextExprType);
      }
      return orderByMethod;
    }

    public  static Func<IQueryable, IQueryable> BuildIQueryableFunc<TArg>(Type instanceType, MethodInfo method, TArg parameter, Type queryableBaseType = null) {
      if (queryableBaseType == null) {
        queryableBaseType = typeof(IQueryable<>);
      }
      var paramExpr = Expression.Parameter(typeof(IQueryable));
      var queryableType = queryableBaseType.MakeGenericType(instanceType);
      var castParamExpr = Expression.Convert(paramExpr, queryableType);


      var callExpr = Expression.Call(method, castParamExpr, Expression.Constant(parameter));
      var castResultExpr = Expression.Convert(callExpr, typeof(IQueryable));
      var lambda = Expression.Lambda(castResultExpr, paramExpr);
      var func = (Func<IQueryable, IQueryable>)lambda.Compile();
      return func;
    }
  }
}


