using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Linq;
using System.Text;

using MongoDB.Bson;
using MongoDB.Driver;

using MongoDB.Driver.Builders;
using MongoDB.Driver.GridFS;
using MongoDB.Driver.Linq;

using System.Reflection;
using System.Xml;

namespace BuildDb {

  public class TableItem {
    public TableItem(String tableName, String collName = "") {
      TableName = tableName;
      CollName = (collName == "") ? TableName + "s" : collName;
    }
    public String TableName;
    public String CollName;
  }

  public class DatabaseConverter {

    public DatabaseConverter(String sqlConnectionString, String mongoConnectionString, String mongoDbName) {
      SqlConnectionString = sqlConnectionString;
      MongoConnectionString = mongoConnectionString;
      var safemode = SafeMode.True;
      MongoSvr = MongoServer.Create(mongoConnectionString);
      MongoDb = MongoSvr.GetDatabase(mongoDbName);

    }

    public String SqlConnectionString { get; set; }
    public String MongoConnectionString { get; set; }
    public String MongoDbName { get; set; }
    public MongoServer MongoSvr { get; set; }
    public MongoDatabase MongoDb { get; set; }

    public void ConvertTables(IEnumerable<TableItem> tableItems) {

      MongoCollection<BsonDocument> coll = MongoDb.GetCollection<BsonDocument>("test");

      int i = 0;
      foreach (var tableItem in tableItems) {
        var tableName = tableItem.TableName;
        var collName = tableItem.CollName;

        using (SqlConnection conn = new SqlConnection(SqlConnectionString)) {
          string query = "select * from [" + tableName + "]";
          using (SqlCommand cmd = new SqlCommand(query, conn)) {
            /// Delete the MongoDb Collection first to proceed with data insertion

            if (MongoDb.CollectionExists(tableItem.CollName)) {
              MongoCollection<BsonDocument> collection = MongoDb.GetCollection<BsonDocument>(collName);
              collection.Drop();
            }
            conn.Open();
            SqlDataReader reader = cmd.ExecuteReader();
            List<BsonDocument> bsonlist = new List<BsonDocument>(1000);
            while (reader.Read()) {
              if (i == 1000) {
                using (MongoSvr.RequestStart(MongoDb)) {
                  //MongoCollection<MongoDB.Bson.BsonDocument> 
                  coll = MongoDb.GetCollection<BsonDocument>(collName);
                  coll.InsertBatch(bsonlist);
                  bsonlist.RemoveRange(0, bsonlist.Count);
                }
                i = 0;
              }
              ++i;
              BsonDocument bson = new BsonDocument();
              for (int j = 0; j < reader.FieldCount; j++) {
                if (reader[j].GetType() == typeof (String)) {
                  bson.Add(new BsonElement(reader.GetName(j), reader[j].ToString()));
                } else if ((reader[j].GetType() == typeof (Int32))) {
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(reader.GetInt32(j))));
                } else if (reader[j].GetType() == typeof (Int16)) {
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(reader.GetInt16(j))));
                } else if (reader[j].GetType() == typeof (Int64)) {
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(reader.GetInt64(j))));
                } else if (reader[j].GetType() == typeof (float)) {
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(reader.GetFloat(j))));
                } else if (reader[j].GetType() == typeof (Decimal)) {
                  var val = (double) reader.GetDecimal(j);
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(val)));
                } else if (reader[j].GetType() == typeof (Double)) {
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(reader.GetDouble(j))));
                } else if (reader[j].GetType() == typeof (DateTime)) {
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(reader.GetDateTime(j))));
                } else if (reader[j].GetType() == typeof(DateTimeOffset)) {
                  var val = reader.GetDateTimeOffset(j).DateTime;
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(val)));
                } else if (reader[j].GetType() == typeof (Guid)) {
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(reader.GetGuid(j))));
                } else if (reader[j].GetType() == typeof (Boolean)) {
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(reader.GetBoolean(j))));
                } else if (reader[j].GetType() == typeof (DBNull)) {
                  // do nothing
                  // bson.Add(new BsonElement(reader.GetName(j), BsonNull.Value));
                } else if (reader[j].GetType() == typeof (Byte)) {
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(reader.GetByte(j))));
                } else if (reader[j].GetType() == typeof (Byte[])) {
                  bson.Add(new BsonElement(reader.GetName(j), BsonValue.Create(reader[j] as Byte[])));
                } else if (reader[j].GetType() == typeof (TimeSpan)) {
                  var ts = reader.GetTimeSpan(j);
                  var val = XmlConvert.ToString(ts);
                  bson.Add(new BsonElement(reader.GetName(j), val));
                } else {
                  throw new Exception("Unable to convert: " + reader[j].GetType());
                }
              }
              bsonlist.Add(bson);
            }
            if (i > 0) {
              using (MongoSvr.RequestStart(MongoDb)) {
                coll = MongoDb.GetCollection<BsonDocument>(collName);
                coll.InsertBatch(bsonlist);
                bsonlist.RemoveRange(0, bsonlist.Count);
              }
              i = 0;
            }
          }
        }
      }
    }

    public void UpdateFk(String parentCollectionName, String parentPkName, String childCollectionName, String childFkName, bool clearParentPk) {
      var parents = MongoDb.GetCollection(parentCollectionName);
      var children = MongoDb.GetCollection(childCollectionName);
      var found = false;
      foreach (var parent in parents.Find(null)) {
        found = true;
        var key = parent[parentPkName];
        var query = Query.EQ(childFkName, key);

        var update = Update.Set(childFkName, parent["_id"]);
        
        var r = children.Update(query, update, UpdateFlags.Multi);
      }
      if (!found) {
        throw new Exception("Unable to locate any " + parentCollectionName);
      }
      if (clearParentPk) {
        ClearOldPk(parentCollectionName, parentPkName);
      }
    }

    public void ClearOldPk(String collectionName, String pkName ) {
      var docs = MongoDb.GetCollection(collectionName);
      var update = Update.Rename(pkName, "X_" + pkName);
      var r = docs.Update(null, update, UpdateFlags.Multi);
    }

    public void MakeChildDoc(String parentCollectionName, String parentPkName, String childCollectionName,
                             String childFkName, String parentPropName) {
      var parents = MongoDb.GetCollection(parentCollectionName);
      var children = MongoDb.GetCollection(childCollectionName);
      foreach (var parent in parents.Find(null)) {
        var key = parent[parentPkName];
        var childrenQuery = Query.EQ(childFkName, key);

        var childDocs = children.Find(childrenQuery).ToList();
        childDocs.ForEach(cd => {
          cd.Remove("_id");
          cd.Remove(childFkName);
        });
        var childArray = new BsonArray(childDocs);
        var parentQuery = Query.EQ("_id", parent["_id"]);
        var parentUpdate = Update.Set(parentPropName, childArray);
        var r = parents.Update(parentQuery, parentUpdate);
        
      }
      ClearOldPk(parentCollectionName, parentPkName);
    }
  }
}
