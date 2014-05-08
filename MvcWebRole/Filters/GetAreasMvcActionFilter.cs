using FundEntities;
using MongoRepository;
using MvcWebRole.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace MvcWebRole.Filters
{
    public class GetAreasMvcActionFilter : ActionFilterAttribute
    {
        public override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            var areaRepository = new MongoRepository<Area>();
            var areaList = new HashSet<string>();

            foreach (var area in areaRepository)
            {
                foreach (var role in RoleValidator.GetAuthorizedRolesForArea(area))
                {
                    if (HttpContext.Current.User.IsInRole(role))
                    {
                        areaList.Add(area.Id);
                        break;
                    }
                }
            }

            filterContext.ActionParameters["accessibleAreas"] = areaList;
        }
    }
}