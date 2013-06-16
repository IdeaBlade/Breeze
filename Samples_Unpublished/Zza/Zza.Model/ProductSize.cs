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
        public virtual int Id { get; set; }
        [Required, MaxLength(20)]
        public virtual string Type { get; set; }
        [Required, MaxLength(50)]
        public virtual string Name { get; set; }
        [Required]
        public virtual decimal Price { get; set; }
        public virtual decimal? PremiumPrice { get; set; }
        public virtual decimal? ToppingPrice { get; set; }
        public virtual bool? IsGlutenFree { get; set; }
    } 
}     