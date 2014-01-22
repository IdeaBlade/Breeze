using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  /// <summary>
  /// Arguments to the <see cref="E:IdeaBlade.EntityModel.EntityManager.EntityManagerCreated"/> event.
  /// </summary>
  public class EntityManagerCreatedEventArgs : System.EventArgs {

    /// <summary>
    /// Initialize a new instance of this class.
    /// </summary>
    public EntityManagerCreatedEventArgs(EntityManager pEntityManager) {
      mEntityManager = pEntityManager;
    }

    /// <summary>
    /// The EntityManager involved in this event.
    /// </summary>
    public EntityManager EntityManager {
      get { return mEntityManager; }
    }

    private EntityManager mEntityManager;

  }

  /// <summary>
  /// Arguments to the <see cref="E:IdeaBlade.EntityModel.EntityManager.EntityManagerCreated"/> event.
  /// </summary>
  public class EntityManagerHasChangesChangedEventArgs : System.EventArgs {

    /// <summary>
    /// Initialize a new instance of this class.
    /// </summary>
    public EntityManagerHasChangesChangedEventArgs(EntityManager entityManager) {
      EntityManager = entityManager;
      
    }

    /// <summary>
    /// The EntityManager involved in this event.
    /// </summary>
    public EntityManager EntityManager {
      get;
      private set;
    }

    public bool HasChanges {
      get { return EntityManager.HasChanges(); }
    }

    

  }
}
