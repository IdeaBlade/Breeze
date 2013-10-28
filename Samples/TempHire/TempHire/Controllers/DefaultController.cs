using System.Web.Http;
using Breeze.ContextProvider.EF6;
using Breeze.WebApi2;

using DomainModel;

namespace TempHire.Controllers
{
    [BreezeController]
    [Authorize]
    public class DefaultController : ApiController
    {
        // ~/breeze/Metadata
        [HttpGet]
        public string Metadata()
        {
            return new EFContextProvider<TempHireDbContext>().Metadata();
        }
    }
}