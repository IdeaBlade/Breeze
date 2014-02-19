using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public static class EntityQueryExtensions {

    #region Linq extensions 
    /// <summary>
    /// Filters a sequence of values based on a predicate.
    /// </summary>
    /// <typeparam name="TSource"></typeparam>
    /// <param name="source1"></param>
    /// <param name="predicate"></param>
    /// <returns></returns>
    public static EntityQuery<TSource> Where<TSource>(this EntityQuery<TSource> source1, Expression<Func<TSource, int, bool>> predicate) {
      return (EntityQuery<TSource>)Queryable.Where(source1, predicate);
    }

    /// <summary>
    /// Filters a sequence of values based on a predicate.
    /// </summary>
    /// <typeparam name="TSource"></typeparam>
    /// <param name="source1"></param>
    /// <param name="predicate"></param>
    /// <returns></returns>
    /// <include file='EntityQueryExtensions.Examples.xml' path='//Class[@name="EntityQueryExtensions"]/method[@name="Where1"]/*' />
    public static EntityQuery<TSource> Where<TSource>(this EntityQuery<TSource> source1, Expression<Func<TSource, bool>> predicate) {
      return (EntityQuery<TSource>)Queryable.Where(source1, predicate);
    }

    /// <summary>
    /// Sorts the elements of a sequence in ascending order.
    /// </summary>
    /// <typeparam name="TSource"></typeparam>
    /// <typeparam name="TKey"></typeparam>
    /// <param name="source"></param>
    /// <param name="keySelector"></param>
    /// <returns></returns>
    /// <include file='EntityQueryExtensions.Examples.xml' path='//Class[@name="EntityQueryExtensions"]/method[@name="OrderBy"]/*' />
    public static EntityQuery<TSource> OrderBy<TSource, TKey>(this EntityQuery<TSource> source, Expression<Func<TSource, TKey>> keySelector) {
      return (EntityQuery<TSource>)Queryable.OrderBy(source, keySelector);
    }


    /// <summary>
    /// Sorts the elements of a sequence in descending order.
    /// </summary>
    /// <typeparam name="TSource"></typeparam>
    /// <typeparam name="TKey"></typeparam>
    /// <param name="source"></param>
    /// <param name="keySelector"></param>
    /// <returns></returns>
    /// <include file='EntityQueryExtensions.Examples.xml' path='//Class[@name="EntityQueryExtensions"]/method[@name="OrderByDescending"]/*' />
    public static EntityQuery<TSource> OrderByDescending<TSource, TKey>(this EntityQuery<TSource> source, Expression<Func<TSource, TKey>> keySelector) {
      return (EntityQuery<TSource>)Queryable.OrderByDescending(source, keySelector);
    }

    /// <summary>
    /// Projects each element of a sequence into a new form.
    /// </summary>
    /// <typeparam name="TSource"></typeparam>
    /// <typeparam name="TResult"></typeparam>
    /// <param name="source"></param>
    /// <param name="selector"></param>
    /// <returns></returns>
    /// <include file='EntityQueryExtensions.Examples.xml' path='//Class[@name="EntityQueryExtensions"]/method[@name="Select1"]/*' />
    public static EntityQuery<TResult> Select<TSource, TResult>(this EntityQuery<TSource> source, Expression<Func<TSource, TResult>> selector) {
      return (EntityQuery<TResult>)Queryable.Select(source, selector);
    }

    /// <summary>
    /// Bypasses a specified number of elements in a sequence and then returns the remaining elements.
    /// </summary>
    /// <typeparam name="TSource"></typeparam>
    /// <param name="source"></param>
    /// <param name="count"></param>
    /// <returns></returns>
    /// <include file='EntityQueryExtensions.Examples.xml' path='//Class[@name="EntityQueryExtensions"]/method[@name="Skip2"]/*' />
    public static EntityQuery<TSource> Skip<TSource>(this EntityQuery<TSource> source, int count) {
      return (EntityQuery<TSource>)Queryable.Skip(source, count);
    }

    /// <summary>
    /// Returns a specified number of contiguous elements from the start of a sequence.
    /// </summary>
    /// <typeparam name="TSource"></typeparam>
    /// <param name="source"></param>
    /// <param name="count"></param>
    /// <returns></returns>
    /// <include file='EntityQueryExtensions.Examples.xml' path='//Class[@name="EntityQueryExtensions"]/method[@name="Skip2"]/*' />
    public static EntityQuery<TSource> Take<TSource>(this EntityQuery<TSource> source, int count) {
      return (EntityQuery<TSource>)Queryable.Take(source, count);
    }

    #endregion

    #region With extensions

    /// <summary>
    /// Returns a clone of the query for the specified EntityManager.
    /// </summary>
    /// <typeparam name="TQuery"></typeparam>
    /// <param name="query"></param>
    /// <param name="em"></param>
    /// <returns></returns>
    /// <include file='EntityQueryExtensions.Examples.xml' path='//Class[@name="EntityQueryExtensions"]/method[@name="With1"]/*' />
    public static TQuery With<TQuery>(this TQuery query, EntityManager em) where TQuery : EntityQuery {
      if (query.EntityManager == em) {
        return query;
      }
      TQuery newQuery = (TQuery)query.Clone();
      newQuery.EntityManager = em;
      return newQuery;
    }

    /// <summary>
    /// Returns a clone of the query for the specified MergeStrategy
    /// </summary>
    /// <typeparam name="TQuery"></typeparam>
    /// <param name="query"></param>
    /// <param name="mergeStrategy"></param>
    /// <returns></returns>
    public static TQuery With<TQuery>(this TQuery query, MergeStrategy mergeStrategy) where TQuery : EntityQuery {
      if (query.QueryOptions.MergeStrategy == mergeStrategy) {
        return query;
      }
      TQuery newQuery = (TQuery)query.Clone();
      newQuery.QueryOptions.MergeStrategy = mergeStrategy;
      return newQuery;
    }

    public static TQuery With<TQuery>(this TQuery query, FetchStrategy fetchStrategy) where TQuery : EntityQuery {
      if (query.QueryOptions.FetchStrategy == fetchStrategy) {
        return query;
      }
      TQuery newQuery = (TQuery)query.Clone();
      newQuery.QueryOptions.FetchStrategy = fetchStrategy;
      return newQuery;
    }

    #endregion
  }
}
