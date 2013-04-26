using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing Category table
    /// </summary>
    public class Category
    {

        public Category()
        {
            ProductCollection = new List<Product>();
        }
        
        public virtual int CategoryId { get; set; }

        [Required]
        [StringLength(15)]
        public virtual string CategoryName { get; set; }

        public virtual string Description { get; set; }

        public virtual System.Byte[] Picture { get; set; }

        [Required]
        public virtual int RowVersion { get; set; }

        public virtual IList<Product> ProductCollection { get; protected set; }

        #region overrides

        public override string ToString()
        {
            return "[CategoryId] = " + CategoryId;

        }

        public override int GetHashCode()
        {
            if (CategoryId == 0) return base.GetHashCode(); //transient instance
            return CategoryId;

        }

        public override bool Equals(object obj)
        {
            var x = obj as Category;
            if (x == null) return false;
            if (CategoryId == 0 && x.CategoryId == 0) return ReferenceEquals(this, x);
            return (CategoryId == x.CategoryId);

        }
        #endregion
    }
}
