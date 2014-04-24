using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MongoRepository;
using Newtonsoft.Json;

namespace FundEntities
{
    [JsonObject(MemberSerialization.OptOut)]
    public class User : Entity
    {
        [Required]
        public string Pid { get; set; }

        public ICollection<string> Roles { get; set; }
    }
}
