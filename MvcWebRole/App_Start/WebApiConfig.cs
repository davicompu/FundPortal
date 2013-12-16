using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using MvcWebRole.Filters;

namespace MvcWebRole
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            config.Routes.MapHttpRoute(
                name: "DefaultApi",
              routeTemplate: "api/{controller}/{action}/{id}",
                defaults: new { id = RouteParameter.Optional }
            );

            // Validate request against model attributes by default
            config.Filters.Add(new ValidateModelAttribute());

            // TODO: Force requests to use Https.
            config.Filters.Add(new RequireHttpsAttributeWebApi());

            // TODO: Force requests into role authorization pipeline.
            config.Filters.Add(new AuthorizeAttribute());

            // Default responses to JSON
            var appXmlType = config.Formatters.XmlFormatter.SupportedMediaTypes.FirstOrDefault(t => t.MediaType == "application/xml");
            config.Formatters.XmlFormatter.SupportedMediaTypes.Remove(appXmlType);
        }
    }
}