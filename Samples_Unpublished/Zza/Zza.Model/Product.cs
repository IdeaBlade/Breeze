using System;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class Product
    {
        public Product()
        {
            HasOptions = true;
        }
        [Key]
        public Int32 Id { get; set; }
        public Guid? StoreId { get; set; }
        [Required, MaxLength(20)]
        public string Type {get; set; }
        [Required, MaxLength(50)]
        public string Name {get; set; }
        [Required, MaxLength(255)]
        public string Description {get; set; }
        [MaxLength(50)]
        public string Image {get; set; }
        [Required]
        public bool HasOptions {get; set; }
        public bool? IsVegetarian {get; set; }
        public bool? WithTomatoSauce {get; set; }
        [MaxLength(10)]
        public string SizeIds { get; set; }
    } 
}     