using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Breeze.WebApi
{
    /// <summary>
    /// Global message handler for CORS support (Development Only)
    /// </summary>
    /// <remarks>
    /// Simple-minded, allow-everything, Web API message handler
    /// for CORS (Cross-origin resource sharing)
    /// http://en.wikipedia.org/wiki/Cross-origin_resource_sharing
    /// Accepts any request for any action from any site
    /// Warning: Do not use for production code. Use as inspiration for a
    /// solution that is consistent with your security requirements.
    /// Code copied with minor changes from 
    /// http://blog.bittercoder.com/2012/09/09/cors-and-webapi/
    /// Install early in Web Api Pipeline, 
    /// perhaps in Global.asax or BreezeWebApiConfig
    /// Set "runaAllManagedModulesForAllRequests" in Web.config for < IIS 8    
    /// </remarks>
    /// <example>
    /// // In Global.asax
    /// protected void Application_Start()
    /// {
    ///     ...
    ///     GlobalConfiguration.Configuration.MessageHandlers.Add(new BreezeSimpleCorsHandler());
    ///     ...
    /// }
    /// 
    /// // In BreezeWebApiConfig
    /// public static void RegisterBreezePreStart() {
    ///   ...
    ///   GlobalConfiguration.Configuration.MessageHandlers.Add(new BreezeSimpleCorsHandler());
    ///   ...
    /// }
    /// </example>
    public class BreezeSimpleCorsHandler : DelegatingHandler
    {
        const string Origin = "Origin";
        const string AccessControlRequestMethod = "Access-Control-Request-Method";
        const string AccessControlRequestHeaders = "Access-Control-Request-Headers";
        const string AccessControlAllowOrigin = "Access-Control-Allow-Origin";
        const string AccessControlAllowMethods = "Access-Control-Allow-Methods";
        const string AccessControlAllowHeaders = "Access-Control-Allow-Headers";
        const string AccessControlAllowCredentials = "Access-Control-Allow-Credentials";

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var isCorsRequest = request.Headers.Contains(Origin);
            var isPreflightRequest = request.Method == HttpMethod.Options;
            if (isCorsRequest)
            {
                if (isPreflightRequest)
                {
                    var response = new HttpResponseMessage(HttpStatusCode.OK);
                    response.Headers.Add(AccessControlAllowOrigin,
                      request.Headers.GetValues(Origin).First());

                    var accessControlRequestMethod =
                      request.Headers.GetValues(AccessControlRequestMethod).FirstOrDefault();

                    if (accessControlRequestMethod != null)
                    {
                        response.Headers.Add(AccessControlAllowMethods, accessControlRequestMethod);
                    }

                    var requestedHeaders = string.Join(", ",
                       request.Headers.GetValues(AccessControlRequestHeaders));

                    if (!string.IsNullOrEmpty(requestedHeaders))
                    {
                        response.Headers.Add(AccessControlAllowHeaders, requestedHeaders);
                    }

                    response.Headers.Add(AccessControlAllowCredentials, "true");

                    var tcs = new TaskCompletionSource<HttpResponseMessage>();
                    tcs.SetResult(response);
                    return tcs.Task;
                }
                return base.SendAsync(request, cancellationToken).ContinueWith(t =>
                    {
                        var resp = t.Result;
                        resp.Headers.Add(AccessControlAllowOrigin, request.Headers.GetValues(Origin).First());
                        resp.Headers.Add(AccessControlAllowCredentials, "true");
                        return resp;
                    });
            }
            return base.SendAsync(request, cancellationToken);
        }
    }
}