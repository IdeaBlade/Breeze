using Breeze.WebApi;
using System;
using System.Web.Http.OData.Query;

namespace Breeze.WebApi.NH {
  /// <summary>
  /// Override the BreezeQueryableAttribute to use NHQueryHelper, which applies OData syntax to NHibernate queries.
  /// Use this attribute on each method in your WebApi controller that uses Nhibernate's IQueryable.
  /// <see cref="http://www.breezejs.com/sites/all/apidocs/classes/EntityQuery.html#method_expand"/>
  /// </summary>
  [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
  public class BreezeNHQueryableAttribute : BreezeQueryableAttribute {
    /// <summary>
    /// Sets HandleNullPropagation = false on the base class.  Otherwise it's true for non-EF, and that
    /// complicates the query expressions and breaks NH's query parser.
    /// </summary>
    public BreezeNHQueryableAttribute()
      : base() {
      base.HandleNullPropagation = HandleNullPropagationOption.False;
    }

    protected override QueryHelper NewQueryHelper() {
      return new NHQueryHelper(GetODataQuerySettings());
    }

  }
}
