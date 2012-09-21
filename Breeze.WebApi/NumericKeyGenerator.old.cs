using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Configuration;
using System.Linq;

namespace Breeze.WebApi {

  public class NumericKeyGenerator : IKeyGenerator {

    public NumericKeyGenerator(String storeConnectionString) {
      _connectionString = storeConnectionString;
      _providerName = GetProviderName(_connectionString);
      _providerFactory = DbProviderFactories.GetFactory(_providerName);
    }

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

      var aConnection = CreateDbConnection();
      aConnection.Open();
      using (aConnection) {
        IDbCommand aCommand = CreateDbCommand(aConnection);

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
      }
      throw new Exception("Unable to generate a new id");
    }

    protected String GetConnectionString(String connectionName) {
      var item = ConfigurationManager.ConnectionStrings[connectionName];
      return item.ConnectionString;
    }

    private String GetProviderName(string connectionString) {
      var csb = new DbConnectionStringBuilder {ConnectionString = connectionString};
      String providerName = null;
      if (csb.ContainsKey("provider")) {
        providerName = csb["provider"].ToString();
      } else {
        var css = ConfigurationManager
          .ConnectionStrings
          .Cast<ConnectionStringSettings>()
          .FirstOrDefault(x => x.ConnectionString == connectionString);
        if (css != null) providerName = css.ProviderName;
      }
      return providerName;
    }

    private DbConnection CreateDbConnection() {
      if (String.IsNullOrEmpty(_connectionString)) {
        throw new Exception("No connection string available");
      }

      var connection = _providerFactory.CreateConnection();
      connection.ConnectionString = _connectionString;
      if (connection == null) {
        throw new Exception(String.Format("Unable to connect to connection string: {0}", _connectionString));
      }
      return connection;
    }

    private DbCommand CreateDbCommand(IDbConnection pConnection) {
      if (pConnection.State != ConnectionState.Open) pConnection.Open();
      IDbCommand command = pConnection.CreateCommand();
      try {
        return (DbCommand) command;
      } catch {
        throw new Exception("Unable to cast a DbCommand object from an IDbCommand for current connection");
      }
    }

    private string _connectionStringName;
    private string _connectionString;
    private DbProviderFactory _providerFactory;
    private string _providerName;
    private static long __nextId;
    private static long __maxNextId;

    private static object __lock = new Object();
    private const int MaxTrys = 3;
    private const int DefaultGroupSize = 100;
    private const int MaxGroupSize = 1000;
  }
}