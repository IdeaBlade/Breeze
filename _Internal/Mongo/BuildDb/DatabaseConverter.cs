using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.Builders;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Xml;

namespace BuildDb {

  public class TableItem {
    public TableItem(String tableName, String collectionName = null, String keyColumnName = null, int integerOffset=0) {
      TableName = tableName;
      CollectionName = (collectionName == null) ? TableName + "s" : collectionName;
      KeyColumnName = keyColumnName;
      IntegerOffset = integerOffset;
    }
    public String TableName;
    public String CollectionName;
    public String KeyColumnName;
    public int IntegerOffset;
  }

  public class DatabaseConverter {

    public DatabaseConverter(String sqlConnectionString, String mongoConnectionString, String mongoDbName) {
      SqlConnectionString = sqlConnectionString;
      MongoConnectionString = mongoConnectionString;
      var safemode = SafeMode.True;
      MongoSvr = MongoServer.Create(mongoConnectionString);
      MongoDb = MongoSvr.GetDatabase(mongoDbName);
      
      // MongoDB.Driver.MongoDefaults.GuidRepresentation = GuidRepresentation.Standard;
      MongoDB.Driver.MongoDefaults.GuidRepresentation = GuidRepresentation.CSharpLegacy;
    }

    public String SqlConnectionString { get; set; }
    public String MongoConnectionString { get; set; }
    public String MongoDbName { get; set; }
    public MongoServer MongoSvr { get; set; }
    public MongoDatabase MongoDb { get; set; }
    public List<TableItem> TableItems { get; set; }

    public void ConvertTables(IEnumerable<TableItem> tableItems) {
      TableItems = tableItems.ToList();

      var coll = MongoDb.GetCollection<BsonDocument>("test");

      int i = 0;
      foreach (var tableItem in tableItems) {
        var tableName = tableItem.TableName;
        var columnName = tableItem.CollectionName;
        var keyColumnName = tableItem.KeyColumnName;
        var intOffset = tableItem.IntegerOffset;
        using (var conn = new SqlConnection(SqlConnectionString)) {
          string query = "select * from [" + tableName + "]";
          using (var cmd = new SqlCommand(query, conn)) {
            // Delete the MongoDb Collection first to proceed with data insertion

            if (MongoDb.CollectionExists(tableItem.CollectionName)) {
              var collection = MongoDb.GetCollection<BsonDocument>(columnName);
              collection.Drop();
            }
            conn.Open();
            var reader = cmd.ExecuteReader();
            var bsonlist = new List<BsonDocument>(1000);
            while (reader.Read()) {
              if (i == 1000) {
                using (MongoSvr.RequestStart(MongoDb)) {
                  //MongoCollection<MongoDB.Bson.BsonDocument> 
                  coll = MongoDb.GetCollection<BsonDocument>(columnName);
                  coll.InsertBatch(bsonlist);
                  bsonlist.RemoveRange(0, bsonlist.Count);
                }
                i = 0;
              }
              ++i;
              var bson = new BsonDocument();
              for (int j = 0; j < reader.FieldCount; j++) {
                var aType = reader[j].GetType();
                var propName = reader.GetName(j);
                if (aType == typeof (String)) {
                  bson.Add(new BsonElement(propName, reader[j].ToString().Trim()));
                } else if (aType == typeof (Int32)) {
                  bson.Add(new BsonElement(propName, BsonValue.Create(reader.GetInt32(j))));
                } else if (aType == typeof (Int16)) {
                  bson.Add(new BsonElement(propName, BsonValue.Create(reader.GetInt16(j))));
                } else if (aType == typeof (Int64)) {
                  bson.Add(new BsonElement(propName, BsonValue.Create(reader.GetInt64(j))));
                } else if (aType == typeof (float)) {
                  bson.Add(new BsonElement(propName, BsonValue.Create(reader.GetFloat(j))));
                } else if (aType == typeof (Decimal)) {
                  var val = (double) reader.GetDecimal(j);
                  bson.Add(new BsonElement(propName, BsonValue.Create(val)));
                } else if (aType == typeof (Double)) {
                  bson.Add(new BsonElement(propName, BsonValue.Create(reader.GetDouble(j))));
                } else if (aType == typeof (DateTime)) {
                  bson.Add(new BsonElement(propName, BsonValue.Create(reader.GetDateTime(j))));
                } else if (aType == typeof(DateTimeOffset)) {
                  var val = reader.GetDateTimeOffset(j).DateTime;
                  bson.Add(new BsonElement(propName, BsonValue.Create(val)));
                } else if (aType == typeof (Guid)) {
                  var guid = reader.GetGuid(j);
                  bson.Add(new BsonElement(propName, guid.ToString()));
                  // bson.Add(new BsonElement(propName, BsonValue.Create(reader.GetGuid(j))));
                } else if (aType == typeof (Boolean)) {
                  bson.Add(new BsonElement(propName, BsonValue.Create(reader.GetBoolean(j))));
                } else if (aType == typeof (DBNull)) {
                  // do nothing
                  // bson.Add(new BsonElement(propName, BsonNull.Value));
                } else if (aType == typeof (Byte)) {
                  bson.Add(new BsonElement(propName, BsonValue.Create(reader.GetByte(j))));
                } else if (aType == typeof (Byte[])) {
                  bson.Add(new BsonElement(propName, BsonValue.Create(reader[j] as Byte[])));
                } else if (aType == typeof (TimeSpan)) {
                  var ts = reader.GetTimeSpan(j);
                  var val = XmlConvert.ToString(ts);
                  bson.Add(new BsonElement(propName, val));
                } else {
                  throw new Exception("Unable to convert: " + aType);
                }
              }
              if (keyColumnName != null) {
                var keyValue = bson.GetElement(keyColumnName).Value;
                if (intOffset != 0) {
                  keyValue = BsonValue.Create(keyValue.AsInt32 + intOffset);
                }
                bson.Add(new BsonElement("_id", keyValue));
              }
              bsonlist.Add(bson);
            }
            if (i > 0) {
              using (MongoSvr.RequestStart(MongoDb)) {
                coll = MongoDb.GetCollection<BsonDocument>(columnName);
                coll.InsertBatch(bsonlist);
                bsonlist.RemoveRange(0, bsonlist.Count);
              }
              i = 0;
            }
          }
        }
      }
    }

    private TableItem GetTableItemForCollection(String collectionName ) {
      return TableItems.First(ti => ti.CollectionName == collectionName);
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

    public void MakeChildDocs(String parentCollectionName, String parentPkName, String childCollectionName,
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
        var parentQuery = Query.EQ(parentPkName, key);
        var parentUpdate = Update.Set(parentPropName, childArray);
        var r = parents.Update(parentQuery, parentUpdate);
        
      }
      ClearOldPk(parentCollectionName, parentPkName);
    }

    public void MakeChildDoc(String parentCollectionName, String parentChildDocName, String[] propertyNames) {
      var parents = MongoDb.GetCollection(parentCollectionName);

      foreach (var parent in parents.Find(null)) {
        var key = parent["_id"];
        var subDoc = new BsonDocument();
        var parentUpdate = Update.Set(parentChildDocName, subDoc);
        foreach (var pn in propertyNames) {
          BsonElement ele;
          if (parent.TryGetElement(pn, out ele)) {
            subDoc.Add(pn, ele.Value);
            parentUpdate.Unset(pn);
          }

        }
        var parentQuery = Query.EQ("_id", key);
        var r = parents.Update(parentQuery, parentUpdate);
      }
    }
  }
}
