using System;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Zza.DataAccess.EF;

namespace Zza.Controllers 
{
    [BreezeController]
    public class DevController : ApiController
    {
        public DevController() {
            _repository = new DevRepository();
        }

        protected override void Initialize(System.Web.Http.Controllers.HttpControllerContext controllerContext)
        {
            Request = controllerContext.Request;// HUH? Why necessary?
            _repository.UserStoreId = GetUserStoreId();
        }

        // ~/breeze/ZzaEf/reset - clears the current user's changes
        // ~/breeze/ZzaEf/reset/?options=fullreset - clear out all user changes; back to base state.
        [HttpPost]
        public string Reset(string options = "")
        {
            return _repository.Reset(options);
        }

        /// <summary>
        /// Get the repository UserStoreId from the current request
        /// </summary>
        private Guid GetUserStoreId()
        {
            try {
                var id = Request.Headers.GetValues("X-UserSessionId").First();
                return Guid.Parse(id);
            } catch {
                return Guid.Empty;
            }
        }

        private readonly DevRepository _repository;
    }
}