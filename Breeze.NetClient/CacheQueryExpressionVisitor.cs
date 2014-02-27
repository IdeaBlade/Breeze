using Breeze.NetClient.Core;
using System;
using System.Collections;
using System.Collections.Generic;
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
    public CacheQueryExpressionVisitor(CacheQueryOptions cacheQueryOptions, Type elementType)
      : base() {
        _cacheQueryOptions = cacheQueryOptions;
        EntityManagerParameterExpr = Expression.Parameter(typeof(EntityManager));
        _elementType = elementType;
    }

    public static Func<EntityManager, U> GetCompiledFunc<U>(Expression expr, CacheQueryOptions cacheQueryOptions, Type elementType) {
      
      var visitor = new CacheQueryExpressionVisitor(cacheQueryOptions, elementType);
      var cacheExpr = visitor.Visit(expr);

      var lambda = Expression.Lambda<Func<EntityManager, U>>(cacheExpr, visitor.EntityManagerParameterExpr);
      var func = lambda.Compile();
      return func;
    }

    
    public ParameterExpression EntityManagerParameterExpr;
    private CacheQueryOptions _cacheQueryOptions;
    private Type _elementType;

    ///<summary>
    ///For internal use only.
    ///</summary>
    protected override Expression VisitConstant(ConstantExpression ce) {

      var entityQuery = ce.Value as EntityQuery;
      if (entityQuery != null) {
        return GetCurrentEntitiesAsParameterExpr(entityQuery.ElementType);
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

      if ((int) args[0].NodeType == 10000) {
        args[0] = GetCurrentEntitiesAsParameterExpr(_elementType);
        newMce = Expression.Call(method, args);
        return base.VisitMethodCall(newMce);
      }

      Expression objectExpr;
      if (mce.Object != null && mce.Method.DeclaringType == typeof(String)) {
        // gracefully handle methods on String where string is null - by coalescing to String.Empty
        objectExpr = Expression.Coalesce(mce.Object, Expression.Constant(String.Empty));
      } else {
        objectExpr = mce.Object;
      }

     
      if (mce.Object != null) {
        newMce = Expression.Call(objectExpr, method, args);
      } else {
        newMce = Expression.Call(method, args);
      }

      // process Guid ordering 
      newMce =  ProcessOrderBy(newMce);

      newMce =  HandleCacheQueryOptions(newMce);
      
      if (mce.Type.Name.StartsWith("DataServiceQuery")) {
        return GetCurrentEntitiesAsParameterExpr(_elementType);
      }
      return base.VisitMethodCall(newMce);
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
        return  ProcessOrderByExpr(mce, methodName, typeof(Guid));
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
      if ( be.Method == null) return false;
      if (be.Method.Name != "op_Equality" && be.Method.Name != "op_Inequality") return false;
      var parms = be.Method.GetParameters();
      return parms.All( p => p.ParameterType == typeof(String));
    }

    private Expression HandleCacheQueryOptions(BinaryExpression be) {
      if (_cacheQueryOptions != CacheQueryOptions.None) { 
        if ( be.Method.Name == "op_Equality") {
          return Expression.Call(StringFns.EqualsMethod, BuildStrFnArgs( be.Left, be.Right));
        } else if (be.Method.Name == "op_Inequality") {
          return Expression.Call(StringFns.NotEqualsMethod, BuildStrFnArgs(be.Left, be.Right));
        } else {
          return base.VisitBinary(be);
        }
      } else {
        return base.VisitBinary(be);
      }
      
    }

    private MethodCallExpression HandleCacheQueryOptions(MethodCallExpression expr) {
      if ( _cacheQueryOptions == CacheQueryOptions.None) return expr;
      
      MethodInfo mi;
      if (!StringFns.Map.TryGetValue(expr.Method.Name, out mi)) return expr;
      if (expr.Arguments.Count != 1) return expr;
      var newExpr = Expression.Call(mi, BuildStrFnArgs(expr.Object, expr.Arguments[0]));
      return newExpr;
    }

    private IEnumerable<Expression> BuildStrFnArgs(Expression expr1, Expression expr2) {
      yield return expr1;
      yield return expr2;
      // yield return Expression.Constant(_cacheQueryOptions.StringComparison);
      yield return Expression.Constant(_cacheQueryOptions);
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

    private Expression GetCurrentEntitiesAsParameterExpr(Type entityType) {
      
      var getEntitiesMi = MethodReflector.Get<EntityManager, Type>((em, t) => em.GetEntities(t));
      var entityTypeExpr = Expression.Constant(entityType, typeof(Type));
      var egExpr = Expression.Call(EntityManagerParameterExpr, getEntitiesMi, entityTypeExpr);

      // var methExpr = Expression.Call(typeof(Enumerable), "AsEnumerable", new Type[] { entityType }, egExpr);
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

    public UnaryExpression expr { get; set; }
  }

  public class ResourceSetReplacementVisitor : ExpressionVisitor {

    private ResourceSetReplacementVisitor(ParameterExpression paramExpr) {
      this._paramExpr = paramExpr;
    }

    public static Expression Visit(Expression expr, ParameterExpression paramExpr) {
      return new ResourceSetReplacementVisitor(paramExpr).Visit(expr);
    }

    protected override Expression VisitMethodCall(MethodCallExpression mce) {
      
      if ((int)mce.Arguments[0].NodeType == 10000) {
        var args = mce.Arguments.ToList();
        args[0] = _paramExpr;
        return Expression.Call(mce.Method, args);
      }

      return base.VisitMethodCall(mce);
    }

    private ParameterExpression _paramExpr;
  }

  //internal class CacheQueryTypeTranslator : TypeTranslator {

  //  public override MethodInfo TranslateMethod(Type fromType, MethodInfo fromMethod) {     
  //    if (fromMethod != null && fromMethod.DeclaringType == typeof(Queryable)) {
  //      if (fromMethod.IsGenericMethod) {
  //        var toGenMethod = QueryableToEnumerableMethodMap[fromMethod.GetGenericMethodDefinition()];
  //        if (toGenMethod.IsGenericMethodDefinition) {
  //          var toMethod = toGenMethod.MakeGenericMethod(fromMethod.GetGenericArguments());
  //          return toMethod;
  //        } else {
  //          return toGenMethod;
  //        }
  //      } else {
  //        var toMethod = QueryableToEnumerableMethodMap[fromMethod];
  //        return toMethod;
  //      }
  //    } else {
  //      return base.TranslateMethod(fromType, fromMethod);
  //    }
  //  }

  //  private static Dictionary<MethodInfo, MethodInfo> QueryableToEnumerableMethodMap {
  //    get {
  //      return __lazyMap.Value;
  //    }
  //  }
  //  private static Lazy<Dictionary<MethodInfo, MethodInfo>> __lazyMap = new Lazy<Dictionary<MethodInfo, MethodInfo>>(() => BuildQueryableEnumerableMap());

  //  private static Dictionary<MethodInfo, MethodInfo> BuildQueryableEnumerableMap() {
  //    // var qMethods = typeof(Queryable).GetMethods().ToList();
  //    // var eMethods = typeof(Enumerable).GetMethods().ToList();
  //    var qMethods = typeof(Queryable).GetTypeInfo().DeclaredMethods;
  //    var eMethods = typeof(Enumerable).GetTypeInfo().DeclaredMethods;

  //    var list = new List<string>();
  //    var qeMap = qMethods.Select(mi => { 
  //      var tmp = eMethods.FirstOrDefault(eM => CompareMethods(mi, eM));
  //      return new {
  //        QMethod = mi,
  //        EMethod = tmp
  //        };
  //      })
  //      .Where(a => a.EMethod != null)
  //      .ToDictionary(a => a.QMethod, a => a.EMethod);
  //    return qeMap;
  //  }

  //  private static bool CompareMethods(MethodInfo qM, MethodInfo eM) {
  //    if (qM.Name != eM.Name) return false;

  //    if (!AreCompatibleTypes(qM.ReturnType, eM.ReturnType)) return false;

  //    var qParmTypes = qM.GetParameters().Select(p => p.ParameterType).ToList();
  //    var eParmTypes = eM.GetParameters().Select(p => p.ParameterType).ToList();
  //    if (!AreCompatibleTypes(qParmTypes, eParmTypes)) return false;

  //    return true;
  //  }
    
  //  private static bool AreSameType(Type t1, Type t2) {
  //    if (t1.IsGenericParameter != t2.IsGenericParameter) return false;
  //    if (!t1.IsGenericParameter) {
  //      if (t1 == typeof(IQueryable) && t2 == typeof(IEnumerable)) return true;
  //      if (!t1.ToString().Equals(t2.ToString())) return false;
  //    }
  //    return true;
  //  }

  //  private static bool AreCompatibleTypes(IEnumerable<Type> types1, IEnumerable<Type> types2) {
  //    if (types1.Count() != types2.Count()) return false;
  //    var match = types1.Zip(types2, (t1, t2) => AreCompatibleTypes(t1, t2)).All(b => b);
  //    if (!match) return false;
  //    return true;
  //  }

  //  private static bool AreCompatibleTypes(Type t1, Type t2) {
  //    var ti1 = t1.GetTypeInfo();
  //    var ti2 = t2.GetTypeInfo();
  //    if (ti1.IsGenericType != ti2.IsGenericType) return false;
  //    if (ti1.IsGenericType) {
  //      if (typeof(Expression).GetTypeInfo().IsAssignableFrom(ti1)) {
  //        return AreCompatibleTypes(ti1.GenericTypeArguments.First(), t2);
  //      } else if (typeof(IQueryable).GetTypeInfo().IsAssignableFrom(ti1)) {
  //        return AreCompatibleTypes(ti1.GenericTypeArguments, ti2.GenericTypeArguments);
  //      } else {
  //        return AreSameType(t1, t2);
  //      }
  //    } else {
  //      return AreSameType(t1, t2);
  //    }
  //  }
  //}

  ///// <summary>
  ///// For internal use only.
  ///// </summary>
  ///// <returns></returns>
  //internal class TypeTranslator {

  //  /// <summary>
  //  /// For internal use only.
  //  /// </summary>
  //  /// <returns></returns>
  //  public TypeTranslator() {
  //    // do not initialize TypeMap here 
  //    // TypeMap may be null for the entire lifetime of the translator
  //    // this is a simplified version of the null object pattern
  //  }

  //  /// <summary>
  //  /// For internal use only.
  //  /// </summary>
  //  /// <returns></returns>
  //  public void InitializeMappings(Dictionary<Type, Type> typeMap) {
  //    TypeMap = typeMap;
  //  }

  //  // No longer needed 
  //  //public bool TranslateAnonTypesToDynamicTypes {
  //  //  get;
  //  //  set;
  //  //}

  //  /// <summary>
  //  /// For internal use only.
  //  /// </summary>
  //  /// <returns></returns>
  //  public void AddMapping(Type fromType, Type ToType) {
  //    if (TypeMap == null) {
  //      TypeMap = new Dictionary<Type, Type>();
  //    }
  //    TypeMap.Add(fromType, ToType);
  //  }

  //  /// <summary>
  //  /// For internal use only.
  //  /// </summary>
  //  /// <returns></returns>
  //  public void RemoveMapping(Type fromType) {
  //    TypeMap.Remove(fromType);
  //  }

  //  /// <summary>
  //  /// For internal use only.
  //  /// </summary>
  //  /// <returns></returns>
  //  public bool ContainsType(Type type) {
  //    if (NoTranslationNeeded) return false;
  //    return TypeMap.ContainsKey(type);
  //  }

  //  private bool NoTranslationNeeded {
  //    get { return (TypeMap == null); }
  //    // get { return (TypeMap == null) && !TranslateAnonTypesToDynamicTypes; }
  //  }


  //  /// <summary>
  //  /// For internal use only.
  //  /// </summary>
  //  /// <returns></returns>
  //  public IEnumerable<Type> TranslateTypes(IEnumerable<Type> types) {
  //    if (NoTranslationNeeded) return types;
  //    return types.Select(t => TranslateType(t));
  //  }

  //  /// <summary>
  //  /// For internal use only.
  //  /// </summary>
  //  /// <returns></returns>
  //  public virtual Type TranslateType(Type aType) {
  //    if (NoTranslationNeeded) return aType;
  //    aType = TranslateTypeCore(aType);
  //    var ti = aType.GetTypeInfo();
  //    if (ti.IsGenericTypeDefinition) {
  //      return aType;
  //    } else if (ti.IsGenericType) {
  //      var newType = TranslateType(aType.GetGenericTypeDefinition());
  //      if ( newType.GetTypeInfo().IsGenericType) {
  //        var genericArgs = TranslateTypes(ti.GenericTypeArguments);
  //        aType = newType.MakeGenericType(genericArgs.ToArray());
  //        return TranslateTypeCore(aType);
  //      } else {
  //        return TranslateTypeCore(newType);
  //      }
  //    } else {
  //      return aType;
  //    }
  //  }

  //  /// <summary>
  //  /// For internal use only.
  //  /// </summary>
  //  /// <returns></returns>
  //  public ConstructorInfo TranslateConstructor(ConstructorInfo info, Type[] expectedArgTypes) {
  //    if (NoTranslationNeeded) return info;
  //    var parameterTypes = new List<Type>();
  //    foreach (var parameter in info.GetParameters()) {
  //      parameterTypes.Add(TranslateType(parameter.ParameterType));
  //    }

  //    var newType = TranslateType(info.DeclaringType);
  //    // return newType.GetConstructor(parameterTypes.ToArray());
  //    return newType.GetTypeInfo().DeclaredConstructors
  //      .FirstOrDefault(ci => ci.GetParameters().Select(p => p.ParameterType).SequenceEqual(parameterTypes));
  //  }

  //  /// <summary>
  //  /// For internal use only.
  //  /// </summary>
  //  /// <returns></returns>
  //  public virtual MethodInfo TranslateMethod(Type fromType, MethodInfo fromMethod) {
  //    if (NoTranslationNeeded) return fromMethod;
  //    if (fromMethod == null) return null;
  //    // MethodInfo newMethod = fromMethod;
  //    if (fromMethod.IsGenericMethod) {
  //      var genericMethod = fromMethod.GetGenericMethodDefinition();
  //      var newMethod = (MethodInfo)TranslateMember(fromType, genericMethod);
  //      if (newMethod.IsGenericMethod) {
  //        var genericArgs = fromMethod.GetGenericArguments();
  //        var newGenericArgs = TranslateTypes(genericArgs);
  //        return newMethod.MakeGenericMethod((Type[])newGenericArgs.ToArray());
  //      } else {
  //        return newMethod;
  //      }
  //    } else {
  //      return (MethodInfo)TranslateMember(fromType, fromMethod);
  //    }
  //  }

  //  /// <summary>
  //  /// For internal use only.
  //  /// </summary>
  //  /// <returns></returns>
  //  public virtual MemberInfo TranslateMember(Type fromType, MemberInfo fromMember) {
  //    if (NoTranslationNeeded) return fromMember;

  //    // we may not always be able to use fromMember.DeclaringType because the member may be declared on a
  //    // base class and we want the concrete subclass type here
  //    if (fromMember == null) return null;
  //    MemberInfo newMember;

  //    if (fromType != null) {
  //      newMember = TranslateMemberCore(fromType, fromMember);
  //      if (newMember != fromMember) {
  //        return newMember;
  //      }
  //    }
  //    newMember = TranslateMemberCore(fromMember.DeclaringType, fromMember);
  //    return newMember;

  //  }

  //  private Type TranslateTypeCore(Type nongenericType) {
  //    Type toType;
  //    if (TypeMap == null) return nongenericType;
  //    if (TypeMap.TryGetValue(nongenericType, out toType)) {
  //      return toType;
  //    } else {
  //      return nongenericType;
  //    }
  //  }

  //  private MemberInfo TranslateMemberCore(Type fromType, MemberInfo fromMember) {
  //    Type toType = TranslateType(fromType);
  //    // MemberInfo newMember;
  //    if (fromType != toType && toType != null) {
  //      MemberInfo newMember;
  //      String memberName = fromMember.Name;
  //      var fromMethod = fromMember as MethodInfo;
  //      if (fromMethod != null) {
  //        // var toMembers = toType.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static)
  //        var toMembers = toType.GetTypeInfo().DeclaredMethods
  //          .Where(m => m.Name == memberName &&
  //            m.GetParameters().Length == fromMethod.GetParameters().Length);
  //        newMember = toMembers.FirstOrDefault();
  //      } else {
  //        // var toMembers = toType.GetMembers(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static)
  //        var toMembers = toType.GetTypeInfo().DeclaredMembers
  //          .Where(m => m.Name == memberName);
  //        newMember = toMembers.FirstOrDefault();
  //      }
  //      if (newMember == null) {
  //        return fromMember;
  //      } else {
  //        return newMember;
  //      }
  //    } else {
  //      return fromMember;
  //    }
  //  }

  //  private Dictionary<Type, Type> TypeMap {
  //    get;
  //    set;
  //  }

  //}

}
