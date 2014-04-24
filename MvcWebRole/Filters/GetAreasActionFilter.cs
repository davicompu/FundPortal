using FundEntities;
using MvcWebRole.Extensions;
using MongoRepository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http.Filters;

namespace MvcWebRole.Filters
{
    public class GetAreasActionFilter : ActionFilterAttribute
    {
        public override void OnActionExecuting(System.Web.Http.Controllers.HttpActionContext actionContext)
        {
            var areaRepository = new MongoRepository<Area>();
            var areaList = new List<Area>();

            foreach (var area in areaRepository)
            {
                foreach (var role in RoleValidator.GetAuthorizedRolesForArea(area))
                {
                    if (HttpContext.Current.User.IsInRole(role))
                    {
                        areaList.Add(area);
                        break;
                    }
                }
            }
            actionContext.Request.Properties["AreaList"] = areaList;
        }
    }
}