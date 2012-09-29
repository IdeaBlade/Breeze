

QUnit.config.autostart = false;
require.config({ baseUrl: "Scripts/Tests" });
require([
      //"paramTests",
      // "miscTests",
      //"koSpecificTests",
      //"attachTests",
      //"classRewriteTests",
      //"metadataTests",
      //"entityManagerTests",
      //"entityQueryCtorTests",
      //"entityTests",
      //"queryTests",
      //"queryDatatypeTests",
      "namedQueryTests",
      //"rawOdataQueryTests",
      //"validateTests",
      //"validateEntityTests",
      // "saveTests"

], function (testFns) {
    document.getElementById("title").appendChild(document.createElement('pre')).innerHTML = testFns.message;
    QUnit.start(); //Tests loaded, run tests

});

