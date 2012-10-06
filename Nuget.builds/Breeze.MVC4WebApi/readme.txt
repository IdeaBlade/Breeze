Breeze MVC4 Web API Nuget Package ReadMe
------------------------------------------

This readme covers

- What to do next
- How to try this Breeze Web API sample
- The inventory of items added by this nuget package

See documentation at http://www.breezejs.com to learn more.

------------------------------------------
NEXT STEPS

We leave 2 manual steps to you rather than modify your existing project files:


1. Add this Breeze route to the top of the Register method in App_Start/WebApiConfig.cs

   config.Routes.MapHttpRoute(
   name: "BreezeApi",
   routeTemplate: "api/{controller}/{action}"
   );

   
2. Add the following lines to the bottom of the Application_Start() method in Global.asax

   BreezeConfig.RegisterBreeze();

   // DEVELOPMENT ONLY: initialize the database
   System.Data.Entity.Database.SetInitializer(
      new Models.BreezeSampleDatabaseInitializer());


Please also confirm that you have the following assembly redirect in the <runtime> section of your web.config:

      <dependentAssembly>
        <assemblyIdentity name="EntityFramework" publicKeyToken="b77a5c561934e089" culture="neutral"/>
        <bindingRedirect oldVersion="0.0.0.0-5.0.0.0" newVersion="5.0.0.0"/>
      </dependentAssembly>


------------------------------------------
TRY IT

1. Run with debug (F5)
2. Append "/api/breezesample/metadata" to browser address bar, e.g., http://localhost:42494/api/breezesample/metadata
3. Append "/api/breezesample/samples" to browser address bar, e.g., http://localhost:42494/api/breezesample/samples


#2 should produce metadata as JSON such as

	<string xmlns="http://schemas.microsoft.com/2003/10/Serialization/">
	{"conceptualModels":{"schema":{"namespace":"$rootname$.Models","alias":"Self","d4p1:UseStrongSpatialTypes":"false","xmlns:d4p1":"http://schemas.microsoft.com/ado/2009/02/edm/annotation","xmlns":"http://schemas.microsoft.com/ado/2009/11/edm","entityType":{"name":"BreezeSampleItem","key":{"propertyRef":{"name":"Id"}},"property":[{"name":"Id","type":"Edm.Int32","nullable":"false","d4p1:StoreGeneratedPattern":"Identity"},{"name":"Name","type":"Edm.String","fixedLength":"false","maxLength":"Max","unicode":"true","nullable":"true"}]},"entityContainer":{"name":"BreezeSampleContext","entitySet":{"name":"SampleItems","entityType":"Self.BreezeSampleItem"}}}}}
	</string>


#3 should trigger database creation and initialization, returning JSON 

	<ArrayOfBreezeSampleItem xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://schemas.datacontract.org/2004/07/{project-name}.Models">
	<BreezeSampleItem>
	<Id>1</Id>
	<Name>Value 1</Name>
	</BreezeSampleItem>
	<BreezeSampleItem>
	<Id>2</Id>
	<Name>Value 2</Name>
	</BreezeSampleItem>
	</ArrayOfBreezeSampleItem>


------------------------------------------
WHAT WAS ADDED

The nuget package added material to the $rootname$ project.

-- always needed --

Two referenced assemblies

	Breeze.WebApi
	Irony

Four scripts

	Scripts/breeze.min.js
	Scripts/breeze.debug.js
	Scripts/q.js
	Scripts/q.min.js


-- sample only --

Sample EF Code First model, DbContext, and initializer

	Models/BreezeSampleItem.cs
	Models/BreezeSampleContext.cs
	Models/BreezeSampleDatabaseInitializer.cs

Sample Breeze Web API controller

	Controllers/BreezeSampleController