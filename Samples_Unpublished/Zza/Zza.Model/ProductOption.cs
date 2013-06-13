using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class ProductOption : IHasIntId
    {
        public ProductOption()
        {
            Factor = 1;
            IsPizzaOption = true;
            IsSaladOption = true;
        }
        [Key]
        public virtual int Id { get; set; }
        [Required, MaxLength(20)]
        public virtual string Type { get; set; }
        [Required, MaxLength(50)]
        public virtual string Name { get; set; }
        [Required]
        public virtual int Factor { get; set; }
        public virtual bool? IsPizzaOption { get; set; }
        public virtual bool? IsSaladOption { get; set; }

        long IHasIntId.Id { get { return Id; } }
    } 
}     