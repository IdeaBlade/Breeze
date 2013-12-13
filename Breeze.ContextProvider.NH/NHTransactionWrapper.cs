using NHibernate;
using System.Data;

namespace Breeze.ContextProvider.NH {
  public class NHTransactionWrapper : IDbTransaction {
    ITransaction _itran;
    IDbConnection _connection;
    IsolationLevel _isolationLevel;

    internal NHTransactionWrapper(ITransaction itran, IDbConnection connection, IsolationLevel isolationLevel) {
      _itran = itran;
      _connection = connection;
      _isolationLevel = isolationLevel;
    }

    public IDbConnection Connection { get { return _connection; } }

    public IsolationLevel IsolationLevel { get { return _isolationLevel; }  }

    public void Commit() {
      _itran.Commit();
    }

    public void Rollback() {
      _itran.Rollback();
    }

    public void Dispose() {
      _itran.Dispose();
    }

  }
}
