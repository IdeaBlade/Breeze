using System;
using System.Collections.Generic;

namespace Breeze.Core {
  /// <summary>
  /// Dynamic implementation of an IEqualityComparer.  
  /// </summary>
  /// <typeparam name="T"></typeparam>
  /// <typeparam name="TResult"></typeparam>
  public class DynamicComparer<T, TResult> : IEqualityComparer<T> {

    /// <summary>
    /// Ctor. The selector func is used to project the comparison object from the compared object.
    /// </summary>
    /// <param name="selector"></param>
    public DynamicComparer(Func<T, TResult> selector) {
      _selector = selector;
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="x"></param>
    /// <param name="y"></param>
    /// <returns></returns>
    public bool Equals(T x, T y) {
      TResult result1 = _selector(x);
      TResult result2 = _selector(y);
      return result1.Equals(result2);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public int GetHashCode(T obj) {
      TResult result = _selector(obj);
      return result.GetHashCode();
    }

    private readonly Func<T, TResult> _selector;

  }

}
