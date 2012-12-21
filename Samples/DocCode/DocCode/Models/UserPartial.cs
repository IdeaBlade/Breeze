using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace DocCode.Models
{
    public class UserPartial
    {
        public long Id { get; set; }

        [MaxLength(100)]
        public string UserName { get; set; }

        [MaxLength(100)]
        public string FirstName { get; set; }

        [MaxLength(100)]
        public string LastName { get; set; }

        [MaxLength(100)]
        public string Email { get; set; }

        public IEnumerable<UserRole> UserRoles { get; set; }

        public string RoleNames { get; set; }
    }
    public class UserPartial2
    {
        public long Id { get; set; }

        [MaxLength(100)]
        public string UserName { get; set; }

        [MaxLength(100)]
        public string FirstName { get; set; }

        [MaxLength(100)]
        public string LastName { get; set; }

        [MaxLength(100)]
        public string Email { get; set; }

        public IEnumerable<UserRole> UserRoles { get; set; }

        public IEnumerable<string> RoleNames { get; set; }
    }
}