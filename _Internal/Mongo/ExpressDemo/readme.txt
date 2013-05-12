To compile odataParser.peg

    insure that pegjs is installed both globally and locally

    run from cmd.
       pegjs odataParser.peg

    this should generate a 'node' aware js file
       odataParser.js

    that can be used via

    require("odataParser.js");

To run odataParser testing

    run parseTest

To run server

    start mongo
       run startdb.bat
    run server.js
    from browser, hit:
       http://localhost:3000/breeze/Products/?$filter=ReorderLevel gt 25


TODO:
    more precedence work - esp: not
