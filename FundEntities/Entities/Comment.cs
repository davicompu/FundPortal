using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using MongoRepository;

namespace FundEntities
{
    [JsonObject(MemberSerialization.OptOut)]
    public class Comment : Entity
    {
        [Required]
        public string FundId { get; set; }

        public DateTimeOffset DateTimeCreated { get; set; }

        public string UserName { get; set; }

        [Required]
        public string Text { get; set; }
    }
}
