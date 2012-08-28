namespace Breeze.Inspector.Models {
    using System;
    using System.Data.Entity;

    public class InspectorContext : DbContext {
        public DbSet<Inspector> Inspectors { get; set; }
        public DbSet<Job> Jobs { get; set; }
        public DbSet<Address> Addresses { get; set; }
        public DbSet<InspectionForm> Forms { get; set; }

        // Todo database initializer (development only)
        public class ContextInitializer : DropCreateDatabaseIfModelChanges<InspectorContext> {
            protected override void Seed(InspectorContext context) {
                var inspector = context.Inspectors.Add(new Inspector {
                    Username = "user",
                    Password = "pw"
                });

                var address = context.Addresses.Add(new Address {
                    Street1 = "1234 Main Street",
                    City = "Cool Town",
                    State = "CA",
                    Zip = "12345"
                });

                var job = context.Jobs.Add(new Job {
                    Inspector = inspector,
                    CreatedAt = DateTime.Now,
                    Location = address
                });

                var form1 = context.Forms.Add(new InspectionForm {
                    Type = "Potential Sweetheart",
                    Questions = {
                        new Question {
                            Text = "Are you single?",
                            Type = QuestionType.Checkbox
                        },
                        new Question {
                            Text = "Gender:",
                            Type = QuestionType.RadioGroup,
                            Options = "Male|Female",
                            IsRequired = true
                        },
                        new Question {
                            Text = "What's your sign?",
                            Type = QuestionType.Dropdown,
                            Options = "Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces",
                            IsRequired = true
                        },new Question {
                            Text = "Which foods do you like most?",
                            Type = QuestionType.CheckboxGroup,
                            Options = "Cheese|Wine|Chocolate|Sardines",
                        },
                        new Question {
                            Text = "Phone Number:",
                            Type = QuestionType.Textbox,
                            IsRequired = true,
                            ResponsePattern = @"^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$"
                        },
                        new Question {
                            Text = "Tell me about yourself:",
                            Type = QuestionType.Textarea
                        }
                    }
                });

                for(var i = 0; i < 1; i++) {
                    var inspection = new Inspection {
                        Form = form1
                    };

                    job.Inspections.Add(inspection);
                }

                context.SaveChanges();

                base.Seed(context);
            }
        }
    }
}