using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using FundEntities;
using MongoRepository;

namespace MvcWebRole.Controllers
{
    // TODO: Verify access to area.
    public class AreaController : ApiController
    {
        private MongoRepository<Area> repository = new MongoRepository<Area>();
        // GET api/area
        public HttpResponseMessage Get()
        {
            var areas = repository;

            return Request.CreateResponse<IEnumerable<Area>>(HttpStatusCode.OK, areas);
        }

        // GET api/area/5
        public HttpResponseMessage Get(string id)
        {
            var area = repository.GetById(id);

            if (area != null)
            {
                return Request.CreateResponse<Area>(HttpStatusCode.OK, area);
            }
            throw new HttpResponseException(HttpStatusCode.NotFound);
        }

        // POST api/area
        public HttpResponseMessage Post([FromBody]Area area)
        {
            var newArea = repository.Add(area);

            return Request.CreateResponse<Area>(HttpStatusCode.Created, newArea);
        }

        // PUT api/area/5
        public HttpResponseMessage Put(string id, [FromBody]Area area)
        {
            area.Id = id;
            var updatedArea = repository.Update(area);

            return Request.CreateResponse<Area>(HttpStatusCode.OK, updatedArea);
        }

        // DELETE api/area/5
        public HttpResponseMessage Delete(string id)
        {
            repository.Delete(id);

            return Request.CreateResponse(HttpStatusCode.NoContent, "application/json");
        }

        #region Helpers
        public bool CanAccessArea(Area area)
        {
            string role = "CanEdit" + area.Number;

            if (User.IsInRole(role))
            {
                return true;
            }

            return false;
        }
        #endregion
    }
}
