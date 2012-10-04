namespace Breeze.Inspector.Models {
    using System;
    using System.Collections.Generic;
    using System.Data.Entity;
    using System.Linq;

    public class InspectorContext : DbContext {
        public DbSet<Inspector> Inspectors { get; set; }
        public DbSet<Job> Jobs { get; set; }
        public DbSet<Address> Addresses { get; set; }
        public DbSet<InspectionForm> Forms { get; set; }

        // Todo database initializer (development only)
        public class ContextInitializer : DropCreateDatabaseIfModelChanges<InspectorContext> {
            protected override void Seed(InspectorContext context) {
                var inspectors = CreateInspectors(context);
                var addresses = CreateAddresses(context);
                var inspectionForms = new[] {
                    CreateBathroomForm(context),
                    CreateElectricalInspection(context),
                    CreateFireplaceInspection(context),
                    CreateHeatingInspection(context),
                    CreateKitchenInspection(context)
                };

                var random = new Random();

                foreach(var inspector in inspectors) {
                    var numberOfJobs = random.Next(1, addresses.Length - 1);
                    var addressQueue = new Queue<Address>(addresses);

                    for(int i = 0; i < numberOfJobs; i++) {
                        var numberOfInspections = random.Next(1, inspectionForms.Length);
                        var inspectionQueue = new Queue<InspectionForm>(inspectionForms);

                        var job = context.Jobs.Add(new Job {
                            Inspector = inspector,
                            CreatedAt = DateTime.Now,
                            Location = addressQueue.Dequeue()
                        });

                        for(var j = 0; j < numberOfInspections; j++) {
                            var inspection = new Inspection {
                                Form = inspectionQueue.Dequeue()
                            };

                            job.Inspections.Add(inspection);
                        }
                    }
                }

                context.SaveChanges();

                base.Seed(context);
            }

            IEnumerable<Inspector> CreateInspectors(InspectorContext context) {
                var names = new[] {
                    "Michael Smith", "Christopher Nguyen", "Jessica Johnson", "Matthew Kim", "Samantha Garcia"
                };

                return names.Select(name => context.Inspectors.Add(new Inspector {
                    Name = name
                })).ToArray();
            }

            Address[] CreateAddresses(InspectorContext context) {
                var addresses = new[] {
                    new Address {
                        Street1 = "1065 La Avenida",
                        City = "Mountain View",
                        State = "CA"
                    },
                    new Address {
                        Street1 = "835 Market Street",
                        City = "San Francisco",
                        State = "CA"
                    },
                    new Address {
                        Street1 = "1290 Avenue of the Americas",
                        Street2 = "Sixth Floor",
                        City = "New York",
                        State = "NY"
                    },
                    new Address {
                        Street1 = "1414 NW Northrup Street",
                        City = "Portland ",
                        State = "OR"
                    },
                    new Address {
                        Street1 = "200 W. Sam Houston Pkwy.",
                        City = "Houston",
                        State = "TX"
                    },
                    new Address {
                        Street1 = "22 157th Avenue",
                        City = "Seattle",
                        State = "WA"
                    }
                };

                foreach(var address in addresses) {
                    context.Addresses.Add(address);
                }

                return addresses;
            }

            InspectionForm CreateBathroomForm(InspectorContext context) {
                var form = new InspectionForm {
                    Type = "Bathroom"
                };

                form.Questions.Add(new Question {
                    Type = QuestionType.CheckboxGroup,
                    Text = "The bathroom includes the following:",
                    Options = "Sink|Toilet|Shower|Bathtub"
                });

                form.Questions.Add(new Question {
                    Type = QuestionType.RadioGroup,
                    Text = "Does the toilet run for more than a minute?",
                    Options = "Yes|No"
                });

                form.Questions.Add(new Question {
                    Type = QuestionType.Dropdown,
                    Text = "Bathroom ventilation:",
                    Options = "Fan|Window|Both|No Ventilation"
                });

                form.Questions.Add(new Question {
                    Text = "Notes:",
                    Type = QuestionType.Textarea
                });

                return form;
            }

            InspectionForm CreateElectricalInspection(InspectorContext context) {
                var form = new InspectionForm {
                    Type = "Electrical"
                };

                form.Questions.Add(new Question {
                    Type = QuestionType.CheckboxGroup,
                    Text = "The bathroom includes the following:",
                    Options = "Triplex Wire|Main Feeder Wires|Panel Feed Wires|Romex|Single Strand Wire"
                });

                form.Questions.Add(new Question {
                    Type = QuestionType.RadioGroup,
                    Text = "Is more than one wire connected to a breaker/fuse?",
                    Options = "Yes|No"
                });

                form.Questions.Add(new Question {
                    Type = QuestionType.Dropdown,
                    Text = "Panel box type is:",
                    Options = "Main Panel|Lighting and Appliances|Split-bus"
                });

                form.Questions.Add(new Question {
                    Text = "Notes:",
                    Type = QuestionType.Textarea
                });

                return form;
            }

            InspectionForm CreateFireplaceInspection(InspectorContext context) {
                var form = new InspectionForm {
                    Type = "Fireplace and Chimney"
                };

                form.Questions.Add(new Question {
                    Type = QuestionType.CheckboxGroup,
                    Text = "Inspected:",
                    Options = "Fireplace|Chimney|Rain Cap"
                });

                form.Questions.Add(new Question {
                    Type = QuestionType.RadioGroup,
                    Text = "Is smoke staining present around the exterior of the firebox?",
                    Options = "Yes|No"
                });

                form.Questions.Add(new Question {
                    Type = QuestionType.Dropdown,
                    Text = "Fireplace fuel type:",
                    Options = "Electrical|Gas|Wood"
                });

                form.Questions.Add(new Question {
                    Text = "Notes:",
                    Type = QuestionType.Textarea
                });

                return form;
            }

            InspectionForm CreateHeatingInspection(InspectorContext context) {
                var form = new InspectionForm {
                    Type = "Heating and Air"
                };

                form.Questions.Add(new Question {
                    Type = QuestionType.CheckboxGroup,
                    Text = "Inspected:",
                    Options = "Heater|Air Conditioner|Ventilation System"
                });

                form.Questions.Add(new Question {
                    Type = QuestionType.RadioGroup,
                    Text = "Home size:",
                    Options = "Under 1,500 sq ft|1,500 – 3,000 sq ft|over 3,000 sq ft"
                });

                form.Questions.Add(new Question {
                    Type = QuestionType.Dropdown,
                    Text = "Heating system fuel type:",
                    Options = "Gas/Electric|Oil/Electric|Electric"
                });

                form.Questions.Add(new Question {
                    Text = "Notes:",
                    Type = QuestionType.Textarea
                });

                return form;
            }

            InspectionForm CreateKitchenInspection(InspectorContext context) {
                var form = new InspectionForm {
                    Type = "Kitchen"
                };

                form.Questions.Add(new Question {
                    Type = QuestionType.CheckboxGroup,
                    Text = "Inspected:",
                    Options = "Faucet|Garbage Disposal|Trash Compactor|Oven|Range|Refrigerator"
                });

                form.Questions.Add(new Question {
                    Type = QuestionType.RadioGroup,
                    Text = "Are there signs of a leak under the sink?",
                    Options = "Yes|No"
                });

                form.Questions.Add(new Question {
                    Type = QuestionType.Dropdown,
                    Text = "Countertop material:",
                    Options = "Natural Stone|Imitation Stone|Formica|Ceramic|Wood|Concrete|Metal"
                });

                form.Questions.Add(new Question {
                    Text = "Notes:",
                    Type = QuestionType.Textarea
                });

                return form;
            }
        }
    }
}