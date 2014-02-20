package com.breezejs.hib;

import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;

public class StaticConfigurator {

    private static SessionFactory sessionFactory;
    private static Metadata metadata;
	
    private StaticConfigurator() {}
    
	static {
		 // configures settings from hibernate.cfg.xml
		Configuration configuration = new Configuration();
		sessionFactory = configuration.configure().buildSessionFactory();
		MetadataBuilder metaGen = new MetadataBuilder(sessionFactory, configuration);
		metadata = metaGen.buildMetadata();
	}
	
    public static SessionFactory getSessionFactory()
    {
        return sessionFactory;
    }
    
	public static Metadata getMetadata()
	{
		return metadata;
	}
}
