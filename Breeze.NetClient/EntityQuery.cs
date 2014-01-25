using System;
using System.Collections.Generic;
using System.Linq;

using System.Threading.Tasks;

using Breeze.Core;

using System.Data.Services.Client;
using System.Data.Services.Common;
using System.Linq.Expressions;

namespace Breeze.NetClient {

  // TODO: EntityQuery is currently just additive - i.e. no way to remove clauses
  public class EntityQuery<T> : EntityQuery, IQueryable<T>, IOrderedQueryable<T>, IQueryProvider {


    public EntityQuery(String resourceName)
      : this() {
        ResourceName = resourceName;
    }

    public EntityQuery( ) : base() {
      var context = new DataServiceContext(new Uri(__placeHolderServiceName), DataServiceProtocolVersion.V3);
      _dataServiceQuery = context.CreateQuery<T>(__placeHolderResourceName);
    }

    public EntityQuery(EntityQuery<T> query) : this(query.ResourceName) {
      DataServiceQuery = query.DataServiceQuery;
    }

    public EntityQuery<T> From(String resourceName) {
      var q = new EntityQuery<T>(this);
      q.ResourceName = resourceName;
      return q;
    }



    public Task<IEnumerable<T>> Execute(EntityManager em) {
      return em.ExecuteQuery<T>(this);
    }

    public EntityQuery<T> Expand<TTarget>(Expression<Func<T, TTarget>> navigationPropertyAccessor) {
      var q = new EntityQuery<T>(this);
      q.DataServiceQuery = this.DataServiceQuery.Expand(navigationPropertyAccessor);
      return q;
    }

    public EntityQuery<T> Expand(String path) {
      var q = new EntityQuery<T>(this);
      q.DataServiceQuery = this.DataServiceQuery.Expand(path);
      return q;
    }

    public EntityQuery<T> AddQueryOption(string name, Object value) {
      var q = new EntityQuery<T>(this);
      q.DataServiceQuery = this.DataServiceQuery.AddQueryOption(name, value);
      return q;
    }
    
    public EntityQuery<T> InlineCount() {
      var q = new EntityQuery<T>(this);
      q.DataServiceQuery = this.DataServiceQuery.IncludeTotalCount();
      return q;
    }

    public String GetResourcePath() {
      var dsq = (DataServiceQuery<T>)_dataServiceQuery;
      var requestUri = dsq.RequestUri;
      var s2 = requestUri.AbsoluteUri.Replace(__placeHolderServiceName, "");
      // if any filter conditions
      var queryResource = s2.Replace(__placeHolderResourceName + "()", ResourceName);
      // if no filter conditions
      queryResource = queryResource.Replace(__placeHolderResourceName, ResourceName);
      return queryResource;
    }

    #region IQueryable impl 

    public IEnumerator<T> GetEnumerator() {
      throw new Exception("EntityQueries cannot be enumerated because they can only be executed asynchronously");
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() {
      throw new Exception("EntityQueries cannot be enumerated because they can only be executed asynchronously");
    }

    public Type ElementType {
      get { return _dataServiceQuery.ElementType; }
    }

    public System.Linq.Expressions.Expression Expression {
      get { return _dataServiceQuery.Expression; }
    }

    public IQueryProvider Provider {
      get { return this; }
    }

    #endregion

    #region IQueryProvider Members

    public EntityQuery(Expression expression, IQueryable queryable) {
      var prevEntityQuery = (EntityQuery)queryable;
      _dataServiceQuery = (DataServiceQuery<T>) prevEntityQuery._dataServiceQuery.Provider.CreateQuery<T>(expression);
      ResourceName = prevEntityQuery.ResourceName;
    }

    /// <summary>
    /// Internal use only - part of <see cref="IQueryProvider"/> implementation.
    /// </summary>
    /// <typeparam name="TElement"></typeparam>
    /// <param name="expression"></param>
    /// <returns></returns>
    IQueryable<TElement> IQueryProvider.CreateQuery<TElement>(Expression expression) {
      return new EntityQuery<TElement>(expression, this);
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

    protected DataServiceQuery<T> DataServiceQuery {
      get {
        return (DataServiceQuery<T>)_dataServiceQuery;
      }
      set {
        _dataServiceQuery = value;
      }
    }

    private static String __placeHolderServiceName = "http://localhost:7890/breeze/Undefined/";
    private static String __placeHolderResourceName = "__Undefined__";

  }
  
  public class EntityQuery {
    public EntityQuery() {
      
    }
    

    public DataService DataService { get; set; }
    public MergeStrategy? MergeStrategy {get; set; }
    public String ResourceName { get; protected set; }
    internal DataServiceQuery _dataServiceQuery;
  }
}
