using FundEntities;
using MongoRepository;
using MvcWebRole.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace MvcWebRole.Controllers
{
    [Authorize(Roles = "MANAGE-USERS")]
    public class UserController : ApiController
    {
        private MongoRepository<User> repository = new MongoRepository<User>();

        // GET api/user
        [HttpGet]
        public HttpResponseMessage Get()
        {
            IQueryable<User> users = repository
                .OrderBy(c => c.Pid);

            return Request.CreateResponse<IEnumerable<User>>(HttpStatusCode.OK, users);
        }

        // GET api/user/getroles
        [HttpGet]
        public HttpResponseMessage GetRoles(string pid)
        {
            User user = repository.SingleOrDefault(u => u.Pid == pid);
            if (user != null)
            {
                IEnumerable<string> roles = user.Roles;

                return Request.CreateResponse<IEnumerable<string>>(HttpStatusCode.OK, roles);
            }
            throw new HttpResponseException(HttpStatusCode.NotFound);
        }

        // GET api/user/5
        public HttpResponseMessage GetById(string id)
        {
            User user = repository.GetById(id);

            return Request.CreateResponse<User>(HttpStatusCode.OK, user);
        }

        // POST api/user
        public HttpResponseMessage Post([FromBody]User user)
        {
            User newUser = repository.Add(user);

            return Request.CreateResponse<User>(HttpStatusCode.Created, newUser);
        }

        // PUT api/user/5
        public HttpResponseMessage Put(string id, [FromBody]User user)
        {
            user.Id = id;

            User updatedUser = repository.Update(user);

            return Request.CreateResponse<User>(HttpStatusCode.OK, updatedUser);
        }

        // DELETE api/user/5
        public HttpResponseMessage Delete(string id)
        {
            repository.Delete(id);
            return Request.CreateResponse(HttpStatusCode.NoContent, "application/json");
        }
    }
}
