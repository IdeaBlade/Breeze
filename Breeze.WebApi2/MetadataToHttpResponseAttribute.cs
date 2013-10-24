using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Web.Http.Filters;

namespace Breeze.WebApi2 {
  /// <summary>
  /// Converts output of a method named "Metadata" that returns a string
  /// into an HttpResponse with string content.
  /// </summary>
  [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
  public class MetadataToHttpResponseAttribute : ActionFilterAttribute {

    /// <summary>
    /// Called when the action is executed.
    /// </summary>
    /// <param name="actionExecutedContext">The action executed context.</param>
    public override void OnActionExecuted(HttpActionExecutedContext actionExecutedContext) {

      base.OnActionExecuted(actionExecutedContext);
      var response = actionExecutedContext.Response;
      if (response == null || !response.IsSuccessStatusCode) {
        return;
      }
      var actionContext = actionExecutedContext.ActionContext;
      var actionDescriptor = actionContext.ActionDescriptor;

      if (actionDescriptor.ReturnType == typeof(string) &&
          (actionDescriptor.ActionName == "Metadata" ||
        // or attribute applied directly to the method
          0 < actionDescriptor.GetCustomAttributes<MetadataToHttpResponseAttribute>().Count)) {
        string contentValue;
        if (response.TryGetContentValue(out contentValue)) {
          var newResponse = new HttpResponseMessage { Content = new StringContent(contentValue) };
          newResponse.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
          actionContext.Response = newResponse;
        }
      }
    }
  }
}