using FundEntities;
using MvcWebRole.Filters;
using MongoDB.Bson;
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
    public class FundController : ApiController
    {
        public MongoRepository<Fund> repository = new MongoRepository<Fund>();
        public MongoRepository<Area> areaRepository = new MongoRepository<Area>();

        // GET api/fund/5
        [ReadFundActionFilter]
        public HttpResponseMessage Get(string id)
        {
            var fund = (Fund)HttpContext.Current.Items["fund"];

            if (fund != null)
            {
                return Request.CreateResponse<Fund>(HttpStatusCode.OK, fund);
            }
            return Request.CreateErrorResponse(HttpStatusCode.NotFound, "The item you requested was not found.");
        }

        // GET api/fund/getbyarea
        [ReadAreaActionFilter]
        public HttpResponseMessage GetByArea(string id)
        {
            var funds = repository
                .Where(f => f.AreaId == id)
                .OrderBy(f => f.Number);

            return Request.CreateResponse<IEnumerable<Fund>>(HttpStatusCode.OK, funds);
        }

        // GET api/fund/getfundsubtotalsbyarea
        [ReadAreaActionFilter]
        public HttpResponseMessage GetFundSubtotalsByArea(string id)
        {
            var area = areaRepository.GetById(id);

            var match = new BsonDocument
            {
                {
                    "$match", new BsonDocument
                    {
                        {
                            "AreaId", id
                        }
                    }
                }
            };

                var group = new BsonDocument 
            {
                { 
                    "$group", new BsonDocument 
                    {
                        {
                            "_id", "$AreaId"
                        },
                        {
                            "currentBudget", new BsonDocument 
                            {
                                {
                                    "$sum", "$CurrentBudget"
                                }
                            }
                        },
                        {
                            "projectedExpenditures", new BsonDocument 
                            {
                                {
                                    "$sum", "$ProjectedExpenditures"
                                }
                            }
                        },
                        {
                            "budgetAdjustment", new BsonDocument 
                            {
                                {
                                    "$sum", "$BudgetAdjustment"
                                }
                            }
                        }
                    }
                }
            };
            var pipeline = new[] { match, group };
            var result = repository.Collection.Aggregate(pipeline);

            return Request.CreateResponse(HttpStatusCode.OK, result.ResultDocuments.ToJson());
        }

        // POST api/fund
        [CreateFundActionFilter]
        public HttpResponseMessage Post([FromBody]Fund fund)
        {
            fund.DateTimeCreated = new DateTimeOffset(DateTime.UtcNow);
            var newFund = repository.Add(fund);

            return Request.CreateResponse<Fund>(HttpStatusCode.Created, newFund);
        }

        // PUT api/fund/5
        [UpdateFundActionFilter]
        public HttpResponseMessage Put(string id, [FromBody]Fund fund)
        {
            fund.Id = id;
            fund.DateTimeEdited.Add(new DateTimeOffset(DateTime.UtcNow));

            var updatedFund = repository.Update(fund);
            return Request.CreateResponse<Fund>(HttpStatusCode.OK, updatedFund);
        }

        // DELETE api/fund/5
        [Authorize(Roles = "MANAGE-FUNDS")]
        public HttpResponseMessage Delete(string id)
        {
            repository.Delete(id);

            return Request.CreateResponse(HttpStatusCode.NoContent, "application/json");
        }
    }
}
