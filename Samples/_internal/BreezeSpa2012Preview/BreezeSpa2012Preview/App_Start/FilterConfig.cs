using System.Web;
using System.Web.Mvc;

namespace BreezeSpa2012Preview
{
    public class FilterConfig
    {
        public static void RegisterGlobalFilters(GlobalFilterCollection filters)
        {
            filters.Add(new HandleErrorAttribute());
        }
    }
}