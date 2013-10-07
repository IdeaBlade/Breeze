
namespace NHibernate.Dialect
{
    public class FixedMsSqlCe40Dialect : MsSqlCe40Dialect
    {
        /// <summary>
        /// SqlCe 4.0 really supports variable limits, so the dialect should too.
        /// </summary>
        public override bool SupportsVariableLimit
        {
            get
            {
                return true;
            }
        }
    }
}