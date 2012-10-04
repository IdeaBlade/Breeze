using System.ComponentModel.DataAnnotations;

namespace BreezyDevices.Models
{
    public class Device
    {
        public int DeviceId { get; set; }
        public int PersonId { get; set; }
        [Required]
        public string DeviceName { get; set; }

        public virtual Person Person { get; set; }
    }
}