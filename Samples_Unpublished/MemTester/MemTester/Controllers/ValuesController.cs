using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace MemTester.Controllers {
  public class ValuesController : ApiController {
    // GET breeze/values
    public IEnumerable<string> Get() {
      return new string[] { "value1", "value2" };
    }

    // GET breeze/values/5
    public string Get(int id) {
      return "value";
    }

    // POST breeze/values
    public void Post([FromBody]string value) {
    }

    // PUT breeze/values/5
    public void Put(int id, [FromBody]string value) {
    }

    // DELETE breeze/values/5
    public void Delete(int id) {
    }
  }
}