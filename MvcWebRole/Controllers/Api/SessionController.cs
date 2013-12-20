using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace MvcWebRole.Controllers
{
    public class SessionController : ApiController
    {
        [HttpGet]
        public HttpResponseMessage Extend()
        {
            return Request.CreateResponse(HttpStatusCode.NoContent, "application/json");
        }
    }
}
