using FundEntities;
using MongoRepository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;

namespace MvcWebRole.Filters
{
    public class CreateFundActionFilter : AccessAreaActionFilter
    {
        public override void OnActionExecuting(System.Web.Http.Controllers.HttpActionContext actionContext)
        {
            // Grab the fund and its associated areaId from the request.
            var fund = (Fund)actionContext.ActionArguments["fund"];
            var areaId = fund.AreaId;

            if(!this.IsAuthorizedToAccessArea(areaId))
            {
                throw new HttpException(401, "Unauthorized. You are not authorized to access this area.");
            }
        }
    }
}