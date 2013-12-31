package northwind.service;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;

public class NorthwindSessionFactory {

    private static Configuration configuration;
    private static SessionFactory sessionFactory;
	
    private NorthwindSessionFactory() {}
    
	static {
		 // configures settings from hibernate.cfg.xml
		configuration = new Configuration();
		sessionFactory = configuration.configure().buildSessionFactory();
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
	
}
