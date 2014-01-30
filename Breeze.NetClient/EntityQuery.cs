using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Data.Services.Client;
using System.Data.Services.Common;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace Breeze.NetClient {

  // TODO: EntityQuery is currently just additive - i.e. no way to remove clauses
  public class EntityQuery<T> : EntityQuery, IQueryable<T>, IOrderedQueryable<T>, IQueryProvider, IHasDataServiceQuery {

    public EntityQuery( ) : base() {
      var context = new DataServiceContext(new Uri(__placeHolderServiceName), DataServiceProtocolVersion.V3);
      DataServiceQuery = context.CreateQuery<T>(__placeHolderResourceName);
    }

    public EntityQuery(String resourceName)
      : this() {
      if (resourceName != null) ResourceName = resourceName;
    }

    public EntityQuery(EntityQuery<T> query) : base(query) {
      DataServiceQuery = query.DataServiceQuery;
    }

    public override object  Clone() {
      return new EntityQuery<T>(this);
    }

    public EntityQuery<T> From(String resourceName) {
      var q = new EntityQuery<T>(this);
      q.ResourceName = resourceName;
      return q;
    }

    public Task<IEnumerable<T>> Execute(EntityManager em = null) {
      em = em ?? this.EntityManager;
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

    public override String GetResourcePath() {
      var dsq = (DataServiceQuery<T>)_dataServiceQuery;
      var requestUri = dsq.RequestUri;
      var s2 = requestUri.AbsoluteUri.Replace(__placeHolderServiceName, "");
      
      var resourceName = (String.IsNullOrEmpty(ResourceName)) 
        ? MetadataStore.Instance.GetDefaultResourceName(typeof(T))
        : ResourceName;
      
      // if any filter conditions
      var queryResource = s2.Replace(__placeHolderResourceName + "()", resourceName);
      // if no filter conditions
      queryResource = queryResource.Replace(__placeHolderResourceName, resourceName);
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
      get { return DataServiceQuery.ElementType; }
    }

    public System.Linq.Expressions.Expression Expression {
      get { return DataServiceQuery.Expression; }
    }

    public IQueryProvider Provider {
      get { return this; }
    }

    #endregion

    #region IQueryProvider Members

    public EntityQuery(Expression expression, IQueryable queryable) {
      var oldDataServiceQuery = ((IHasDataServiceQuery)queryable).DataServiceQuery;
      DataServiceQuery = (DataServiceQuery<T>) oldDataServiceQuery.Provider.CreateQuery<T>(expression);
      UpdateFrom((EntityQuery)queryable);
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

    public override Type TargetType {
      get { return typeof(T);}
    }

    protected DataServiceQuery<T> DataServiceQuery {
      get { return (DataServiceQuery<T>)_dataServiceQuery;  }
      set { _dataServiceQuery = value; }
    }

    DataServiceQuery IHasDataServiceQuery.DataServiceQuery {
      get { return _dataServiceQuery; }
    }

    private DataServiceQuery _dataServiceQuery;
    private static String __placeHolderServiceName = "http://localhost:7890/breeze/Undefined/";
    private static String __placeHolderResourceName = "__Undefined__";

  }
  
  public abstract class EntityQuery : IEntityQuery {
    public EntityQuery() {       
    }

    public static EntityQuery<T> From<T>(string resourceName) {
      return new EntityQuery<T>(resourceName); 
    }

    public EntityQuery(EntityQuery query) {
      UpdateFrom(query);
    }

    public void UpdateFrom(EntityQuery query) {
      ResourceName = query.ResourceName;
      TargetType = query.TargetType;
      DataService = query.DataService;
      EntityManager = query.EntityManager;
      MergeStrategy = query.MergeStrategy;
      FetchStrategy = query.FetchStrategy;
    }

    public String ResourceName { get; protected internal set; }
    public virtual Type TargetType { get; protected internal set; }
    public DataService DataService { get; protected internal set; }
    public EntityManager EntityManager { get; protected internal set; }
    public MergeStrategy? MergeStrategy { get; protected internal set; }
    public FetchStrategy? FetchStrategy {get; protected internal set;}
    public abstract object Clone();
    public abstract String GetResourcePath();
  }

  public interface IEntityQuery {
    DataService DataService { get;  }
    EntityManager EntityManager { get;  }
    MergeStrategy? MergeStrategy { get;  }
    String ResourceName { get;   }
    Object Clone();
  }

  internal interface IHasDataServiceQuery {
    DataServiceQuery DataServiceQuery { get; }
  }
}
