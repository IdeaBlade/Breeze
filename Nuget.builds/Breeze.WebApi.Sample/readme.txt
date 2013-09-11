"Breeze for ASP.NET MVC4 Web Api Sample" NuGet Package ReadMe
-------------------------------------------------------
This package installs a simple sample applications that 
a) helps confirm your breeze project is setup properly
b) demonstrates elementary Breeze application setup

This package depends upon the Breeze.WebApi package which
adds essential Breeze script files and .NET Web Api libraries to your project.

This readme covers

- Trying the "Breeze for ASP.NET MVC4 Web Api Sample" application
- Trying the Web API calls of that application
- The inventory of items added by this nuget package

Visit http://www.breezejs.com/documentation/start-nuget to learn more.

-------------------------------------------------------
TRY THE SAMPLE APPLICATION

* Run with debug (F5) or without debug (ctrl-F5)

* After a pause to build the database, you should see a browser page displaying a list of sample items.

* Each item is a ToDo item. You can edit the items and save changes by clicking the link.

* Click the checkbox to mark an item "done" or "not done". Save changes again.

* Refresh the browser to confirm changes OR

* Toggle the "include done" checkbox to refresh the list with either all items or just the items "not done".

------------------------------------------
TRY THE BREEZE SAMPLE WEB API CONTROLLER

1. Run with debug (F5) of without debug (ctrl-F5)
2. Append "/breeze/BreezeSample/metadata" to browser address bar, e.g., http://localhost:42494/breeze/BreezeSample/metadata
3. Append "/breeze/BreezeSample/todos" to browser address bar, e.g., http://localhost:42494/breeze/BreezeSample/todos

*** VIEWING IS EASIER IN NON-IE BROWSERS, IF USING IE, SEE NOTE BELOW.  ***

#2 should produce metadata as JSON such as

<string xmlns="http://schemas.microsoft.com/2003/10/Serialization/">
{"conceptualModels":{"schema":{"namespace":"%rootname%.Models","alias":"Self","d4p1:UseStrongSpatialTypes":"false","xmlns:d4p1":"http://schemas.microsoft.com/ado/2009/02/edm/annotation","xmlns":"http://schemas.microsoft.com/ado/2009/11/edm","entityType":{"name":"BreezeSampleTodoItem","key":{"propertyRef":{"name":"Id"}},"property":[{"name":"Id","type":"Edm.Int32","nullable":"false","d4p1:StoreGeneratedPattern":"Identity"},{"name":"Description","type":"Edm.String","fixedLength":"false","maxLength":"Max","unicode":"true","nullable":"true"},{"name":"IsDone","type":"Edm.Boolean","nullable":"false"}]},"entityContainer":{"name":"BreezeSampleContext","entitySet":{"name":"Todos","entityType":"Self.BreezeSampleTodoItem"}}}}}
</string>


#3 should trigger database creation and initialization, returning JSON 

<ArrayOfBreezeSampleTodoItem xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://schemas.datacontract.org/2004/07/$rootname$.Models">
<BreezeSampleTodoItem>
    <Description>Wake up</Description>
    <Id>1</Id>
    <IsDone>false</IsDone>
</BreezeSampleTodoItem>
<BreezeSampleTodoItem>
    <Description>Do dishes</Description>
    <Id>2</Id>
    <IsDone>true</IsDone>
</BreezeSampleTodoItem>
...
</ArrayOfBreezeSampleTodoItem>

------------------------------------------
VIEWING JSON RESULTS IN IE

IE browser security prevents display of JSON objects within the browser.
You can still view the JSON response by doing the following:

* A dialog asks "Do you want to open or save ... from localhost"
  (This dialog is often at the bottom of the browser window).

* Click the "Open" button
* A dialog offers programs with which to open the data file
* Pick Notepad or your favorite text editor
* Click "OK"
* Another dialog asks you to confirm your choice; click "Open"

-------------------------------------------------------
WHAT THIS PACKAGE ADDED

This package depends upon and extends the "Breeze.WebApi" NuGet Package
by adding a simple MVC4 HTML/JavaScript application that uses Breeze
to display, edit, and save changes.

It automatically includes the "Breeze Web Api" NuGet Package if it is not already installed.

This specific nuget package added the following files to this project,
shown from "back to front" from the Model on the server to the client.

Sample EF Code First model, DbContext, and initializer

	Models/BreezeSampleTodoItem.cs
	Models/BreezeSampleContext.cs
	Models/BreezeSampleDatabaseInitializer.cs

Two Controllers

	Controllers/BreezeSampleController.cs      - the app's Web Api controller
	Controllers/BreezeSampleShellController.cs - the app's MVC controller

One MVC 4 Shell View

	Views/BreezeSampleShell/index.cshtml

One configuration file

	App_Start/BreezeClientSampleRouteConfig.cs - to make the sample app the start page

One CSS content file

	Content/breezesample.css

Two 3rd party scripts

	Scripts/app/jquery-1.7.1.min.js
	Scripts/app/knockout-2.1.0.js
	
    [Breeze and Q were added previously by the base package]

Two application scripts

	Scripts/app/logger.js
	Scripts/app/sampleViewModel.js

-------------------------------------------------------	
Artifacts added by the "Breeze.WebApi" NuGet package
are described in the readme file for that package and on the web at
http://www.breezejs.com/documentation/start-nuget