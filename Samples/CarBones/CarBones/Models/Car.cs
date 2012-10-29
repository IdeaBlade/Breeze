using System.Collections.Generic;

namespace CarBones.Models
{
    public class Car
    {
        public int Id { get; set; }
        public string Make { get; set; }
        public string Model { get; set; }
        public ICollection<Option> Options { get; set; } 
    }
}