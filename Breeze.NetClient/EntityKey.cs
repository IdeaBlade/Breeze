﻿using Breeze.Core;

using System;
using System.Collections;
using System.Linq;

namespace Breeze.NetClient {
  /// <summary>
  /// Represents the primary key for an <see cref="IEntity"/>.
  /// </summary>
  public class EntityKey : IComparable, IJsonSerializable  {

    public EntityKey(Type clrType, params Object[] values)
      : this(clrType, null, values) {
    }

    public EntityKey(JNode jn) {
      var etName = jn.Get<String>("entityType");
      var et = MetadataStore.Instance.GetEntityType(etName);
      ClrType = et.ClrType;
      Values = jn.GetPrimitiveArray<Object>("values").ToArray();
    }

     JNode IJsonSerializable.ToJNode(object config) {
      var jn = new JNode();
      jn.AddPrimitive("entityType", this.EntityType.Name);
      jn.AddArray("values", this.Values);
      return jn;
    }

    /// <summary>
    /// Initializes a new instance of the EntityKey class.    
    /// </summary>
    /// <param name="entityType">The Entity type</param>
    /// <param name="values">The values of the primary key properties</param>
    public EntityKey(EntityType entityType, params Object[] values)
      : this(entityType.ClrType, entityType, values) {
    }

   
    internal EntityKey(Type clrType, EntityType entityType, Object[] values) {
      ClrType = clrType;
      EntityType = entityType;

      if (values.Length == 1 && values[0] is Array) {
        Values = ((IEnumerable)values[0]).Cast<Object>().ToArray();
      } else {
        Values = values;
      }
    }

    public Type ClrType {
      get;
      private set;
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


    public bool IsEmpty() {
      return Values == null || Values.Length == 0 || Values.Any(v => v==null) ;
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

    
    internal EntityKey Coerce(EntityType entityType=null) {
      if (entityType == null) {
        if (EntityType == null) {
          throw new Exception("No EntityType to coerce into");
        }
      } else {
        if (EntityType != null && EntityType != entityType) {
          throw new Exception("Cannot coerce entityKey: " + this + " to : " + entityType);
        }
        EntityType = entityType;
      }
    
      for (int i = 0; i < Values.Length; i++) {
        var  clrType = EntityType.KeyProperties[i].ClrType;
        var val = Values[i];
        if (val == null) continue;
        if (clrType != val.GetType()) {
          Values[i] = TypeFns.ConvertType(val, clrType, false);
        }
      }
      return this;
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
      if (!ClrType.Equals(other.ClrType)) return false;
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
      int hashCode = ClrType.GetHashCode();
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
      return ClrType.Name + ": " + Values.ToAggregateString(",");
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
    //    parentEntityKey = new EntityKey(baseType, parentEntityKey.Values);
    //  }
    //  return parentEntityKey;
    //}

   

  
  }

}
