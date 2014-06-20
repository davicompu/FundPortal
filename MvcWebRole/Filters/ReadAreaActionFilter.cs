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
    public class ReadAreaActionFilter : AccessAreaActionFilter
    {
        public override void OnActionExecuting(System.Web.Http.Controllers.HttpActionContext actionContext)
        {
            // Grab the areaId from the request.
            var areaId = HttpContext.Current.Request.QueryString.GetValues("id")[0];

            if (!this.IsAuthorizedToAccessArea(areaId))
            {
                throw new HttpException(401, "Unauthorized. You are not authorized to access this area.");
            }
        }
    }
}