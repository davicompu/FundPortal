using FundEntities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace MvcWebRole.Extensions
{
    public static class RoleValidator
    {
        const string EDIT_AREA_ROLE_PREFIX = "EDIT-";
        const string MANAGE_ALL_AREAS_ROLE = "MANAGE-FUNDS";

        public static IList<string> GetAuthorizedRolesForArea(Area area)
        {
            var authorizedRoles = new List<string>();
            var editRole = EDIT_AREA_ROLE_PREFIX + area.Number;

            authorizedRoles.Add(editRole);
            authorizedRoles.Add(MANAGE_ALL_AREAS_ROLE);

            return authorizedRoles;
        }
    }
}