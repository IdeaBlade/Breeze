using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public interface IKeyGenerator {


    /// <summary>
    /// Generates a new temporary ID for a specified EntityProperty.  
    /// </summary>
    /// <param name="property">Property for which a new ID should be generated</param>
    /// <returns>A new temporary ID</returns>
    /// <remarks>The definition of a "temporary" ID is user-defined.  In the sample code for a "LongIdGenerator"
    /// negative integers are used as temporary IDs. 
    /// <para>This method should also store the temporary IDs generated in a <see cref="UniqueIdCollection"/>.
    /// </para>
    /// </remarks>
    object GetNextTempId(DataProperty property);

    /// <summary>
    /// Determines whether a given ID is temporary.
    /// </summary>
    /// <param name="uniqueId">ID to be analyzed</param>
    /// <returns>true if the ID is temporary; otherwise false</returns>
    /// <remarks>The <see cref="UniqueId.Value"/> contains the ID to be tested.
    /// You can use the <see cref="StructuralProperty.EntityType"/> property of the <see cref="UniqueId.Property"/>
    /// to determine the <see cref="IEntity"/> type.
    /// </remarks>
    bool IsTempId(UniqueId uniqueId);

    /// <summary>
    /// Returns the temporary IDs generated since instantiation of this class or the last <see cref="Reset"/>.
    /// </summary>
    UniqueIdCollection TempIds { get; }

    /// <summary>
    /// Reset temporary ID generation back to its initial state. 
    /// </summary>
    /// <remarks>Called by the <see cref="EntityManager"/> after Id fixup
    /// during <see cref="EntityManager.SaveChanges"/> processing.
    /// </remarks>
    void Reset();

  }

  public class DefaultKeyGenerator : IKeyGenerator {

    public DefaultKeyGenerator() {
      TempIds = new UniqueIdCollection();
    }

    public virtual object GetNextTempId(DataProperty property) {
      var nextValue = property.DataType.GetNextTempValue();
      if (nextValue == null) {
        throw new Exception("Unable to generate a temporary id for this property: " + property.Name);
      }
      TempIds.Add(new UniqueId(property, nextValue));
      return nextValue;
    }

    public bool IsTempId(UniqueId uniqueId) {
      return TempIds.Contains(uniqueId);
    }

    public UniqueIdCollection TempIds {
      get; private set; 
    }

    public void Reset() {
      TempIds.Clear();
    }
  }


}
