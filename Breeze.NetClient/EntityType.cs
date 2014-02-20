﻿using Breeze.Core;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace Breeze.NetClient {

  public class EntityType : StructuralType, IJsonSerializable {

    public EntityType() {
    }

    public EntityType(JNode jNode) {
      ShortName = jNode.Get<String>("shortName");
      Namespace = jNode.Get<String>("namespace");
      BaseTypeName = jNode.Get<String>("baseTypeName");
      IsAbstract = jNode.Get<bool>("isAbstract");
      AutoGeneratedKeyType = jNode.GetEnum<AutoGeneratedKeyType>("autoGeneratedKeyType");
      var drn = jNode.Get<String>("defaultResourceName");
      if (drn != null) {
        MetadataStore.Instance.AddResourceName(drn, this, true);
      }
      jNode.GetJNodeArray("dataProperties").Select(jn => new DataProperty(jn)).ForEach(dp => AddDataProperty(dp));
      jNode.GetJNodeArray("navigationProperties").Select(jn => new NavigationProperty(jn)).ForEach(np => AddNavigationProperty(np));
      // validators
      // custom
    }

    JNode IJsonSerializable.ToJNode(Object config) {
      var jo = new JNode();
      jo.AddPrimitive("shortName", this.ShortName);
      jo.AddPrimitive("namespace", this.Namespace);
      jo.AddPrimitive("baseTypeName", this.BaseTypeName);
      jo.AddPrimitive("isAbstract", this.IsAbstract, false);
      jo.AddPrimitive("autoGeneratedKeyType", this.AutoGeneratedKeyType.ToString());
      jo.AddPrimitive("defaultResourceName", this.DefaultResourceName);
      jo.AddArray("dataProperties", this.DataProperties.Where(dp => dp.IsInherited == false));
      jo.AddArray("navigationProperties", this.NavigationProperties.Where(np => np.IsInherited == false));
      // jo.AddArrayProperty("validators", this.Validators);
      // jo.AddProperty("custom", this.Custom.ToJObject)
      return jo;
    }

    #region Public properties

    public String BaseTypeName { get; internal set; }
    public EntityType BaseEntityType { get; internal set; }
    public AutoGeneratedKeyType AutoGeneratedKeyType { get; internal set; }
    public override bool IsEntityType { get { return true; } }

    public String DefaultResourceName {
      get { return MetadataStore.Instance.GetDefaultResourceName(this); }
    }

    public ReadOnlyCollection<EntityType> Subtypes {
      get { return _subtypes.ReadOnlyValues; }
    }

    public override IEnumerable<StructuralProperty> Properties {
      get { return _dataProperties.Cast<StructuralProperty>().Concat(_navigationProperties); }
    }

    public ICollection<NavigationProperty> NavigationProperties {
      get { return _navigationProperties.ReadOnlyValues; }
    }

    public ReadOnlyCollection<DataProperty> KeyProperties {
      get { return _keyProperties.ReadOnlyValues; }
    }

    public ReadOnlyCollection<DataProperty> ForeignKeyProperties {
      get { return _foreignKeyProperties.ReadOnlyValues; }
    }

    public ReadOnlyCollection<DataProperty> ConcurrencyProperties {
      get { return _concurrencyProperties.ReadOnlyValues; }
    }

    #endregion

    #region Public methods

    public IEntity CreateEntity() {
      var entity = (IEntity)Activator.CreateInstance(this.ClrType);
      entity.EntityAspect.EntityType = this;
      return entity;
    }

    public override StructuralProperty GetProperty(String propertyName) {
      var dp = GetDataProperty(propertyName);
      if (dp != null) return dp;
      var np = GetNavigationProperty(propertyName);
      if (np != null) return np;
      return null;
    }

    public StructuralProperty AddProperty(StructuralProperty prop) {
      // TODO: check that property is not already on this type
      // and that it isn't also on some other type.
      if (prop.IsDataProperty) {
        AddDataProperty((DataProperty)prop);
      } else {
        AddNavigationProperty((NavigationProperty)prop);
      }
      return prop;
    }

    public NavigationProperty GetNavigationProperty(String npName) {
      return _navigationProperties[npName];
    }



    #endregion

    #region protected/internal

    internal void AddSubEntityType(EntityType entityType) {
      _subtypes.Add(entityType);
    }

    internal override DataProperty AddDataProperty(DataProperty dp) {
      base.AddDataProperty(dp);

      if (dp.IsPartOfKey) {
        _keyProperties.Add(dp);
      }

      if (dp.IsForeignKey) {
        _foreignKeyProperties.Add(dp);
      }

      if (dp.IsConcurrencyProperty) {
        _concurrencyProperties.Add(dp);
      }

      return dp;
    }

    internal NavigationProperty AddNavigationProperty(NavigationProperty np) {
      np.ParentType = this;
      UpdateClientServerName(np);
      _navigationProperties.Add(np);

      if (!IsQualifiedTypeName(np.EntityTypeName)) {
        np.EntityTypeName = StructuralType.QualifyTypeName(np.EntityTypeName, this.Namespace);
      }
      return np;
    }



    #endregion

    #region private
    private NavigationPropertyCollection _navigationProperties = new NavigationPropertyCollection();
    private SafeList<DataProperty> _keyProperties = new SafeList<DataProperty>();
    private SafeList<DataProperty> _foreignKeyProperties = new SafeList<DataProperty>();
    private SafeList<DataProperty> _concurrencyProperties = new SafeList<DataProperty>();

    private SafeList<EntityType> _subtypes = new SafeList<EntityType>();

    #endregion



  
  }

  public class EntityTypeCollection : MapCollection<String, EntityType> {
    protected override String GetKeyForItem(EntityType item) {
      return item.ShortName + ":#" + item.Namespace;
    }
  }

  public enum AutoGeneratedKeyType {
    None = 0,
    Identity = 1,
    KeyGenerator = 2
  }




}
