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
            var areaAccessList = GetAreaAccessForCurrentUser();

            var areas = repository
                .Where(a => areaAccessList.Contains(a.Id))
                .OrderBy(a => a.Number);

            return Request.CreateResponse<IEnumerable<Area>>(HttpStatusCode.OK, areas);
        }

        // GET api/area/5
        public HttpResponseMessage Get(string id)
        {
            var area = repository.GetById(id);

            if (area != null)
            {
                if (CanAccessArea(area))
                {
                    return Request.CreateResponse<Area>(HttpStatusCode.OK, area);
                }
                else
                {
                    throw new HttpResponseException(HttpStatusCode.Unauthorized);
                }
            }
            throw new HttpResponseException(HttpStatusCode.NotFound);
        }

        #region Helpers
        public bool CanAccessArea(Area area)
        {
            string role = "EDIT-" + area.Number;

            if (User.IsInRole(role))
            {
                return true;
            }

            return false;
        }

        public HashSet<string> GetAreaAccessForCurrentUser()
        {
            var areaAccessList = new HashSet<string>();

            foreach (var area in repository)
            {
                if (CanAccessArea(area))
                {
                    areaAccessList.Add(area.Id);
                }
            }
            return areaAccessList;
        }
        #endregion
    }
}
