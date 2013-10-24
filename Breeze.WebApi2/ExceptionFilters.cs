using System;
using System.Collections.Generic;
using System.Linq;

using System.Net;
using System.Net.Http;
using System.Web.Http.Filters;

using Breeze.ContextProvider;

namespace Breeze.WebApi2 {

    public class EntityErrorsFilterAttribute : ExceptionFilterAttribute {

        public override void OnException(HttpActionExecutedContext context) {
            if (context.Exception is EntityErrorsException) {
                var e = (EntityErrorsException)context.Exception;
                var error = new SaveError(e.EntityErrors);
                var resp = new HttpResponseMessage(e.StatusCode) {
                  Content = new ObjectContent(typeof(SaveError), error, JsonFormatter.Create()),
                  ReasonPhrase = e.Message ?? "Entity Errors exception"
                };
                context.Response = resp;
            }
        }
    }



    // Example code
    //public class NotImplExceptionFilterAttribute : ExceptionFilterAttribute {
    //    public override void OnException(HttpActionExecutedContext context) {
    //        if (context.Exception is NotImplementedException) {
    //            context.Response = new HttpResponseMessage(HttpStatusCode.NotImplemented);
    //        }
    //    }
    //}
    
}
