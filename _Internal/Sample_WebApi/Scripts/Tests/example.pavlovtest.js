QUnit.specify.globalApi = true;
pavlov.specify("Pavlov Example", function(){
  describe("Misc tests - pavlov", function(){
      var core = iblade.core;
      var Enum = core.Enum;
      
      before(function(){
          
      });

      after(function(){

      });

      it("funclet", function () {

          var foos = [
            { id: 1, name: "Abc" },
            { id: 2, name: "def" },
            { id: 3, name: "ghi" }
          ];

          assert(foos[0]).equals(core.arrayFirst(foos, core.propEq("name", "Abc")));
          assert(foos[2] === core.arrayFirst(foos, core.propEq("id", 3))).isTrue();
      });

      it("enum", function () {

          var proto = {
              isBright: function () { return this.toString().toLowerCase().indexOf("r") >= 0; },
              isShort: function () { return this.getName().length <= 4; }
          };

          var Color = new Enum(proto);
          Color.Red = Color.addSymbol();
          Color.Blue = Color.addSymbol();
          Color.Green = Color.addSymbol();

          //    Color.RedOrBlue = Color.or(Color.Red, Color.Blue);
          //    var isB = Color.RedOrBlue.isBright();
          //    var symbols = Color.symbols();
          //    var name = Color.RedOrBlue.name();

          ok(Color.Red.isBright(), "Red should be 'bright'");
          ok(!Color.Blue.isBright(), "Blue should not be 'bright'");
          ok(!Color.Green.isShort(), "Green should not be short");

          var Shape = new Enum();
          Shape.Round = Shape.addSymbol();
          Shape.Square = Shape.addSymbol();

          ok(Shape.Round.isBright === undefined, "Shape.Round.isBright should be undefined");

          ok(Color instanceof Enum, "color should be instance of Enum");
          ok(Enum.isSymbol(Color.Red), "Red should be a symbol");
          ok(Color.contains(Color.Red), "Color should contain Red");
          ok(!Color.contains(Shape.Round), "Color should not contain Round");
          ok(Color.symbols().length === 3, "There should be 3 colors defined");

          ok(Color.Green.toString() == "Green", "Green.toString should be 'Green' was:" + Color.Green.toString());
          ok(Shape.Square.parentEnum === Shape, "Shape.Square's parent should be Shape");

      });



     
    });
});