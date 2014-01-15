using System;
using System.Collections.Generic;
using System.Linq;

using System.Threading.Tasks;

using Breeze.Core;
using Breeze.Metadata;
using System.Data.Services.Client;
using System.Data.Services.Common;
using System.Linq.Expressions;

namespace Breeze.NetClient {
  public class EntityQuery<T> : EntityQuery, IQueryable<T>, IOrderedQueryable<T>, IQueryProvider {

    private static String __placeHolderServiceName = "http://localhost:7890/breeze/Foo/";
    private static String __placeHolderResourceName = "__Test__";
    public EntityQuery(String resourceName)
      : this() {
        ResourceName = resourceName;
    }

    public EntityQuery( ) : base() {
      var context = new DataServiceContext(new Uri(__placeHolderServiceName), DataServiceProtocolVersion.V3);
      _dataServiceQuery = context.CreateQuery<T>(__placeHolderResourceName);
      _expression = _dataServiceQuery.Expression;
    }

    public EntityQuery(Expression expression, IQueryable queryable) {
      _expression = expression;

      var query = queryable as EntityQuery;
    }


    protected DataServiceQuery<T> _dataServiceQuery;
    protected Expression _expression;

    public Task<IEnumerable<T>> Execute(EntityManager em) {
      return em.ExecuteQuery<T>(this);
    }

    public String GetResourcePath() {
      var requestUri = _dataServiceQuery.RequestUri;
      var s2 = requestUri.AbsoluteUri.Replace(__placeHolderServiceName, "");
      // if any filter conditions
      var queryResource = s2.Replace(__placeHolderResourceName + "()", ResourceName);
      // if no filter conditions
      queryResource = queryResource.Replace(__placeHolderResourceName, ResourceName);
      return queryResource;
    }

    public IEnumerator<T> GetEnumerator() {
      throw new NotImplementedException();
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() {
      throw new NotImplementedException();
    }

    public Type ElementType {
      get { return _dataServiceQuery.ElementType; }
    }

    public System.Linq.Expressions.Expression Expression {
      get { return _expression; }
    }

    public IQueryProvider Provider {
      get { return this; }
    }

    #region IQueryProvider Members

    /// <summary>
    /// Internal use only - part of <see cref="IQueryProvider"/> implementation.
    /// </summary>
    /// <typeparam name="TElement"></typeparam>
    /// <param name="expression"></param>
    /// <returns></returns>
    IQueryable<TElement> IQueryProvider.CreateQuery<TElement>(Expression expression) {
      var q = new EntityQuery<TElement>(expression, this);
      q._dataServiceQuery = (DataServiceQuery<TElement>)_dataServiceQuery.Provider.CreateQuery<TElement>(expression);
      q.ResourceName = ResourceName;
      return q;
    }

    /// <summary>
    /// Internal use only - part of <see cref="IQueryProvider"/> implementation.
    /// </summary>
    /// <param name="expression"></param>
    /// <returns></returns>
    IQueryable IQueryProvider.CreateQuery(Expression expression) {
      // Not sure when this is called but it IS called on OfType() resolution
      var methodExpr = (MethodCallExpression)expression;
      // return type will be an IQueryable<X> 
      var returnType = methodExpr.Method.ReturnType;
      // extract X
      var typeT = TypeFns.GetGenericArgument(returnType);
      // now do the equivalent of => return new EntityQuery<{typeT}>(expression, this);
      var query = TypeFns.ConstructGenericInstance(typeof(EntityQuery<>), new Type[] { typeT },
        expression, this);
      return (IQueryable)query;
    }

    /// <summary>
    /// Internal use only - part of <see cref="IQueryProvider"/> implementation.
    /// </summary>
    /// <typeparam name="TResult"></typeparam>
    /// <param name="expression"></param>
    /// <returns></returns>
    TResult IQueryProvider.Execute<TResult>(Expression expression) {
      throw new Exception("EntityQueries can only be executed asynchronously");
    }

   

    /// <summary>
    /// Internal use only - part of <see cref="IQueryProvider"/> implementation.
    /// </summary>
    /// <param name="expression"></param>
    /// <returns></returns>
    Object IQueryProvider.Execute(Expression expression) {
      throw new Exception("EntityQueries can only be executed asynchronously");
    }

    #endregion 

  }
  
  public class EntityQuery {
    public EntityQuery() {
      
    }
    public EntityQuery(Type clrType) {

    }
    public EntityQuery(EntityType entityType) {

    }

    //public static EntityQuery From(String resourceName) {
    //  return new EntityQuery(resourceName);
    //}



    public String ResourceName { get; protected set; }
  }
}
