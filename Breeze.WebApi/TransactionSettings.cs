using System;
using System.Transactions;

namespace Breeze.WebApi
{
    public class TransactionSettings
    {
        /// <summary>
        /// Default settings for all saves. 
        /// </summary>
        /// <remarks>
        /// The <b>Default</b> provides default transaction settings for all SaveChanges actions.  
        /// Override BreezeConfig to return a different TransactionSettings value.
        /// You can supply settings for a particular save with the TransactionSettings passed in the SaveChanges call. 
        /// </remarks>
        public static TransactionSettings Default
        {
            get
            {
                lock (_default)
                {
                    return _default;
                }
            }
            set
            {
                lock (_default)
                {
                    var temp = value ?? new TransactionSettings();
                    _default.IsolationLevel = temp.IsolationLevel;
                    _default.Timeout = temp.Timeout;
                    _default.UseTransactionScope = temp.UseTransactionScope;
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
        /// and <see cref="UseTransactionScope"/> to true.  These settings are not Breeze requirements
        /// and can be changed using the appropriate constructor.
        /// </remarks>
        public TransactionSettings()
        {
            IsolationLevel = IsolationLevel.ReadCommitted;
            Timeout = TransactionManager.DefaultTimeout;
            UseTransactionScope = true;
        }

        /// <summary>
        /// Create a TransactionSettings object with the specified settings.
        /// </summary>
        /// <remarks>
        /// Note that IsolationLevel and Timeout have no affect if UseTransactionScope is false.
        /// </remarks>
        public TransactionSettings(IsolationLevel isolationLevel, TimeSpan timeout, bool useTransactionScope = true)
        {
            IsolationLevel = isolationLevel;
            Timeout = timeout;
            UseTransactionScope = useTransactionScope;
        }


        /// <summary>
        /// Whether to use a .NET TransactionScope to perform transactions. 
        /// </summary>
        /// <remarks>
        ///  Defaults to true. Note that if a transaction crosses database boundaries then 
        ///  the transaction may escalate to use DTC (the Distributed Transaction Coordinator).
        /// </remarks>
        public bool UseTransactionScope
        {
            get;
            internal set;
        }

        /// <summary>
        /// Gets the transaction locking behavior.
        /// </summary>
        /// <remarks>
        /// Only applicable if <see cref="UseTransactionScope"/> is true.  The default IsolationLevel is ReadCommitted.
        /// </remarks>
        public IsolationLevel IsolationLevel
        {
            get;
            internal set;
        }

        /// <summary>
        /// Gets the timeout period for the transaction. 
        /// </summary>
        /// <remarks>
        /// Only applicable if <see cref="UseTransactionScope"/> is true.  
        /// The default Timeout is TransactionManager.DefaultTimeout which is usually 1 minute.
        /// See http://stackoverflow.com/questions/6402031/transactionscope-maximumtimeout
        /// </remarks>
        public TimeSpan Timeout
        {
            get;
            internal set;
        }

        /// <summary>
        /// Converts the TransactionSettings to a <see cref="System.Transactions.TransactionOptions" /> instance.
        /// </summary>
        /// <returns></returns>
        public TransactionOptions ToTransactionOptions()
        {
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
        public override bool Equals(Object obj)
        {
            if (obj == null) return false;
            TransactionSettings other = obj as TransactionSettings;
            if (other == null) return false;
            return other.IsolationLevel.Equals(this.IsolationLevel)
              && other.Timeout.Equals(this.Timeout)
              && other.UseTransactionScope.Equals(this.UseTransactionScope);
        }


        /// <summary>
        /// See <see cref="M:System.Object.GetHashCode"/>.
        /// </summary>
        /// <returns>
        /// A hash code for the current <see cref="T:System.Object"></see>.
        /// </returns>
        public override int GetHashCode()
        {
            return this.IsolationLevel.GetHashCode() ^ this.Timeout.GetHashCode() ^ this.UseTransactionScope.GetHashCode();
        }
    }
}
