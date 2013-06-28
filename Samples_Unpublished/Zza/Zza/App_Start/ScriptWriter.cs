using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Web.Hosting;
using Zza.DataAccess.EF;

namespace Zza.App_Start
{
    /// <summary>
    /// Creates and saves JSON metadata as JavaScript file(s).
    /// </summary>
    public static class ScriptWriter
    {
        const string jsNamespace = "zza";
        const string defaultPrefix = "var " + jsNamespace + "=" + jsNamespace + "||{};";
        const string defaultPostfix = ";";

        /// <summary>
        /// Save metadata to a script file
        /// Certain tests will load this script dynamically so they can get metadata
        /// without making a Web API call
        /// </summary>
        public static void WriteMetadataFile()
        {
            var metadata = new ZzaRepository().Metadata;
            var scriptFilename = HostingEnvironment.MapPath("~/app/metadata.js");
            WriteFile(scriptFilename, metadata);
        }

        public static void WriteFile(string filename, string body, 
            string prefix=null, string postfix=null)
        {
            prefix = prefix ?? 
                defaultPrefix+jsNamespace+"."+ PropertyNameFromFileName(filename)+"=";
            postfix = postfix ?? defaultPostfix;

            using (var writer = new StreamWriter(filename))
            {
                writer.WriteLine(prefix + body + postfix);
            }
        }

        internal static string PropertyNameFromFileName(string filename )
        {
            // regex looking for trailing filename like "metadata.js"
            var re = new Regex(@"([a-zA-Z0-9]*)[\.\w]*$");
            var m = re.Match(filename);
            if (m.Success)
            {
                return m.Groups[1].Value;
            }
            throw new ArgumentException(
                "Couldn't extract filename property from "+filename);    
        }

    }
}
