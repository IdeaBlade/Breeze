using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public static class EntityQueryExtensions  {
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


  }
}
