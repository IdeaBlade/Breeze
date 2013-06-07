using System;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class ProductSize
    {
        public ProductSize()
        {
          IsGlutenFree = false;
        }
        [Key]
        public Int32 Id { get; set; }
        [Required, MaxLength(20)]
        public string Type {get; set; }
        [Required, MaxLength(50)]
        public string Name {get; set; }
        [Required]
        public decimal Price { get; set; }
        public decimal PremiumPrice { get; set; }
        public decimal ToppingPrice { get; set; }
        public bool? IsGlutenFree { get; set; }
    } 
}     