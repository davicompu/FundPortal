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
    public class FundController : ApiController
    {
        private MongoRepository<Fund> repository = new MongoRepository<Fund>();

        // GET api/fund
        public HttpResponseMessage Get()
        {
            var funds = repository;

            return Request.CreateResponse<IEnumerable<Fund>>(HttpStatusCode.OK, funds);
        }

        // GET api/fund/5
        public HttpResponseMessage Get(string id)
        {
            var fund = repository.GetById(id);

            return Request.CreateResponse<Fund>(HttpStatusCode.OK, fund);
        }

        // GET api/fund/getbyarea
        public HttpResponseMessage GetByArea(string areaId)
        {
            // TODO: Verify access to area.
            var funds = repository
                .Where(f => f.AreaId == areaId);

            return Request.CreateResponse<IEnumerable<Fund>>(HttpStatusCode.OK, funds);
        }

        // POST api/fund
        public HttpResponseMessage Post([FromBody]Fund fund)
        {
            fund.DateTimeCreated = new DateTimeOffset(DateTime.UtcNow);
            var newFund = repository.Add(fund);

            return Request.CreateResponse<Fund>(HttpStatusCode.Created, newFund);
        }

        // PUT api/fund/5
        public HttpResponseMessage Put(string id, [FromBody]Fund fund)
        {
            fund.Id = id;
            fund.DateTimeEdited.Add(new DateTimeOffset(DateTime.UtcNow));
            var updatedFund = repository.Update(fund);

            return Request.CreateResponse<Fund>(HttpStatusCode.OK, updatedFund);
        }

        // DELETE api/fund/5
        public HttpResponseMessage Delete(string id)
        {
            repository.Delete(id);

            return Request.CreateResponse(HttpStatusCode.NoContent, "application/json");
        }
    }
}
