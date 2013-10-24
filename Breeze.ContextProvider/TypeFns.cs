
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Linq.Expressions;
using System.Diagnostics;
using System.Text;

namespace Breeze.ContextProvider {
  /// <summary>
  /// A collection of static methods used to provide additional <see cref="System.Type"/> related services.
  /// </summary>
  public static class TypeFns {

    /// <summary>
    /// Returns an array of numeric types.
    /// </summary>
    public static readonly Type[] NumericTypes = new Type[] {
      typeof(Byte),
      typeof(Int16), typeof(UInt16), 
      typeof(Int32), typeof(UInt32), 
      typeof(Int64), typeof(UInt64), 
      typeof(Single),
      typeof(Double),
      typeof(Decimal)
    };

    /// <summary>
    /// Returns an array of integer types.
    /// </summary>
    public static readonly Type[] IntegerTypes = new Type[] {
      typeof(Byte),
      typeof(Int16), typeof(UInt16), 
      typeof(Int32), typeof(UInt32), 
      typeof(Int64), typeof(UInt64), 
    };

    /// <summary>
    /// Returns an array of decimal types.
    /// </summary>
    public static readonly Type[] DecimalTypes = new Type[] {
      typeof(Single),
      typeof(Double),
      typeof(Decimal)
    };

    /// <summary>
    /// Returns an array of predefined types.
    /// </summary>
    public static readonly Type[] PredefinedTypes = {
            typeof(Object),
            typeof(Boolean),
            typeof(Char),
            typeof(String),
            typeof(SByte),
            typeof(Byte),
            typeof(Int16),
            typeof(UInt16),
            typeof(Int32),
            typeof(UInt32),
            typeof(Int64),
            typeof(UInt64),
            typeof(Single),
            typeof(Double),
            typeof(Decimal),
            typeof(DateTime),
            typeof(DateTimeOffset),
            typeof(TimeSpan),
            typeof(Guid),
            typeof(Math),
            typeof(Convert)
        };

    /// <summary>
    /// Returns the name of either the specified type or its non-nullable counterpart.
    /// </summary>
    /// <param name="type"></param>
    /// <returns>the name of the given type</returns>
    public static string GetTypeName(Type type) {
      Type baseType = GetNonNullableType(type);
      string s = baseType.Name;
      if (type != baseType) s += '?';
      return s;
    }

    /// <summary>
    /// Returns whether the specified type (or its non-nullable counterpart) represents an enumeration.
    /// </summary>
    /// <param name="type"></param>
    /// <returns>true if the specified type represents an enumeration; false otherwise</returns>
    public static bool IsEnumType(Type type) {
      return GetNonNullableType(type).IsEnum;
    }

    /// <summary>
    /// Returns whether the specified type (or its non-nullable counterpart) represents a numeric type.
    /// </summary>
    /// <param name="type"></param>
    /// <returns>true if the specified type is numeric; false otherwise</returns>
    public static bool IsNumericType(Type type) {
      return GetNumericTypeKind(type) != 0;
    }

    /// <summary>
    /// Returns whether the specified type (or its non-nullable counterpart) represents an integer type.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static bool IsIntegralType(Type type) {
      return GetNumericTypeKind(type) >= 2;
    }

    /// <summary>
    /// Returns whether the specified type (or its non-nullable counterpart) represents a signed integer type.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static bool IsSignedIntegralType(Type type) {
      return GetNumericTypeKind(type) == 2;
    }

    /// <summary>
    /// Returns whether the specified type (or its non-nullable counterpart) represents an unsigned integer type.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static bool IsUnsignedIntegralType(Type type) {
      return GetNumericTypeKind(type) == 3;
    }

    private static int GetNumericTypeKind(Type type) {
      type = GetNonNullableType(type);
      if (type.IsEnum) return 0;
      switch (Type.GetTypeCode(type)) {
      case TypeCode.Char:
      case TypeCode.Single:
      case TypeCode.Double:
      case TypeCode.Decimal:
        return 1;
      case TypeCode.SByte:
      case TypeCode.Int16:
      case TypeCode.Int32:
      case TypeCode.Int64:
        return 2;
      case TypeCode.Byte:
      case TypeCode.UInt16:
      case TypeCode.UInt32:
      case TypeCode.UInt64:
        return 3;
      default:
        return 0;
      }
    }

    /// <summary>
    /// Think about making public if used again.
    /// </summary>
    /// <param name="t"></param>
    /// <returns></returns>
    internal static bool IsGenericQueryableType(Type t) {
      if (typeof(IQueryable).IsAssignableFrom(t)) {
        var queryableType = typeof(IQueryable<>).MakeGenericType(TypeFns.GetElementType(t));
        if (queryableType.IsAssignableFrom(t)) {
          return true;
        }
      }
      return false;
    }

    /// <summary>
    /// Returns true if the Type is an IGrouping.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static  bool IsGroupingType(Type type) {
      return GetGroupingInterface(type) != null;
    }

    // may return null;
    /// <summary>
    /// Returns the IGrouping interface implemented by the type.
    /// </summary>
    /// <param name="type"></param>
    /// <returns>May return null if the specified type is not a grouping type</returns>
    public static Type GetGroupingInterface(Type type) {
      if (type.IsInterface && type.Name.StartsWith("IGrouping")) return type;
      return type.GetInterfaces().FirstOrDefault(i => i.Name.StartsWith("IGrouping"));
    }
    
    /// <summary>
    /// Gets a single generic argument from a specified type.
    /// </summary>
    /// <param name="type"></param>
    /// <returns>null if it can't find one or result is ambiguous</returns>
    public static Type GetGenericArgument(Type type) {
      if (!type.IsGenericType) return null;
      var genArgs = type.GetGenericArguments();
      if (genArgs.Length != 1) return null;
      return genArgs[0];
    }

    /// <summary>
    /// Gets the nullable type that corresponds to the given type.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static Type GetNullableType(Type type) {
      if (!type.IsValueType) {
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
      return IsNullableType(type) ? type.GetGenericArguments()[0] : type;
    }

    /// <summary>
    /// Returns the element type of any enumerable type;
    /// </summary>
    /// <param name="seqType"></param>
    /// <returns></returns>
    public static Type GetElementType(Type seqType) {
      Type ienum = FindIEnumerable(seqType);
      if (ienum == null) return null;
      return ienum.GetGenericArguments()[0];
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="seqType"></param>
    /// <returns></returns>
    public static Type FindIEnumerable(Type seqType) {
      if (seqType == null || seqType == typeof(string)) {
        return null;
      }

      if (seqType.IsArray) {
        return typeof(IEnumerable<>).MakeGenericType(seqType.GetElementType());
      }

      if (seqType.IsGenericType) {
        foreach (Type arg in seqType.GetGenericArguments()) {
          Type ienum = typeof(IEnumerable<>).MakeGenericType(arg);
          if (ienum.IsAssignableFrom(seqType)) {
            return ienum;
          }
        }
      }

      Type[] ifaces = seqType.GetInterfaces();
      if (ifaces != null && ifaces.Length > 0) {
        foreach (Type iface in ifaces) {
          Type ienum = FindIEnumerable(iface);
          if (ienum != null) return ienum;
        }
      }
      if (seqType.BaseType != null && seqType.BaseType != typeof(object)) {
        return FindIEnumerable(seqType.BaseType);
      }
      return null;
    }

    /// <summary>
    /// Returns whether the specified type is one of the <see cref="PredefinedTypes"/>.
    /// </summary>
    /// <param name="type"></param>
    /// <returns>true if the specified type is a predefined type; false otherwise</returns>
    public static bool IsPredefinedType(Type type) {
      foreach (Type t in PredefinedTypes) if (t == type) return true;
      return false;
    }

    /// <summary>
    /// Returns whether the specified type is one of the <see cref="PredefinedTypes"/> and
    /// optionally includes nullable versions of the same in the check.
    /// </summary>
    /// <param name="type"></param>
    /// <param name="includeNullable"></param>
    /// <returns></returns>
    public static bool IsPredefinedType(Type type, bool includeNullable) {
      if (includeNullable) {
        var nonnullType = GetNonNullableType(type);
        if (nonnullType != type) {
          return IsPredefinedType(nonnullType);
        }
      }
      return IsPredefinedType(type);
    }

    /// <summary>
    /// Returns whether the specified type is a nullable generic type, i.e. Nullable{T}.
    /// </summary>
    /// <param name="type"></param>
    /// <returns>true if the specified type is a nullable generic type; false otherwise</returns>
    public static bool IsNullableType(Type type) {
      return type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Nullable<>);
    }

    /// <summary>
    /// Gets the default value for a specified type.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static object GetDefaultValue(Type type) {
      if (type == null) return null;
      if (!type.IsValueType) return null;
      
      NullableInfo result;
      if (NullableInfoMap.TryGetValue(type, out result )) {
        return result.DefaultValue;
      } else {
        return Activator.CreateInstance(type);
      }
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <typeparam name="TIn"></typeparam>
    /// <typeparam name="TOut"></typeparam>
    /// <param name="prototypeLambda"></param>
    /// <param name="resolvedTypes"></param>
    /// <returns></returns>
    public static MethodInfo GetMethodByExample<TIn, TOut>(Expression<Func<TIn, TOut>> prototypeLambda, params Type[] resolvedTypes) {
      var mi = (prototypeLambda.Body as MethodCallExpression).Method;
      if (!resolvedTypes.Any()) return mi;
      if (!mi.IsGenericMethod) return mi;
      var mi2 = mi.GetGenericMethodDefinition();
      var mi3 = mi2.MakeGenericMethod(resolvedTypes);
      return mi3;
    }

    public static MethodInfo GetMethodByExample<TIn1, TIn2, TOut>(Expression<Func<TIn1, TIn2, TOut>> prototypeLambda, params Type[] resolvedTypes) {
      var mi = (prototypeLambda.Body as MethodCallExpression).Method;
      if (!resolvedTypes.Any()) return mi;
      if (!mi.IsGenericMethod) return mi;
      var mi2 = mi.GetGenericMethodDefinition();
      var mi3 = mi2.MakeGenericMethod(resolvedTypes);
      return mi3;
    }
  
    /// <summary>
    /// Finds a specific public property or field. Will be automatically restricted as well by execution environment restrictions ( e.g. Silverlight).
    /// </summary>
    /// <param name="type"></param>
    /// <param name="memberName"></param>
    /// <param name="isPublic"></param>
    /// <param name="isStatic"></param>
    /// <returns></returns>
    public static MemberInfo FindPropertyOrField(Type type, string memberName, bool isPublic, bool isStatic) {
      var flags = isStatic ? BindingFlags.Static : BindingFlags.Instance;
      if (isPublic) {
        flags |= BindingFlags.Public;
      } else {
        flags |= BindingFlags.Public | BindingFlags.NonPublic;
      }
      return FindPropertyOrField(type, memberName, flags);
    }


    /// <summary>
    /// Finds a specific property or field
    /// </summary>
    /// <param name="type"></param>
    /// <param name="memberName"></param>
    /// <param name="bindingFlags"></param>
    /// <returns></returns>
    public static MemberInfo FindPropertyOrField(Type type, string memberName, BindingFlags bindingFlags) {
      foreach (Type t in GetSelfAndBaseTypes(type)) {
        MemberInfo[] members = t.FindMembers(MemberTypes.Property | MemberTypes.Field,
            bindingFlags, Type.FilterNameIgnoreCase, memberName);
        if (members.Length != 0) return members[0];
      }
      return null;

    }

 

    /// <summary>
    /// Finds a specific public method.
    /// </summary>
    /// <param name="type"></param>
    /// <param name="methodName"></param>
    /// <param name="parameterTypes"></param>
    /// <returns></returns>
    public static MethodInfo FindMethod(Type type, string methodName, Type[] parameterTypes) {
      BindingFlags flags = BindingFlags.Public | BindingFlags.DeclaredOnly |
          BindingFlags.Static | BindingFlags.Instance;
      return FindMethod(type, methodName, flags, parameterTypes);
    }

   
    /// <summary>
    /// Finds a specific method.
    /// </summary>
    /// <param name="type"></param>
    /// <param name="methodName"></param>
    /// <param name="flags"></param>
    /// <param name="genericArgTypes"></param>
    /// <param name="parameterTypes"></param>
    /// <returns></returns>
    public static MethodInfo FindMethod(Type type, string methodName, BindingFlags flags, Type[] genericArgTypes, Type[] parameterTypes) {

      var methods = FindMethods(type, methodName, flags, genericArgTypes, parameterTypes).ToList();
      if (!methods.Any()) return null;
      var counts = methods.Select(m => {
        var candidateParameterTypes = m.GetParameters().Select(p => p.ParameterType);
        return candidateParameterTypes.Zip(parameterTypes, (a, b) => Object.Equals(a, b) ? 1 : 0).Sum();
      }).ToList();
      // best method is where most number of parameters are an exact match.
      var bestMethod = methods.OrderByDescending(m => {
        var candidateParameterTypes = m.GetParameters().Select(p => p.ParameterType);
        return candidateParameterTypes.Zip(parameterTypes, (a, b) => Object.Equals(a, b) ? 1 : 0).Sum();
      }).First();
      return bestMethod;
    }

    /// <summary>
    /// Finds all the methods that match specific criteria.
    /// </summary>
    /// <param name="type"></param>
    /// <param name="methodName"></param>
    /// <param name="flags"></param>
    /// <param name="genericArgTypes"></param>
    /// <param name="parameterTypes"></param>
    /// <returns></returns>
    public static IEnumerable<MethodInfo> FindMethods(Type type, string methodName, BindingFlags flags, Type[] genericArgTypes, Type[] parameterTypes) {
      foreach (Type t in GetSelfAndBaseTypes(type)) {
        MemberInfo[] members = t.FindMembers(MemberTypes.Method,
            flags, Type.FilterNameIgnoreCase, methodName);
        foreach (MethodInfo method in members.OfType<MethodInfo>()) {
          MethodInfo resolvedMethod;
          if (genericArgTypes != null && genericArgTypes.Length > 0) {
            var genericArgs = method.GetGenericArguments();
            if (genericArgs.Length != genericArgTypes.Length) continue;
            // TODO: may need a try/catch around this call
            resolvedMethod = method.MakeGenericMethod(genericArgTypes);
          } else {
            resolvedMethod = method;
          }
          var parameters = resolvedMethod.GetParameters();
          if (parameters.Length != parameterTypes.Length) continue;
          var candidateParameterTypes = parameters.Select(p => p.ParameterType);
          var ok = parameterTypes.Zip(candidateParameterTypes, (p, cp) => cp.IsAssignableFrom(p)).All(x => x);
          if (ok) {
            yield return resolvedMethod;
          }
        }
      }
    }

    /// <summary>
    /// Finds specific methods.
    /// </summary>
    /// <param name="type"></param>
    /// <param name="methodName"></param>
    /// <param name="flags"></param>
    /// <param name="parameterTypes"></param>
    /// <returns></returns>
    public static IEnumerable<MethodInfo> FindMethods(Type type, string methodName, BindingFlags flags, Type[] parameterTypes) {
      foreach (Type t in GetSelfAndBaseTypes(type)) {
        MemberInfo[] members = t.FindMembers(MemberTypes.Method,
            flags, Type.FilterNameIgnoreCase, methodName);
        foreach (MethodBase method in members.Cast<MethodBase>()) {
          var parameters = method.GetParameters();
          if (parameters.Length != parameterTypes.Length) continue;
          var candidateParameterTypes = parameters.Select(p => p.ParameterType);
          candidateParameterTypes = candidateParameterTypes.Select((cpt, i) =>
            parameterTypes[i].IsGenericTypeDefinition ? cpt.GetGenericTypeDefinition() : cpt);
          var ok = parameterTypes.Zip(candidateParameterTypes, (p, cp) => cp.IsAssignableFrom(p)).All(x => x);
          if (ok) {
            yield return (MethodInfo)method;
          }
        }
      }
      yield break;
    }

    /// <summary>
    /// Finds a specific method.
    /// </summary>
    /// <param name="type"></param>
    /// <param name="methodName"></param>
    /// <param name="isStatic"></param>
    /// <param name="parameterTypes"></param>
    /// <returns></returns>
    public static MethodInfo FindMethod(Type type, string methodName, bool isStatic, Type[] parameterTypes) {
      BindingFlags flags = BindingFlags.Public | BindingFlags.DeclaredOnly |
          (isStatic ? BindingFlags.Static : BindingFlags.Instance);
      return FindMethod(type, methodName, flags, parameterTypes);
    }

    /// <summary>
    /// Finds a specific method.
    /// </summary>
    /// <param name="type"></param>
    /// <param name="methodName"></param>
    /// <param name="flags"></param>
    /// <param name="parameterTypes"></param>
    /// <returns></returns>
    public static MethodInfo FindMethod(Type type, string methodName, BindingFlags flags, Type[] parameterTypes) {
      return FindMethods(type, methodName, flags, parameterTypes).FirstOrDefault();
    }

    /// <summary>
    /// Finds a collection of generic methods. 
    /// </summary>
    /// <param name="type"></param>
    /// <param name="methodName">Is case insensitive</param>
    /// <param name="flags"></param>
    /// <param name="genericArgTypes"></param>
    /// <returns></returns>
    public static IEnumerable<MethodInfo> FindGenericMethods(Type type, string methodName, BindingFlags flags, Type[] genericArgTypes) {
      foreach (Type t in GetSelfAndBaseTypes(type)) {
        MemberInfo[] members = t.FindMembers(MemberTypes.Method,
            flags, Type.FilterNameIgnoreCase, methodName);
        foreach (MethodInfo method in members.OfType<MethodInfo>()) {
          MethodInfo resolvedMethod;
          if (genericArgTypes != null && genericArgTypes.Length > 0) {
            var genericArgs = method.GetGenericArguments();
            if (genericArgs.Length != genericArgTypes.Length) continue;
            // TODO: may need a try/catch around this call
            resolvedMethod = method.MakeGenericMethod(genericArgTypes);
          } else {
            resolvedMethod = method;
          }
          yield return resolvedMethod;
        }
      }
    }

    /// <summary>
    /// Returns a collection of types from which the given type directly inherits or implements.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static IEnumerable<Type> GetSelfAndBaseTypes(Type type) {
      if (type.IsInterface) return (new List<Type>() { type }).Concat(type.GetInterfaces());
      if (type == typeof(Object)) return new List<Type>() { type };
      var ifaceTypes = type.GetInterfaces();
      var baseTypes =  GetSelfAndBaseTypes(type.BaseType);
      var results = new[] { type }.Concat(baseTypes).Concat(ifaceTypes).Distinct().ToList();
      return results;
    }

    /// <summary>
    /// Returns a collection of classes (not interfaces) from which the given type directly inherits.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static IEnumerable<Type> GetSelfAndBaseClasses(Type type) {
      while (type != null) {
        yield return type;
        type = type.BaseType;
      }
    }

    /// <summary>
    /// Determines whether the source type is compatible with the given target type.
    /// </summary>
    /// <remarks>This is a better implementation than <see cref="Type.IsAssignableFrom"/>.</remarks>
    /// <param name="source"></param>
    /// <param name="target"></param>
    /// <returns></returns>
    public static bool IsCompatibleWith(Type source, Type target) {
      if (source == target) return true;
      if (!target.IsValueType) return target.IsAssignableFrom(source);
      Type st = GetNonNullableType(source);
      Type tt = GetNonNullableType(target);
      if (st != source && tt == target) return false;
      TypeCode sc = st.IsEnum ? TypeCode.Object : Type.GetTypeCode(st);
      TypeCode tc = tt.IsEnum ? TypeCode.Object : Type.GetTypeCode(tt);
      switch (sc) {
      case TypeCode.SByte:
        switch (tc) {
        case TypeCode.SByte:
        case TypeCode.Int16:
        case TypeCode.Int32:
        case TypeCode.Int64:
        case TypeCode.Single:
        case TypeCode.Double:
        case TypeCode.Decimal:
          return true;
        }
        break;
      case TypeCode.Byte:
        switch (tc) {
        case TypeCode.Byte:
        case TypeCode.Int16:
        case TypeCode.UInt16:
        case TypeCode.Int32:
        case TypeCode.UInt32:
        case TypeCode.Int64:
        case TypeCode.UInt64:
        case TypeCode.Single:
        case TypeCode.Double:
        case TypeCode.Decimal:
          return true;
        }
        break;
      case TypeCode.Int16:
        switch (tc) {
        case TypeCode.Int16:
        case TypeCode.Int32:
        case TypeCode.Int64:
        case TypeCode.Single:
        case TypeCode.Double:
        case TypeCode.Decimal:
          return true;
        }
        break;
      case TypeCode.UInt16:
        switch (tc) {
        case TypeCode.UInt16:
        case TypeCode.Int32:
        case TypeCode.UInt32:
        case TypeCode.Int64:
        case TypeCode.UInt64:
        case TypeCode.Single:
        case TypeCode.Double:
        case TypeCode.Decimal:
          return true;
        }
        break;
      case TypeCode.Int32:
        switch (tc) {
        case TypeCode.Int32:
        case TypeCode.Int64:
        case TypeCode.Single:
        case TypeCode.Double:
        case TypeCode.Decimal:
          return true;
        }
        break;
      case TypeCode.UInt32:
        switch (tc) {
        case TypeCode.UInt32:
        case TypeCode.Int64:
        case TypeCode.UInt64:
        case TypeCode.Single:
        case TypeCode.Double:
        case TypeCode.Decimal:
          return true;
        }
        break;
      case TypeCode.Int64:
        switch (tc) {
        case TypeCode.Int64:
        case TypeCode.Single:
        case TypeCode.Double:
        case TypeCode.Decimal:
          return true;
        }
        break;
      case TypeCode.UInt64:
        switch (tc) {
        case TypeCode.UInt64:
        case TypeCode.Single:
        case TypeCode.Double:
        case TypeCode.Decimal:
          return true;
        }
        break;
      case TypeCode.Single:
        switch (tc) {
        case TypeCode.Single:
        case TypeCode.Double:
          return true;
        }
        break;
      default:
        if (st == tt) return true;
        break;
      }
      return false;
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
    /// Constructs a generic list.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static IList MakeGenericList(Type type) {
      return (IList)TypeFns.ConstructGenericInstance(typeof(List<>), type);
    }

    /// <summary>
    /// Constructs a generic instance. Can only access public constructors.
    /// </summary>
    /// <param name="genericType"></param>
    /// <param name="argTypes"></param>
    /// <param name="constructorParams"></param>
    /// <returns></returns>
    public static Object ConstructGenericInstance(Type genericType, Type[] argTypes,
      params Object[] constructorParams) {
      if (genericType == null) {
        throw new ArgumentNullException("genericType");
      }

      Type finalType = genericType.MakeGenericType(argTypes);
      return Activator.CreateInstance(finalType, constructorParams);
    }

    private static Dictionary<Type, NullableInfo> NullableInfoMap {
      get {
        lock (__nullableInfoMap) {
          if (__nullableInfoMap.Count == 0) {
            UpdateNullableInfoMap<Byte>();
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
      public Type   NullableType;
      public Object DefaultValue;
    }


  }

  public static class EnumerableExtns {
    // Not named GetHashCode to avoid naming conflict; object.GetHashCode would
    // always take precedence
    /// <summary>
    /// Returns a hashcode for a collection that 
    /// uses a similar algorithm to that used by the .NET Tuple class.
    /// Order matters.
    /// </summary>
    /// <remarks>
    /// </remarks>
    /// <param name="items"></param>
    /// <returns></returns>
    public static int GetAggregateHashCode(this IEnumerable items) {
      // Old code - talk to Jay about issues with this. 
      //int hash = 0;
      //foreach (Object item in items) {
      //  if (item != null) {
      //    hash ^= item.GetHashCode();
      //  }
      //}
      int hash = 0;
      foreach (Object item in items) {
        if (item != null) {
          if (hash == 0) {
            hash = item.GetHashCode();
          } else {
            hash = ((hash << 5) + hash) ^ item.GetHashCode();
          }
        }
      }
      return hash;
    }

    /// <summary>
    /// Concatenates the string version of each element in a collection using the delimiter provided.
    /// </summary>
    /// <param name="items">The enumerated items whose string formated elements will be concatenated</param>
    /// <param name="delimiter">Delimiter</param>
    /// <returns>A delimited string</returns>
    public static string ToAggregateString(this IEnumerable items, string delimiter) {
      StringBuilder sb = null;
      foreach (object aObject in items) {
        if (sb == null) {
          sb = new StringBuilder();
        } else {
          sb.Append(delimiter);
        }
        sb.Append(aObject.ToString());
      }
      if (sb == null) return String.Empty;
      return sb.ToString();
    }
  }
}
