/*
/// <changelog>
  ///   <item who="jtraband" when="...">Created</item>
  ///   <item who="jtraband" when="Feb-10-2011">Added Equals and GetHashCode impls</item>
  ///
</changelog>
*/
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Reflection;
using System.Reflection.Emit;
using System.Threading;

using System.IO;
using System.Runtime.Serialization;


namespace Breeze.ContextProvider {

  // This class is a hack because I can't get the IL Emit for Equals and GetHashCode to work in Silverlight becuase of a 
  // VerificationException.  

  /// <summary>
  /// For internal use only.
  /// </summary>
  public  abstract class DynamicTypeBase {

    /// <summary>
    /// For internal use only.
    /// </summary>
    public DynamicTypeBase() {}

    ///// <summary>
    ///// 
    ///// </summary>
    ///// <param name="obj"></param>
    ///// <returns></returns>
    //public override bool Equals(object obj) {
      
    //  if (obj == null) return false;
    //  if (obj.GetType() != this.GetType()) return false;
    //  var deconstructFunc = GetDeconstructorFunc(this.GetType());
    //  var theseItems = deconstructFunc(this);
    //  var otherItems = deconstructFunc(obj);
    //  return theseItems.SequenceEqual(otherItems);
    //}

    ///// <summary>
    ///// 
    ///// </summary>
    ///// <returns></returns>
    //public override int GetHashCode() {
    //  var deconstructFunc = GetDeconstructorFunc(this.GetType());
    //  var otherItems = deconstructFunc(this);
    //  return otherItems.GetAggregateHashCode();
    //}

    //private Func<Object, Object[]> GetDeconstructorFunc(Type type) {
      
    //  Func<Object, Object[]> func = null;
    //  lock (__deconstructorMap) {
    //    if ( !__deconstructorMap.TryGetValue(type, out func)) {
    //      func = AnonymousFns.BuildDeconstructorFunc(type, false);
    //      __deconstructorMap[type] = func;
    //    }
    //  }
    //  return func;
    //}

    //private static Dictionary<Type, Func<Object, Object[]>> __deconstructorMap = new Dictionary<Type,Func<object,object[]>>();
   

  }

  internal static class DynamicGenericTypeBuilder {
    /// <summary>
    /// Constructs a new dynamic entity type from the specified DynamicTypeInfo.
    /// </summary>
    /// <param name="info">An DynamicTypeInfo instance</param>
    /// <returns></returns>
    /// <exception cref="ArgumentException">Thrown if the dynamic type key name is already defined.</exception>
    public static Type CreateType(DynamicTypeInfo info) {
      if (info == null) {
        throw new ArgumentNullException("info");
      }

      AssemblyBuilder asmBuilder = BuildAssembly(info);
      ModuleBuilder modBuilder = BuildModule(info, asmBuilder);
      TypeBuilder typBuilder = BuildType(info, modBuilder);
      GenericTypeParameterBuilder[] parameterBuilders = BuildGenericParameters(info, typBuilder);

      // Build the fields
      var fieldBuilders = BuildFields(info, typBuilder, parameterBuilders).ToList();

      // Build an empty (parameterless) ctor
      BuildEmptyCtor(info, typBuilder);
      // Build a ctor that includes all properties.
      BuildCtor(info, typBuilder, fieldBuilders, parameterBuilders);
      

      // Build Properties
      BuildProperties(info, typBuilder, fieldBuilders, parameterBuilders);

      // BuildEqualsMethod(info, typBuilder, fieldBuilders);
      // BuildGetHashCodeMethod(info, typBuilder, fieldBuilders);

      var openGenericType = typBuilder.CreateType();
      var returnType = openGenericType.MakeGenericType(info.PropertyTypes.ToArray());
      //OnDynamicEntityTypeCreated(new DynamicEntityTypeCreatedEventArgs(returnType));
      if (info.DynamicTypeShouldSave) {
#if !SILVERLIGHT
        asmBuilder.Save(asmBuilder.GetName().Name + ".dll");
#endif
      }

      return returnType;

    }

    private static AssemblyBuilder BuildAssembly(DynamicTypeInfo info) {
      AppDomain aDomain = Thread.GetDomain();

      // Build the assembly
      AssemblyName asmName = new AssemblyName();
      asmName.Name = info.DynamicTypeName + DynamicTypeInfo.DynamicAssemblyNameSuffix;
      AssemblyBuilder asmBuilder;
#if !SILVERLIGHT
      if (info.DynamicTypeShouldSave) {
        if (String.IsNullOrEmpty(info.DynamicTypeFileDirectory)) {
          asmBuilder = aDomain.DefineDynamicAssembly(asmName, AssemblyBuilderAccess.RunAndSave);
        } else {
          asmBuilder = aDomain.DefineDynamicAssembly(asmName, AssemblyBuilderAccess.RunAndSave, info.DynamicTypeFileDirectory);
        }
      } else {
        asmBuilder = aDomain.DefineDynamicAssembly(asmName, AssemblyBuilderAccess.Run);
      }
#else 
      asmBuilder = aDomain.DefineDynamicAssembly(asmName, AssemblyBuilderAccess.Run);
#endif
      return asmBuilder;
    }

    private static ModuleBuilder BuildModule(DynamicTypeInfo info, AssemblyBuilder asmBuilder) {
      // Build the module
      ModuleBuilder modBuilder;
#if !SILVERLIGHT
      if (info.DynamicTypeShouldSave) {
        modBuilder = asmBuilder.DefineDynamicModule("DynamicAnonTypeModule_" + info.TypeName, asmBuilder.GetName().Name + ".dll");
      } else {
        modBuilder = asmBuilder.DefineDynamicModule("DynamicAnonTypeModule_" + info.TypeName);
      }
#else 
      modBuilder = asmBuilder.DefineDynamicModule("DynamicAnonTypeModule_" + info.TypeName);
#endif
      return modBuilder;
    }

    private static TypeBuilder BuildType(DynamicTypeInfo info, ModuleBuilder modBuilder) {
      // Build the type
      var typBuilder = modBuilder.DefineType(info.DynamicTypeName,
        TypeAttributes.Public |
        TypeAttributes.Class |
        TypeAttributes.AutoClass |
        TypeAttributes.AnsiClass |
        TypeAttributes.BeforeFieldInit |
        TypeAttributes.AutoLayout,
        // typeof(Object));
        typeof(DynamicTypeBase));
      return typBuilder;
    }

    private static GenericTypeParameterBuilder[] BuildGenericParameters(DynamicTypeInfo info, TypeBuilder typBuilder) {
      // generates the names T0, T1, T2 ...
      String[] parameterNames = Enumerable.Range(0, info.PropertyNames.Count).Select(i => "T" + i.ToString()).ToArray();
      var parameterBuilders = typBuilder.DefineGenericParameters(parameterNames);
      return parameterBuilders;
    }

    private static void BuildCtor(DynamicTypeInfo info, TypeBuilder typBuilder, 
      List<FieldBuilder> fieldBuilders, GenericTypeParameterBuilder[] parameterBuilders) {
      Type[] ctorParams = parameterBuilders;
      var ctorBuilder = typBuilder.DefineConstructor(
        MethodAttributes.Public |
        MethodAttributes.SpecialName |
        MethodAttributes.RTSpecialName,
        CallingConventions.Standard,
        ctorParams);

      ILGenerator ctorIL = ctorBuilder.GetILGenerator();
      ctorIL.Emit(OpCodes.Ldarg_0);
      // var baseCtorInfo = typeof(Object).GetConstructor(new Type[0]);
      var baseCtorInfo = typeof(DynamicTypeBase).GetConstructor(new Type[0]);
      ctorIL.Emit(OpCodes.Call, baseCtorInfo);
      for (byte i = 0; i < info.PropertyNames.Count; i++) {
        ctorIL.Emit(OpCodes.Ldarg_0);
        if (i == 0) {
          ctorIL.Emit(OpCodes.Ldarg_1);
        } else if (i == 1) {
          ctorIL.Emit(OpCodes.Ldarg_2);
        } else if (i == 2) {
          ctorIL.Emit(OpCodes.Ldarg_3);
        } else {
          ctorIL.Emit(OpCodes.Ldarg_S, i + 1);
        }
        ctorIL.Emit(OpCodes.Stfld, fieldBuilders[i]);
      }
      //Get the base constructor

      ctorIL.Emit(OpCodes.Ret);
    }

    private static void BuildEmptyCtor(DynamicTypeInfo info, TypeBuilder typBuilder) {
      var ctorBuilder = typBuilder.DefineConstructor(
        MethodAttributes.Public |
        MethodAttributes.SpecialName |
        MethodAttributes.RTSpecialName,
        CallingConventions.Standard,
        new Type[0]);

      var generator = ctorBuilder.GetILGenerator();
      generator.Emit(OpCodes.Ldarg_0);
      var baseCtorInfo = typeof(Object).GetConstructor(new Type[0]);
      generator.Emit(OpCodes.Call, baseCtorInfo);
      generator.Emit(OpCodes.Ret);
    }

    private static void BuildProperties(DynamicTypeInfo info, TypeBuilder typBuilder, 
      List<FieldBuilder> fieldBuilders, GenericTypeParameterBuilder[] parameterBuilders) {
      for (int i = 0; i < info.PropertyNames.Count; i++) {
        //var propBuilder = typBuilder.DefineProperty(
        //  info.PropertyNames[i], PropertyAttributes.None, parameterBuilders[i], Type.EmptyTypes);
        var propBuilder = typBuilder.DefineProperty(
          info.PropertyNames[i], PropertyAttributes.HasDefault, parameterBuilders[i], Type.EmptyTypes);

        // Build Get prop
        var getMethBuilder = typBuilder.DefineMethod(
          "get_" + info.PropertyNames[i], MethodAttributes.Public | MethodAttributes.SpecialName | MethodAttributes.HideBySig,
          parameterBuilders[i], Type.EmptyTypes);
        var generator = getMethBuilder.GetILGenerator();

        generator.Emit(OpCodes.Ldarg_0); // load 'this'
        generator.Emit(OpCodes.Ldfld, fieldBuilders[i]); // load the field
        generator.Emit(OpCodes.Ret);
        propBuilder.SetGetMethod(getMethBuilder);

        // Build Set prop
        var setMethBuilder = typBuilder.DefineMethod(
          "set_" + info.PropertyNames[i], MethodAttributes.Public | MethodAttributes.SpecialName | MethodAttributes.HideBySig, 
          typeof(void), new Type[] { fieldBuilders[i].FieldType });
        generator = setMethBuilder.GetILGenerator();

        generator.Emit(OpCodes.Ldarg_0); // load 'this'
        generator.Emit(OpCodes.Ldarg_1); // load value
        generator.Emit(OpCodes.Stfld, fieldBuilders[i]);
        generator.Emit(OpCodes.Ret);
        propBuilder.SetSetMethod(setMethBuilder);
      }
    }

    //// This method does not work for Silverlight. It executes but the call to Equals fails with a VerificationException at runtime
    //private static void BuildEqualsMethod(DynamicTypeInfo info, TypeBuilder typBuilder, List<FieldBuilder> fields) {
    //  var methodBuilder = typBuilder.DefineMethod("Equals",
    //      MethodAttributes.Public | MethodAttributes.ReuseSlot |
    //      MethodAttributes.Virtual | MethodAttributes.HideBySig,
    //      typeof(bool), new Type[] { typeof(object) });
    //  var generator = methodBuilder.GetILGenerator();
    //  LocalBuilder other = generator.DeclareLocal(typBuilder);
    //  Label next = generator.DefineLabel();
    //  generator.Emit(OpCodes.Ldarg_1);
    //  generator.Emit(OpCodes.Isinst, typBuilder);
    //  generator.Emit(OpCodes.Stloc, other);
    //  generator.Emit(OpCodes.Ldloc, other);
    //  generator.Emit(OpCodes.Brtrue_S, next);
    //  generator.Emit(OpCodes.Ldc_I4_0);
    //  generator.Emit(OpCodes.Ret);
    //  generator.MarkLabel(next);

    //  var tuples = info.PropertyTypes.Zip(fields, (t, f) => Tuple.Create(t, f));
    //  foreach (var tuple in tuples) {
    //    // can't use field.FieldType because it returns an unresolved generic type.
    //    Type fieldType = tuple.Item1; // field.FieldType;
    //    FieldBuilder field = tuple.Item2;

    //    Type ct = typeof(EqualityComparer<>).MakeGenericType(fieldType);
    //    next = generator.DefineLabel();
    //    generator.EmitCall(OpCodes.Call, ct.GetMethod("get_Default"), null);
    //    generator.Emit(OpCodes.Ldarg_0);
    //    generator.Emit(OpCodes.Ldfld, field);
    //    generator.Emit(OpCodes.Ldloc, other);
    //    generator.Emit(OpCodes.Ldfld, field);
    //    generator.EmitCall(OpCodes.Callvirt, ct.GetMethod("Equals", new Type[] { fieldType, fieldType }), null);
    //    generator.Emit(OpCodes.Brtrue_S, next);
    //    generator.Emit(OpCodes.Ldc_I4_0);
    //    generator.Emit(OpCodes.Ret);
    //    generator.MarkLabel(next);
    //  }
    //  generator.Emit(OpCodes.Ldc_I4_1);
    //  generator.Emit(OpCodes.Ret);
    //}

    //// This method does not work for Silverlight. It executes but the call to GetHashCode fails with a VerificationException at runtime
    //private static void BuildGetHashCodeMethod(DynamicTypeInfo info, TypeBuilder typBuilder, List<FieldBuilder> fields) {
    //  var mb = typBuilder.DefineMethod("GetHashCode",
    //      MethodAttributes.Public | MethodAttributes.ReuseSlot |
    //      MethodAttributes.Virtual | MethodAttributes.HideBySig,
    //      typeof(int), Type.EmptyTypes);
    //  var generator = mb.GetILGenerator();
    //  generator.Emit(OpCodes.Ldc_I4_0);
    //  var tuples = info.PropertyTypes.Zip(fields, (t, f) => Tuple.Create(t, f));
    //  foreach (var tuple in tuples) {
    //    Type fieldType = tuple.Item1; //  field.FieldType;
    //    var field = tuple.Item2;
    //    Type ct = typeof(EqualityComparer<>).MakeGenericType(fieldType);
    //    generator.EmitCall(OpCodes.Call, ct.GetMethod("get_Default"), null);
    //    generator.Emit(OpCodes.Ldarg_0);
    //    generator.Emit(OpCodes.Ldfld, field);
    //    generator.EmitCall(OpCodes.Callvirt, ct.GetMethod("GetHashCode", new Type[] { fieldType }), null);
    //    generator.Emit(OpCodes.Xor);
    //  }
    //  generator.Emit(OpCodes.Ret);
    //}
    

    private static IEnumerable<FieldBuilder> BuildFields(DynamicTypeInfo info, 
      TypeBuilder typBuilder, GenericTypeParameterBuilder[] parameterBuilders) {
      var propertyCount = info.PropertyNames.Count;
      for (int i = 0; i < propertyCount; i++) {
        yield return typBuilder.DefineField("_" + info.PropertyNames[i], parameterBuilders[i],
          FieldAttributes.Private | FieldAttributes.InitOnly);
      }
    }

  }
}
