using System.Web.Http;
using Breeze.WebApi2;
using DocCode.DataAccess;

namespace DocCode.Controllers
{
    /// <summary>
    /// A controller whose only job is to return metadata about the FooBar model
    /// </summary>
    [BreezeController]
    public class FoosMetadataController : ApiController
    {
        // ~/breeze/FoosMetadata/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return FoosMetadataProvider.Metadata;
        }
    }
}