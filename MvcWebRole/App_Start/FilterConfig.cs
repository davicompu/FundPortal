using System.Web;
using System.Web.Mvc;

namespace MvcWebRole
{
    public class FilterConfig
    {
        public static void RegisterGlobalFilters(GlobalFilterCollection filters)
        {
            filters.Add(new HandleErrorAttribute());

            // Force requests to use Https.
            filters.Add(new RequireHttpsAttribute());

            // Force requests into role authorization pipeline.
            filters.Add(new AuthorizeAttribute());
        }
    }
}