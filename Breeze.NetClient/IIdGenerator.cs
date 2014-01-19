using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public interface IIdGenerator {


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
    /// You can use the <see cref="EntityProperty.EntityType"/> property of the <see cref="UniqueId.Property"/>
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

    ///// <summary>
    ///// Returns a dictionary that maps temporary IDs to real IDs.
    ///// </summary>
    ///// <remarks>
    ///// In the <see cref="UniqueIdMap"/> returned, the <see cref="UniqueId"/> key contains the 
    ///// temporary ID, while the value holds the real ID.
    ///// <para>
    ///// <b>GetRealIdMap</b> is called by the <see cref="EntityManager"/> during <see cref="EntityManager.SaveChanges"/> processing.
    ///// The collection of temporary IDs passed in may contain entries for multiple entity types.
    ///// You can use the <see cref="IDataSourceKey"/> passed to manage access to the backend data source to determine real IDs.
    ///// </para>
    ///// <para>In an n-tier deployment, this method is called only on the "server" instance of this class.</para>
    ///// <para>The definition of a "real" ID is user-defined.</para>
    ///// </remarks>
    //UniqueIdMap GetRealIdMap(UniqueIdCollection tempIds, IDataSourceKey dataSourceKey);

  }
}
