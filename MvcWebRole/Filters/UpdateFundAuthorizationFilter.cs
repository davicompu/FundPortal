using FundEntities;
using MvcWebRole.Controllers;
using MvcWebRole.Extensions;
using MongoRepository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Http;

namespace MvcWebRole.Filters
{
    /// <summary>
    /// Authorizes a user to modify a fund.
    /// </summary>
    public class UpdateFundActionFilter : AccessAreaActionFilter
    {
        public override void OnActionExecuting(System.Web.Http.Controllers.HttpActionContext actionContext)
        {
            // Grab the arguments from the request.
            var id = (string)actionContext.ActionArguments["id"];
            var fundData = (Fund)actionContext.ActionArguments["fund"];

            // Ensure the user has not mismatched the Id property.
            if (id != fundData.Id)
            {
                throw new HttpException(400, "BadRequest: Data does not match item associated with request id.");
            }

            var fundRepository = new MongoRepository<Fund>();
            var fund = fundRepository.GetById(id);

            // Ensure the fund exists.
            if (fund == null)
            {
                throw new HttpException(404, "NotFound. The requested fund does not exist.");
            }

            // Ensure the user has not mismatched the AreaId property.
            if (fundData.AreaId != fund.AreaId)
            {
                throw new HttpException(400, "BadRequest: Data does not match item associated with request id.");
            }

            if (!this.IsAuthorizedToAccessArea(fund.AreaId))
            {
                throw new HttpException(401, "Unauthorized. You are not authorized to access this area.");
            }
        }
    }
}