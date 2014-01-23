using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.Core {
  public static class TypeFns {

    public static bool IsAssignableFrom(this Type entityType, Type otherType) {
      return entityType.GetTypeInfo().IsAssignableFrom(otherType.GetTypeInfo());
    }

    /// <summary>
    /// Gets a single generic argument from a specified type.
    /// </summary>
    /// <param name="type"></param>
    /// <returns>null if it can't find one or result is ambiguous</returns>
    public static Type GetGenericArgument(Type type) {
      var ti =  IntrospectionExtensions.GetTypeInfo(type);
      if (!ti.IsGenericType) return null;
      var genArgs = ti.GenericTypeArguments;
      if (genArgs.Length != 1) return null;
      return genArgs[0];
    }

    /// <summary>
    /// Constructs a generic instance.
    /// </summary>
    /// <param name="genericType"></param>
    /// <param name="argTypes"></param>
    /// <returns></returns>
    public static Object ConstructGenericInstance(Type genericType, params Type[] argTypes) {
      if (genericType == null) {
        throw new ArgumentNullException("genericType");
      }

      Type finalType = genericType.MakeGenericType(argTypes);
      return Activator.CreateInstance(finalType);
    }

    /// <summary>
    /// Constructs a generic instance. Can only access public constructors.
    /// </summary>
    /// <param name="genericType"></param>
    /// <param name="argTypes"></param>
    /// <param name="constructorParams"></param>
    /// <returns></returns>
    public static Object ConstructGenericInstance(Type genericType, Type[] argTypes, params Object[] constructorParams) {
      if (genericType == null) {
        throw new ArgumentNullException("genericType");
      }

      Type finalType = genericType.MakeGenericType(argTypes);
      return Activator.CreateInstance(finalType, constructorParams);
    }

    /// <summary>
    /// Try and convert a value to the specified conversion type.
    /// </summary>
    /// <param name="value"></param>
    /// <param name="conversionType"></param>
    /// <param name="throwIfError"></param>
    /// <returns></returns>
    public static object ConvertType(object value, Type conversionType, bool throwIfError) {
      if (value == null) return null;
      return Convert.ChangeType(value, conversionType, CultureInfo.CurrentCulture);
      // wont compile on PCL
      //try {
      //  if (typeof(IConvertible).IsAssignableFrom(conversionType)) {
      //    return Convert.ChangeType(value, conversionType, System.Threading.Thread.CurrentThread.CurrentCulture);
      //  }
      //  // Guids fail above - try this
      //  TypeConverter typeConverter = TypeDescriptor.GetConverter(conversionType);
      //  return typeConverter.ConvertFrom(value);
      //} catch {
      //  if (throwIfError) throw;
      //}
      //return null;
    }


  }
}
