using FundEntities;
using MvcWebRole.Filters;
using MongoRepository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;

namespace MvcWebRole.Controllers
{
    public class AreaController : ApiController
    {
        private MongoRepository<Area> repository = new MongoRepository<Area>();

        // GET api/area
        [GetAreasActionFilter]
        public HttpResponseMessage Get()
        {
            var areas = (List<Area>)Request.Properties["AreaList"];
            return Request.CreateResponse<IEnumerable<Area>>(HttpStatusCode.OK, areas);
        }

        // GET api/area/5
        [ReadAreaAuthorizationFilter]
        public HttpResponseMessage Get(string id)
        {
            var area = (Area)HttpContext.Current.Items["area"];

            if (area != null)
            {
                return Request.CreateResponse<Area>(HttpStatusCode.OK, area);
            }
            return Request.CreateErrorResponse(HttpStatusCode.NotFound, "The item you requested was not found.");
        }

        // POST api/area
        [Authorize(Roles = "MANAGE-AREAS")]
        public HttpResponseMessage Post([FromBody]Area area)
        {
            var newArea = repository.Add(area);

            return Request.CreateResponse<Area>(HttpStatusCode.Created, newArea);
        }

        // PUT api/area/5
        [Authorize(Roles = "MANAGE-AREAS")]
        public HttpResponseMessage Put(string id, [FromBody]Area area)
        {
            area.Id = id;
            var updatedArea = repository.Update(area);

            return Request.CreateResponse<Area>(HttpStatusCode.OK, updatedArea);
        }

        // DELETE api/area/5
        [Authorize(Roles = "MANAGE-AREAS")]
        public HttpResponseMessage Delete(string id)
        {
            repository.Delete(id);

            return Request.CreateResponse(HttpStatusCode.NoContent, "application/json");
        }
    }
}
