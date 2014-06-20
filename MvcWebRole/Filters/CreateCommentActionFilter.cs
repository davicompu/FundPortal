using FundEntities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace MvcWebRole.Filters
{
    public class CreateCommentActionFilter : ActionFilterAttribute
    {
        public override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            // Grab the arguments from the request.
            var comment = (Comment)filterContext.ActionParameters["comment"];

            comment.DateTimeCreated = new DateTimeOffset(DateTime.UtcNow);
        }
    }
}