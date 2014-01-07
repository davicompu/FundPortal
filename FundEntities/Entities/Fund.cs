using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using MongoRepository;
using System.ComponentModel.DataAnnotations;
using System.Runtime.Serialization;

namespace FundEntities
{
    [DataContract]
    [JsonObject(MemberSerialization.OptOut)]
    public class Fund : Entity
    {
        [Required]
        public string AreaId { get; set; }

        [Required]
        [Display(Name="Fund number")]
        public string Number { get; set; }
        
        public DateTimeOffset DateTimeCreated { get; set; }

        public ICollection<DateTimeOffset> DateTimeEdited { get; set; }

        [Required]
        [Display(Name="Fund title")]
        public string Title { get; set; }

        public Status Status { get; set; }

        [Required]
        public string Description { get; set; }

        [Required]
        [Display(Name = "Fund responsible person")]
        public string ResponsiblePerson { get; set; }

        [Required]
        [DataMember(IsRequired = true)]
        [Display(Name="Fund current fiscal year approved budget")]
        public int CurrentBudget { get; set; }

        [Required]
        [DataMember(IsRequired = true)]
        [Display(Name="Current fiscal year projected expenditures")]
        public int ProjectedExpenditures { get; set; }

        [Required]
        [DataMember(IsRequired = true)]
        public int BudgetAdjustment { get; set; }

        [ConditionallyRequireNote("BudgetAdjustment", 3)]
        public string BudgetAdjustmentNote { get; set; }

        public int FiscalYear { get; set; }

        public ICollection<FileUpload> FileUploads { get; set; }
    }
}
