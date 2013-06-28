# Breeze.js

Breeze is a data management library for JavaScript that makes it easy to query data from the server. Breeze’s simple, yet powerful API allows you to make complex queries against the server, cache the data on the client for performance, and supports offline scenarios.

When used with a databinding framework like Knockout, Breeze enables you to code in a familiar architectural pattern like MVC or MVVM and keep your view separate from your business logic.

## Issues and Wiki
The GitHub Issues and Wiki have been disabled. Please post all questions and issues to [StackOverflow tagged with breeze](http://stackoverflow.com/questions/tagged/breeze?sort=newest).

## Official releases

The Breeze source is free, open-source, and available here on GitHub. If you don't need the full source code, you can download one of the official releases.

###[Runtime and Runtime + samples](http://www.breezejs.com/documentation/download)
The Runtime package includes breeze.debug.js, its minified version, breeze.js, and Breeze.webApi.dll and Irony.dll for building backend services with an ASP Web API.

Runtime + samples includes the same, plus the code samples and the DocCode companion to the Breeze online documentation. 

## Dependencies
Please note: Both Q and jQuery are both included in the Runtime + samples package. they are not included in the Runtime package.

###[Q.js](https://github.com/kriskowal/q)
We use Q.js for making and composing asynchronus promises.

###[jQuery](http://jquery.com/)
We only use jQuery for Ajax calls. We'll eventually make it so you can use your own Ajaxlibrary.

## Prerequisites
To build the Todo sample the following must first be installed on your system:

If you're using Visual Studio 2010:
- ASP.NET MVC 4 
- Web Platform Installer
- IIS Express
- You must allow NuGet to download packages during builds. (Tools > Library Package Manager > Package Manager Settings)

If you're using Visual Studio 2012:
- None. VS 2012 takes care of it all as long as you allow NuGet to download packages during builds.



## Learn more

   * [Breezejs.com](http://www.breezejs.com/)
   * [Docs](http://www.breezejs.com/documentation/introduction)
   * [API](http://www.breezejs.com/sites/all/apidocs/index.html)

##Contact us

### Support

Ask questions at [Stack Overflow](http://stackoverflow.com/questions/tagged/breeze?sort=newest) and get answers from support engineers, MVPs, and developers just like you.

### Email

If you prefer to email us, please contact us at [breeze@ideablade.com](mailto:breeze@ideablade.com).

### Social

Follow [@IdeaBlade](http://twitter.com/#!/ideablade) on Twitter and [Facebook](https://www.facebook.com/IdeaBlade) to get the latest information.

## Version history

Please read the release notes at [Breezejs.com](http://www.breezejs.com/documentation/download#release notes).
 

## Copyright and license
Copyright 2013 IdeaBlade, Inc.

Breeze uses the [MIT license](http://opensource.org/licenses/mit-license.php).
