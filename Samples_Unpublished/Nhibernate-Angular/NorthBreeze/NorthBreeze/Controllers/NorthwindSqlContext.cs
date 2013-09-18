using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Breeze.WebApi;
using System.Data;
using System.Data.SqlClient;
using System.Configuration;
using System.Data.Common;
using Models.NorthwindIB.NH;

namespace NorthBreeze.Controllers
{
    public class NorthwindSqlContext : ContextProvider, IDisposable
    {
        private SqlConnection _dbConnection;

        /// <summary>
        /// Perform business rules prior to saving
        /// </summary>
        /// <param name="saveMap"></param>
        /// <returns></returns>
        protected override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap)
        {
            if (saveMap.ContainsKey(typeof(User)))
                throw new HttpException(403, "Attempt to save an invalid type");

            return base.BeforeSaveEntities(saveMap);
        }

        /// <summary>
        /// Not implemented.  Metadata is found in metadata.js
        /// </summary>
        /// <returns></returns>
        protected override string BuildJsonMetadata()
        {
            throw new NotImplementedException();
        }

        /// <summary>
        /// Closes the DbConnection.  The base class will call this after SaveChange is complete.
        /// </summary>
        protected override void CloseDbConnection()
        {
            if (_dbConnection != null && _dbConnection.State == ConnectionState.Open)
            {
                _dbConnection.Close();
            }
        }

        /// <summary>
        /// Closes the DbConnection
        /// </summary>
        public void Dispose()
        {
            CloseDbConnection();
        }

        /// <summary>
        /// Provides the connection to BeforeSaveEntities if needed.
        /// </summary>
        /// <returns></returns>
        public override IDbConnection GetDbConnection()
        {
            return _dbConnection;
        }

        /// <summary>
        /// Open the connection to the database.  The base class calls this during SaveChanges()
        /// </summary>
        protected override void OpenDbConnection()
        {
            if (_dbConnection != null && _dbConnection.State == ConnectionState.Open)
                return;

            var connStr = ConfigurationManager.ConnectionStrings["NorthwindConnection"].ConnectionString;
            _dbConnection = new SqlConnection(connStr);
            _dbConnection.Open();
        }

        /// <summary>
        /// Perform the actual work of saving the entity data to the database.
        /// </summary>
        /// <param name="saveWorkState"></param>
        protected override void SaveChangesCore(SaveWorkState saveWorkState)
        {
            var saveMap = saveWorkState.SaveMap;
            var conn = _dbConnection;
            
            foreach (var type in saveMap.Keys)
            {
                List<EntityInfo> entityInfos = saveMap[type];
                if (type == typeof(Customer))
                {
                    SaveCustomers(conn, entityInfos);
                }
                else
                {
                    throw new Exception("Unable to handle saving type " + type.Name);
                }
            }

        }

        /// <summary>
        /// Save (Insert/Update/Delete) the Customers in the EntityInfo objects
        /// </summary>
        /// <param name="conn">Open database connection</param>
        /// <param name="entityInfos">EntityInfo.Entity is Customer</param>
        public void SaveCustomers(SqlConnection conn, List<EntityInfo> entityInfos)
        {
            var dto = new CustomerDTO();
            foreach (var info in entityInfos)
            {
                var customer = info.Entity as Customer;
                switch (info.EntityState)
                {
                    case EntityState.Added:
                        dto.Insert(conn, customer);
                        break;
                    case EntityState.Modified:
                        dto.Update(conn, customer);
                        break;
                    case EntityState.Deleted:
                        dto.Delete(conn, customer);
                        break;
                }
            }
        }

        /// <summary>
        /// Return all the customers in the DB.  Does not close the connection, so call CloseDbConnection() or Dispose().
        /// </summary>
        /// <returns></returns>
        public List<Customer> Customers()
        {
            OpenDbConnection();
            var dto = new CustomerDTO();
            return dto.SelectAll(_dbConnection);
        }
    }

    /// <summary>
    /// For loading and saving customers using plain ol' SQL
    /// </summary>
    public class CustomerDTO
    {
        const string SELECT = "SELECT CustomerID, CustomerID_OLD, CompanyName, ContactName, ContactTitle, Address, City, Region, PostalCode, Country, Phone, Fax, RowVersion FROM Customer";
        const string SELECT_ONE = SELECT + " WHERE CustomerID=@CustomerID";

        const string INSERT = "INSERT INTO Customer " + 
            "(CustomerID, CustomerID_OLD, CompanyName, ContactName, ContactTitle, Address, City, Region, PostalCode, Country, Phone, Fax, RowVersion) VALUES " +
            "(@CustomerID, @CustomerID_OLD, @CompanyName, @ContactName, @ContactTitle, @Address, @City, @Region, @PostalCode, @Country, @Phone, @Fax, @RowVersion)";

        const string UPDATE = "UPDATE Customer SET CustomerID_OLD=@CustomerID_OLD, CompanyName=@CompanyName, ContactName=@ContactName, " + 
                       "ContactTitle=@ContactTitle, Address=@Address, City=@City, Region=@Region, PostalCode=@PostalCode, Country=@Country, " + 
                       "Phone=@Phone, Fax=@Fax, RowVersion=@RowVersion WHERE CustomerID=@CustomerID";

        const string DELETE = "DELETE FROM Customer WHERE CustomerID=@CustomerID";

        private int InsertOrUpdate(SqlConnection conn, Customer customer, string commandText)
        {
            using (SqlCommand command = new SqlCommand(commandText, conn))
            {
                var p = command.Parameters;
                p.Add(new SqlParameter("@CustomerID", customer.CustomerID));
                p.Add(new SqlParameter("@CustomerID_OLD", customer.CustomerID_OLD));
                p.Add(new SqlParameter("@CompanyName", customer.CompanyName));
                p.Add(new SqlParameter("@ContactName", customer.ContactName));
                p.Add(new SqlParameter("@ContactTitle", customer.ContactTitle));
                p.Add(new SqlParameter("@Address", customer.Address));
                p.Add(new SqlParameter("@City", customer.City));
                p.Add(new SqlParameter("@Region", customer.Region));
                p.Add(new SqlParameter("@PostalCode", customer.PostalCode));
                p.Add(new SqlParameter("@Country", customer.Country));
                p.Add(new SqlParameter("@Phone", customer.Phone));
                p.Add(new SqlParameter("@Fax", customer.Fax));
                p.Add(new SqlParameter("@RowVersion", customer.RowVersion));

                var rowsAffected = command.ExecuteNonQuery();
                return rowsAffected;
            }
        }

        public int Insert(SqlConnection conn, Customer customer)
        {
            return InsertOrUpdate(conn, customer, INSERT);
        }

        public int Update(SqlConnection conn, Customer customer)
        {
            return InsertOrUpdate(conn, customer, UPDATE);
        }

        public int Delete(SqlConnection conn, Customer customer)
        {
            using (SqlCommand command = new SqlCommand(DELETE, conn))
            {
                var p = command.Parameters;
                p.Add(new SqlParameter("@CustomerID", customer.CustomerID));

                var rowsAffected = command.ExecuteNonQuery();
                return rowsAffected;
            }
        }

        public Customer SelectOne(SqlConnection conn, Guid customerID)
        {
            using (SqlCommand command = new SqlCommand(SELECT_ONE, conn))
            {
                var p = command.Parameters;
                p.Add(new SqlParameter("@CustomerID", customerID));

                SqlDataReader reader = command.ExecuteReader();
                while (reader.Read())
                {
                    return BuildCustomer(reader);
                }
                return null;
            }
        }

        public List<Customer> SelectAll(SqlConnection conn)
        {
            using (SqlCommand command = new SqlCommand(SELECT, conn))
            {
                SqlDataReader reader = command.ExecuteReader();
                var list = new List<Customer>();
                while (reader.Read())
                {
                    list.Add(BuildCustomer(reader));
                }
                return list;
            }
        }

        private Customer BuildCustomer(SqlDataReader reader)
        {
            Customer customer = new Customer();
            customer.CustomerID = reader.GetGuid(0);
            customer.CustomerID_OLD = GetString(reader, 1);
            customer.CompanyName = GetString(reader, 2);
            customer.ContactName = GetString(reader, 3);
            customer.ContactTitle = GetString(reader, 4);
            customer.Address = GetString(reader, 5);
            customer.City = GetString(reader, 6);
            customer.Region = GetString(reader, 7);
            customer.PostalCode = GetString(reader, 8);
            customer.Country = GetString(reader, 9);
            customer.Phone = GetString(reader, 10);
            customer.Fax = GetString(reader, 11);
            customer.RowVersion = reader.IsDBNull(12) ? (int?) null : reader.GetInt32(12);
            return customer;
        }

        private string GetString(SqlDataReader reader, int index)
        {
            return reader.IsDBNull(index) ? (string)null : reader.GetString(index);
        }
    }
}