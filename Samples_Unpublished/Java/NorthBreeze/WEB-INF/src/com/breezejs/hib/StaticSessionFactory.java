package com.breezejs.hib;

import java.util.Map;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;

public class StaticSessionFactory {

    private static Configuration configuration;
    private static SessionFactory sessionFactory;
    private static Map<String, Object> metadataMap;
	
    private StaticSessionFactory() {}
    
	static {
		 // configures settings from hibernate.cfg.xml
		configuration = new Configuration();
		sessionFactory = configuration.configure().buildSessionFactory();
		MetadataBuilder metaGen = new MetadataBuilder(sessionFactory, configuration);
		metadataMap = metaGen.buildMetadata();
	}
	
    public static Configuration getConfiguration()
    {
        return configuration;
    }

    public static SessionFactory getSessionFactory()
    {
        return sessionFactory;
    }

    public static Session openSession()
    {
        Session session = sessionFactory.openSession();
        return session;
    }
    
	public static Map<String, Object> getMetadataMap()
	{
		return metadataMap;
	}
}
