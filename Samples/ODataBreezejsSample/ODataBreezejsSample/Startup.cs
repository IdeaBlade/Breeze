using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(ODataBreezejsSample.Startup))]
namespace ODataBreezejsSample
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);
        }
    }
}
