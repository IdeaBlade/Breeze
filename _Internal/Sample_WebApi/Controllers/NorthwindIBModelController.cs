// Only one of the next 4 should be uncommented.
//#define CODEFIRST_PROVIDER
//#define DATABASEFIRST_OLD
#define DATABASEFIRST_NEW
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
#elif NHIBERNATE
  public class NorthwindContextProvider : NorthwindContext {
    

#endif

    protected override bool BeforeSaveEntity(EntityInfo entityInfo) {
      // prohibit any additions of entities of type 'Region'

      if (entityInfo.Entity.GetType() == typeof(Region) && entityInfo.EntityState == EntityState.Added) {
        var region = entityInfo.Entity as Region;
        if (region.RegionDescription.ToLowerInvariant().StartsWith("error")) return false;
      }
      return base.BeforeSaveEntity(entityInfo);
    }

    protected override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {
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

#if NHIBERNATE
    protected override void Initialize(System.Web.Http.Controllers.HttpControllerContext controllerContext)
    {
        base.Initialize(controllerContext);
        // BreezeNHQueryableAttribute needs the session
        BreezeNHQueryableAttribute.SetSession(Request, ContextProvider.Session);
    }
#endif
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
    public SaveResult SaveWithComment(JObject saveBundle) {
      ContextProvider.BeforeSaveEntitiesDelegate = AddComment;
      return ContextProvider.SaveChanges(saveBundle);
    }


    [HttpPost]
    public SaveResult SaveWithExit(JObject saveBundle) {
        return new SaveResult() { Entities = new List<Object>(), KeyMappings = new List<KeyMapping>() };
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

    private Dictionary<Type, List<EntityInfo>> CheckFreightOnOrders(Dictionary<Type, List<EntityInfo>> saveMap) {
      List<EntityInfo> entityInfos;
      if (saveMap.TryGetValue(typeof(Order), out entityInfos)) {
        foreach (var entityInfo in entityInfos) {
          CheckFreight(entityInfo);
        }  
      }
      
      return saveMap;
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


    #region standard queries

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
      return ContextProvider.Context.Customers.GroupBy(c => c.Country).Select(g => new {g.Key, Count = g.Count()});
    }
    

    [HttpGet]
    public Customer CustomerWithScalarResult() {
      return ContextProvider.Context.Customers.First();
    }

    [HttpGet]
    public IQueryable<Customer> CustomersWithHttpError() {
      throw new HttpResponseException(HttpStatusCode.NotFound);
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
    public Object Lookups()
    {
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
    public IQueryable<Object> CompanyInfoAndOrders() {
      var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID, c.Orders });
      return stuff;
    }

    [HttpGet]
    public Object CustomersAndProducts() {
      var stuff = new {Customers = ContextProvider.Context.Customers.ToList(), Products = ContextProvider.Context.Products.ToList()};
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