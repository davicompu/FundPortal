using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace MvcWebRole.Filters
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

            // Check string property type.
            if (validationContext.ObjectType.GetProperty(validationContext.MemberName).PropertyType != "".GetType())
            {
                return new ValidationResult(String.Format("The type of {0} must be string.",
                    validationContext.DisplayName));
            }

            // Check if the user has entered an adjustment.
            if (numericValue > 0)
            {
                // Check if the user has entered an adjustment explanation.
                if (Convert.ToString(value).Length < this.MinimumNoteLength)
                {
                    return new ValidationResult(
                        String.Format("Budget adjustments require a note explaining the change."));
                }
            }

            // Property is valid.
            return null;
        }
    }
}