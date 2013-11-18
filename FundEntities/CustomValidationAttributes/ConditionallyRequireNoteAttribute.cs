using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace FundEntities
{
    public class ConditionallyRequireNoteAttribute : ValidationAttribute
    {
        public string NumericPropertyName { get; private set; }
        public int MinimumNoteLength { get; private set; }

        public ConditionallyRequireNoteAttribute(string numericPropertyName, int minimumNoteLength)
        {
            this.NumericPropertyName = numericPropertyName;
            this.MinimumNoteLength = minimumNoteLength;
        }

        protected override ValidationResult IsValid(object value, ValidationContext validationContext)
        {
            var numericProperty = validationContext.ObjectType.GetProperty(this.NumericPropertyName);
            
            // Check that number property is not null.
            if (numericProperty == null)
            {
                return new ValidationResult(String.Format("Unknown property: {0}.", this.NumericPropertyName));
            }

            // Get the number property value.
            var numericValue = (int)numericProperty.GetValue(validationContext.ObjectInstance, null);

            // Check if the user has entered an adjustment.
            if (numericValue > 0)
            {
                // Check if the user has entered an adjustment explaination.
                if (Convert.ToString(value).Length < this.MinimumNoteLength)
                {
                    return new ValidationResult(
                        String.Format("{0} requires a note explaining the change.", this.NumericPropertyName));
                }
            }

            // Property is valid.
            return null;
        }
    }
}