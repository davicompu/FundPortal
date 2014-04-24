using FundEntities;
using MongoRepository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;

namespace MvcWebRole.Filters
{
    public class CreateFundAuthorizationFilter : AccessAreaAuthorizationFilter
    {
        protected override bool IsAuthorized(System.Web.Http.Controllers.HttpActionContext actionContext)
        {
            // Run base method to handle Users and Roles filter parameters.
            if (!base.IsAuthorized(actionContext))
            {
                return false;
            }

            // Grab the fund and its associated areaId from the request.
            var fund = (Fund)actionContext.ActionArguments["fund"];
            var areaId = fund.AreaId;

            return this.IsAuthorizedToAccessArea(areaId);
        }
    }
}