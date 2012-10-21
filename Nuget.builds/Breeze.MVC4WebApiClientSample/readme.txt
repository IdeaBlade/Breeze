Breeze MVC4 Web API Client Sample Nuget Package ReadMe
-------------------------------------------------------

This readme covers

- How to try this Breeze Web API Client sample
- The inventory of items added by this nuget package

See documentation at http://www.breezejs.com to learn more.

-------------------------------------------------------
TRY IT

* Run with debug (F5) of without debug (ctrl-F5)

* After a pause to build the database, you should see a browser page displaying a list of sample items.

* Each item is a ToDo item. You can edit the items and save changes by clicking the link.

* Click the checkbox to mark an item "done" or "not done". Save changes again.

* Refresh the browser to confirm changes OR

* Toggle the "include done" checkbox to refresh the list with either all items or just the items "not done".


-------------------------------------------------------
WHAT THIS PACKAGE ADDED


This package depends upon and extends the Breeze MVC4 Web API Nuget Package
by adding a simple HTML/JavaScript client that uses Breeze to
to display, edit, and save changes.

It automatically includes the Breeze MVC4 Web API Nuget Package if it is not already installed.

It also depends upon 3 other NuGet packages and will install them if not present:
- jQuery v.1.7.1 
- Knockout v.2.1.0
- Modernizr v.2.5.3

This specific nuget package added the following files to this project.

One configuration file

	App_Start/BreezeConfig_ClientSample.cs

One CSS content file

	Content/breezesample.css

One MVC 4 Controller

	Controllers/BreezeSampleShellController.cs

One MVC 4 Shell View

	Views/BreezeSampleShell/index.cshtml


Two application scripts

	Scripts/app/logger.js
	Scripts/app/sampleViewModel.js
	