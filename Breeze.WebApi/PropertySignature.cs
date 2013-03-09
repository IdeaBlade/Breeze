using System;
using System.Reflection;
using System.Linq;
using System.Linq.Expressions;
using System.Collections.Generic;


namespace Breeze.WebApi {

  internal class PropertySignature  {
    public PropertySignature(Type instanceType, String propertyPath) {
      InstanceType = instanceType;
      PropertyPath = propertyPath;
      Properties = GetProperties(InstanceType, PropertyPath).ToList();
    }

    public Type InstanceType { get; private set; }
    public String PropertyPath { get; private set; }
    public List<PropertyInfo> Properties { get; private set; }

    public String Name {
      get { return Properties.Select(p => p.Name).ToAggregateString("_"); }
    }

    public Type ReturnType {
      get { return Properties.Last().PropertyType; }
    }

    private IEnumerable<PropertyInfo> GetProperties(Type instanceType, String propertyPath) {
      var propertyNames = propertyPath.Split('.');

      var nextInstanceType = instanceType;
      foreach (var propertyName in propertyNames) {
        var property = GetProperty(nextInstanceType, propertyName);
        yield return property;
        nextInstanceType = property.PropertyType;
      }
    }

    private PropertyInfo GetProperty(Type instanceType, String propertyName) {
      var propertyInfo = (PropertyInfo)TypeFns.FindPropertyOrField(instanceType, propertyName,
        BindingFlags.Instance | BindingFlags.DeclaredOnly | BindingFlags.Public);
      if (propertyInfo == null) {
        var msg = String.Format("Unable to locate property '{0}' on type '{1}'.", propertyName, instanceType);
        throw new Exception(msg);
      }
      return propertyInfo;
    }

    public Expression BuildMemberExpression(ParameterExpression parmExpr) {
      Expression memberExpr = BuildPropertyExpression(parmExpr, Properties.First());
      foreach (var property in Properties.Skip(1)) {
        memberExpr = BuildPropertyExpression(memberExpr, property);
      }
      return memberExpr;
    }

    public Expression BuildPropertyExpression(Expression baseExpr, PropertyInfo property) {
      return Expression.Property(baseExpr, property);
    }

    
    
  }

 
}
