using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using System.Web.Http.OData.Builder;
using Microsoft.Data.Edm.Csdl;
using Breeze.WebApi2;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sample_WebApi2.Models;
using Microsoft.Data.Edm.Validation;
using System.Xml;
using System.IO;
using System.Xml.Linq;
using System.Web;

namespace Sample_WebApi2.Controllers {


  //public class MetadataTestProvider  : ContextProvider {
    
    


  //}

  [BreezeController]
  public class MetadataTestController : ApiController {


    [HttpGet]
    public String Metadata() {
      var folder = Path.Combine(HttpRuntime.AppDomainAppPath, "App_Data");
      var fileName = Path.Combine(folder, "metadataTest.json");
      var jsonMetadata = File.ReadAllText(fileName);
      return jsonMetadata;
    }
    
  }

  

}