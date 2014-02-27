using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  /// <summary>
  /// Options that allow queries that will be run against cache to share the same semantics as the corresponding
  /// query against the Entity Framework and the backend database.  Linq To Objects (CLR) and Linq To Entities do
  /// not share the same semantics.  This class allows IdeaBlade Entity queries against the Entity cache (Linq to Objects queries)
  /// to be interpreted like they will be against the Entity Framework.
  /// </summary>
  
  public class CacheQueryOptions {

    static CacheQueryOptions() {
      // same as DefaultSqlServerCompatibility.
      // __default = new CacheQueryOptions(StringComparison.OrdinalIgnoreCase, true, GuidOrdering.SqlServer);
      __default = new CacheQueryOptions(StringComparison.CurrentCultureIgnoreCase, true, GuidOrdering.SqlServer);
    }

    /// <summary>
    /// To be used when standard CLR semantics should be used and no compatibility with the backend datastore is needed.
    /// </summary>
    public static CacheQueryOptions None =
      new CacheQueryOptions(StringComparison.CurrentCulture, false, GuidOrdering.CLR);

    /// <summary>
    /// Options that represents a default SQL Server installations and settings.
    /// </summary>
    public static CacheQueryOptions DefaultSqlServerCompatibility =
      // new CacheQueryOptions(StringComparison.OrdinalIgnoreCase, true, GuidOrdering.SqlServer);
      new CacheQueryOptions(StringComparison.CurrentCultureIgnoreCase, true, GuidOrdering.SqlServer);

    /// <summary>
    /// The default value for CacheQueryOptions. May be modified and will affect all of the standard QueryStrategies. 
    /// </summary>
    public static CacheQueryOptions Default {
      get {
        lock (__lock) {
          return __default;
        }
      }
      set {
        lock (__lock) {
          __default.StringComparison = value.StringComparison;
          __default.UseSql92CompliantStringComparison = value.UseSql92CompliantStringComparison;
          __default.GuidOrdering = value.GuidOrdering;
        }
      }
    }

    // For deep cloning
    private CacheQueryOptions() { }

    /// <summary>
    /// Ctor.
    /// </summary>
    /// <param name="stringComparison"></param>
    /// <param name="useSql92CompliantStringComparison"></param>
    /// <param name="guidOrdering"></param>
    public CacheQueryOptions(StringComparison stringComparison, bool useSql92CompliantStringComparison, GuidOrdering guidOrdering) {
      StringComparison = stringComparison;
      UseSql92CompliantStringComparison = useSql92CompliantStringComparison;
      GuidOrdering = guidOrdering;
    }

    /// <summary>
    /// Is this instance the default instance. 
    /// </summary>
    public bool IsDefault {
      get { return Object.ReferenceEquals(this, __default); }
    }

    /// <summary>
    /// Determines case sensitivity of Cache queries.
    /// </summary>
    public StringComparison StringComparison {
      get;
      internal set;
    }

    /// <summary>
    /// Determines whether String comparisons are performed according to the ANSI SQL92 specification.  In particular, 
    /// the ANSI standard requires padding for the character strings used in comparisons so that their lengths match before comparing them.
    /// </summary>
    /// <remarks>
    /// Note that this is typically NOT enforced for operations that rely on the SQL 'Like' operator such as 'StartsWith'
    /// 'EndsWith' and 'Contains'. So, for example:
    /// "ABC" == "ABC  " -> true  
    /// but
    /// "ABC".StartsWith("ABC  ") -> false
    /// </remarks>
    public bool UseSql92CompliantStringComparison {
      get;
      internal set;
    }

    /// <summary>
    /// Determines whether to use standard CLR semantics for sorting Guids or the SQL Server default mechanism 
    /// in which only the last 6 bytes of a value are evaluated.
    /// </summary>
    public GuidOrdering GuidOrdering {
      get;
      internal set;
    }

    /// <summary>
    /// See <see cref="Object.Equals(Object)"/>.
    /// </summary>
    /// <param name="o"></param>
    /// <returns></returns>
    public override bool Equals(Object o) {
      if (o == null) return false;
      CacheQueryOptions cqo = o as CacheQueryOptions;
      if (cqo == null) return false;
      return cqo.StringComparison == this.StringComparison
        && cqo.UseSql92CompliantStringComparison == this.UseSql92CompliantStringComparison
        && cqo.GuidOrdering == this.GuidOrdering;
    }

    /// <summary>
    /// Operator == overload.
    /// </summary>
    /// <param name="x"></param>
    /// <param name="y"></param>
    /// <returns></returns>
    public static bool operator ==(CacheQueryOptions x, CacheQueryOptions y) {
      if (null == (Object)x) {
        return null == (Object)y;
      }
      return x.Equals(y);
    }

    /// <summary>
    /// Operator != overload.
    /// </summary>
    /// <param name="x"></param>
    /// <param name="y"></param>
    /// <returns></returns>
    public static bool operator !=(CacheQueryOptions x, CacheQueryOptions y) {
      return !(x == y);
    }


    /// <summary>
    /// See <see cref="M:System.Object.GetHashCode"/>.
    /// </summary>
    /// <returns>
    /// A hash code for the current <see cref="T:System.Object"></see>.
    /// </returns>
    public override int GetHashCode() {
      return (int)this.StringComparison ^
        this.UseSql92CompliantStringComparison.GetHashCode() ^
        this.GuidOrdering.GetHashCode();
    }

    private static object __lock = new Object();
    private static CacheQueryOptions __default;

  }

  /// <summary>
  /// Different semantics for ordering Guids.
  /// </summary>
  public enum GuidOrdering {
    /// <summary>
    /// Standard CLR ordering
    /// </summary>
    CLR = 0,
    /// <summary>
    /// SQL Server ordering.
    /// </summary>
    SqlServer = 1,
  }

  /// <summary>
  /// A comparer that emulates SQL Server's comparison semantics for Guids.
  /// </summary>
  public sealed class SqlServerGuidComparer : IComparer<Guid> {
    private static readonly int[] _importance = new[] { 3, 2, 1, 0, 5, 4, 7, 6, 9, 8, 15, 14, 13, 12, 11, 10 };

    /// <summary>
    /// <see cref="System.Collections.Generic.IComparer{T}"/>
    /// </summary>
    /// <param name="x"></param>
    /// <param name="y"></param>
    /// <returns></returns>
    public int Compare(Guid x, Guid y) {
      var a = x.ToByteArray();
      var b = y.ToByteArray();
      for (int i = _importance.Length - 1; i >= 0; i--) {
        var guidIndex = _importance[i];
        var c = a[guidIndex].CompareTo(b[guidIndex]);
        if (c != 0) {
          return c;
        }
      }
      return 0;
    }
  }
}
