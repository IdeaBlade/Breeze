# Breeze.js Runtime Package / Breeze.js Runtime Package + Samples

The runtime package includes 

Breeze Client Runtime JavaScript Files
---------------------------------------

All Breeze JavaScript files are in the Scripts folder.

The breeze.debug.js is the all-in-one JavaScript file. You will likely develop with this one. Breeze.js is its minified version and breeze.intellisense.js is its intellisense file.

The all-in-one scripts include every AJAX, ModelLibrary and Dataservice adapter we ship. Your application may only need one adapter from each category.

Therefore this package also includes a "base" Breeze version (breeze.base.debug.js) with no adapters (breeze.base.min.js) is the minified version). You can deploy this script and the adapter scripts you need, drawn from the Adapters folder.

Finally, the Scripts folder includes the "Q" promises library (plain and minified) from https://github.com/kriskowal/q. Breeze depends on "Q".

Breeze Runtime Server Files
----------------------------
Dlls for building backend services with ASP.NET Web API/Web API 2.

Samples
------
The runtime-plus-samples package includes everything in the runtime package plus the sample applications, including the DocCode companion to the Breeze online documentation.

-------------------------------------------------------------------------------------

Please visit the
[Breezejs download](http://www.breezejs.com/documentation/download) page for more information about this package.

Copyright 2013 IdeaBlade, Inc.
