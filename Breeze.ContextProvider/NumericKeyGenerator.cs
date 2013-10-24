using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Configuration;
using System.Linq;

namespace Breeze.ContextProvider {

  public class NumericKeyGenerator : IKeyGenerator {

    public NumericKeyGenerator(DbConnection dbConnection) {
      _connection = dbConnection;
    }

    private DbConnection _connection;

    public void UpdateKeys(List<TempKeyInfo> keys) {

      long nextId = GetNextId(keys.Count);
      keys.ForEach(ki => {
        try {
          var nextIdValue = Convert.ChangeType(nextId, ki.Property.PropertyType);
          ki.RealValue = nextIdValue;
        } catch {
          throw new NotSupportedException("This id generator cannot generate ids of type " + ki.Property.PropertyType);
        }
        nextId++;
      });
    }


    //***********************************
    // Private & Protected
    //***********************************

    private long GetNextId(int pCount) {
      // Serialize access to GetNextId 
      lock (__lock) {

        if (__nextId + pCount > __maxNextId) {
          AllocateMoreIds(pCount);
        }
        long result = __nextId;
        __nextId += pCount;
        return result;
      }
    }

    private void AllocateMoreIds(int pCount) {
      const String sqlSelect = "select NextId from NextId where Name = 'GLOBAL'";
      const String sqlUpdate = "update NextId set NextId={0} where Name = 'GLOBAL' and NextId={1}";

      // allocate the larger of the amount requested or the default alloc group size
      pCount = Math.Max(pCount, DefaultGroupSize);

      var wasClosed = _connection.State != ConnectionState.Open;
      try {
        if (wasClosed) {
          _connection.Open();
        }
        IDbCommand aCommand = CreateDbCommand(_connection);

        for (int trys = 0; trys <= MaxTrys; trys++) {

          aCommand.CommandText = sqlSelect;
          IDataReader aDataReader = aCommand.ExecuteReader();
          if (!aDataReader.Read()) {
            throw new Exception("Unable to locate 'NextId' record");
          }

          Object tmp = aDataReader.GetValue(0);
          long nextId = (long) Convert.ChangeType(tmp, typeof (Int64));
          long newNextId = nextId + pCount;
          aDataReader.Close();

          // do the update;
          aCommand.CommandText = String.Format(sqlUpdate, newNextId, nextId);

          // if only one record was affected - we're ok; otherwise try again.
          if (aCommand.ExecuteNonQuery() == 1) {
            __nextId = nextId;
            __maxNextId = newNextId;
            return;
          }
        }
      } finally {
          if (wasClosed) {
            _connection.Close();
          }
      }
      throw new Exception("Unable to generate a new id");
    }

    private DbCommand CreateDbCommand(IDbConnection connection) {
      IDbCommand command = connection.CreateCommand();
      try {
        return (DbCommand) command;
      } catch {
        throw new Exception("Unable to cast a DbCommand object from an IDbCommand for current connection");
      }
    }

    private static long __nextId;
    private static long __maxNextId;

    private static object __lock = new Object();
    private const int MaxTrys = 3;
    private const int DefaultGroupSize = 100;
    private const int MaxGroupSize = 1000;
  }
}