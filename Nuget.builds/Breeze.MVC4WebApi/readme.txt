Breeze MVC4 Web API Nuget Package ReadMe
------------------------------------------

This readme covers

- How to try this Breeze Web API sample
- The inventory of items added by this nuget package

See documentation at http://www.breezejs.com to learn more.

------------------------------------------
TRY IT

1. Run with debug (F5) of without debug (ctrl-F5)
2. Append "/api/BreezeSample/metadata" to browser address bar, e.g., http://localhost:42494/api/BreezeSample/metadata
3. Append "/api/BreezeSample/samples" to browser address bar, e.g., http://localhost:42494/api/BreezeSample/samples

*** VIEWING IS EASIER IN NON-IE BROWSERS, IF USING IE, SEE NOTE BELOW.  ***

#2 should produce metadata as JSON such as

<string xmlns="http://schemas.microsoft.com/2003/10/Serialization/">
{"conceptualModels":{"schema":{"namespace":"$rootname$.Models","alias":"Self","d4p1:UseStrongSpatialTypes":"false","xmlns:d4p1":"http://schemas.microsoft.com/ado/2009/02/edm/annotation","xmlns":"http://schemas.microsoft.com/ado/2009/11/edm","entityType":{"name":"BreezeSampleItem","key":{"propertyRef":{"name":"Id"}},"property":[{"name":"Id","type":"Edm.Int32","nullable":"false","d4p1:StoreGeneratedPattern":"Identity"},{"name":"Description","type":"Edm.String","fixedLength":"false","maxLength":"Max","unicode":"true","nullable":"true"},{"name":"IsDone","type":"Edm.Boolean","nullable":"false"}]},"entityContainer":{"name":"BreezeSampleContext","entitySet":{"name":"Samples","entityType":"Self.BreezeSampleItem"}}}}}
</string>


#3 should trigger database creation and initialization, returning JSON 

<ArrayOfBreezeSampleItem xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://schemas.datacontract.org/2004/07/$rootname$.Models">
<BreezeSampleItem>
    <Description>Wake up</Description>
    <Id>1</Id>
    <IsDone>false</IsDone>
</BreezeSampleItem>
<BreezeSampleItem>
    <Description>Do dishes</Description>
    <Id>2</Id>
    <IsDone>true</IsDone>
</BreezeSampleItem>
...
</ArrayOfBreezeSampleItem>

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

------------------------------------------
WHAT THIS PACKAGE ADDED

The nuget package added the following files to this project.

-- always needed --

Two referenced assemblies

	Breeze.WebApi
	Irony

Four scripts

	Scripts/breeze.min.js
	Scripts/breeze.debug.js
	Scripts/q.js
	Scripts/q.min.js

One configuration file

	App_Start/BreezeConfig.cs 
	
-- sample only --

Sample EF Code First model, DbContext, and initializer

	Models/BreezeSampleItem.cs
	Models/BreezeSampleContext.cs
	Models/BreezeSampleDatabaseInitializer.cs

Sample Breeze Web API controller

	Controllers/BreezeSampleController