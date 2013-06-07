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
        public virtual Int32 Id { get; set; }
        [Required, MaxLength(20)]
        public virtual string Type { get; set; }
        [Required, MaxLength(50)]
        public virtual string Name { get; set; }
        [Required, MaxLength(255)]
        public virtual string Description { get; set; }
        [MaxLength(50)]
        public virtual string Image { get; set; }
        [Required]
        public virtual bool HasOptions { get; set; }
        public virtual bool? IsVegetarian { get; set; }
        public virtual bool? WithTomatoSauce { get; set; }
        [MaxLength(10)]
        public virtual string SizeIds { get; set; }
    } 
}     