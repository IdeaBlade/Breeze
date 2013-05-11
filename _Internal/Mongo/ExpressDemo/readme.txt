To compile odataParser.peg

insure that pegjs is installed both globally and locally

run from cmd.
   pegjs odataParser.peg

this should generate a 'node' aware js file
   odataParser.js

that can be used via

require("odataParser.js");