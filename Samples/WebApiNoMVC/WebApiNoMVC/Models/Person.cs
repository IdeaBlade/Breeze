using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace WebApiNoMVC.Models
{
  public class Person
  {
    public int PersonId { get; set; }
    [MaxLength(10)]
    public string IdentityCardNumber { get; set; }
    public string FirstName { get; set; }
    [Required]
    public string LastName { get; set; }

    public virtual ICollection<Device> Devices { get; set; }
  }
}