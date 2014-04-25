using FundEntities;
using MongoRepository;
using MvcWebRole.Filters;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace MvcWebRole.Controllers
{
    [Authorize(Roles = "MANAGE-FUNDS")]
    public class CommentController : ApiController
    {
        public MongoRepository<Comment> repository = new MongoRepository<Comment>();

        public HttpResponseMessage Get(string id)
        {
            var comments = repository
                .Where(c => c.FundId == id)
                .OrderBy(c => c.DateTimeCreated);

            return Request.CreateResponse<IEnumerable<Comment>>(HttpStatusCode.OK, comments);
        }

        [CreateCommentActionFilter]
        public HttpResponseMessage Post([FromBody]Comment comment)
        {
            comment.UserName = User.Identity.Name;
            var newComment = repository.Add(comment);
            return Request.CreateResponse<Comment>(HttpStatusCode.Created, newComment);
        }
    }
}
