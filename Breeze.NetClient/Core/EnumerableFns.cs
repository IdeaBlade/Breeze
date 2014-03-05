using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Breeze.Core {
  /// <summary>
  /// Provides a set of static methods for querying objects that implement <see cref="IEnumerable{T}"/>.
  /// <seealso cref="System.Linq"/>
  /// </summary>
  /// <remarks>
  /// To use these extensions, add a using statement (Imports in Visual Basic) for this namespace
  /// to your class.  
  /// <para>
  /// Since the methods here are extensions, you cannot use them in queries which will be sent to the data source,
  /// </para>
  /// <para>
  /// For more information on extension methods, see <b>Extension Methods (C# Programming Guide)</b>
  /// or <b>Extension Methods (Visual Basic)</b> in the Visual Studio documentation.
  /// </para>
  /// </remarks>
  public static class EnumerableFns {

    // TODO: Think about it.
    ///// <summary>
    ///// Returns the count of any IEnumerable
    ///// </summary>
    ///// <param name="items"></param>
    ///// <returns></returns>
    //public static int Count(this IEnumerable items) {
    //  int count = 0;
    //  foreach (var item in items) count++;
    //  return count;
    //}


    /// <summary>
    /// Enumerate a cached collection performing the specified action on each item.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="items"></param>
    /// <param name="action"></param>
    /// <include file='EnumerableFns.Examples.xml' path='//Class[@name="EnumerableFns"]/method[@name="ForEach"]/*' />
    public static void ForEach<T>(this IEnumerable<T> items, Action<T> action) {
      foreach (T item in items) {
        action(item);
      }
    }

    /// <summary>
    /// Enumerate an indexed collection in cache performing the specified action on each item.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="items"></param>
    /// <param name="action">Delegate taking a T and an index value</param>
    /// <include file='EnumerableFns.Examples.xml' path='//Class[@name="EnumerableFns"]/method[@name="ForEach2"]/*' />
    public static void ForEach<T>(this IEnumerable<T> items, Action<T, int> action) {
      int i = 0;
      foreach (T item in items) {
        action(item, i);
        i++;
      }
    }

    /// <summary>
    /// Returns true if any of the items in the indexed collection in cache satisfy the given predicate.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="items"></param>
    /// <param name="predicate"></param>
    /// <returns></returns>
    /// <include file='EnumerableFns.Examples.xml' path='//Class[@name="EnumerableFns"]/method[@name="Any"]/*' />
    public static bool Any<T>(this IEnumerable<T> items, Func<T, int, bool> predicate) {
      int i = 0;
      foreach (T item in items) {
        if (predicate(item, i)) return true;
        i++;
      }
      return false;
    }

    /// <summary>
    /// Returns true if all items in a cached collection satisfy the given predicate.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="items"></param>
    /// <param name="predicate"></param>
    /// <returns></returns>
    /// <include file='EnumerableFns.Examples.xml' path='//Class[@name="EnumerableFns"]/method[@name="All"]/*' />
    public static bool All<T>(this IEnumerable<T> items, Func<T, int, bool> predicate) {
      int i = 0;
      foreach (T item in items) {
        if (!predicate(item, i)) return false;
        i++;
      }
      return true;
    }

    /// <summary>
    /// Returns true if all items in a cached collection are equal.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="items"></param>
    /// <returns></returns>
    public static bool AllEqual<T>(this IEnumerable<T> items) {
      if (!items.Any()) return true;
      T val = items.First();
      foreach (T item in items.Skip(1)) {
        if (!Object.Equals(val, item)) return false;
      }
      return true;

    }

    /// <summary>
    /// Returns true if all items in a cached collection have the same projected value.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <typeparam name="U"></typeparam>
    /// <param name="items"></param>
    /// <param name="selector"></param>
    /// <returns></returns>
    public static bool AllEqual<T, U>(this IEnumerable<T> items, Func<T, U> selector) {
      if (!items.Any()) return true;
      U val = selector(items.First());
      foreach (T item in items.Skip(1)) {
        if (!Object.Equals(val, selector(item))) return false;
      }
      return true;
    }


    /// <summary>
    /// Concatenates two sequences.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="sequence1"></param>
    /// <param name="sequence2"></param>
    /// <returns></returns>
    public static IEnumerable<T> Concat<T>(this IEnumerable<T> sequence1, params T[] sequence2) {
      foreach (var item in sequence1) yield return item;
      foreach (var item in sequence2) yield return item;
    }


    /// <summary>
    /// Returns the index of the first item in the sequence matching a condition, or -1 if no match found.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="items"></param>
    /// <param name="predicate"></param>
    /// <returns></returns>
    public static int IndexOf<T>(this IEnumerable<T> items, Func<T, bool> predicate) {
      int i = 0;
      foreach (T item in items) {
        if (predicate(item)) return i;
        i++;
      }
      return -1;
    }

    /// <summary>
    /// Returns a <see cref="HashSet{T}"/> of the specified collection.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="items"></param>
    /// <returns></returns>
    public static HashSet<T> ToHashSet<T>(this IEnumerable<T> items) {
      return new HashSet<T>(items);
    }

    // Not named GetHashCode to avoid naming conflict; object.GetHashCode would
    // always take precedence
    /// <summary>
    /// Returns a hashcode for a collection that 
    /// uses a similar algorithm to that used by the .NET Tuple class.
    /// Order matters.
    /// </summary>
    /// <remarks>
    /// </remarks>
    /// <param name="items"></param>
    /// <returns></returns>
    public static int GetAggregateHashCode(this IEnumerable items) {
      // Old code - talk to Jay about issues with this. 
      //int hash = 0;
      //foreach (Object item in items) {
      //  if (item != null) {
      //    hash ^= item.GetHashCode();
      //  }
      //}
      int hash = 0;
      foreach (Object item in items) {
        if (item != null) {
          if (hash == 0) {
            hash = item.GetHashCode();
          } else {
            hash = ((hash << 5) + hash) ^ item.GetHashCode();
          }
        }
      }
      return hash;
    }

    /// <summary>
    /// Concatenates the string version of each element in a collection using the delimiter provided.
    /// </summary>
    /// <param name="items">The enumerated items whose string formated elements will be concatenated</param>
    /// <param name="delimiter">Delimiter</param>
    /// <returns>A delimited string</returns>
    public static string ToAggregateString(this IEnumerable items, string delimiter) {
      StringBuilder sb = null;
      foreach (object aObject in items) {
        if (sb == null) {
          sb = new StringBuilder();
        } else {
          sb.Append(delimiter);
        }
        sb.Append(aObject.ToString());
      }
      if (sb == null) return String.Empty;
      return sb.ToString();
    }

    /// <summary>
    /// Repeat the items enumerable count times.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="items"></param>
    /// <param name="count"></param>
    /// <returns></returns>
    public static IEnumerable<T> Repeat<T>(this IEnumerable<T> items, int count) {
      for (int i = 0; i < count; i++) {
        foreach (T item in items) {
          yield return item;
        }
      }
    }

    /// <summary>
    /// 
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="items"></param>
    /// <param name="batchSize"></param>
    /// <returns></returns>
    internal static IEnumerable<IEnumerable<T>> Partition<T>(this IEnumerable<T> items, int batchSize) {
      var remainingItems = items;
      while (remainingItems.Any()) {
        var batch = remainingItems.Take(batchSize).ToList();
        yield return batch;
        remainingItems = remainingItems.Skip(batchSize);
      }
    }

    /// <summary>
    ///  Returns distinct elements from a sequence by using a specified selector function to project objects to compare.
    /// </summary>
    /// <typeparam name="TSource"></typeparam>
    /// <typeparam name="TResult"></typeparam>
    /// <param name="source"></param>
    /// <param name="selector"></param>
    /// <returns></returns>
    public static IEnumerable<TSource> Distinct<TSource, TResult>(
        this IEnumerable<TSource> source, Func<TSource, TResult> selector) {
      return source.Distinct(new DynamicComparer<TSource, TResult>(selector));
    }


    /// <summary>
    /// Produces the set union of two sequences by using a specified selector function to project objects to compare.
    /// </summary>
    /// <typeparam name="TSource"></typeparam>
    /// <typeparam name="TResult"></typeparam>
    /// <param name="first"></param>
    /// <param name="second"></param>
    /// <param name="selector"></param>
    /// <returns></returns>
    public static IEnumerable<TSource> Union<TSource, TResult>(
        this IEnumerable<TSource> first, IEnumerable<TSource> second, Func<TSource, TResult> selector) {
      return first.Union(second, new DynamicComparer<TSource, TResult>(selector));
    }

    /// <summary>
    /// Produces the set intersection of two sequences by using a specified selector function to project objects to compare.
    /// </summary>
    /// <typeparam name="TSource"></typeparam>
    /// <typeparam name="TResult"></typeparam>
    /// <param name="first"></param>
    /// <param name="second"></param>
    /// <param name="selector"></param>
    /// <returns></returns>
    public static IEnumerable<TSource> Intersect<TSource, TResult>(
            this IEnumerable<TSource> first, IEnumerable<TSource> second, Func<TSource, TResult> selector) {
      return first.Intersect(second, new DynamicComparer<TSource, TResult>(selector));
    }


    /// <summary>
    /// Produces the set difference of two sequences by using a specified selector function to compare values.
    /// </summary>
    /// <typeparam name="TSource"></typeparam>
    /// <typeparam name="TResult"></typeparam>
    /// <param name="first"></param>
    /// <param name="second"></param>
    /// <param name="selector"></param>
    /// <returns></returns>
    public static IEnumerable<TSource> Except<TSource, TResult>(
            this IEnumerable<TSource> first, IEnumerable<TSource> second, Func<TSource, TResult> selector) {
      return first.Except(second, new DynamicComparer<TSource, TResult>(selector));
    }

    internal static SafeList<T> ToSafeList<T>(this IEnumerable<T> items) {
      return new SafeList<T>(items);
    }

    

  }
}
