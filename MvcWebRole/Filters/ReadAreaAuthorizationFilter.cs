using FundEntities;
using MvcWebRole.Controllers;
using MongoRepository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Http;
using System.Web.Http.Filters;

namespace MvcWebRole.Filters
{
    public class ReadAreaAuthorizationFilter : AccessAreaAuthorizationFilter
    {
        protected override bool IsAuthorized(System.Web.Http.Controllers.HttpActionContext actionContext)
        {
            // Run base method to handle Users and Roles filter parameters.
            if (!base.IsAuthorized(actionContext))
            {
                return false;
            }

            // Grab the areaId from the request.
            var areaId = HttpContext.Current.Request.QueryString.GetValues("id")[0];

            return this.IsAuthorizedToAccessArea(areaId);
        }
    }
}