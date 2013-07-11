using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using System.Web.Http.OData.Builder;
using Microsoft.Data.Edm.Csdl;
using Breeze.WebApi;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sample_WebApi.Models;
using Microsoft.Data.Edm.Validation;
using System.Data;
using System.Xml;
using System.IO;
using System.Xml.Linq;

namespace Sample_WebApi.Controllers {


  public class NonEFContextProvider  : ContextProvider {
    
    public NonEFModelContext Context = new NonEFModelContext();


    protected override bool BeforeSaveEntity(EntityInfo entityInfo) {
        return true;
    }

    protected override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {
      return saveMap;
    }

    protected override IDbConnection GetDbConnection() { return null;  }

    protected override void OpenDbConnection() { }

    protected override void CloseDbConnection() { }
   

    protected override string BuildJsonMetadata() {
      return null;
      //var mb = new ODataConventionModelBuilder();
      //mb.EntitySet<Person>("Persons");
      //mb.EntitySet<Meal>("Meals");
      //// mb.Entity<Person>().HasKe
      //var edmModel = mb.GetEdmModel();
      //IEnumerable<EdmError> errors;
      //String csdl;
      //using (var swriter = new StringWriter()) {
      //  using (var xwriter = new XmlTextWriter(swriter)) {
      //    // edmModel.TryWriteCsdl(xwriter, out errors);
      //    // CsdlWriter.TryWriteCsdl(edmModel, xwriter, out errors);
      //    EdmxWriter.TryWriteEdmx(edmModel, xwriter, EdmxTarget.OData, out errors);
      //    csdl = swriter.ToString();
          
      //  }
      //}
      //var xele = XElement.Parse(csdl);
      //var ns = xele.Name.Namespace;
      //var dataServicesEle = xele.Descendants(ns + "DataServices").First();
      //var xDoc = XDocument.Load(dataServicesEle.CreateReader());
      //var json = ContextProvider.CsdlToJson(xDoc);
      //return json;
    }

    protected override List<KeyMapping> SaveChangesCore(Dictionary<Type, List<EntityInfo>> saveMap) {
      throw new NotImplementedException();
    }
  }

  [BreezeController]
  public class NonEFModelController : ApiController {


    NonEFContextProvider ContextProvider = new NonEFContextProvider();


    [HttpGet]
    public String Metadata() {
      return ContextProvider.Metadata();
    }

    [HttpPost]
    public SaveResult SaveChanges(JObject saveBundle) {
      return ContextProvider.SaveChanges(saveBundle);
    }

    #region standard queries

    [HttpGet]
    public IQueryable<Person> Persons() {
      var custs = ContextProvider.Context.Persons;
      return custs;
    }

    [HttpGet]
    public IQueryable<Meal> Meals() {
      var orders = ContextProvider.Context.Meals;
      return orders;
    }
    
    
    #endregion

    #region named queries

    #endregion
  }

  

}