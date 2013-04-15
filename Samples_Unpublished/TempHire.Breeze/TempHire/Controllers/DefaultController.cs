using System.Web.Http;
using Breeze.WebApi;
using DomainModel;

namespace TempHire.Controllers
{
    [BreezeController]
    [Authorize]
    public class DefaultController : ApiController
    {
        // ~/api/Metadata
        [HttpGet]
        public string Metadata()
        {
            return new EFContextProvider<TempHireDbContext>().Metadata();
        }
    }
}