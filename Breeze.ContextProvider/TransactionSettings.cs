using System;
using System.Transactions;

namespace Breeze.ContextProvider {
  public class TransactionSettings {
    /// <summary>
    /// Default settings for all saves. 
    /// </summary>
    /// <remarks>
    /// The <b>Default</b> provides default transaction settings for all SaveChanges actions.  
    /// Override BreezeConfig to return a different TransactionSettings value.
    /// You can supply settings for a particular save with the TransactionSettings passed in the SaveChanges call. 
    /// </remarks>
    public static TransactionSettings Default {
      get {
        lock (_default) {
          return _default;
        }
      }
      set {
        lock (_default) {
          var temp = value ?? new TransactionSettings();
          _default.IsolationLevel = temp.IsolationLevel;
          _default.Timeout = temp.Timeout;
          _default.TransactionType = temp.TransactionType;
        }
      }
    }

    private static TransactionSettings _default = new TransactionSettings();

    /// <summary>
    /// Create a TransactionSettings object using default settings.
    /// </summary>
    /// <remarks>
    /// Defaults the <see cref="IsolationLevel"/> to ReadCommitted, 
    /// the <see cref="Timeout"/> to TransactionManager.DefaultTimeout (which is usually 1 minute),
    /// and <see cref="TransactionType"/> to TransactionType.None (which means the other settings have no effect).  
    /// These settings are not Breeze requirements and can be changed using the appropriate constructor or setter.
    /// </remarks>
    public TransactionSettings() {
      IsolationLevel = IsolationLevel.ReadCommitted;
      Timeout = TransactionManager.DefaultTimeout;
      TransactionType = TransactionType.None;
    }

    /// <summary>
    /// Create a TransactionSettings object with the specified settings.
    /// </summary>
    /// <remarks>
    /// Note that IsolationLevel and Timeout have no affect if TransactionType is None.
    /// </remarks>
    public TransactionSettings(IsolationLevel isolationLevel, TimeSpan timeout, TransactionType transactionType) {
      IsolationLevel = isolationLevel;
      Timeout = timeout;
      TransactionType = transactionType;
    }


    /// <summary>
    /// What type of transaction to use when performing saves.
    /// The transaction wraps the BeforeSaveEntity/ies, SaveChangesCore, and AfterSaveEntities methods
    /// so all work can be commited or rolled back together.
    /// </summary>
    public TransactionType TransactionType {
      get;
      set;
    }

    /// <summary>
    /// Gets the transaction locking behavior.
    /// </summary>
    /// <remarks>
    /// Only applicable if <see cref="TransactionType"/> is not <code>None</code>.  The default IsolationLevel is ReadCommitted.
    /// </remarks>
    public IsolationLevel IsolationLevel {
      get;
      set;
    }

    /// <summary>
    /// Gets the transaction locking behavior as a System.Data.IsolationLevel.
    /// </summary>
    /// <remarks>
    /// Only applicable if <see cref="TransactionType"/> is not <code>None</code>.  The default IsolationLevel is ReadCommitted.
    /// </remarks>
    public System.Data.IsolationLevel IsolationLevelAs {
      get {
        return IsolationMap[(int)IsolationLevel];
      }
    }

    /// <summary>
    /// Gets the timeout period for the TransactionScope transaction. 
    /// </summary>
    /// <remarks>
    /// Only applicable if <see cref="TransactionType"/> is <code>TransactionScope</code>. 
    /// The default Timeout is TransactionManager.DefaultTimeout which is usually 1 minute.
    /// See http://stackoverflow.com/questions/6402031/transactionscope-maximumtimeout
    /// </remarks>
    public TimeSpan Timeout {
      get;
      set;
    }

    /// <summary>
    /// Converts the TransactionSettings to a <see cref="System.Transactions.TransactionOptions" /> instance.
    /// </summary>
    /// <returns></returns>
    public TransactionOptions ToTransactionOptions() {
      TransactionOptions options = new TransactionOptions();
      options.IsolationLevel = this.IsolationLevel;
      options.Timeout = this.Timeout;
      return options;
    }

    /// <summary>
    /// See <see cref="Object.Equals(Object)"/>.
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public override bool Equals(Object obj) {
      if (obj == null) return false;
      TransactionSettings other = obj as TransactionSettings;
      if (other == null) return false;
      return other.IsolationLevel.Equals(this.IsolationLevel)
        && other.Timeout.Equals(this.Timeout)
        && other.TransactionType.Equals(this.TransactionType);
    }


    /// <summary>
    /// See <see cref="M:System.Object.GetHashCode"/>.
    /// </summary>
    /// <returns>
    /// A hash code for the current <see cref="T:System.Object"></see>.
    /// </returns>
    public override int GetHashCode() {
      return this.IsolationLevel.GetHashCode() ^ this.Timeout.GetHashCode() ^ this.TransactionType.GetHashCode();
    }

    /// <summary>
    /// Maps the System.Transactions.IsolationLevel to System.Data.IsolationLevel
    /// </summary>
    private static readonly System.Data.IsolationLevel[] IsolationMap = new System.Data.IsolationLevel[]  {
          System.Data.IsolationLevel.Serializable,
          System.Data.IsolationLevel.RepeatableRead,
          System.Data.IsolationLevel.ReadCommitted,
          System.Data.IsolationLevel.ReadUncommitted,
          System.Data.IsolationLevel.Snapshot,
          System.Data.IsolationLevel.Chaos,
          System.Data.IsolationLevel.Unspecified
        };

  }

  /// <summary><list>
  ///  TransactionScope - Use the ambient .NET TransactionScope object.  Necessary for distributed transactions.
  ///  DbTransaction - Use the transaction from the DbConnection.  Only works against the single connection.
  ///  None - BeforeSaveEntity/ies, SaveChangesCore, and AfterSaveEntities are not executed in the same transaction.
  /// </list></summary>
  public enum TransactionType {
    TransactionScope,
    DbTransaction,
    None
  }
}
