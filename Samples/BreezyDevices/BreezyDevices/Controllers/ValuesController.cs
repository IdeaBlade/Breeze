using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace BreezyDevices.Controllers
{
  public class ValuesController : ApiController
  {
 
    public IEnumerable<string> Get()
    {
      return new string[] { "value1", "value2" };
    }

    
    public string Get(int id)
    {
      return "value";
    }

    
    public void Post([FromBody]string value)
    {
    }

    // PUT api/values/5
    public void Put(int id, [FromBody]string value)
    {
    }

    // DELETE api/values/5
    public void Delete(int id)
    {
    }
  }
}