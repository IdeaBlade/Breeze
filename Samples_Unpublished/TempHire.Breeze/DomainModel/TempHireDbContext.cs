//====================================================================================================================
// Copyright (c) 2012 IdeaBlade
//====================================================================================================================
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE 
// WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS 
// OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR 
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 
//====================================================================================================================
// USE OF THIS SOFTWARE IS GOVERENED BY THE LICENSING TERMS WHICH CAN BE FOUND AT
// http://cocktail.ideablade.com/licensing
//====================================================================================================================

using System;
using System.Collections.Generic;
using System.Data.Entity;

namespace DomainModel
{
    public class TempHireDbContext : DbContext
    {
        public TempHireDbContext()
        {
            Database.SetInitializer(new TempHireDbInitializer());

            // DevForce already performs validation
            Configuration.ValidateOnSaveEnabled = false;
        }

        public TempHireDbContext(string connection = null)
            : base(connection)
        {
            Database.SetInitializer(new TempHireDbInitializer());

            // DevForce already performs validation
            Configuration.ValidateOnSaveEnabled = false;
        }

        public DbSet<StaffingResource> StaffingResources { get; set; }
        public DbSet<Address> Addresses { get; set; }
        public DbSet<AddressType> AddressTypes { get; set; }
        public DbSet<PhoneNumber> PhoneNumbers { get; set; }
        public DbSet<PhoneNumberType> PhoneNumberTypes { get; set; }
        public DbSet<Rate> Rates { get; set; }
        public DbSet<RateType> RateTypes { get; set; }
        public DbSet<State> States { get; set; }
        public DbSet<WorkExperienceItem> WorkExperienceItems { get; set; }
        public DbSet<Skill> Skills { get; set; }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
        }
    }

    internal class TempHireDbInitializer : DropCreateDatabaseIfModelChanges<TempHireDbContext>
    {
        protected override void Seed(TempHireDbContext context)
        {
            // Seed data
            var addressTypes = new List<AddressType>
                                   {
                                       new AddressType
                                           {
                                               Id = Guid.NewGuid(),
                                               Name = "Mailing",
                                               DisplayName = "Mailing Address",
                                               Default = true
                                           },
                                       new AddressType
                                           {Id = Guid.NewGuid(), Name = "Home", DisplayName = "Home Address"},
                                       new AddressType
                                           {Id = Guid.NewGuid(), Name = "Work", DisplayName = "Work Address"}
                                   };
            addressTypes.ForEach(e => context.AddressTypes.Add(e));

            var phoneTypes = new List<PhoneNumberType>
                                 {
                                     new PhoneNumberType {Id = Guid.NewGuid(), Name = "Home", Default = true},
                                     new PhoneNumberType {Id = Guid.NewGuid(), Name = "Work"},
                                     new PhoneNumberType {Id = Guid.NewGuid(), Name = "Mobile"}
                                 };
            phoneTypes.ForEach(e => context.PhoneNumberTypes.Add(e));

            var rateTypes = new List<RateType>
                                {
                                    new RateType
                                        {
                                            Id = Guid.NewGuid(),
                                            Name = "hourly",
                                            DisplayName = "Per Hour",
                                            Sequence = 0
                                        },
                                    new RateType
                                        {Id = Guid.NewGuid(), Name = "daily", DisplayName = "Per Day", Sequence = 1},
                                    new RateType
                                        {
                                            Id = Guid.NewGuid(),
                                            Name = "weekly",
                                            DisplayName = "Per Week",
                                            Sequence = 2
                                        },
                                    new RateType
                                        {
                                            Id = Guid.NewGuid(),
                                            Name = "monthly",
                                            DisplayName = "Per Month",
                                            Sequence = 3
                                        }
                                };
            rateTypes.ForEach(e => context.RateTypes.Add(e));

            var states = new List<State>
                             {
                                 new State {Id = Guid.NewGuid(), ShortName = "AL", Name = "Alabama"},
                                 new State {Id = Guid.NewGuid(), ShortName = "AK", Name = "Alaska"},
                                 new State {Id = Guid.NewGuid(), ShortName = "AZ", Name = "Arizona"},
                                 new State {Id = Guid.NewGuid(), ShortName = "AR", Name = "Arkansas"},
                                 new State {Id = Guid.NewGuid(), ShortName = "CA", Name = "California"},
                                 new State {Id = Guid.NewGuid(), ShortName = "CO", Name = "Colorado"},
                                 new State {Id = Guid.NewGuid(), ShortName = "CT", Name = "Connecticut"},
                                 new State {Id = Guid.NewGuid(), ShortName = "DE", Name = "Delaware"},
                                 new State {Id = Guid.NewGuid(), ShortName = "DC", Name = "District of Columbia"},
                                 new State {Id = Guid.NewGuid(), ShortName = "FL", Name = "Florida"},
                                 new State {Id = Guid.NewGuid(), ShortName = "GA", Name = "Georgia"},
                                 new State {Id = Guid.NewGuid(), ShortName = "HI", Name = "Hawaii"},
                                 new State {Id = Guid.NewGuid(), ShortName = "ID", Name = "Idaho"},
                                 new State {Id = Guid.NewGuid(), ShortName = "IL", Name = "Illinois"},
                                 new State {Id = Guid.NewGuid(), ShortName = "IN", Name = "Indiana"},
                                 new State {Id = Guid.NewGuid(), ShortName = "IA", Name = "Iowa"},
                                 new State {Id = Guid.NewGuid(), ShortName = "KS", Name = "Kansas"},
                                 new State {Id = Guid.NewGuid(), ShortName = "KY", Name = "Kentucky"},
                                 new State {Id = Guid.NewGuid(), ShortName = "LA", Name = "Louisiana"},
                                 new State {Id = Guid.NewGuid(), ShortName = "ME", Name = "Maine"},
                                 new State {Id = Guid.NewGuid(), ShortName = "MD", Name = "Maryland"},
                                 new State {Id = Guid.NewGuid(), ShortName = "MA", Name = "Massachusetts"},
                                 new State {Id = Guid.NewGuid(), ShortName = "MI", Name = "Michigan"},
                                 new State {Id = Guid.NewGuid(), ShortName = "MN", Name = "Minnesota"},
                                 new State {Id = Guid.NewGuid(), ShortName = "MS", Name = "Mississippi"},
                                 new State {Id = Guid.NewGuid(), ShortName = "MO", Name = "Missouri"},
                                 new State {Id = Guid.NewGuid(), ShortName = "MT", Name = "Montana"},
                                 new State {Id = Guid.NewGuid(), ShortName = "NE", Name = "Nebraska"},
                                 new State {Id = Guid.NewGuid(), ShortName = "NV", Name = "Nevada"},
                                 new State {Id = Guid.NewGuid(), ShortName = "NH", Name = "New Hampshire"},
                                 new State {Id = Guid.NewGuid(), ShortName = "NJ", Name = "New Jersey"},
                                 new State {Id = Guid.NewGuid(), ShortName = "NM", Name = "New Mexico"},
                                 new State {Id = Guid.NewGuid(), ShortName = "NY", Name = "New York"},
                                 new State {Id = Guid.NewGuid(), ShortName = "NC", Name = "North Carolina"},
                                 new State {Id = Guid.NewGuid(), ShortName = "ND", Name = "North Dakota"},
                                 new State {Id = Guid.NewGuid(), ShortName = "OH", Name = "Ohio"},
                                 new State {Id = Guid.NewGuid(), ShortName = "OK", Name = "Oklahoma"},
                                 new State {Id = Guid.NewGuid(), ShortName = "OR", Name = "Oregon"},
                                 new State {Id = Guid.NewGuid(), ShortName = "PA", Name = "Pennsylvania"},
                                 new State {Id = Guid.NewGuid(), ShortName = "RI", Name = "Rhode Island"},
                                 new State {Id = Guid.NewGuid(), ShortName = "SC", Name = "South Carolina"},
                                 new State {Id = Guid.NewGuid(), ShortName = "SD", Name = "South Dakota"},
                                 new State {Id = Guid.NewGuid(), ShortName = "TN", Name = "Tennessee"},
                                 new State {Id = Guid.NewGuid(), ShortName = "TX", Name = "Texas"},
                                 new State {Id = Guid.NewGuid(), ShortName = "UT", Name = "Utah"},
                                 new State {Id = Guid.NewGuid(), ShortName = "VT", Name = "Vermont"},
                                 new State {Id = Guid.NewGuid(), ShortName = "VA", Name = "Virginia"},
                                 new State {Id = Guid.NewGuid(), ShortName = "WA", Name = "Washington"},
                                 new State {Id = Guid.NewGuid(), ShortName = "WV", Name = "West Virginia"},
                                 new State {Id = Guid.NewGuid(), ShortName = "WI", Name = "Wisconsin"},
                                 new State {Id = Guid.NewGuid(), ShortName = "WY", Name = "Wyoming"},
                                 new State {Id = Guid.NewGuid(), ShortName = "--", Name = "International"}
                             };
            states.ForEach(e => context.States.Add(e));

            // Sample data
            StaffingResource r = NewStaffingResource("Nancy", "Lynn", "Davolio",
                                     "Education includes a BA in psychology from Colorado State University in 1970.  She also completed \"The Art of the Cold Call.\"  Nancy is a member of Toastmasters International.");
            context.StaffingResources.Add(r);
            context.Addresses.Add(NewAddress(r, addressTypes[0], "507 - 20th Ave. E.", "Apt. 2A", "Seattle",
                                             states[47],
                                             "98122", true));
            context.Addresses.Add(NewAddress(r, addressTypes[1], "449 11th Ave W", "Suite 101", "Seattle", states[47],
                                             "98123",
                                             false));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[0], "206", "555-9857", true));
            context.Rates.Add(NewRate(r, rateTypes[0], 100));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1989, 6, 22), new DateTime(1995, 8, 4),
                                                    "Concord Catalogs",
                                                    "Concord MA", "Sales Representative",
                                                    "Tripled sales every three years.  Exceeded sales target every quarter."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1995, 8, 5), new DateTime(2000, 2, 14),
                                                    "Cyberbiz",
                                                    "San Francisco CA", "Business Development Executive",
                                                    "Targeted clients and found new business through all the sales avenues, including cold calling, email marketing, direct face to face meetings etc."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(2000, 2, 14), new DateTime(2011, 3, 18),
                                                    "IIBSIS Global",
                                                    "New York NY", "Business Development Sales Executive",
                                                    "Sold business intelligence to a wide variety of industry verticals including finance, consulting, accounting, manufacturing."));
            context.Skills.Add(NewSkill(r, "Sales"));

            r = NewStaffingResource("Andrew", "I", "Fuller",
                            "Andrew received his BTS commercial in 1974 and a Ph.D. in international marketing from the University of Dallas in 1981.  He is fluent in French and Italian and reads German.  He joined the company as a sales representative, was promoted to sales manager in January 1992 and to vice president of sales in March 1993.  Andrew is a member of the Sales Management Roundtable, the Seattle Chamber of Commerce, and the Pacific Rim Importers Association.");
            context.StaffingResources.Add(r);
            context.Addresses.Add(NewAddress(r, addressTypes[0], "908 W. Capital Way", "", "Tacoma", states[47],
                                             "98401", true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[0], "206", "555-9482", true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[1], "206", "555-0123", false));
            context.Rates.Add(NewRate(r, rateTypes[0], 180));
            context.Rates.Add(NewRate(r, rateTypes[1], 1000));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1992, 8, 22), new DateTime(1999, 8, 4),
                                                    "Famous Footware",
                                                    "Lightfoot PA", "Marketing Manager",
                                                    "Launched 3 effective campaigns for new products."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1999, 8, 5), new DateTime(2002, 6, 1),
                                                    "Logorific",
                                                    "Grand Rapids, MI", "Sales & Marketing Account Executive",
                                                    "Worked with local chambers of commerce and town halls to set up a distribution point for marketing materials."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(2002, 6, 2), new DateTime(2011, 9, 5),
                                                    "Start This",
                                                    "Palo Alto CA", "Head of Marketing",
                                                    "Built and executed marketing and PR strategy from scratch, including positioning, brand identity, pricing and product definition."));
            context.Skills.Add(NewSkill(r, "Sales"));
            context.Skills.Add(NewSkill(r, "Marketing"));

            r = NewStaffingResource("Janet", "N", "Leverling",
                            "Janet has a BS degree in chemistry from Boston College (1984).  She has also completed a certificate program in food retailing management.  Janet was hired as a sales associate in 1991 and promoted to sales representative in February 1992.");
            context.StaffingResources.Add(r);
            context.Addresses.Add(NewAddress(r, addressTypes[0], "722 Moss Bay Blvd.", "", "Kirkland", states[47],
                                             "98033",
                                             true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[0], "206", "555-3412", true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[1], "206", "555-3355", false));
            context.Rates.Add(NewRate(r, rateTypes[0], 50));
            context.Rates.Add(NewRate(r, rateTypes[1], 300));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1992, 4, 1), new DateTime(1998, 3, 1),
                                                    "Hobson Foods",
                                                    "Tacoma WA", "Junior Chemist",
                                                    "Developed new food additives.  Was banned from employeed cafeteria."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1998, 3, 2), new DateTime(1995, 8, 4),
                                                    "Pharmabiz",
                                                    "Wilmington NC", "Chemist",
                                                    "Responsible for validation of analytical methods and testing in support of pharmaceutical product development."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1995, 8, 4), new DateTime(2009, 12, 21), "Colaca",
                                                    "Point Comfort TX", "Senior Chemist",
                                                    "Provided technical analytical support to the laboratory for day-to-day operations and long term technical advancement of the department."));
            context.Skills.Add(NewSkill(r, "Sales"));
            context.Skills.Add(NewSkill(r, "Chemistry"));

            r = NewStaffingResource("Margaret", "G", "Peacock",
                            "Margaret holds a BA in English literature from Concordia College (1958) and an MA from the American Institute of Culinary Arts (1966).  She was assigned to the London office temporarily from July through November 1992.");
            context.StaffingResources.Add(r);
            context.Addresses.Add(NewAddress(r, addressTypes[0], "4110 Old Redmond Rd.", "", "Redmond", states[47],
                                             "98052",
                                             true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[0], "206", "555-8122", true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[1], "206", "555-5176", false));
            context.Rates.Add(NewRate(r, rateTypes[0], 50));
            context.Rates.Add(NewRate(r, rateTypes[1], 300));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1993, 5, 3), new DateTime(1998, 3, 1),
                                                    "Sylvan Software",
                                                    "Tacoma WA", "Developer",
                                                    "Co-developed internal database system.  Put all data in a single table to conserve space."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1998, 3, 2), new DateTime(2008, 5, 5),
                                                    "Big Man Industries",
                                                    "Champaign IL", "Developer", "Silverlight and web applications."));
            context.Skills.Add(NewSkill(r, "C++"));


            context.Skills.Add(NewSkill(r, "SQL"));

            r = NewStaffingResource("Steven", "T", "Buchanan",
                            "Steven Buchanan graduated from St. Andrews University, Scotland, with a BSC degree in 1976.  Upon joining the company as a sales representative in 1992, he spent 6 months in an orientation program at the Seattle office and then returned to his permanent post in London.  He was promoted to sales manager in March 1993.  Mr. Buchanan has completed the courses \"Successful Telemarketing\" and \"International Sales Management.\"  He is fluent in French.");
            context.StaffingResources.Add(r);
            context.Addresses.Add(NewAddress(r, addressTypes[0], "14 Garrett Hill", "", "London", states[51],
                                             "SW1 8JR", true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[0], "071", "555-4848", true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[1], "071", "555-3453", false));
            context.Rates.Add(NewRate(r, rateTypes[0], 50));
            context.Rates.Add(NewRate(r, rateTypes[1], 300));
            context.Rates.Add(NewRate(r, rateTypes[2], 1500));
            context.Rates.Add(NewRate(r, rateTypes[2], 6000));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1989, 6, 22), new DateTime(1995, 8, 4),
                                                    "AeroDef Sales",
                                                    "Virginia Beach VA", "Vertical Sales Manager, Army East",
                                                    "Developed business relationships with key decision makers at the Command, Division, Brigade, etc. levels."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1995, 8, 4), new DateTime(2002, 2, 6),
                                                    "FireControl",
                                                    "Tampa FL", "Residential Sales Manager",
                                                    "Implemented new sales techniques to increase business in new territory"));

            r = NewStaffingResource("Michael", "", "Suyama",
                            "Michael is a graduate of Sussex University (MA, economics, 1983) and the University of California at Los Angeles (MBA, marketing, 1986).  He has also taken the courses \"Multi-Cultural Selling\" and \"Time Management for the Sales Professional.\"  He is fluent in Japanese and can read and write French, Portuguese, and Spanish.");
            context.StaffingResources.Add(r);
            context.Addresses.Add(NewAddress(r, addressTypes[0], "Coventry House  Miner Rd.", "", "London",
                                             states[51],
                                             "EC2 7JR", true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[0], "071", "555-7773", true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[1], "071", "555-0428", false));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1989, 6, 22), new DateTime(1994, 1, 1), "Rainout",
                                                    "Oakland CA", "CRM Analyst",
                                                    "Responsible for all aspects of CRM business management and marketing development."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1995, 1, 2), new DateTime(2005, 10, 30),
                                                    "Planatele",
                                                    "Chicago IL", "Field Sales Account Manager",
                                                    "Expanded account penetration by increasing share of total year over year spend."));

            r = NewStaffingResource("Laura", "A", "Callahan",
                            "Laura received a BA in psychology from the University of Washington.  She has also completed a course in business French.  She reads and writes French.");
            context.StaffingResources.Add(r);
            context.Addresses.Add(NewAddress(r, addressTypes[0], "4726 - 11th Ave. N.E.", "", "Seattle", states[47],
                                             "98105",
                                             true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[0], "206", "555-1189", true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[1], "206", "555-2344", false));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1989, 6, 22), new DateTime(1995, 8, 4), "Careste",
                                                    "Fort Lauderdale FL", "Sales Development Associate",
                                                    "Soliciting accounts and contacting existing customers to promote sales."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(2002, 2, 18), new DateTime(2009, 12, 24),
                                                    "Silent Hill",
                                                    "Atlanta GA", "Legal eagle",
                                                    "Passion for innovation, creativity and continuous improvement."));

            r = NewStaffingResource("Anne", "F", "Dodsworth",
                            "Anne has a BA degree in English from St. Lawrence College.  She is fluent in French and German.");
            context.StaffingResources.Add(r);
            context.Addresses.Add(NewAddress(r, addressTypes[0], "7 Houndstooth Rd.", "", "London", states[51],
                                             "WG2 7LT",
                                             true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[0], "071", "555-4444", true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[1], "071", "555-0452", false));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1989, 6, 22), new DateTime(1995, 8, 4),
                                                    "TigerGate",
                                                    "Bellvue WA", "Editorial Program Manager",
                                                    "Defined guidelines and policies for the landing page content selection and promotion."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1999, 3, 21), new DateTime(2011, 6, 1),
                                                    "ProTrans",
                                                    "Coral Gables FL", "Linguistic Coder",
                                                    "Liaison between the developers and the client. Helps communicate thoughts and ideas into values which are structured and analyzed."));

            r = NewStaffingResource("Pearl", "P", "Pindlegrass",
                            "Holds the MA degree in Education from UC Berkeley");
            context.StaffingResources.Add(r);
            context.Addresses.Add(NewAddress(r, addressTypes[0], "18233 N.Wunderkindt", "", "Munich", states[35],
                                             "32382",
                                             true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[0], "382", "293-2938", true));
            context.PhoneNumbers.Add(NewPhone(r, phoneTypes[1], "382", "555-2938", false));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1989, 6, 22), new DateTime(1995, 8, 4),
                                                    "Reynolds School District", "Grenville PA", "German Teacher",
                                                    "Pennsylvania Foreign Language (German) Teacher Certification"));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1996, 9, 1), new DateTime(1997, 6, 16),
                                                    "Phillips Academy",
                                                    "Andover MA", "Visiting Scholar", "One-year teaching fellowship."));
            context.WorkExperienceItems.Add(NewWork(r, new DateTime(1989, 6, 22), new DateTime(1995, 8, 4), "TeachCo",
                                                    "New Rochelle NY", "Special Educator", "NYS Certified"));
        }

        # region methods for building entities with sample data

        private StaffingResource NewStaffingResource(string first, string middle, string last, string summary)
        {
            return new StaffingResource
                       {
                           Id = Guid.NewGuid(),
                           FirstName = first,
                           MiddleName = middle,
                           LastName = last,
                           Summary = summary,
                           Created = DateTime.Now,
                           CreatedUser = "SampleData",
                           Modified = DateTime.Now,
                           ModifyUser = "SampleData"
                       };
        }

        private Address NewAddress(StaffingResource staffingResource, AddressType type, string address1, string address2, string city,
                                   State state, string zip, bool primary)
        {
            return new Address
                       {
                           Id = Guid.NewGuid(),
                           AddressType = type,
                           Address1 = address1,
                           Address2 = address2,
                           City = city,
                           State = state,
                           Zipcode = zip,
                           StaffingResource = staffingResource,
                           Primary = primary,
                           Created = DateTime.Now,
                           CreatedUser = "SampleData",
                           Modified = DateTime.Now,
                           ModifyUser = "SampleData"
                       };
        }

        private PhoneNumber NewPhone(StaffingResource staffingResource, PhoneNumberType type, string areaCode, string phone,
                                     bool primary)
        {
            return new PhoneNumber
                       {
                           Id = Guid.NewGuid(),
                           PhoneNumberType = type,
                           AreaCode = areaCode,
                           Number = phone,
                           StaffingResource = staffingResource,
                           Primary = primary,
                           Created = DateTime.Now,
                           CreatedUser = "SampleData",
                           Modified = DateTime.Now,
                           ModifyUser = "SampleData"
                       };
        }

        private Rate NewRate(StaffingResource staffingResource, RateType type, decimal amount)
        {
            return new Rate
                       {
                           Id = Guid.NewGuid(),
                           RateType = type,
                           Amount = amount,
                           StaffingResource = staffingResource,
                           Created = DateTime.Now,
                           CreatedUser = "SampleData",
                           Modified = DateTime.Now,
                           ModifyUser = "SampleData"
                       };
        }

        private WorkExperienceItem NewWork(StaffingResource staffingResource, DateTime from, DateTime to, string company,
                                           string location,
                                           string title, string description)
        {
            return new WorkExperienceItem
                       {
                           Id = Guid.NewGuid(),
                           StaffingResource = staffingResource,
                           From = from,
                           To = to,
                           Company = company,
                           Location = location,
                           PositionTitle = title,
                           Description = description,
                           Created = DateTime.Now,
                           CreatedUser = "SampleData",
                           Modified = DateTime.Now,
                           ModifyUser = "SampleData"
                       };
        }

        private Skill NewSkill(StaffingResource staffingResource, string desc)
        {
            return new Skill
                       {
                           Id = Guid.NewGuid(),
                           Description = desc,
                           StaffingResource = staffingResource,
                           Created = DateTime.Now,
                           CreatedUser = "SampleData",
                           Modified = DateTime.Now,
                           ModifyUser = "SampleData"
                       };
        }

        #endregion
    }
}