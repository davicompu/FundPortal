using FundEntities;
using MvcWebRole.Controllers;
using MongoRepository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;

namespace MvcWebRole.Filters
{
    public class ReadFundActionFilter : AccessAreaActionFilter
    {
        public override void OnActionExecuting(System.Web.Http.Controllers.HttpActionContext actionContext)
        {
            // Run base method to handle Users and Roles filter parameters.
            // Grab the fundId from the request.
            var fundId = actionContext.ControllerContext.RouteData.Values["id"].ToString();

            // Query for the fund.
            var fundRepository = new MongoRepository<Fund>();
            var fund = fundRepository.GetById(fundId);

            // Ensure the supplied fund exists.
            if (fund == null)
            {
                throw new HttpException(404, "NotFound");
            }

            if (this.IsAuthorizedToAccessArea(fund.AreaId))
            {
                // Add the fund to the Items dictionary to avoid duplicating the query.
                HttpContext.Current.Items["fund"] = fund;
            }
            else
            {
                throw new HttpException(401, "Unauthorized. You are not authorized to access this area.");
            }
        }
    }
}