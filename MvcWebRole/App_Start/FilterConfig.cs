using System.Web;
using System.Web.Mvc;

namespace MvcWebRole
{
    public class FilterConfig
    {
        public static void RegisterGlobalFilters(GlobalFilterCollection filters)
        {
            filters.Add(new HandleErrorAttribute());

            // TODO: Force requests to use Https.
            //filters.Add(new RequireHttpsAttribute());

            // TODO: Force requests into role authorization pipeline.
            //filters.Add(new AuthorizeAttribute());
        }
    }
}