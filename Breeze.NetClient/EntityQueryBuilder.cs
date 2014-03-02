using Breeze.Core;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  /// <summary>
  /// Used internally by the framework to build an <see cref="EntityQuery"/>.
  /// </summary>
  internal static class EntityQueryBuilder  {

    /// <summary>
    /// Builds an <see cref="EntityQuery"/> based on a collection of <see cref="EntityKey"/>s.
    /// The EntityQuery returned is actually an EntityQuery{T} but T is unknown at compile time.
    /// </summary>
    /// <param name="keys"></param>
    /// <returns></returns>
    public static EntityQuery BuildQuery(params EntityKey[] keys) {
      return BuildQuery((IEnumerable<EntityKey>) keys);
    }

    /// <summary>
    /// Builds an <see cref="EntityQuery"/> based on a collection of <see cref="EntityKey"/>s.
    /// The EntityQuery returned is actually an EntityQuery{T} but T is unknown at compile time.
    /// </summary>
    /// <param name="keys"></param>
    /// <returns></returns>
    public static EntityQuery BuildQuery(IEnumerable<EntityKey> keys) {
      if (!keys.AllEqual(k => k.EntityType)) {
        throw new ArgumentException("The EntityQueryBuilder.BuildQuery method requires that the 'keys' parameter consist of EntityKeys all with the same EntityType.");
      }
      var firstKey = keys.FirstOrDefault();
      if (firstKey == null) return null;
      var entityQuery = EntityQuery.Create(firstKey.EntityType.ClrType);
      return AddWhereClause(entityQuery, keys);
    }

    public static EntityQuery BuildQuery(IEntity entity, NavigationProperty np) {
      var ekQuery = BuildQuery(entity.EntityAspect.EntityKey);
      var q = ekQuery.ExpandNonGeneric(np.Name);
      return q;
    }

    /// <summary>
    /// Returns a query that will return an Empty enumeration of specified type when executed.
    /// </summary>
    /// <param name="entityType"></param>
    /// <returns></returns>
    public static EntityQuery BuildEmptyQuery(Type entityType) {
      var parameterExpr = Expression.Parameter(entityType, "t");
      // where 1 = 0;
      var predicateExpr = Expression.Equal(Expression.Constant(1), Expression.Constant(0));
      var lambdaExpr = Expression.Lambda(predicateExpr, parameterExpr);
      var entityQuery = EntityQuery.Create(entityType);
      entityQuery = AddWhereClause(entityQuery, lambdaExpr);
      return entityQuery;
    }

    /// <summary>
    /// Builds an <see cref="EntityQuery"/> tied to a specific <see cref="EntityGroup"/> based on a collection of <see cref="EntityKey"/>s
    /// </summary>
    /// <param name="keys"></param>
    /// <param name="entityQuery"></param>
    /// <returns></returns>
    private static EntityQuery AddWhereClause(EntityQuery entityQuery, IEnumerable<EntityKey> keys) {
      var lambda = BuildWhereLambda(keys);
      return AddWhereClause(entityQuery, lambda);
    }

    private static EntityQuery AddWhereClause(EntityQuery entityQuery, LambdaExpression lambda) {
      // This works too - not sure which is faster or better
      //var method = factory.GetType().GetMethod("Where", new Type[] { typeof(LambdaExpression) });
      //var query = method.Invoke(factory, new Object[] { lambda });
      //return (EntityQuery)query;
      var expr = BuildCallWhereExpr(entityQuery, lambda);
      var query = (EntityQuery)TypeFns.ConstructGenericInstance(typeof(EntityQuery<>),
        new Type[] { entityQuery.ElementType },
        expr, entityQuery);
      return query;
    }

    /// <summary>
    /// For internal use only. Handles both scalar and multivalued primary keys
    /// </summary>
    /// <param name="keys"></param>
    /// <returns></returns>
    private static LambdaExpression BuildWhereLambda(IEnumerable<EntityKey> keys) {
      var firstKey = keys.FirstOrDefault();
      if (firstKey == null) return null;
      var entityType = firstKey.EntityType;

      var parameterExpr = Expression.Parameter(entityType.ClrType, "t");
      // get list of propExpressions for entity type's primary key properties
      var propExpressions =  entityType.KeyProperties.Select(
       property => Expression.Property(parameterExpr, property.Name));

      var pkExpressions = keys.Select(key => BuildMultiEqualExpr(propExpressions, key.Values));
      var resultExpr = pkExpressions.Or();
      return Expression.Lambda(resultExpr, parameterExpr);
    }

    private static MethodCallExpression BuildCallWhereExpr(EntityQuery entityQuery, LambdaExpression lambda) {
      // var entityQueryExpression = Expression.Constant(entityQuery);
      var expr = Expression.Call(
                    typeof(Queryable), "Where",
                    new Type[] { entityQuery.ElementType },
                    entityQuery.Expression, Expression.Quote(lambda));
      return expr;
    }


    private static BinaryExpression BuildMultiEqualExpr(IEnumerable<MemberExpression> propExpressions, Object[] values) {
      var condExpressions = propExpressions.Select(
        (expr, i) => BuildEqualExpr(expr, values[i]));
      // and together all of the pieces of the primary key ( if more than 1)
      var resultExpr = condExpressions.And();
      return resultExpr;
    }

    private static BinaryExpression BuildEqualExpr(MemberExpression propertyExpr, Object aValue) {
      // Allow query to be parameterized.
      // var expr = LocalizingExpressionVisitor.LocalizePrimitive(aValue, propertyExpr.Type);
      var expr = Expression.Constant(aValue, propertyExpr.Type);
      return Expression.Equal(propertyExpr, expr);
    }

    private static BinaryExpression And(this IEnumerable<BinaryExpression> expressions) {
      BinaryExpression resultExpr = null;
      foreach (var nextExpr in expressions) {
        resultExpr = (resultExpr != null)
          ? Expression.AndAlso(resultExpr, nextExpr)
          : nextExpr;
      }
      return resultExpr;
    }

    private static BinaryExpression Or(this IEnumerable<BinaryExpression> expressions) {
      BinaryExpression resultExpr = null;
      foreach (var nextExpr in expressions) {
        resultExpr = (resultExpr != null)
          ? Expression.OrElse(resultExpr, nextExpr)
          : nextExpr;
      }
      return resultExpr;
    }

    private static Type GetFuncType(params Type[] typeArgs) {
      if (typeArgs == null || typeArgs.Length < 1 || typeArgs.Length > 5) throw new ArgumentException();
      return funcTypes[typeArgs.Length - 1].MakeGenericType(typeArgs);
    }

    static readonly Type[] funcTypes = new Type[] {
            typeof(Func<>),
            typeof(Func<,>),
            typeof(Func<,,>),
            typeof(Func<,,,>),
            typeof(Func<,,,,>)
        };

    // TODO: review this later.
    //static Expression<Func<T, bool>> In<T, R>(this Expression<Func<T, R>> member, params R[] values) {
    //  var prop = member.Body as MemberExpression;
    //  if (prop == null)
    //    throw new Exception("Expression has to be member");
    //  if (values.Length == 0)
    //    return _ => true;
    //  var body = values.Select(v => Expression.Equal(prop, Expression.Constant(v))).Aggregate(Expression.OrElse);
    //  return Expression.Lambda<Func<T, bool>>(body, member.Parameters[0]);
    //}

    //// Helps with type inference
    //static Expression<Func<A, B>> E<A, B>(Expression<Func<A, B>> exp) {
    //  return exp;
    //}

    // ------------------------------------------------------------------------------------------------

    //internal static EntityQuery BuildQuery(List<EntityAspect> aspects, EntityRelationLink relationLink) {
    //  // Building a query of the form:
    //  // var q0 = customers
    //  //   .Where(c => c.CustomerID == 1 || c.CustomerID == 2)
    //  //   .SelectMany(c => c.SalesOrderHeaders);
    //  // --- RelationLink: Customer_SalesOrderHeader.ToChild From: Customer To: SalesOrderHeader
    //  if (aspects.Count == 0) {
    //    throw new ArgumentException("entities must contains at least one entity");
    //  }
    //  var eks = aspects.Select(e => e.EntityKey);
    //  var entityType = eks.First().EntityType;
    //  var em = aspects[0].InternalEntityManager;
    //  var baseQuery = EntityQuery.Create(entityType, em);

    //  var fromLambdaExpr = BuildLambdaKeyQuery(eks);
    //  var parameterExpr = fromLambdaExpr.Parameters[0];
    //  var whereExpr = BuildCallWhereExpr(baseQuery, fromLambdaExpr);
    //  var castExpr = Expression.Call(
    //    typeof(Queryable), "OfType",
    //      new Type[] { entityType },
    //      whereExpr);

    //  var memberAccessLambda = BuildLambdaMemberAccessExpr(entityType, relationLink, parameterExpr);

    //  Expression expr;
    //  if (relationLink.IsScalar) {
    //    expr = Expression.Call(
    //      typeof(Queryable), "Select",
    //      new Type[] { entityType, relationLink.ToRole.EntityType },
    //      castExpr, Expression.Quote(memberAccessLambda));
    //  } else {
    //    expr = Expression.Call(
    //      typeof(Queryable), "SelectMany",
    //      new Type[] { entityType, relationLink.ToRole.EntityType },
    //      castExpr, Expression.Quote(memberAccessLambda));
    //  }

    //  var query = (EntityQuery)TypeFns.ConstructGenericInstance(typeof(EntityQuery<>), 
    //    new Type[] { relationLink.ToRole.EntityType },
    //    expr, baseQuery);
    //  return query;
    //}

    //private static LambdaExpression BuildLambdaMemberAccessExpr(Type fromType, EntityRelationLink relationLink, ParameterExpression parameterExpr) {
    //  // fromType may not be the same as the relationLink.FromType because of inheritence
    //  var propertyName = relationLink.ToRole.RelationPropertyName;
    //  var propertyInfo = TypeFns.FindPropertyOrField(fromType, propertyName, false, false);
    //  Type funcType;
    //  if (!relationLink.IsScalar) {
    //    var enumerableToType = typeof(IEnumerable<>).MakeGenericType(relationLink.ToRole.EntityType);
    //    funcType = GetFuncType(fromType, enumerableToType);
    //  } else {
    //    funcType = GetFuncType(fromType, relationLink.ToRole.EntityType);
    //  }

    //  var selectLambda = Expression.Lambda(
    //    funcType,
    //    Expression.MakeMemberAccess(parameterExpr, propertyInfo),
    //    parameterExpr);
    //  return selectLambda;
    //}
  
  }
}
