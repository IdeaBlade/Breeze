using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient.Core {
  // Note: Do not make this public yet - too hard to understand and use ( but usefull);
  internal static class MethodReflector {

    /*
    /// MethodInfo info = 
    ///   MethodReflector.Get<SomeType, string, int>((x, y, z) => x.SomeMethod(y, z));
    ///  vs
    /// MethodInfo info =   
    ///   typeof(SomeType).GetMethod("SomeMethod", new Type[] { typeof(string), typeof(int) }));
    */

    public delegate object Operation();
    public delegate object Operation<T>(T declaringType);
    public delegate object Operation<T, A0>(T declaringType, A0 arg0);
    public delegate object Operation<T, A0, A1>(T declaringType, A0 arg0, A1 arg1);

    public static MethodInfo Get<TDeclaringType>(Expression<Operation> method) {
      return GetMethodInfo(method);
    }

    public static MethodInfo Get<TDeclaringType>(Expression<Operation<TDeclaringType>> method) {
      return GetMethodInfo(method);
    }

    public static MethodInfo Get<TDeclaringType, A0>(Expression<Operation<TDeclaringType, A0>> method) {
      return GetMethodInfo(method);
    }

    public static MethodInfo Get<TDeclaringType, A0, A1>(Expression<Operation<TDeclaringType, A0, A1>> method) {
      return GetMethodInfo(method);
    }

    private static MethodInfo GetMethodInfo(Expression method) {

      LambdaExpression lambda = method as LambdaExpression;
      if (lambda == null) throw new ArgumentNullException("method");
      MethodCallExpression methodExpr = null;
      // Our Operation<T> returns an object, so first statement can be either 
      // a cast (if method does not return an object) or the direct method call.
      if (lambda.Body.NodeType == ExpressionType.Convert) {
        // The cast is an unary expression, where the operand is the actual method call expression.
        methodExpr = ((UnaryExpression)lambda.Body).Operand as MethodCallExpression;
      } else if (lambda.Body.NodeType == ExpressionType.Call) {
        // || lambda.Body.NodeType == ExpressionType.CallVirtual) {
        methodExpr = lambda.Body as MethodCallExpression;
      } else {
        throw new ArgumentException("method");
      }
      return methodExpr.Method;

    }
  }
}
