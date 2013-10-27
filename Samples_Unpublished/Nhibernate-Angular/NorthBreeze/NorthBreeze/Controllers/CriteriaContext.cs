using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Breeze.WebApi.NH;
using Models.NorthwindIB.NH;
using NHibernate;
using NHibernate.OData;
using Breeze.WebApi;
using NHibernate.Criterion;

namespace NorthBreeze.Controllers
{
    public class CriteriaContext : NHContext
    {
        ODataParserConfiguration _pc;
        public CriteriaContext() : base(NHConfig.OpenSession(), NHConfig.Configuration) 
        {
            _pc = new ODataParserConfiguration() { CaseSensitive = false };
        }

        public ICriteria Criteria(Type type, string queryString)
        {
            ICriteria query = Session.ODataQuery(type, FixQueryString(queryString), _pc);
            return query;
        }

        public ICriteria Criteria<T>(string queryString)
        {
            ICriteria query = Session.ODataQuery<T>(FixQueryString(queryString), _pc);
            return query;
        }

        public IList<T> List<T>(string queryString)
        {
            ICriteria query = Criteria<T>(queryString);
            var list = query.List<T>();
            this.Close();
            return list;
        }

        public QueryResult Result<T>(string queryString)
        {
            var hasInline = HasInlineCount(queryString);
            ICriteria query = Criteria<T>(queryString);
            ICriteria countQuery = (ICriteria) query.Clone();

            var list = query.Future<T>();

            QueryResult result;
            if (hasInline)
            {
                countQuery.ClearOrders();
                var count = countQuery
                    .SetFirstResult(0)
                    .SetMaxResults(Int32.MaxValue)
                    .SetProjection(Projections.RowCount()).FutureValue<Int32>();

                result = new QueryResult() { InlineCount = count.Value, Results = list };
            }
            else
            {
                result = new QueryResult() { Results = list };
            }
            return result;

        }

        /// <summary>
        /// Remove the leading '?' and the $inlinecount from the queryString.
        /// NHibernate.Odata chokes on these.
        /// </summary>
        /// <param name="queryString"></param>
        /// <returns></returns>
        private string FixQueryString(string queryString)
        {
            if (String.IsNullOrEmpty(queryString)) return queryString;
            if (queryString[0] == '?') queryString = queryString.Substring(1);
            queryString = queryString.Replace("&$inlinecount=allpages", "");
            queryString = queryString.Replace("&$inlinecount=none", "");
            return queryString;
        }

        /// <returns>true if queryString contains "$inlinecount=allpages", false otherwise.</returns>
        private bool HasInlineCount(string queryString)
        {
            if (String.IsNullOrEmpty(queryString)) return false;
            return (queryString.IndexOf("$inlinecount=allpages") >= 0);
        }
    }
}