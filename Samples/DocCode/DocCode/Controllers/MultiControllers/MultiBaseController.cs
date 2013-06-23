using System;
using System.Linq;
using System.Web.Http;
using System.Web.Http.Controllers;
using DocCode.DataAccess;

namespace DocCode.Controllers.MultiControllers
{
    /// <summary>
    /// Base class for controllers of the "Multiple Controllers" example
    /// </summary>
    /// <remarks>
    /// The all share the same metadata and repository.
    /// </remarks>
    public abstract class MultiBaseController : ApiController
    {

        protected MultiBaseController() : this(null){}

        // Todo: inject via an interface rather than "new" the concrete class
        protected MultiBaseController(NorthwindRepository repository)
        {         
            Repository = repository ?? new NorthwindRepository();
        }

        protected NorthwindRepository Repository { get; private set; }

        protected override void Initialize(HttpControllerContext controllerContext)
        {
            base.Initialize(controllerContext);
            Repository.UserSessionId = getUserSessionId();
        }

        /// <summary>
        /// Get the UserSessionId from value in the request header
        /// </summary>
        private Guid getUserSessionId()
        {
            try
            {
                var id = Request.Headers.GetValues("X-UserSessionId").First();
                return Guid.Parse(id);
            }
            catch
            {
                return Guid.Empty;
            }
        }
    }
}