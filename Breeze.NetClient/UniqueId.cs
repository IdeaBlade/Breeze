using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;

namespace Breeze.NetClient {
  /// <summary>
  /// Represents the combination of a specific <see cref="StructuralProperty"/> and value.
  /// <seealso cref="IIdGenerator"/>
  /// <seealso cref="UniqueIdCollection"/>
  /// </summary>
  /// <remarks><b>UniqueIds</b> are used when implementing the <see cref="IIdGenerator"/> interface.
  /// </remarks>
  
  public class UniqueId : IComparable {

    // For deep cloning
    private UniqueId() { }

    /// <summary>
    /// Creates a new instance of UniqueId.
    /// </summary>
    /// <param name="property"></param>
    /// <param name="value"></param>
    public UniqueId(DataProperty property, Object value) {
      Property = property;
      Value = value;
    }

    /// <summary>
    /// Returns the EntityProperty associated with this UniqueId.
    /// </summary>
    public DataProperty Property {
      get;
      private set;
    }

    /// <summary>
    /// Returns the Value associated with this UniqueId.
    /// </summary>
    
    public Object Value {
      get;
      set;  // public for deserialization in SL
    }

    /// <summary>
    /// See <see cref="Object.Equals(Object)"/>.
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public override Boolean Equals(Object obj) {
      if (this == obj) return true;
      var other = obj as UniqueId;
      if (other == null) return false;
      return
        other.Value.Equals(this.Value) &&
        other.Property.Name.Equals(this.Property.Name) &&
        other.Property.ParentType.Equals(this.Property.ParentType);
    }


    /// <summary>
    /// See <see cref="Object.GetHashCode"/>.
    /// </summary>
    /// <returns></returns>
    public override int GetHashCode() {
      return Value.GetHashCode() ^
             Property.Name.GetHashCode() ^
             Property.ParentType.GetHashCode();
    }

    /// <summary>
    /// Returns a human readable representation of this UniqueId.
    /// </summary>
    /// <returns></returns>
    public override String ToString() {
      return Property.ParentType + "." + Property.Name + ", " + Value.ToString();
    }

    /// <summary>
    /// <see cref="IComparable.CompareTo"/> implementation.
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public int CompareTo(Object obj) {
      UniqueId id = obj as UniqueId;
      if (id == null) return -1;
      int result = this.Property.ParentType.Name.CompareTo(id.Property.ParentType.Name);
      if (result == 0) {
        result = this.Property.Name.CompareTo(id.Property.Name);
        if (result == 0) {
          result = this.Value.ToString().CompareTo(id.Value.ToString());
        }
      }
      return result;
    }


  }

  /// <summary>
  /// Represents a collection of <see cref="UniqueId"/> objects.
  /// </summary>
  public class UniqueIdCollection : HashSet<UniqueId> {

    /// <summary>
    /// Ctor.
    /// </summary>
    public UniqueIdCollection() {
    }

    /// <summary>
    /// Ctor.
    /// </summary>
    /// <param name="uniqueIds"></param>
    public UniqueIdCollection(IEnumerable<UniqueId> uniqueIds)
      : base(uniqueIds) {

    }

    /// <summary>
    /// Adds a collection of UniqueIds to this collection.
    /// </summary>
    /// <param name="uniqueIds"></param>
    public void AddRange(IEnumerable<UniqueId> uniqueIds) {
      foreach (var id in uniqueIds) {
        this.Add(id);
      }
    }

    /// <summary>
    /// Returns whether the list contains any auto-incrementing (Identity) properties.
    /// </summary>
    public bool ContainsIdentityIds {
      get {
        return this.Any(id => id.Property.IsAutoIncrementing);
      }
    }


  }

  /// <summary>
  /// A strongly typed dictionary mapping <see cref="UniqueId"/> keys containing temporary identifiers
  /// to values for the permanent identifiers.
  /// <seealso cref="IIdGenerator"/>
  /// </summary>
  /// <remarks>Used in the <see cref="IIdGenerator"/> method <see cref="IIdGenerator.GetRealIdMap"/>
  /// when mapping temporary to real identifiers.</remarks>
  public class UniqueIdMap : Dictionary<UniqueId, Object> {

    /// <summary>
    /// Initializes a new instance of the UniqueIdMap class.
    /// </summary>
    public UniqueIdMap()
      : base() {
    }

    /// <summary>
    /// Initializes a new instance of the UniqueIdMap class.
    /// </summary>
    /// <param name="collection"></param>
    public UniqueIdMap(UniqueIdCollection collection)
      : base() {
      AddCollection(collection);
    }

    /// <summary>
    ///  Initializes a new instance of the UniqueIdMap class.
    /// </summary>
    /// <param name="maps"></param>
    public UniqueIdMap(IEnumerable<UniqueIdMap> maps) {
      foreach (var map in maps) this.AddMap(map);
    }

    /// <summary>
    /// Adds another UniqueIdMap to this one.
    /// </summary>
    /// <param name="map">map</param>
    public void AddMap(UniqueIdMap map) {
      if (map == null) return;
      foreach (KeyValuePair<UniqueId, Object> entry in map) {
        this.Add(entry.Key, entry.Value);
      }
    }

    /// <summary>
    /// Adds a <see cref="UniqueIdCollection"/> items.
    /// </summary>
    /// <param name="collection"></param>
    public void AddCollection(UniqueIdCollection collection) {
      if (collection == null || collection.Count == 0) return;
      collection.ForEach(u => this.Add(u, null));
    }



    /// <summary>
    /// Returns the items in the map as a <see cref="UniqueIdCollection"/>
    /// </summary>
    /// <returns></returns>
    public UniqueIdCollection ToCollection() {
      return new UniqueIdCollection(this.Keys);
    }


  }
}
