** "public": the Express override directory **

The 'public' directory parallels the 'zza' directory.

The express server, when looking for static content, will prefer a file found here to the same named file in 'zza'.

Thus we can 'replace' (or 'override') files in 'zza' with versions specific to our needs in the Express/Mongo version of the Zza app.

This is accomplished in server.js by registering the static module twice under '/' with two different paths.
    app.use('/', express.static(expressAppdir)); // look for overrides on express server 1st
    app.use('/', express.static(appDir));    // then look in regular zza
