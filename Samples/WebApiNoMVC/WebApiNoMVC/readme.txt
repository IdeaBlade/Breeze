Demo Web API without MVC
-------------------------
Demonstrates building a Breeze Web API without MVC
Reuses the model and controller from BreezyDevices sample
No UI

TRY IT
---------------------------------------------
API calls


HOW TO BUILD IT FROM FILE | NEW | PROJECT
-------------------------------------------------
Start from ASP.NET Empty Web Application

Add NuGet packages
- ASP.NET Web Api - The entire Web API stack of packages
- Breeze Web Api  - The Breeze JS files and the Breeze Web Api support. No MVC
- EntityFramework.SqlServerCompact - DEMO - to support the BreezyDevices sample database


/* BreezeDevices Web API and server-side model ... for example purposes only
- App_Data directory to hold the db (and its .gitignore and readme.txt)

- Controllers/BreezyDevicesController.cs

- Models/
    BreezyDevicesContext.cs
    BreezyDevicesDatabaseInitializer.cs
    Device.cs
    Person.cs

- WebConfig - add a connection string for the sample
      <connectionStrings>
         <add name="BreezyDevicesContext" connectionString="Data Source=|DataDirectory|BreezyDevices.sdf" providerName="System.Data.SqlServerCe.4.0" />
      </connectionStrings>