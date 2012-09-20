namespace Breeze.Learn.Helpers {
    using System.IO;
    using System.Web;
    using Newtonsoft.Json;

    public static class JsonHelpers {
        public static IHtmlString ToJsonObject(this object obj) {
            if(obj == null) {
                return new HtmlString("null");
            }

            var sw = new StringWriter();

            var serializer = new JsonSerializer();

            serializer.Serialize(sw, obj);

            return new HtmlString(sw.GetStringBuilder().ToString());
        }
    }
}