using System;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class ProductOption
    {
        public ProductOption()
        {
            Factor = 1;
            IsPizzaOption = true;
            IsSaladOption = true;
        }
        [Key]
        public Int32 Id { get; set; }
        [Required, MaxLength(20)]
        public string Type {get; set; }
        [Required, MaxLength(50)]
        public string Name {get; set; }
        [Required]
        public int Factor { get; set; }
        public bool? IsPizzaOption { get; set; }
        public bool? IsSaladOption { get; set; } 
    } 
}     