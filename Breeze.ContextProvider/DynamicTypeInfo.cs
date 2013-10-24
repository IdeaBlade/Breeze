using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Reflection;
using System.Runtime.Serialization;
using System.Diagnostics;
using System.Text;


namespace Breeze.ContextProvider {

 
  /// <summary>
  /// Internal use only.
  /// </summary>
  [DataContract]
  public class DynamicTypeInfo {

    /// <summary>
    /// Suffix added to all dynamic assemblies constructed here.
    /// </summary>
    public const String DynamicAssemblyNameSuffix = "_IdeaBlade";
    /// <summary>
    /// For internal use only
    /// </summary>
    public const string CSharpAnonPrefix = "<>f__Anon";

    /// <summary>
    /// For internal use only
    /// </summary>
    public const string CSharpDynamicPrefix = "_IB_f__Anon";

    /// <summary>
    /// For internal use only
    /// </summary>
    public const string VBAnonPrefix = "VB$";

    /// <summary>
    /// For internal use only
    /// </summary>
    public const string VBDynamicPrefix = "$IBVB";

    /// <summary>
    /// For internal use only
    /// </summary>
    public const string BaseDynamicPrefix = "_IB_";



    static DynamicTypeInfo() {
      lock (__lock) {
        if (!__typeResolverRegistered) {
          __typeResolverRegistered = true;
          AppDomain.CurrentDomain.AssemblyResolve += new ResolveEventHandler(AssemblyResolveHandler);
        }
      }
    }

    /// <summary>
    /// Either finds a dynamic type that matches the specified anon or dynamic type or 
    /// creates a new DynamicTypeInfo that does.
    /// </summary>
    /// <param name="anonOrDynType"></param>
    /// <returns></returns>
    public static DynamicTypeInfo FindOrCreate(Type anonOrDynType) {
      if (DynamicTypeInfo.IsDynamicType(anonOrDynType)) {
        return FindByDynamicTypeName(anonOrDynType.Name);
      } else {
        return null;
      }
    }

    /// <summary>
    /// Either finds a dynamic type that matches the specified propertyNames and propertyTypes or creates a 
    /// new DynamicType that does.  
    /// </summary>
    /// <param name="propertyNames"></param>
    /// <param name="propertyTypes"></param>
    /// <returns></returns>
    public static DynamicTypeInfo FindOrCreate(IEnumerable<String> propertyNames, IEnumerable<Type> propertyTypes) {
      var typeShape = new TypeShape(propertyNames, propertyTypes);
      var dti = FindByTypeShape(typeShape);
      if (dti != null) {
        return dti;
      } else {
        return new DynamicTypeInfo(typeShape);
      }
    }

    /// <summary>
    /// For internal use only. Builds a dynamic type from an anonymous type.
    /// </summary>
    /// <param name="anonType"></param>
    private DynamicTypeInfo(Type anonType) {
      OriginalType = anonType;
      TypeName = anonType.Name;

      var props = anonType.GetProperties();
      _propertyNames = props.Select(p => p.Name).ToList();
      _propertyTypes = props.Select(p => p.PropertyType).ToList();
      DynamicTypeName = BuildDynamicTypeName();
    }

    /// <summary>
    /// Called by FindOrCreate to create a new dynamictypeinfo based on the selected properties and types  
    /// </summary>
    private DynamicTypeInfo(TypeShape typeShape) {
      _propertyNames = typeShape.PropertyNames;
      _propertyTypes = typeShape.PropertyTypes;
      if (_propertyNames.Count != _propertyTypes.Count) {
        throw new ArgumentException("Number of property names and property types must be the same");
      }
      DynamicTypeName = BuildDynamicTypeName();
      CreateDynamicType();
      // originalType will be set by CreateDynamicType if not already set.
    }

    

    /// <summary>
    /// For internal use only.
    /// </summary>
    public Type OriginalType {
      get { return _originalType; }
      set { _originalType = value; }
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    public Type DynamicType {
      get {
        if (_dynamicType == null) {
          CreateDynamicType();
        }
        return _dynamicType;
      }
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    [DataMember]
    public String TypeName { get; protected set; }

    /// <summary>
    /// For internal use only.
    /// </summary>
    [DataMember]
    public String DynamicTypeName { get; private set; }

    /// <summary>
    /// For internal use only.
    /// </summary>
    public ReadOnlyCollection<String> PropertyNames {
      get { return _propertyNames.AsReadOnly(); }
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    public ReadOnlyCollection<Type> PropertyTypes {
      get { return _propertyTypes.AsReadOnly(); }
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    public ReadOnlyCollection<PropertyInfo> Properties {
      get {
        if ( _properties == null) {
          _properties = PropertyNames.Select(p => DynamicType.GetProperty(p)).ToList();
        }
        return _properties.AsReadOnly();
      }
    }


    /// <summary>
    /// For internal use only.
    /// </summary>
    public ConstructorInfo DynamicConstructor {
      get {
        if (_dynamicConstructorInfo == null) {
          CreateDynamicType();
        }
        return _dynamicConstructorInfo;
      }
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    public ConstructorInfo DynamicEmptyConstructor {
      get {
        if (_dynamicEmptyConstructorInfo == null) {
          CreateDynamicType();
        }
        return _dynamicEmptyConstructorInfo;
      }
    }

    /// <summary>
    /// Should this dynamic type's assembly be written out as a file.
    /// </summary>
    public bool DynamicTypeShouldSave {
      get;
      set;
    }

    /// <summary>
    /// File directory to write out the dynamic types assembly.
    /// </summary>
    public String DynamicTypeFileDirectory {
      get;
      set;
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public override bool Equals(object obj) {
      if (this == obj) return true;
      var other = obj as DynamicTypeInfo;
      if (other == null) return false;
      if (OriginalType != null) {
        return this.OriginalType == other.OriginalType;
      } else {
        return this.TypeName.Equals(other.TypeName)
          && this.PropertyNames.SequenceEqual(other.PropertyNames)
          && this.PropertyTypes.SequenceEqual(other.PropertyTypes);
      }
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <returns></returns>
    public override int GetHashCode() {
      return TypeName.GetHashCode();
    }

    #region public statics 


    ///// <summary>
    ///// Converts a anon type to a dynamic type and returns non-anon types unchanged.  If the same anon type is converted more than once the same dynamic type will be returned.
    ///// </summary>
    ///// <param name="t"></param>
    ///// <returns></returns>
    //public static Type ConvertType(Type t) {
    //  if (!AnonymousFns.IsAnonymousType(t)) return t;
    //  var dti = DynamicTypeInfo.FindOrCreate(t);
    //  return dti.DynamicType;
    //}

    /// <summary>
    /// Return the DynamicTypeInfo for the specified assembly name containing a dynamic type.
    /// </summary>
    /// <param name="pAssemblyName"></param>
    /// <returns></returns>
    public static DynamicTypeInfo FindByAssemblyName(String pAssemblyName) {
      String dynamicTypeName = ConvertDynamicAssemblyNameToDynamicTypeName(pAssemblyName);
      return DynamicTypeInfo.FindByDynamicTypeName(dynamicTypeName);
    }

    /// <summary>
    /// Return the DynamicTypeInfo for the specified dynamic type name.
    /// </summary>
    /// <param name="name"></param>
    /// <returns></returns>
    public static DynamicTypeInfo FindByDynamicTypeName(String name) {
      DynamicTypeInfo result;
      lock (__lock) {
        if (TypeInfoNameMap.TryGetValue(name, out result)) {
          return result;
        } else {
          return null;
        }
      }
    }

    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="type"></param>
    /// <returns></returns>
    public static bool IsDynamicType(Type type) {
      return type.FullName.StartsWith(CSharpDynamicPrefix)
        || type.FullName.StartsWith(VBDynamicPrefix)
        || type.FullName.StartsWith(BaseDynamicPrefix);
    }

    /// <summary>
    /// Return the dynamic type name for the specified assembly name containing the dynamic type.
    /// </summary>
    /// <param name="pAssemblyName"></param>
    /// <returns></returns>
    private static String ConvertDynamicAssemblyNameToDynamicTypeName(String pAssemblyName) {
      int ix = pAssemblyName.IndexOf(DynamicAssemblyNameSuffix);
      if (ix == -1) return String.Empty;
      String typeName = pAssemblyName.Substring(0, ix);
      return typeName;
    }


    /// <summary>
    /// For internal use only.
    /// </summary>
    /// <param name="typeShape"></param>
    /// <returns></returns>
    private static DynamicTypeInfo FindByTypeShape(TypeShape typeShape) {
      DynamicTypeInfo result;
      lock (__lock) {
        if (TypeShapeMap.TryGetValue(typeShape, out result)) {
          return result;
        } else {
          return null;
        }
      }
    }

    #endregion

    private static Dictionary<Type, DynamicTypeInfo> TypeInfoMap {
      get {
        Initialize();
        return __typeInfoMap;
      }
    }

    private static Dictionary<String, DynamicTypeInfo> TypeInfoNameMap {
      get {
        Initialize();
        return __typeInfoNameMap;
      }
    }

    private static Dictionary<TypeShape, DynamicTypeInfo> TypeShapeMap {
      get {
        Initialize();
        return __typeShapeMap;
      }
    }

    private static void Initialize() {
      // do not try assigning these in static constructors; can cause a very subtle dependency bug.
      lock (__lock) {
        if (__typeInfoMap != null) return;
        __typeInfoMap = new Dictionary<Type, DynamicTypeInfo>();
        __typeInfoNameMap = new Dictionary<string, DynamicTypeInfo>();
        __typeShapeMap = new Dictionary<TypeShape, DynamicTypeInfo>();
      }

    }

    /// <summary>
    /// The type name generated must be the same even if generated during different sessions
    /// ( so no part can be random or based on the current time)
    /// because this same name may be sent to the server by multiple clients and
    /// the server needs to understand that these are all the same type. 
    /// </summary>
    /// <returns></returns>
    private String BuildDynamicTypeName() {
      if (this.OriginalType != null) {
        // Assert.IsTrue(AnonymousFns.IsAnonymousType(this.OriginalType)
        return TypeName
          .Replace(VBAnonPrefix, VBDynamicPrefix)
          .Replace(CSharpAnonPrefix, CSharpDynamicPrefix)
          + GetUniqueToken();
      } else {
        return BaseDynamicPrefix + GetUniqueToken();
      }
    }

    private String GetUniqueToken() {
      // This is used to construct the DynamicTypeName and needs to be 'unique'
      // across multiple applications because it will be used on the EntityServer 
      // Need to use the PropertyType name instead of the type itself because the 'type's 
      // hash code may change depending on the appDomain it is loaded into but
      // the name will not change.  We are not using GetHashCode because
      // it is not distinct enough hence the CalcStringHash method. 
      var input = (TypeName ?? "") + "|" + PropertyNames.ToAggregateString(",") + "|" + PropertyTypes.Select(t => t.FullName).ToAggregateString(",");
      var stringHash = CalcStringHash(input, 16);
      return stringHash;
    }

    /// <summary>
    /// Returns a hash encoded as a string with the chars (A-Z,A-z,0-9,_) only.
    /// Under the covers this method returns an 128 bit hash code calculated
    /// using SHA1.  This code is then encoded into an approx Base64 encode
    /// of the chars listed above.  This will usually be approx 28 chars in length,
    /// which may then be truncated based on the maxChars parameter. This
    /// method can process approx 100K 300 char strings a second.
    /// </summary>
    /// <param name="stringToHash"></param>
    /// <param name="maxChars"></param>
    /// <returns></returns>
    private static string CalcStringHash(string stringToHash, int maxChars) {
      //Unicode Encode Covering all characterset
      byte[] byteContents = Encoding.Unicode.GetBytes(stringToHash);
      var provider = new System.Security.Cryptography.SHA1Managed();
      byte[] hash = provider.ComputeHash(byteContents);

      string stringHash = Convert.ToBase64String(hash);
      stringHash = stringHash.Replace("=", "").Replace("/", "_d").Replace("+", "_p");
      return stringHash;
    }


    private void CreateDynamicType() {
      _dynamicType = DynamicGenericTypeBuilder.CreateType(this);
      _dynamicEmptyConstructorInfo = _dynamicType.GetConstructor( new Type[0]);
      _dynamicConstructorInfo = _dynamicType.GetConstructor(_propertyTypes.ToArray());
      if (OriginalType == null) {
        OriginalType = _dynamicType;
      }
      AddToMap(this);
      Trace.WriteLine("DynamicType constructed " + this.DynamicTypeName);
    }

    private static void AddToMap(DynamicTypeInfo info) {
      if (info._isInMap) return;
      lock (__lock) {
        TypeInfoMap[info.OriginalType] = info;
        TypeInfoNameMap[info.DynamicTypeName] = info;
        if (info.DynamicType == info.OriginalType) {
          TypeShapeMap[new TypeShape(info)] = info;
        }
        info._isInMap = true;
      }
    }

    private static Assembly AssemblyResolveHandler(object pSender, ResolveEventArgs pArgs) {
      DynamicTypeInfo info = FindByAssemblyName(pArgs.Name);
      if (info == null) {
        // return Assembly.GetExecutingAssembly(); // will allow caller throw a standard unable to resolve exception
        return null;
      } else {
        return info.DynamicType.Assembly;
      }
    }


    /// <summary>
    /// For internal use only.
    /// </summary>
    [DataMember]
    public List<String> PropertyNameWrappers {
      get { return _propertyNames; }
      set { _propertyNames = value; }
    }

    /// <summary>
    ///Used for shape comparison.
    /// </summary>
    internal class TypeShape {

      public TypeShape(IEnumerable<String> propertyNames, IEnumerable<Type> propertyTypes) {
        PropertyNames = propertyNames.ToList();
        PropertyTypes = propertyTypes.ToList();
      }

      public TypeShape(DynamicTypeInfo dti) {
        PropertyNames = dti._propertyNames;
        PropertyTypes = dti._propertyTypes;
      }

      public List<String> PropertyNames { get; private set; }
      public List<Type> PropertyTypes { get; private set; }

      public override bool Equals(object obj) {
        var tk = obj as TypeShape;
        if (tk == null) return false;
        return tk.PropertyNames.SequenceEqual(this.PropertyNames) 
          && tk.PropertyTypes.SequenceEqual(this.PropertyTypes);
      }

      public override int GetHashCode() {
        return PropertyNames.GetAggregateHashCode() ^ PropertyTypes.GetAggregateHashCode();
      }

    }

    private static Object __lock = new Object();
    private static bool __typeResolverRegistered = false;
    // map of anon and dynamic types to corresponding dynamicTypeInfo
    private static Dictionary<Type, DynamicTypeInfo> __typeInfoMap;
    // map of regular type name to its corresponding dynamicTypeInfo
    private static Dictionary<String, DynamicTypeInfo> __typeInfoNameMap;
    // map of unique dynamic type shapes to their corresponding dynamicTypeInfo
    private static Dictionary<TypeShape, DynamicTypeInfo> __typeShapeMap;

    private bool _isInMap;
    private Type _originalType;
    private Type _dynamicType;
    private List<String> _propertyNames;
    private List<Type> _propertyTypes;
    private List<PropertyInfo> _properties;
    private ConstructorInfo _dynamicConstructorInfo;
    private ConstructorInfo _dynamicEmptyConstructorInfo;

  }

  
}
