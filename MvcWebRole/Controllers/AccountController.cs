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
    public class AccountController : ApiController
    {
        private MongoRepository<User> repository = new MongoRepository<User>();

        [HttpGet]
        public HttpResponseMessage GetUserInfo()
        {
            var userInfo = new UserInfoViewModel
            {
                UserName = User.Identity.Name
            };

            var user = repository.SingleOrDefault(u => u.Pid == User.Identity.Name);
            if (user != null)
            {
                userInfo.UserRoles = string.Join(",", user.Roles);
            }

            return Request.CreateResponse<UserInfoViewModel>(HttpStatusCode.OK, userInfo);
        }
    }
}
