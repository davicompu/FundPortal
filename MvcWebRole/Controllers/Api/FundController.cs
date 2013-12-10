using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using FundEntities;
using MongoDB.Bson;
using MongoRepository;

namespace MvcWebRole.Controllers
{
    public class FundController : ApiController
    {
        private MongoRepository<Fund> repository = new MongoRepository<Fund>();
        private MongoRepository<Area> areaRepository = new MongoRepository<Area>();

        // GET api/fund
        public HttpResponseMessage Get()
        {
            var funds = repository
                .OrderBy(f => f.Number);

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
                .Where(f => f.AreaId == areaId)
                .OrderBy(f => f.Number);

            return Request.CreateResponse<IEnumerable<Fund>>(HttpStatusCode.OK, funds);
        }

        // GET api/fund/getfundsubtotalsbyarea
        public HttpResponseMessage GetFundSubtotalsByArea(string areaId)
        {
            // TODO: Verify access to area.
            var match = new BsonDocument
            {
                {
                    "$match", new BsonDocument
                    {
                        {
                            "AreaId", areaId
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
        public HttpResponseMessage Post([FromBody]Fund fund)
        {
            fund.DateTimeCreated = new DateTimeOffset(DateTime.UtcNow);
            var newFund = repository.Add(fund);

            return Request.CreateResponse<Fund>(HttpStatusCode.Created, newFund);
        }

        // PUT api/fund/5
        public HttpResponseMessage Put(string id, [FromBody]Fund fund)
        {
            // TODO: Uncomment authorization.
            //if (this.CanModifyFund(repository.GetById(id)))
            //{
                fund.Id = id;
                fund.DateTimeEdited.Add(new DateTimeOffset(DateTime.UtcNow));
                var updatedFund = repository.Update(fund);

                return Request.CreateResponse<Fund>(HttpStatusCode.OK, updatedFund);
            //}

            //throw new HttpResponseException(HttpStatusCode.Unauthorized);
        }

        // DELETE api/fund/5
        public HttpResponseMessage Delete(string id)
        {
            repository.Delete(id);

            return Request.CreateResponse(HttpStatusCode.NoContent, "application/json");
        }

        #region Helpers
        private bool CanModifyFund(Fund fund)
        {
            if (fund.Status.ToString() == "Draft")
            {
                return true;
            }

            if (User.IsInRole("CanAdministerFunds"))
            {
                return true;
            }

            return false;
        }

        private bool CanAccessAreaFunds(Area area)
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
