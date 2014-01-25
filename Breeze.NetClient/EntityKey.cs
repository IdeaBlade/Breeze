using Breeze.Core;

using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  /// <summary>
  /// Represents the primary key for an <see cref="IEntity"/>.
  /// </summary>
  public class EntityKey : IComparable {

    /// <summary>
    /// Initializes a new instance of the EntityKey class.
    /// </summary>
    /// <param name="entityType">The Entity type</param>
    /// <param name="aValue">The value of the primary key property</param>
    public EntityKey(EntityType entityType, Object aValue)
      : this(entityType, aValue, true) {
    }

    /// <summary>
    /// Initializes a new instance of the EntityKey class.    
    /// </summary>
    /// <param name="entityType">The Entity type</param>
    /// <param name="values">The values of the primary key properties</param>
    public EntityKey(EntityType entityType, params Object[] values)
      : this(entityType, values, true) {
    }

    /// <summary>
    /// Initializes a new instance of the EntityKey class.
    /// </summary>
    /// <param name="entityType">The Entity type</param>
    /// <param name="aValue">The value of the primary key property</param>
    /// <param name="convertValue">Whether or not to convert the <paramref name="aValue"/> to the 
    /// correct datatype (if necessary)</param>
    public EntityKey(EntityType entityType, Object aValue, bool convertValue) {
      EntityType = entityType;

      if (aValue is Array) {
        Values = ((IEnumerable)aValue).OfType<Object>().ToArray();
      } else {
        Values = new Object[] { aValue };
      }

      if (convertValue) {
        ConvertValues();
      }
    }

    /// <summary>
    /// Initializes a new instance of the EntityKey class.    
    /// </summary>
    /// <param name="entityType">The Entity type</param>
    /// <param name="values">The values of the primary key properties</param>
    /// <param name="convertValues"></param>
    public EntityKey(EntityType entityType, Object[] values, bool convertValues) {
      EntityType = entityType;
      Values = values;
      if (convertValues) {
        ConvertValues();
      }
    }

    public bool IsEmpty() {
      return (Values == null) || Values.Length == 0;
    }

    /// <summary>
    /// Returns an <see cref="EntityQuery"/> to retrieve the item
    /// represented by this key.
    /// </summary>
    /// <returns></returns>
    public EntityQuery ToQuery() {
      return null;
      // return new EntityQuery
      //var query = EntityQueryBuilder.BuildQuery(this);
      //query.EntityManager = entityManager;
      //return query;
    }


    //// do not need to serialize this.
    //internal EntityKey BasemostEntityKey {
    //  get {
    //    if (_baseMostEntityKey == null) {
    //      _baseMostEntityKey = GetBasemostEntityKey(this);
    //    }
    //    return _baseMostEntityKey;
    //  }
    //}
    //private EntityKey _baseMostEntityKey;

    //private EntityKey GetBasemostEntityKey(EntityKey parentEntityKey) {
    //  var baseType = EntityMetadata.GetBaseEntitySubtype(parentEntityKey.EntityType);
    //  if (baseType != parentEntityKey.EntityType) {
    //    parentEntityKey = new EntityKey(baseType, parentEntityKey.Values, false);
    //  }
    //  return parentEntityKey;
    //}

    /// <summary>
    /// Convert the keys values to the 
    /// correct datatype (if necessary)
    /// </summary>
    private void ConvertValues() {
      
      for (int i = 0; i < Values.Length; i++) {
        var  clrType = EntityType.KeyProperties[i].ClrType;
        var val = Values[i];
        if (val == null) continue;
        if (clrType != val.GetType()) {
          Values[i] = TypeFns.ConvertType(val, clrType, false);
        }
      }
    }

    internal bool HasDefaultValue {
      get {
        bool isDefault = EntityType.KeyProperties
          .Select(p => p.DefaultValue)
          .SequenceEqual(this.Values);
        return isDefault;
      }
    }
    /// <summary>
    /// Determines whether two primary keys refer to the same entity.
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public override Boolean Equals(Object obj) {
      if ((Object)this == obj) return true;
      var other = obj as EntityKey;
      if (other == null) return false;
      if (!EntityType.Equals(other.EntityType)) return false;
      if (!Values.SequenceEqual(other.Values)) return false;
      return true;
    }

    /// <summary>
    /// See <see cref="IComparable.CompareTo"/>.
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public virtual int CompareTo(Object obj) {
      if ((Object)this == obj) return 0;
      var other = obj as EntityKey;
      if (other == null) return -1;
      int result = -1;
      for (int i = 0; i < this.Values.GetLength(0); i++) {
        result = this.Values[i].ToString().CompareTo(other.Values[i].ToString());
        if (result != 0) return result;
      }
      return result;
    }

    /// <summary>
    /// See <see cref="Object.GetHashCode"/>.
    /// </summary>
    /// <returns></returns>
    public override int GetHashCode() {
      int hashCode = EntityType.GetHashCode();
      foreach (Object item in Values) {
        if (item == null) continue;
        hashCode ^= item.GetHashCode();
      }
      return hashCode;
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="a"></param>
    /// <param name="b"></param>
    /// <returns></returns>
    public static bool operator ==(EntityKey a, EntityKey b) {
      // If both are null, or both are same instance, return true.

      if (System.Object.ReferenceEquals(a, b)) {
        return true;
      }

      // If one is null, but not both, return false.
      if (((object)a == null) || ((object)b == null)) {
        return false;
      }

      return a.Equals(b);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="a"></param>
    /// <param name="b"></param>
    /// <returns></returns>
    public static bool operator !=(EntityKey a, EntityKey b) {
      return !(a == b);
    }


    /// <summary>
    /// Returns a human readable representation of this Primary Key.
    /// </summary>
    /// <returns></returns>
    public override String ToString() {
      return EntityType.Name + ": " + Values.ToAggregateString(",");
    }

    /// <summary>
    /// The <see cref="IEntity"/> type associated with this primary key.
    /// </summary>
    public EntityType EntityType {
      get;
      private set;
    }

    /// <summary>
    /// An array of values associated with individual properties of the key.
    /// </summary>

    public Object[] Values {
      get;
      internal set;
    }

  }

}
