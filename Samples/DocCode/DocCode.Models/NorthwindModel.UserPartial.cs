using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Newtonsoft.Json;

namespace Northwind.Models
{
    public class UserPartial
    {
        public UserPartial()
        {
            Roles = new Role[0];
        }
        public long Id { get; set; }

        [MaxLength(100)]
        public string UserName { get; set; }

        [MaxLength(100)]
        public string FirstName { get; set; }

        [MaxLength(100)]
        public string LastName { get; set; }

        [MaxLength(100)]
        public string Email { get; set; }

        // not serialized; set by projection
        [JsonIgnore]
        internal IEnumerable<Role> Roles { get; set; }

        public string RoleNames
        {
            get
            {
                return string.Join(",", Roles.Select(role => role.Name));
            }
            set { } // read only. Need setter for serialization
        }
    }

}