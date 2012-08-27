using Irony.Parsing;

namespace Breeze.WebApi {

  [Language("ODataFilterGrammar", "1.65", "OData $filter grammar")]
  public class ODataFilterGrammar : Grammar {
    public ODataFilterGrammar() {
      //Terminals

      var simpleIdentifier = TerminalFactory.CreateCSharpIdentifier("Identifier");
      var stringLiteral = new StringLiteral("StringLiteral", "'", StringOptions.NoEscapes | StringOptions.AllowsDoubledQuote);
      var numberLiteral = new NumberLiteral("NumberLiteral");
      
      // This impl has problems with .NET 4.5 - so ToTerm methods below were used instead.
      //var constant = new ConstantTerminal("Constant", typeof(Object));
      //constant.Add("true", true);
      //constant.Add("false", false);
      //constant.Add("null", null);
      var trueLiteral = ToTerm("true", "Constant");
      var falseLiteral = ToTerm("false", "Constant");
      var nullLiteral = ToTerm("null", "Constant");

      var dateTimeOffsetLiteral = new StringLiteral("DateTimeOffsetLiteral");
      dateTimeOffsetLiteral.AddStartEnd("datetimeoffset'","'", StringOptions.None);
      var dateTimeLiteral = new StringLiteral("DateTimeLiteral");
      dateTimeLiteral.AddStartEnd("datetime'", "'", StringOptions.None);
      var timeLiteral = new StringLiteral("TimeLiteral");
      timeLiteral.AddStartEnd("time'", "'", StringOptions.None);
      var guidLiteral = new StringLiteral("GuidLiteral");
      guidLiteral.AddStartEnd("guid'", "'", StringOptions.None);

      //NonTerminals
      var baseExpr = new NonTerminal("BaseExpr");
      var compositeIdentifier = new NonTerminal("CompositeIdentifier");
      var parenExpr = new NonTerminal("ParenExpr");
      var methodCallExpr = new NonTerminal("MethodCallExpr"); 
      var literalExpr = new NonTerminal("LiteralExpr");
      var subExpr= new NonTerminal("SubExpr");
      var lambdaExpr = new NonTerminal("LambdaExpr");
      var lambdaVariable = new NonTerminal("LambdaVariable");

      var memberExpr = new NonTerminal("MemberExpr");
      var binaryExpr = new NonTerminal("BinaryExpr"); 
      var binaryExprOp = new NonTerminal("BinaryExprOp");
      var unaryExpr = new NonTerminal("UnaryExpr"); 
      var unaryExprOp = new NonTerminal("UnaryExprOp");      

      #region Methods
      // bool
      var anyMethodCallExpr = new NonTerminal("AnyMethodCallExpr");
      var allMethodCallExpr = new NonTerminal("AllMethodCallExpr");
      var substringOfMethodCallExpr = new NonTerminal("SubstringOfMethodCallExpr"); 
      var endsWithMethodCallExpr = new NonTerminal("EndsWithMethodCallExpr"); 
      var startsWithMethodCallExpr = new NonTerminal("StartsWithMethodCallExpr");

      // int
      var lengthMethodCallExpr = new NonTerminal("LengthMethodCallExpr"); 
      var indexOfMethodCallExpr = new NonTerminal("IndexOfMethodCallExpr"); 

      // string
      var replaceMethodCallExpr = new NonTerminal("ReplaceMethodCallExpr"); 
      var substring1MethodCallExpr = new NonTerminal("Substring1MethodCallExpr"); 
      var substring2MethodCallExpr = new NonTerminal("Substring2MethodCallExpr"); 
      var toLowerMethodCallExpr = new NonTerminal("ToLowerMethodCallExpr"); 
      var toUpperMethodCallExpr = new NonTerminal("ToUpperMethodCallExpr"); 
      var trimMethodCallExpr = new NonTerminal("TrimMethodCallExpr"); 
      var concatMethodCallExpr = new NonTerminal("ConcatMethodCallExpr"); 

      // date
      var secondMethodCallExpr = new NonTerminal("SecondMethodCallExpr"); 
      var minuteMethodCallExpr = new NonTerminal("MinuteMethodCallExpr"); 
      var hourMethodCallExpr = new NonTerminal("HourMethodCallExpr"); 
      var dayMethodCallExpr = new NonTerminal("DayMethodCallExpr"); 
      var monthMethodCallExpr = new NonTerminal("MonthMethodCallExpr"); 
      var yearMethodCallExpr = new NonTerminal("YearMethodCallExpr"); 

      // math
      var roundMethodCallExpr = new NonTerminal("RoundMethodCallExpr"); 
      var floorMethodCallExpr = new NonTerminal("FloorMethodCallExpr"); 
      var ceilingMethodCallExpr = new NonTerminal("CeilingMethodCallExpr"); 

      // type
      var isOf1MethodCallExpr = new NonTerminal("isOf1MethodCallExpr"); 
      var isOf2MethodCallExpr = new NonTerminal("isOf2MethodCallExpr"); 

      #endregion

      Root = baseExpr;
      baseExpr.Rule = parenExpr
                    | literalExpr
                    | memberExpr
                    | methodCallExpr
                    | binaryExpr
                    | unaryExpr;

   
      parenExpr.Rule = "(" + baseExpr + ")";
      literalExpr.Rule = stringLiteral
                        | numberLiteral
                        // | constant
                        | trueLiteral | falseLiteral | nullLiteral
                        | dateTimeLiteral
                        | dateTimeOffsetLiteral
                        | timeLiteral
                        | guidLiteral;

      subExpr.Rule = simpleIdentifier | anyMethodCallExpr | allMethodCallExpr;

      KeyTerm backSlash = ToTerm("/", "backslash");
      compositeIdentifier.Rule = MakePlusRule(compositeIdentifier, backSlash, subExpr);
      memberExpr.Rule =  compositeIdentifier;

      lambdaVariable.Rule = simpleIdentifier + ":";
      lambdaExpr.Rule = lambdaVariable + baseExpr;

      unaryExpr.Rule = unaryExprOp + baseExpr;
      unaryExprOp.Rule = (BnfExpression) "not" | "-";

      binaryExpr.Rule = baseExpr + binaryExprOp + baseExpr;
      binaryExprOp.Rule = (BnfExpression)"eq" | "ne" | "lt" | "le" | "gt" | "ge" | "add" | "sub" | "mul" | "div" | "mod" | "and" | "or";

      methodCallExpr.Rule = anyMethodCallExpr
                          | allMethodCallExpr
                          | replaceMethodCallExpr
                          | substring1MethodCallExpr
                          | substring2MethodCallExpr
                          | toLowerMethodCallExpr
                          | toUpperMethodCallExpr
                          | trimMethodCallExpr
                          | concatMethodCallExpr
                          | lengthMethodCallExpr
                          | indexOfMethodCallExpr
                          | secondMethodCallExpr
                          | minuteMethodCallExpr
                          | hourMethodCallExpr
                          | dayMethodCallExpr
                          | monthMethodCallExpr
                          | yearMethodCallExpr
                          | roundMethodCallExpr
                          | floorMethodCallExpr
                          | ceilingMethodCallExpr
                          | isOf1MethodCallExpr
                          | isOf2MethodCallExpr
                          | substringOfMethodCallExpr
                          | startsWithMethodCallExpr
                          | endsWithMethodCallExpr;

      anyMethodCallExpr.Rule = (BnfExpression) "any" + "(" + lambdaExpr + ")";
      allMethodCallExpr.Rule = (BnfExpression) "all" + "(" + lambdaExpr + ")";
      replaceMethodCallExpr.Rule = (BnfExpression)"replace" + "(" + baseExpr + "," + baseExpr + "," + baseExpr + ")";
      substring1MethodCallExpr.Rule = (BnfExpression)"substring" + "(" + baseExpr + "," + baseExpr + ")";
      substring2MethodCallExpr.Rule = (BnfExpression)"substring" + "(" + baseExpr + "," + baseExpr + "," + baseExpr + ")";
      toLowerMethodCallExpr.Rule = (BnfExpression)"tolower" + "(" + baseExpr + ")";
      toUpperMethodCallExpr.Rule = (BnfExpression)"toupper" + "(" + baseExpr + ")";
      trimMethodCallExpr.Rule = (BnfExpression)"trim" + "(" + baseExpr + ")";
      concatMethodCallExpr.Rule = (BnfExpression)"concat" + "(" + baseExpr + "," + baseExpr + ")";

      lengthMethodCallExpr.Rule = (BnfExpression)"length" + "(" + baseExpr + ")";
      indexOfMethodCallExpr.Rule = (BnfExpression)"indexof" + "(" + baseExpr + "," + baseExpr + ")";

      substringOfMethodCallExpr.Rule = (BnfExpression)"substringof" + "(" + baseExpr + "," + baseExpr + ")";
      startsWithMethodCallExpr.Rule = (BnfExpression)"startswith" + "(" + baseExpr + "," + baseExpr + ")";
      endsWithMethodCallExpr.Rule = (BnfExpression)"endswith" + "(" + baseExpr + "," + baseExpr + ")";

      secondMethodCallExpr.Rule = (BnfExpression)"second" + "(" + baseExpr + ")";
      minuteMethodCallExpr.Rule = (BnfExpression)"minute" + "(" + baseExpr + ")";
      hourMethodCallExpr.Rule = (BnfExpression)"hour" + "(" + baseExpr + ")";
      dayMethodCallExpr.Rule = (BnfExpression)"day" + "(" + baseExpr + ")";
      monthMethodCallExpr.Rule = (BnfExpression)"month" + "(" + baseExpr + ")";
      yearMethodCallExpr.Rule = (BnfExpression)"year" + "(" + baseExpr + ")";

      roundMethodCallExpr.Rule = (BnfExpression)"round" + "(" + baseExpr + ")";
      ceilingMethodCallExpr.Rule = (BnfExpression)"ceiling" + "(" + baseExpr + ")";
      floorMethodCallExpr.Rule = (BnfExpression)"floor" + "(" + baseExpr + ")";

      isOf1MethodCallExpr.Rule = (BnfExpression)"isof" + "(" + baseExpr + ")";
      isOf2MethodCallExpr.Rule = (BnfExpression)"isof" + "(" + baseExpr + "," + baseExpr + ")";

      
      RegisterOperators(10, "or");
      RegisterOperators(20, "and");
      RegisterOperators(30, "eq", "ne", "lt", "le", "gt", "ge");
      RegisterOperators(40, "add", "sub", "mul", "div", "mod");
      RegisterOperators(50, "-");

      RegisterBracePair("(", ")");

      MarkPunctuation(",", "(", ")" , "/", ":");

      MarkTransient(baseExpr);
      MarkTransient(binaryExprOp);
      MarkTransient(unaryExprOp);

      MarkTransient(parenExpr);
      MarkTransient(methodCallExpr);
      MarkTransient(literalExpr);
      MarkTransient(subExpr);
      MarkTransient(lambdaVariable);

    }
  }
}

