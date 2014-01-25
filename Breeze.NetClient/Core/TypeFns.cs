using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Reflection;

namespace Breeze.Core {
  public static class TypeFns {

    /// <summary>
    /// Gets the default value for a specified type.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static object GetDefaultValue(Type type) {
      if (type == null) return null;
      if (!type.GetTypeInfo().IsValueType) return null;

      NullableInfo result;
      if (NullableInfoMap.TryGetValue(type, out result)) {
        return result.DefaultValue;
      } else {
        return Activator.CreateInstance(type);
      }
    }

    #region Type conversion

    public static bool IsAssignableFrom(this Type entityType, Type otherType) {
      return entityType.GetTypeInfo().IsAssignableFrom(otherType.GetTypeInfo());
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
      try {
        if (conversionType == typeof(Guid)) {
          return Guid.Parse(value.ToString());
        } else {
          // doesn't work for guids
          return Convert.ChangeType(value, conversionType, CultureInfo.CurrentCulture);
        }
      } catch {
        if (throwIfError) throw;
        return null;
      }

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

    #endregion

    #region Generic handling

    /// <summary>
    /// Constructs a generic instance.
    /// </summary>
    /// <param name="genericType"></param>
    /// <param name="argTypes"></param>
    /// <returns></returns>
    public static Object CreateGenericInstance(Type genericType, params Type[] argTypes) {
      if (genericType == null) {
        throw new ArgumentNullException("genericType");
      }

      Type finalType = genericType.MakeGenericType(argTypes);
      return Activator.CreateInstance(finalType);
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

    #endregion

    #region Types from Assembly

    public static Type[] GetTypesImplementing(Type type, Assembly assembly) {
      if (type == null) {
        throw new ArgumentNullException("type");
      }
      if (assembly == null) {
        throw new ArgumentNullException("assembly");
      }

      var types = GetTypes(assembly)
        .Where(t => type.IsAssignableFrom(t))
        .ToArray();
      return types;
    }

    /// <summary>
    /// Returns a list of all of the types in one or more assemblies that implement a specific
    /// interface or extend a specific class.
    /// </summary>
    /// <param name="type">Interface or base type</param>
    /// <param name="assemblies"></param>
    /// <returns></returns>
    public static Type[] GetTypesImplementing(Type type, IEnumerable<Assembly> assemblies) {
      if (assemblies == null) {
        return new Type[0];
      }
      var validAssemblies = GetValidAssemblies(assemblies);
      var result = validAssemblies.SelectMany(a => GetTypesImplementing(type, a)).ToArray();
      return result;
    }

    internal static IEnumerable<Type> GetTypes(Assembly assembly) {
      lock (__invalidAssemblies) {
        if (__invalidAssemblies.Contains(assembly)) {
          return new Type[] { };
        }
      }

      try {
        return assembly.DefinedTypes.Select(ti => ti.AsType());
      } catch (Exception ex) {
        string msg = string.Empty;
        if (ex is System.Reflection.ReflectionTypeLoadException) {
          msg = ((ReflectionTypeLoadException)ex).LoaderExceptions.ToAggregateString(". ");
        }
        
        Debug.WriteLine("Error: Unable to execute Assembly.DefinedTypes for "
          + assembly.ToString() + "." + msg);
        lock (__invalidAssemblies) {
          __invalidAssemblies.Add(assembly);
        }
        return new Type[] { };
      }
    }

    private static List<Assembly> GetValidAssemblies(IEnumerable<Assembly> assemblies) {
      List<Assembly> validAssemblies;
      lock (__invalidAssemblies) {
        validAssemblies = assemblies.Except(__invalidAssemblies).ToList();
      }
      return validAssemblies;
    }

    private static List<Assembly> __invalidAssemblies = new List<Assembly>();

    #endregion

    #region Nullable stuff

    /// <summary>
    /// Returns whether the specified type is a nullable generic type, i.e. Nullable{T}.
    /// </summary>
    /// <param name="type"></param>
    /// <returns>true if the specified type is a nullable generic type; false otherwise</returns>
    public static bool IsNullableType(Type type) {
      return type.GetTypeInfo().IsGenericType && type.GetGenericTypeDefinition() == typeof(Nullable<>);
    }

    /// <summary>
    /// Gets the nullable type that corresponds to the given type.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static Type GetNullableType(Type type) {
      if (!type.GetTypeInfo().IsValueType) {
        return type;
      }
      NullableInfo result;
      if (NullableInfoMap.TryGetValue(type, out result)) {
        return result.NullableType;
      } else {
        return null;
      }
    }

    /// <summary>
    /// Returns either the specified type or its non-nullable counterpart.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static Type GetNonNullableType(Type type) {
      return IsNullableType(type) ? GetGenericArgument(type) : type;
    }

    private static Dictionary<Type, NullableInfo> NullableInfoMap {
      get {
        lock (__nullableInfoMap) {
          if (__nullableInfoMap.Count == 0) {
            UpdateNullableInfoMap<Byte>();
            UpdateNullableInfoMap<SByte>();
            UpdateNullableInfoMap<Int16>();
            UpdateNullableInfoMap<UInt16>();
            UpdateNullableInfoMap<Int32>();
            UpdateNullableInfoMap<UInt32>();
            UpdateNullableInfoMap<Int64>();
            UpdateNullableInfoMap<UInt64>();
            UpdateNullableInfoMap<Single>();
            UpdateNullableInfoMap<Double>();
            UpdateNullableInfoMap<Decimal>();
            UpdateNullableInfoMap<Boolean>();
            UpdateNullableInfoMap<Char>();
            UpdateNullableInfoMap<DateTime>();
            UpdateNullableInfoMap<DateTimeOffset>();
            UpdateNullableInfoMap<TimeSpan>();
            UpdateNullableInfoMap<Guid>();

          }
          return __nullableInfoMap;
        }
      }
    }

    private static void UpdateNullableInfoMap<T>() where T : struct {
      __nullableInfoMap[typeof(T)] = new NullableInfo(typeof(Nullable<T>), default(T));
    }

    private static Dictionary<Type, NullableInfo> __nullableInfoMap = new Dictionary<Type, NullableInfo>();

    private class NullableInfo {
      public NullableInfo(Type pNullableType, Object pDefaultValue) {
        NullableType = pNullableType;
        DefaultValue = pDefaultValue;
      }
      public Type NullableType;
      public Object DefaultValue;
    }
    #endregion
  }
}
