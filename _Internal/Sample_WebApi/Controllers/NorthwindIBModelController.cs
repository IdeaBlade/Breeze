// Only one of the next 5 should be uncommented.
//#define CODEFIRST_PROVIDER
//#define DATABASEFIRST_OLD
#define DATABASEFIRST_NEW
//#define ORACLE_EDMX
//#define NHIBERNATE


#define CLASS_ACTIONFILTER

using System;
using System.Net;
using System.Linq;
using System.Web.Http;
using System.Web.Http.OData;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using System.Web.Http.OData.Query;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Data.SqlClient;
using System.IO;
using System.Web;

#if CODEFIRST_PROVIDER
using Models.NorthwindIB.CF;
using Foo;
using System.ComponentModel.DataAnnotations;
#elif DATABASEFIRST_OLD
using Models.NorthwindIB.EDMX;
#elif DATABASEFIRST_NEW
using Models.NorthwindIB.EDMX_2012;
#elif ORACLE_EDMX
using Models.NorthwindIB.Oracle;
#elif NHIBERNATE
using Models.NorthwindIB.NH;
using Breeze.Nhibernate.WebApi;
using NHibernate;
using NHibernate.Linq;
#endif

namespace Sample_WebApi.Controllers {


#if CODEFIRST_PROVIDER
  public class NorthwindContextProvider: EFContextProvider<NorthwindIBContext_CF>  {
    public NorthwindContextProvider() : base() { }
#elif DATABASEFIRST_OLD
  public class NorthwindContextProvider: EFContextProvider<NorthwindIBContext_EDMX>  {
    public NorthwindContextProvider() : base() { }
#elif DATABASEFIRST_NEW
  public class NorthwindContextProvider : EFContextProvider<NorthwindIBContext_EDMX_2012> {
    public NorthwindContextProvider() : base() { }
#elif ORACLE_EDMX
  public class NorthwindContextProvider : EFContextProvider<Entities> {
    public NorthwindContextProvider() : base() { }
#elif NHIBERNATE
  public class NorthwindContextProvider : NorthwindNHContext {
#endif

    protected override void AfterSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap, List<KeyMapping> keyMappings) {
      var tag = (string)SaveOptions.Tag;
      if (tag == "CommentKeyMappings.After") {

        foreach (var km in keyMappings) {
          var realint = Convert.ToInt32(km.RealValue);
          byte seq = (byte)(realint % 512);
          AddComment(km.EntityTypeName + ':' + km.RealValue, seq);
        }
      }
      else if (tag == "UpdateProduceKeyMapping.After") {
        if (!keyMappings.Any()) throw new Exception("UpdateProduce.After: No key mappings available");
        var km = keyMappings[0];
        UpdateProduceDescription(km.EntityTypeName + ':' + km.RealValue);

      } else if (tag == "LookupEmployeeInSeparateContext.After") {
        LookupEmployeeInSeparateContext();
      }
      base.AfterSaveEntities(saveMap, keyMappings);
    }

    // Test performing a raw db insert to NorthwindIB using the base connection
    private int AddComment(string comment, byte seqnum) {
      var conn = base.GetDbConnection();
      var cmd = conn.CreateCommand();
#if ORACLE_EDMX
      var time = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
      cmd.CommandText = String.Format("insert into COMMENT_ (CreatedOn, Comment1, SeqNum) values (TO_DATE('{0}','YYYY-MM-DD HH24:MI:SS'), '{1}', {2})",
          time, comment, seqnum);
#else
      var time = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
      cmd.CommandText = String.Format("insert into Comment (CreatedOn, Comment1, SeqNum) values ('{0}', '{1}', {2})",
          time, comment, seqnum);
#endif
      var result = cmd.ExecuteNonQuery();
      return result;
    }

    // Test performing a raw db update to ProduceTPH using the ProduceTPH connection.  Requires DTC.
    private int UpdateProduceDescription(string comment) {
      using (var conn = new SqlConnection("data source=.;initial catalog=ProduceTPH;integrated security=True;multipleactiveresultsets=True;application name=EntityFramework")) {
        conn.Open();
        var cmd = conn.CreateCommand();
        cmd.CommandText = String.Format("update ItemOfProduce set Description='{0}' where id='{1}'",
            comment, "13F1C9F5-3189-45FA-BA6E-13314FAFAA92");
        var result = cmd.ExecuteNonQuery();
        conn.Close();
        return result;
      }
    }

    // Use another Context to simulate lookup.  Returns Margaret Peacock if employeeId is not specified.
    private Employee LookupEmployeeInSeparateContext(int employeeId = 4) {
      var context2 = new NorthwindIBContext_EDMX_2012();
      var query = context2.Employees.Where(e => e.EmployeeID == employeeId);
      var employee = query.FirstOrDefault();
      return employee;
    }


    protected override bool BeforeSaveEntity(EntityInfo entityInfo) {
      if ((string)SaveOptions.Tag == "addProdOnServer") {
        Supplier supplier = entityInfo.Entity as Supplier;
        Product product = new Product() {
          ProductName = "Product added on server"
        };
#if CODEFIRST_PROVIDER
        if (supplier.Products == null) supplier.Products = new List<Product>();
#endif
        supplier.Products.Add(product);
        return true;
      }

      // prohibit any additions of entities of type 'Region'
      if (entityInfo.Entity.GetType() == typeof(Region) && entityInfo.EntityState == EntityState.Added) {
        var region = entityInfo.Entity as Region;
        if (region.RegionDescription.ToLowerInvariant().StartsWith("error")) return false;
      }

#if ORACLE_EDMX
      // Convert GUIDs in Customer and Order to be compatible with Oracle
      if (entityInfo.Entity.GetType() == typeof(Customer)) {
        var cust = entityInfo.Entity as Customer;
        if (cust.CustomerID != null) {
          cust.CustomerID = cust.CustomerID.ToUpperInvariant();
        }
      } else if (entityInfo.Entity.GetType() == typeof(Order)) {
        var order = entityInfo.Entity as Order;
        if (order.CustomerID != null) {
          order.CustomerID = order.CustomerID.ToUpperInvariant();
        }
      }
#endif

      return base.BeforeSaveEntity(entityInfo);
    }

    protected override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {

      var tag = (string)SaveOptions.Tag;

      if (tag == "CommentOrderShipAddress.Before") {
        var orderInfos = saveMap[typeof(Order)];
        byte seq = 1;
        foreach (var info in orderInfos) {
          var order = (Order)info.Entity;
          AddComment(order.ShipAddress, seq++);
        }
      }
      else if (tag == "UpdateProduceShipAddress.Before") {
        var orderInfos = saveMap[typeof(Order)];
        var order = (Order)orderInfos[0].Entity;
        UpdateProduceDescription(order.ShipAddress);
      } else if (tag == "LookupEmployeeInSeparateContext.Before") {
        LookupEmployeeInSeparateContext();
      
      } else if (tag == "ValidationError.Before") {
        foreach(var type in saveMap.Keys) {
          var list = saveMap[type];
          foreach(var entityInfo in list) {
            var entity = entityInfo.Entity;
            var entityError = new EntityError() {
              EntityTypeName = type.Name,
              ErrorMessage = "Error message for " + type.Name,
              ErrorName = "Server-Side Validation",
            };
            if (entity is Order) {
              var order = (Order)entity;
              entityError.KeyValues = new object[] { order.OrderID };
              entityError.PropertyName = "OrderDate";
            }
          
          }
        }
      }


      if (tag == "increaseProductPrice") {
        Dictionary<Type, List<EntityInfo>> saveMapAdditions = new Dictionary<Type, List<EntityInfo>>();
        foreach (var type in saveMap.Keys) {
          if (type == typeof(Category)) {
            foreach (var entityInfo in saveMap[type]) {
              if (entityInfo.EntityState == EntityState.Modified) {
                Category category = (entityInfo.Entity as Category);
                var products = this.Context.Products.Where(p => p.CategoryID == category.CategoryID);
                foreach (var product in products) {
                  if (!saveMapAdditions.ContainsKey(typeof(Product)))
                    saveMapAdditions[typeof(Product)] = new List<EntityInfo>();

                  var ei = this.CreateEntityInfo(product, EntityState.Modified);
                  ei.ForceUpdate = true;
                  var incr = (Convert.ToInt64(product.UnitPrice) % 2) == 0 ? 1 : -1;
                  product.UnitPrice += incr;
                  saveMapAdditions[typeof(Product)].Add(ei);
                }
              }
            }
          }
        }
        foreach (var type in saveMapAdditions.Keys) {
          if (!saveMap.ContainsKey(type)) {
            saveMap[type] = new List<EntityInfo>();
          }
          foreach (var enInfo in saveMapAdditions[type]) {
            saveMap[type].Add(enInfo);
          }
        }
        return saveMap;
      }

      return base.BeforeSaveEntities(saveMap);
      // return saveMap;
    }

  }

#if CLASS_ACTIONFILTER
#if NHIBERNATE
  [BreezeNHController]
#else
  [BreezeController]
#endif
  public class NorthwindIBModelController : ApiController {
    private NorthwindContextProvider ContextProvider;

    public NorthwindIBModelController() {
      ContextProvider = new NorthwindContextProvider();
    }

    //[HttpGet]
    //public String Metadata() {
    //  var folder = Path.Combine(HttpRuntime.AppDomainAppPath, "App_Data");
    //  var fileName = Path.Combine(folder, "metadata.json");
    //  var jsonMetadata = File.ReadAllText(fileName);
    //  return jsonMetadata;
    //}

    [HttpGet]
    public String Metadata() {
      return ContextProvider.Metadata();
    }

    //[HttpGet]
    //public HttpResponseMessage Metadata() {
    //  var result = new HttpResponseMessage { Content = new StringContent(ContextProvider.Metadata())};
    //  result.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
    //  return result;
    //}

    [HttpPost]
    public SaveResult SaveChanges(JObject saveBundle) {
      return ContextProvider.SaveChanges(saveBundle);
    }

    [HttpPost]
    public SaveResult SaveWithTransactionScope(JObject saveBundle) {
      var txSettings = new TransactionSettings() { TransactionType = TransactionType.TransactionScope };
      return ContextProvider.SaveChanges(saveBundle, txSettings);
    }

    [HttpPost]
    public SaveResult SaveWithDbTransaction(JObject saveBundle) {
      var txSettings = new TransactionSettings() { TransactionType = TransactionType.DbTransaction };
      return ContextProvider.SaveChanges(saveBundle, txSettings);
    }

    [HttpPost]
    public SaveResult SaveWithNoTransaction(JObject saveBundle) {
      var txSettings = new TransactionSettings() { TransactionType = TransactionType.None };
      return ContextProvider.SaveChanges(saveBundle, txSettings);
    }

    [HttpPost]
    public SaveResult SaveWithComment(JObject saveBundle) {
      ContextProvider.BeforeSaveEntitiesDelegate = AddComment;
      return ContextProvider.SaveChanges(saveBundle);
    }


    [HttpPost]
    public SaveResult SaveWithExit(JObject saveBundle) {
      return new SaveResult() { Entities = new List<Object>(), KeyMappings = new List<KeyMapping>() };
    }

    [HttpPost]
    public SaveResult SaveAndThrow(JObject saveBundle) {
      ContextProvider.BeforeSaveEntitiesDelegate = ThrowError;
      return ContextProvider.SaveChanges(saveBundle);
    }

    [HttpPost]
    public SaveResult SaveWithEntityErrorsException(JObject saveBundle) {
      ContextProvider.BeforeSaveEntitiesDelegate = ThrowEntityErrorsException;
      return ContextProvider.SaveChanges(saveBundle);
    }


    [HttpPost]
    public SaveResult SaveWithFreight(JObject saveBundle) {
      ContextProvider.BeforeSaveEntityDelegate = CheckFreight;
      return ContextProvider.SaveChanges(saveBundle);
    }

    [HttpPost]
    public SaveResult SaveWithFreight2(JObject saveBundle) {
      ContextProvider.BeforeSaveEntitiesDelegate = CheckFreightOnOrders;
      return ContextProvider.SaveChanges(saveBundle);
    }

    [HttpPost]
    public SaveResult SaveCheckInitializer(JObject saveBundle) {
      ContextProvider.BeforeSaveEntitiesDelegate = AddOrder;
      return ContextProvider.SaveChanges(saveBundle);
    }

    [HttpPost]
    public SaveResult SaveCheckUnmappedProperty(JObject saveBundle) {
      ContextProvider.BeforeSaveEntityDelegate = CheckUnmappedProperty;
      return ContextProvider.SaveChanges(saveBundle);
    }

    private Dictionary<Type, List<EntityInfo>> ThrowError(Dictionary<Type, List<EntityInfo>> saveMap) {
      throw new Exception("Deliberately thrown exception");
    }

    private Dictionary<Type, List<EntityInfo>> ThrowEntityErrorsException(Dictionary<Type, List<EntityInfo>> saveMap) {
      List<EntityInfo> orderInfos;
      if (saveMap.TryGetValue(typeof(Order), out orderInfos)) {
        var errors = orderInfos.Select(oi => {
          return new EFEntityError(oi, "Cannot save orders with this save method", "OrderID");
        });
        throw new EntityErrorsException(errors);
      }
      return saveMap;
    }


    private Dictionary<Type, List<EntityInfo>> AddOrder(Dictionary<Type, List<EntityInfo>> saveMap) {
      var order = new Order();
      order.OrderDate = DateTime.Today;
      var ei = ContextProvider.CreateEntityInfo(order);
      List<EntityInfo> orderInfos;
      if (!saveMap.TryGetValue(typeof(Order), out orderInfos)) {
        orderInfos = new List<EntityInfo>();
        saveMap.Add(typeof(Order), orderInfos);
      }
      orderInfos.Add(ei);

      return saveMap;
    }

    private Dictionary<Type, List<EntityInfo>> CheckFreightOnOrders(Dictionary<Type, List<EntityInfo>> saveMap) {
      List<EntityInfo> entityInfos;
      if (saveMap.TryGetValue(typeof(Order), out entityInfos)) {
        foreach (var entityInfo in entityInfos) {
          CheckFreight(entityInfo);
        }
      }

      return saveMap;
    }

    private bool CheckFreight(EntityInfo entityInfo) {
      if ((ContextProvider.SaveOptions.Tag as String) == "freight update") {
        var order = entityInfo.Entity as Order;
        order.Freight = order.Freight + 1;
      } else if ((ContextProvider.SaveOptions.Tag as String) == "freight update-ov") {
        var order = entityInfo.Entity as Order;
        order.Freight = order.Freight + 1;
        entityInfo.OriginalValuesMap["Freight"] = null;
      } else if ((ContextProvider.SaveOptions.Tag as String) == "freight update-force") {
        var order = entityInfo.Entity as Order;
        order.Freight = order.Freight + 1;
        entityInfo.ForceUpdate = true;
      }
      return true;
    }

    private Dictionary<Type, List<EntityInfo>> AddComment(Dictionary<Type, List<EntityInfo>> saveMap) {
      var comment = new Comment();
      var tag = ContextProvider.SaveOptions.Tag;
      comment.Comment1 = (tag == null) ? "Generic comment" : tag.ToString();
      comment.CreatedOn = DateTime.Now;
      comment.SeqNum = 1;
      var ei = ContextProvider.CreateEntityInfo(comment);
      List<EntityInfo> commentInfos;
      if (!saveMap.TryGetValue(typeof(Comment), out commentInfos)) {
        commentInfos = new List<EntityInfo>();
        saveMap.Add(typeof(Comment), commentInfos);
      }
      commentInfos.Add(ei);

      return saveMap;
    }

    private bool CheckUnmappedProperty(EntityInfo entityInfo) {
      var unmappedValue = entityInfo.UnmappedValuesMap["myUnmappedProperty"];
      if ((String)unmappedValue != "anything22") {
        throw new Exception("wrong value for unmapped property:  " + unmappedValue);
      }
      Customer cust = entityInfo.Entity as Customer;
      return false;
    }




    #region standard queries

    [HttpGet]
    public List<Employee> QueryInvolvingMultipleEntities() {
#if NHIBERNATE
        // need to figure out what to do here
        //return new List<Employee>();
        var dc0 = new NorthwindNHContext();
        var dc = new NorthwindNHContext();
#elif CODEFIRST_PROVIDER
        var dc0 = new NorthwindIBContext_CF();
        var dc = new EFContextProvider<NorthwindIBContext_CF>();
#elif DATABASEFIRST_OLD
        var dc0 = new NorthwindIBContext_EDMX();
        var dc = new EFContextProvider<NorthwindIBContext_EDMX>();
#elif DATABASEFIRST_NEW
      var dc0 = new NorthwindIBContext_EDMX_2012();
      var dc = new EFContextProvider<NorthwindIBContext_EDMX_2012>();
#elif ORACLE_EDMX
      var dc0 = new Entities();
      var dc = new EFContextProvider<Entities>();
#endif
      //the query executes using pure EF 
      var query0 = (from t1 in dc0.Employees
                    where (from t2 in dc0.Orders select t2.EmployeeID).Distinct().Contains(t1.EmployeeID)
                    select t1);
      var result0 = query0.ToList();

      //the same query fails if using EFContextProvider
      dc0 = dc.Context;
      var query = (from t1 in dc0.Employees
                   where (from t2 in dc0.Orders select t2.EmployeeID).Distinct().Contains(t1.EmployeeID)
                   select t1);
      var result = query.ToList();
      return result;
    }

    [HttpGet]
    // [BreezeQueryable]
    public IQueryable<Customer> Customers() {
      var custs = ContextProvider.Context.Customers;
      return custs;
    }

    //public class CustomerDTO {
    //  public CustomerDTO(Customer cust) {
    //    CompanyName = cust.CompanyName;
    //    ContactName = cust.ContactName;
    //  }

    //  public String CompanyName { get; set; }
    //  public String ContactName { get; set; }
    //}

    //[HttpGet]
    //// [BreezeQueryable]
    //public IQueryable<CustomerDTO> CustomerDTOs() {
    //  var custs = ContextProvider.Context.Customers.Select(c => new CustomerDTO(c));
    //  return custs;
    //}

    [HttpGet]
    public IQueryable<Customer> CustomersStartingWith(string companyName) {
      var custs = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith(companyName));
      return custs;
    }

    [HttpGet]
    public Object CustomerCountsByCountry() {
      return ContextProvider.Context.Customers.GroupBy(c => c.Country).Select(g => new { g.Key, Count = g.Count() });
    }


    [HttpGet]
    public Customer CustomerWithScalarResult() {
      return ContextProvider.Context.Customers.First();
    }

    [HttpGet]
    public IQueryable<Customer> CustomersWithHttpError() {
      // throw new HttpResponseException(HttpStatusCode.NotFound);
      var responseMsg = new HttpResponseMessage(HttpStatusCode.NotFound);
      responseMsg.Content = new StringContent("Custom error message");
      responseMsg.ReasonPhrase = "Custom Reason";
      throw new HttpResponseException(responseMsg);
    }

    [HttpGet]
    public IQueryable<Order> Orders() {
      var orders = ContextProvider.Context.Orders;
      return orders;
    }

    [HttpGet]
    public IQueryable<Employee> Employees() {
      return ContextProvider.Context.Employees;
    }

    [HttpGet]
    public IQueryable<Employee> EmployeesFilteredByCountryAndBirthdate(DateTime birthDate, string country) {
      return ContextProvider.Context.Employees.Where(emp => emp.BirthDate >= birthDate && emp.Country == country);
    }

    [HttpGet]
    public IQueryable<OrderDetail> OrderDetails() {
      return ContextProvider.Context.OrderDetails;
    }

    [HttpGet]
    public IQueryable<Product> Products() {
      return ContextProvider.Context.Products;
    }

    [HttpGet]
    public IQueryable<Supplier> Suppliers() {
      return ContextProvider.Context.Suppliers;
    }

    [HttpGet]
    public IQueryable<Region> Regions() {
      return ContextProvider.Context.Regions;
    }


    [HttpGet]
    public IQueryable<Territory> Territories() {
      return ContextProvider.Context.Territories;
    }

    [HttpGet]
    public IQueryable<Category> Categories() {
      return ContextProvider.Context.Categories;
    }

    [HttpGet]
    public IQueryable<Role> Roles() {
      return ContextProvider.Context.Roles;
    }

    [HttpGet]
    public IQueryable<User> Users() {
      return ContextProvider.Context.Users;
    }

    [HttpGet]
    public IQueryable<TimeLimit> TimeLimits() {
      return ContextProvider.Context.TimeLimits;
    }

    [HttpGet]
    public Object Lookups() {
      var regions = ContextProvider.Context.Regions.ToList();
      var roles = ContextProvider.Context.Roles.ToList();
      return new { regions, roles };
    }

    [HttpGet]
    public IQueryable<TimeGroup> TimeGroups() {
      return ContextProvider.Context.TimeGroups;
    }

    [HttpGet]
    public IQueryable<Comment> Comments() {
      return ContextProvider.Context.Comments;
    }

    [HttpGet]
    public IQueryable<UnusualDate> UnusualDates() {
      return ContextProvider.Context.UnusualDates;
    }

#if ! DATABASEFIRST_OLD
    [HttpGet]
    public IQueryable<Geospatial> Geospatials() {
      return ContextProvider.Context.Geospatials;
    }
#endif

    #endregion

    #region named queries

    [HttpGet]
    public Customer CustomerFirstOrDefault() {
      var customer = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith("blah")).FirstOrDefault();
      return customer;
    }

    [HttpGet]
    public IQueryable<Employee> SearchEmployees([FromUri] int[] employeeIds) {
      var query = ContextProvider.Context.Employees.AsQueryable();
      if (employeeIds.Length > 0) {
        query = query.Where(emp => employeeIds.Contains(emp.EmployeeID));
        var result = query.ToList();
      }
      return query;
    }


    [HttpGet]
    public IQueryable<Customer> CustomersOrderedStartingWith(string companyName) {
      var customers = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith(companyName)).OrderBy(cust => cust.CompanyName);
      var list = customers.ToList();
      return customers;
    }

    [HttpGet]
    public IQueryable<Employee> EmployeesMultipleParams(int employeeID, string city) {
      var emps = ContextProvider.Context.Employees.Where(emp => emp.EmployeeID == employeeID || emp.City.Equals(city));
      return emps;
    }

    [HttpGet]
    public IQueryable<Object> CompanyNames() {
      var stuff = ContextProvider.Context.Customers.Select(c => c.CompanyName);
      return stuff;
    }

    [HttpGet]
    public IQueryable<Object> CompanyNamesAndIds() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID });
      return stuff;
    }

    [HttpGet]
    public IQueryable<Object> CustomersWithBigOrders() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { Customer = c, BigOrders = c.Orders.Where(o => o.Freight > 100) });
      return stuff;
    }



    [HttpGet]
#if NHIBERNATE
    public IQueryable<Object> CompanyInfoAndOrders(ODataQueryOptions options) {
        // Need to handle this specially for NH, to prevent $top being applied to Orders
        var query = ContextProvider.Context.Customers;
        var queryHelper = new NHQueryHelper();

        // apply the $filter, $skip, $top to the query
        var query2 = queryHelper.ApplyQuery(query, options);

        // execute query, then expand the Orders
        var r = query2.Cast<Customer>().ToList();
        NHInitializer.InitializeList(r, "Orders");

        // after all is loaded, create the projection
        var stuff = r.AsQueryable().Select(c => new { c.CompanyName, c.CustomerID, c.Orders });
        queryHelper.ConfigureFormatter(Request, query);
#else
    public IQueryable<Object> CompanyInfoAndOrders() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID, c.Orders });
#endif
      return stuff;
    }

    [HttpGet]
    public Object CustomersAndProducts() {
      var stuff = new { Customers = ContextProvider.Context.Customers.ToList(), Products = ContextProvider.Context.Products.ToList() };
      return stuff;
    }

    [HttpGet]
    public IQueryable<Object> TypeEnvelopes() {
      var stuff = this.GetType().Assembly.GetTypes()
        .Select(t => new { t.Assembly.FullName, t.Name, t.Namespace })
        .AsQueryable();
      return stuff;
    }


    [HttpGet]
    public IQueryable<Customer> CustomersAndOrders() {
      var custs = ContextProvider.Context.Customers.Include("Orders");
      return custs;
    }

    [HttpGet]
    public IQueryable<Order> OrdersAndCustomers() {
      var orders = ContextProvider.Context.Orders.Include("Customer");
      return orders;
    }


    [HttpGet]
    public IQueryable<Customer> CustomersStartingWithA() {
      var custs = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith("A"));
      return custs;
    }

    [HttpGet]
#if NHIBERNATE
    [BreezeNHQueryable]
#else
    [BreezeQueryable]
#endif
    public HttpResponseMessage CustomersAsHRM() {
      var customers = ContextProvider.Context.Customers.Cast<Customer>();
      var response = Request.CreateResponse(HttpStatusCode.OK, customers);
      return response;
    }

    #endregion
  }

#else
  
  [JsonFormatter]
  public class NorthwindIBModelController : ApiController {
  
    NorthwindContextProvider ContextProvider = new NorthwindContextProvider();


    [HttpGet]
    public String Metadata() {
      return ContextProvider.Metadata();
    }

    [HttpPost]
    public SaveResult SaveChanges(JObject saveBundle) {
      var saveOptions = Breeze.WebApi.ContextProvider.ExtractSaveOptions(saveBundle);
      var tag = saveOptions.Tag as String;
      if (tag == "exit") {
        return new SaveResult() { Entities = new List<Object>(), KeyMappings = new List<KeyMapping>() };
      } else {
        return ContextProvider.SaveChanges(saveBundle);
      }
    }

  #region standard queries

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Customer> Customers() {
      var custs = ContextProvider.Context.Customers;
      return custs;
    }

    [HttpGet]
    public IQueryable<Customer> Customers2(ODataQueryOptions oDataQueryOptions) {
      var custs = ContextProvider.Context.Customers;
      var applied = oDataQueryOptions.ApplyTo(custs);
      return (IQueryable<Customer>) applied;
    }


    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Customer> CustomersStartingWith(string companyName) {
      var custs = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith(companyName));
      return custs;
    }

    [HttpGet]
    // [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public Customer CustomerWithScalarResult() {
      return ContextProvider.Context.Customers.First();
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Customer> CustomersWithHttpError() {
      throw new HttpResponseException(HttpStatusCode.NotFound);
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Order> Orders() {
      var orders = ContextProvider.Context.Orders;
      return orders;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Employee> Employees() {
      return ContextProvider.Context.Employees;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Employee> EmployeesFilteredByCountryAndBirthdate(DateTime birthDate, string country) {
      return ContextProvider.Context.Employees.Where(emp => emp.BirthDate >= birthDate && emp.Country == country);
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<OrderDetail> OrderDetails() {
      return ContextProvider.Context.OrderDetails;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Product> Products() {
      return ContextProvider.Context.Products;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Supplier> Suppliers() {
      return ContextProvider.Context.Suppliers;
    }


    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Region> Regions() {
      return ContextProvider.Context.Regions;
    }


    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Territory> Territories() {
      return ContextProvider.Context.Territories;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Category> Categories() {
      return ContextProvider.Context.Categories;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Role> Roles() {
      return ContextProvider.Context.Roles;
    }

#if ! DATABASEFIRST_OLD
    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<TimeLimit> TimeLimits() {
      return ContextProvider.Context.TimeLimits;
    }
#endif
  #endregion

  #region named queries

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Object> CompanyNames() {
      var stuff = ContextProvider.Context.Customers.Select(c => c.CompanyName);
      return stuff;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Object> CompanyNamesAndIds() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID });
      return stuff;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Object> CustomersWithBigOrders() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { Customer = c, BigOrders = c.Orders.Where(o => o.Freight > 100) });
      return stuff;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Object> CompanyInfoAndOrders() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID, c.Orders });
      return stuff;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Object> TypeEnvelopes() {
      var stuff = this.GetType().Assembly.GetTypes()
                      .Select(t => new {t.Assembly.FullName, t.Name, t.Namespace}).ToList();

      return stuff.AsQueryable();
    }
    
    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Customer> CustomersAndOrders() {
      var custs = ContextProvider.Context.Customers.Include("Orders");
      return custs;
    }

    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Order> OrdersAndCustomers() {
      var orders = ContextProvider.Context.Orders.Include("Customer");
      return orders;
    }
    
    [HttpGet]
    [BreezeQueryable(AllowedQueryOptions = AllowedQueryOptions.All)]
    public IQueryable<Customer> CustomersStartingWithA() {
      var custs = ContextProvider.Context.Customers.Where(c => c.CompanyName.StartsWith("A"));
      return custs;
    }


  #endregion
  }

#endif

}