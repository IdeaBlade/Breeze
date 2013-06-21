using System.IO;
using System.Web.Hosting;
using Zza.DataAccess.EF;

namespace Zza.App_Start
{
    /// <summary>
    /// Creates and saves JSON metadata as JavaScript file(s).
    /// </summary>
    public static class MetadataScriptWriter
    {
        /// <summary>
        /// Save metadata to a script file
        /// Certain tests will load this script dynamically so they can get metadata
        /// without making a Web API call
        /// </summary>
        public static void WriteFile()
        {
            var metadata = new ZzaRepository().Metadata;
            var scriptFilename = HostingEnvironment.MapPath("~/app/metadata.js");
            const string prefix = "var zza=zza||{};zza.metadata = ";
            const string postfix = ";";

            using (var writer = new StreamWriter(scriptFilename))
            {
                writer.WriteLine(prefix + metadata + postfix);
            }
        }
    }
}
