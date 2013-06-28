using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Northwind.Models;

namespace DocCode.Controllers.MultiControllers
{
    /// <summary>
    /// Employees controller of the controller-per-type variety.
    /// </summary>
    [BreezeController]
    public class EmployeesController : MultiBaseController
    {
        //GET ~/multi/employees
        [HttpGet]
        public IQueryable<Employee> SalesReps() { // doesn't matter what you call it
            return Repository.Employees;
        }

        //GET ~/multi/employees/1
        [HttpGet]
        public Employee Get(int id) // doesn't matter what you call it
        {
            return Repository.Employees.FirstOrDefault(e => e.EmployeeID == id);
        }
    }
}