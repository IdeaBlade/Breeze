using Breeze.NetClient.Core;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Data.Services.Client;
using System.Diagnostics;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
   /// <summary>
  /// For internal use only. Called to convert a query to a cache only in memory query
  /// </summary>
  internal class CacheQueryExpressionVisitor : ExpressionVisitor {

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="cacheQueryOptions"></param>
    /// <param name="entityManagerParameterExpr"></param>
    private  CacheQueryExpressionVisitor(CacheQueryOptions cacheQueryOptions, Type entityType)
      : base() {
        _cacheQueryOptions = cacheQueryOptions;
        _elementType = entityType;
        _entityManagerParameterExpr = Expression.Parameter(typeof(EntityManager));
    }


    public static Expression<Func<EntityManager, IEnumerable<T>>> Visit<T>(Expression expr, CacheQueryOptions cacheQueryOptions)  {
      var visitor = new CacheQueryExpressionVisitor(cacheQueryOptions, typeof(T));
      Expression<Func<EntityManager, IEnumerable<T>>> lambda;
      if (IsResourceSetExpression(expr)) {
        lambda = (EntityManager em) => em.GetEntities<T>(EntityState.AllButDetached);
      } else {
        var cacheExpr = visitor.Visit(expr);
        lambda = Expression.Lambda<Func<EntityManager, IEnumerable<T>>>(cacheExpr, visitor._entityManagerParameterExpr);
      }
      return lambda;
    }


    private ParameterExpression _entityManagerParameterExpr;
    private CacheQueryOptions _cacheQueryOptions;
    private Type _elementType;

    #region Visit methods 

    /////<summary>
    /////For internal use only.
    /////</summary>
    protected override Expression VisitConstant(ConstantExpression ce) {

      var entityQuery = ce.Value as EntityQuery;
      if (entityQuery != null) {
        return GetEntitiesAsParameterExpr(_elementType);
      }

      return base.VisitConstant(ce);
    }

    protected override Expression VisitBinary(BinaryExpression be) {
      // handle entity == null expressions
      if ( be.NodeType == ExpressionType.Equal || be.NodeType == ExpressionType.NotEqual) {
        //if (  IsEntityExpr(be.Left) && IsConstantNullExpr(be.Right)) {
        //  return CreateIsNullEntityExpr(be.Left, be.NodeType);
        //}
        //if (  IsEntityExpr(be.Right) && IsConstantNullExpr(be.Left)) {
        //  return CreateIsNullEntityExpr(be.Right, be.NodeType);
        //}
        if ( IsStringEqualityExpr(be)) {
          return HandleCacheQueryOptions(be);
        }
      }
      return base.VisitBinary(be);
    }



    protected override Expression VisitMethodCall(MethodCallExpression mce) {

      // Dequote lambda expressions - this is required because that Enumerable.XXX() methods take Func's whereas
      // Queryable.XXX() methods take Expr<Func  
      var args = DequoteLambdas(mce.Arguments);

      var method = TranslateQueryableToEnumerable(mce.Method);

      MethodCallExpression newMce;
      Expression objectExpr = mce.Object;

      if (args.Any() && IsResourceSetExpression(args[0])) {
        args[0] = GetEntitiesAsParameterExpr(_elementType);
        newMce = Expression.Call(method, args);
        return base.VisitMethodCall(newMce);
      }

      if (method.Name == "Expand" || method.Name == "IncludeTotalCount") {
        var operand = ((UnaryExpression)objectExpr).Operand;
        if (IsResourceSetExpression(operand)) {
          return GetEntitiesAsParameterExpr(_elementType);
        } else {
          return base.Visit(operand);
        }
      } 
      
      if (objectExpr != null && mce.Method.DeclaringType == typeof(String)) {
        // gracefully handle methods on String where string is null - by coalescing to String.Empty
        objectExpr = Expression.Coalesce(objectExpr, Expression.Constant(String.Empty));
      } 

     
      if (objectExpr != null) {
        newMce = Expression.Call(objectExpr, method, args);
      } else {
        newMce = Expression.Call(method, args);
      }

      // process Guid ordering and String comparisions 
      newMce =  ProcessOrderBy(newMce);

      newMce =  HandleCacheQueryOptions(newMce);
      
    
      return base.VisitMethodCall(newMce);
    }

    protected override Expression VisitMember(MemberExpression me) {
      // gracefully handle properties on String where string is null - by coalescing to String.Empty
      if (me.Member.DeclaringType == typeof(String)) {
        var coalesceExpr = Expression.Coalesce(me.Expression, Expression.Constant(String.Empty));
        var newMe = Expression.MakeMemberAccess(coalesceExpr, me.Member);
        return base.VisitMember(newMe);
      } else {
        return base.VisitMember(me);
      }
    }

    //protected override Expression VisitMemberInit(MemberInitExpression mie) {
    //  // Convert to New expression if dynamic type.  In SL the parameterless ctor throws when used against cache.
    //  var ne = newExpr as NewExpression;
    //  if (DynamicTypeInfo.IsDynamicType(ne.Constructor.DeclaringType) && bindings.Count() != 0) {
    //    var dti = DynamicTypeInfo.FindOrCreate(ne.Constructor.DeclaringType);
    //    if (dti == null || dti.DynamicConstructor.GetParameters().Count() != bindings.Count()) {
    //      return base.VisitMemberInit(mie, newExpr, bindings);
    //    }
    //    var args = bindings.Cast<MemberAssignment>().Select(a => a.Expression);
    //    var newExpr2 = Expression.New(dti.DynamicConstructor, args);
    //    return this.VisitNew(newExpr2, args);
    //  } else {
    //    return base.VisitMemberInit(mie);
    //  }
    //}

    #endregion

    #region Private members


    private static bool IsResourceSetExpression(Expression expr) {
      return (int)expr.NodeType == 10000;
    }


    private MethodInfo TranslateQueryableToEnumerable(MethodInfo method) {
      // convert from method Queryable<A,B>.OrderBy( a, b) -> Queryable<A, B>.OrderBy( a, b, IComparer<B>);
      if (method.DeclaringType != typeof(Queryable)) return method;

      var genericArgs = method.GetGenericArguments();
      var methodCandidates = typeof(Enumerable).GetTypeInfo().DeclaredMethods
        .Where(mi => mi.Name == method.Name && mi.IsGenericMethod && (mi.IsPublic || mi.IsStatic));
      var methods = methodCandidates.Where(mi => mi.GetGenericArguments().Length == genericArgs.Length)
        .Select(mi => mi.MakeGenericMethod(genericArgs));
      return methods.First();
    }

    private static List<Expression> DequoteLambdas(IEnumerable<Expression> argExpressions) {
      var argExpressionList = argExpressions.Select(e => {
        var ue = e as UnaryExpression;
        if (ue != null && ue.NodeType == ExpressionType.Quote) {
          return ue.Operand;
        } else {
          return e;
        }
      }).ToList();
      return argExpressionList;
    }

    private MethodCallExpression ProcessOrderBy(MethodCallExpression mce) {
      var methodName = mce.Method.Name;
      if (!methodName.StartsWith("OrderBy")) return mce;
      if (_cacheQueryOptions.GuidOrdering != GuidOrdering.CLR) {
        return ProcessOrderByExpr(mce, methodName, typeof(Guid));
      }
      if (_cacheQueryOptions.StringComparison != StringComparison.CurrentCulture) {
        return ProcessOrderByExpr(mce, methodName, typeof(String));
      }
      return mce;
    }

    private MethodCallExpression ProcessOrderByExpr(MethodCallExpression mce, string methodName, Type returnType) {
      try {
        var args = mce.Arguments;
        if (args.Count != 2) return mce;
        var lambda = args[1] as LambdaExpression;
        if (lambda == null) return mce;
        if (lambda.ReturnType != returnType) return mce;

        // convert from method Queryable<A,B>.OrderBy( a, b) -> Queryable<A, B>.OrderBy( a, b, IComparer<B>);
        var genericArgs = mce.Method.GetGenericArguments();
        // var orderByMethods = TypeFns.FindGenericMethods(typeof(Enumerable), methodName, BindingFlags.Public | BindingFlags.Static, genericArgs).ToList();
        var methodCandidates = typeof(Enumerable).GetTypeInfo().DeclaredMethods
          .Where(mi => mi.Name == methodName && mi.IsGenericMethod && (mi.IsPublic || mi.IsStatic));
        var orderByMethods = methodCandidates.Where(mi => mi.GetGenericArguments().Length == genericArgs.Length)
          .Select(mi => mi.MakeGenericMethod(genericArgs));
        var selectedMethod = orderByMethods.First(m => m.GetParameters().Count() == 3);
        Expression comparerExpr;
        if (returnType == typeof(Guid)) {
          comparerExpr = Expression.Constant(new SqlServerGuidComparer());
        } else if (returnType == typeof(String)) {
          var stringComparer = GetStringComparer(_cacheQueryOptions.StringComparison);
          comparerExpr = Expression.Constant(stringComparer);
        } else {
          return mce;
        }
        var argsList = args.ToList();
        argsList.Add(comparerExpr);
        var expr = Expression.Call(selectedMethod, argsList);
        return expr;
      } catch (Exception e) {
        Debug.WriteLine("Unable to handle CacheQuery " + returnType + " ordering:" + e.Message);
        return null;
      }
    }

    private static object GetStringComparer(StringComparison stringComparison) {
      var stringComparers = new StringComparer[] { 
        StringComparer.CurrentCulture, 
        StringComparer.CurrentCultureIgnoreCase,
        StringComparer.Ordinal,
        StringComparer.OrdinalIgnoreCase
      };
      return stringComparers[(int)stringComparison];

    }

    private bool IsStringEqualityExpr(BinaryExpression be) {
      if (be.Method == null) return false;
      if (be.Method.Name != "op_Equality" && be.Method.Name != "op_Inequality") return false;
      var parms = be.Method.GetParameters();
      return parms.All(p => p.ParameterType == typeof(String));
    }

    private Expression HandleCacheQueryOptions(BinaryExpression be) {
      if (_cacheQueryOptions != CacheQueryOptions.None) {
        if (be.Method.Name == "op_Equality") {
          return Expression.Call(StringFns.EqualsMethod, BuildStrFnArgs(be.Left, be.Right));
        } else if (be.Method.Name == "op_Inequality") {
          return Expression.Call(StringFns.NotEqualsMethod, BuildStrFnArgs(be.Left, be.Right));
        } else {
          return base.VisitBinary(be);
        }
      } else {
        return base.VisitBinary(be);
      }

    }

    private MethodCallExpression HandleCacheQueryOptions(MethodCallExpression mce) {
      if (mce.Object == null || mce.Method.DeclaringType != typeof(String)) return mce;
      if (_cacheQueryOptions == CacheQueryOptions.None) return mce;

      MethodInfo mi;
      if (!StringFns.Map.TryGetValue(mce.Method.Name, out mi)) return mce;
      if (mce.Arguments.Count != 1) return mce;
      var newExpr = Expression.Call(mi, BuildStrFnArgs(mce.Object, mce.Arguments[0]));
      return newExpr;
    }

    private IEnumerable<Expression> BuildStrFnArgs(Expression expr1, Expression expr2) {
      yield return expr1;
      yield return expr2;
      // yield return Expression.Constant(_cacheQueryOptions.StringComparison);
      yield return Expression.Constant(_cacheQueryOptions);
    }

    private Expression GetEntitiesAsParameterExpr(Type entityType) {
      
      var getEntitiesMi = MethodReflector.Get<EntityManager, Type>((em, t) => em.GetEntities(t));
      var entityTypeExpr = Expression.Constant(entityType, typeof(Type));
      var egExpr = Expression.Call(_entityManagerParameterExpr, getEntitiesMi, entityTypeExpr);

      var methExpr = Expression.Call(typeof(Enumerable), "Cast", new Type[] { entityType }, egExpr);
      return methExpr;

    }

    //private Expression CreateIsNullEntityExpr(Expression entityExpr, ExpressionType nodeType) {
    //  var entityAspectMember = TypeFns.FindPropertyOrField(entityExpr.Type, "EntityAspect", true, false);
    //  var isNullEntityMember = TypeFns.FindPropertyOrField(typeof(EntityAspect), "IsNullEntity", true, false);
    //  var eaPropExpr = Expression.MakeMemberAccess(entityExpr, entityAspectMember);
    //  var isNullExpr = Expression.MakeMemberAccess(eaPropExpr, isNullEntityMember);
    //  if (nodeType == ExpressionType.NotEqual) {
    //    return Expression.Not(isNullExpr);
    //  } else {
    //    return isNullExpr;
    //  }
    //}

    private bool IsEntityExpr(Expression expr) {
      return typeof(IEntity).GetTypeInfo().IsAssignableFrom(expr.Type.GetTypeInfo());
    }

    private bool IsConstantNullExpr(Expression expr) {
      var ce = expr as ConstantExpression;
      if (ce == null) return false;
      return ce.Value == null;
    }

    #endregion

    internal static class StringFns {

      // this line needs to occur before Map property below.
      private static readonly Lazy<Dictionary<String, MethodInfo>> __lazyMap = new Lazy<Dictionary<string, MethodInfo>>(() => BuildMap());

      public static Dictionary<String, MethodInfo> Map {
        get { return __lazyMap.Value; }
      }

      public static MethodInfo EqualsMethod = Map["Equals"];
      public static MethodInfo NotEqualsMethod = Map["NotEquals"];

      public static bool Equals(String s1, String s2, CacheQueryOptions cqo) {
        if (cqo.UseSql92CompliantStringComparison) {
          s1 = (s1 ?? "").TrimEnd();
          s2 = (s2 ?? "").TrimEnd();
        }
        return String.Equals(s1, s2, cqo.StringComparison);
      }

      public static bool NotEquals(String s1, String s2, CacheQueryOptions cqo) {
        if (cqo.UseSql92CompliantStringComparison) {
          s1 = (s1 ?? "").TrimEnd();
          s2 = (s2 ?? "").TrimEnd();
        }
        return !String.Equals(s1, s2, cqo.StringComparison);
      }

      public static bool StartsWith(String s1, String s2, CacheQueryOptions cqo) {
        return s1.StartsWith(s2, cqo.StringComparison);
      }

      public static bool EndsWith(String s1, String s2, CacheQueryOptions cqo) {
        return s1.EndsWith(s2, cqo.StringComparison);
      }

      public static bool Contains(String s1, String s2, CacheQueryOptions cqo) {
        return s1.IndexOf(s2, cqo.StringComparison) >= 0;
      }

      public static int IndexOf(String s1, String s2, CacheQueryOptions cqo) {
        return s1.IndexOf(s2, cqo.StringComparison);
      }

      private static Dictionary<String, MethodInfo> BuildMap() {
        var methods = typeof(StringFns).GetTypeInfo().DeclaredMethods
          .Where(m => (m.IsPublic || m.IsStatic) && m.GetParameters().Length > 0);
        //var methods = typeof(StringFns).GetMethods(BindingFlags.Public | BindingFlags.Static)
        //  .Where(m => m.GetParameters().Length > 0 );
        return methods.ToDictionary(m => m.Name, m => m);
      }

    }

  }


}
