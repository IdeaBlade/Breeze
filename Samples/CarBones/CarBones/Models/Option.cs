namespace CarBones.Models
{
    public class Option
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int CarId { get; set; }
        public Car Car { get; set; }
    }
}