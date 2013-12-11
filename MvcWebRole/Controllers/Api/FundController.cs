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

        // GET api/fund/5
        public HttpResponseMessage Get(string id)
        {
            var fund = repository.GetById(id);


            if (fund != null)
            {
                var area = areaRepository.GetById(fund.AreaId);

                if (CanAccessArea(area))
                {
                    return Request.CreateResponse<Fund>(HttpStatusCode.OK, fund);
                }
                else
                {
                    throw new HttpResponseException(HttpStatusCode.Unauthorized);
                }
            }
            throw new HttpResponseException(HttpStatusCode.NotFound);
        }

        // GET api/fund/getbyarea
        public HttpResponseMessage GetByArea(string areaId)
        {
            var area = areaRepository.GetById(areaId);

            if (CanAccessArea(area))
            {
                // TODO: Verify access to area.
                var funds = repository
                    .Where(f => f.AreaId == areaId)
                    .OrderBy(f => f.Number);

                return Request.CreateResponse<IEnumerable<Fund>>(HttpStatusCode.OK, funds);
            }
            throw new HttpResponseException(HttpStatusCode.Unauthorized);
        }

        // GET api/fund/getfundsubtotalsbyarea
        public HttpResponseMessage GetFundSubtotalsByArea(string areaId)
        {
            var area = areaRepository.GetById(areaId);

            if (CanAccessArea(area))
            {
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
            throw new HttpResponseException(HttpStatusCode.Unauthorized);
        }

        // POST api/fund
        public HttpResponseMessage Post([FromBody]Fund fund)
        {
            var area = areaRepository.GetById(fund.AreaId);

            if (CanAccessArea(area))
            {
                fund.DateTimeCreated = new DateTimeOffset(DateTime.UtcNow);
                var newFund = repository.Add(fund);

                return Request.CreateResponse<Fund>(HttpStatusCode.Created, newFund);
            }
            throw new HttpResponseException(HttpStatusCode.Unauthorized);
        }

        // PUT api/fund/5
        public HttpResponseMessage Put(string id, [FromBody]Fund fund)
        {
            var area = areaRepository.GetById(fund.AreaId);

            if (CanAccessArea(area))
            {
                fund.Id = id;
                fund.DateTimeEdited.Add(new DateTimeOffset(DateTime.UtcNow));
                var updatedFund = repository.Update(fund);

                return Request.CreateResponse<Fund>(HttpStatusCode.OK, updatedFund);
            }
            throw new HttpResponseException(HttpStatusCode.Unauthorized);
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

            foreach (var area in areaRepository)
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
