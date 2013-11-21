using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Web;

namespace MvcWebRole.Extensions
{
    public class DataAnnotationsHelper
    {
        public static string GetPropertyName<T>(Expression<Func<T, Object>> expression)
        {
            if (expression.Body is MemberExpression)
            {
                MemberExpression propertyExpression = (MemberExpression)expression.Body;
                MemberInfo propertyMember = propertyExpression.Member;

                Object[] displayAttributes = propertyMember.GetCustomAttributes(typeof(DisplayAttribute), true);
                if (displayAttributes != null && displayAttributes.Length == 1)
                    return ((DisplayAttribute)displayAttributes[0]).Name;

                return propertyMember.Name;
            }
            else
            {
                var op = ((UnaryExpression)expression.Body).Operand;
                MemberExpression propertyExpression = ((MemberExpression)op);
                MemberInfo propertyMember = propertyExpression.Member;

                Object[] displayAttributes = propertyMember.GetCustomAttributes(typeof(DisplayAttribute), true);
                if (displayAttributes != null && displayAttributes.Length == 1)
                    return ((DisplayAttribute)displayAttributes[0]).Name;

                return propertyMember.Name;
            }
        }
    }
}