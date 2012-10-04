using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;

namespace BreezyDevices.App_Start
{
  public class BreezeConfig
  {
    public static void RegisterBreeze()
    {
      // Use breeze config of Json.Net JsonFormatter instead of the default
      GlobalConfiguration.Configuration.Formatters.Insert(
          0, Breeze.WebApi.JsonFormatter.Create());

      // Apply query parameters, expressed as OData URI query strings, 
      // to results of Web API controller methods that return IQueryable<T>
      GlobalConfiguration.Configuration.Filters.Add(
          new Breeze.WebApi.ODataActionFilter());

    }
  }
}