using System;
using System.Collections.Generic;
using System.Linq;

namespace Sample_WebApi2.Models {

  public class NonEFModelContext {

    private List<Person> _persons;

    public NonEFModelContext() {
      this._persons = new List<Person>();

      var p = new Person("John", "Smith", new DateTime(1965, 1, 1));
      p.Meals.Add(new Meal(p, new DateTime(2012, 1, 1),
                           new Dish("Spaghetti", 1),
                           new Dish("Milk", 1.5)));
      p.Meals.Add(new Meal(p, new DateTime(2012, 2, 2),
                           new Dish("Brocolli", 1),
                           new Dish("Red Wine", 1.5)));
      p.Meals.Add(new Meal(p, new DateTime(2012, 2, 2),
                           new Dish("Lamb Chop", 2),
                           new Dish("White Wine", 1.5)));
      this._persons.Add(p);

      p = new Person("William", "Jones", new DateTime(1983, 3, 15));
      p.Meals.Add(new Meal(p, new DateTime(2012, 1, 1),
                           new Dish("Brownie", 2),
                           new Dish("Milk", 1.5)));
      p.Meals.Add(new Meal(p, new DateTime(2012, 2, 2),
                           new Dish("Denver Omelette", 1),
                           new Dish("Bacon", 2),
                           new Dish("Orange Juice", 1.5)));
      this._persons.Add(p);

      p = new Person("An", "Yang", new DateTime(1977, 6, 20));
      p.Meals.Add(new Meal(p, new DateTime(2012, 2, 1),
                           new Dish("Bran Cereal", 2),
                           new Dish("Milk", 1.5)));
      p.Meals.Add(new Meal(p, new DateTime(2012, 4, 2),
                           new Dish("Denver Omelette", 1),
                           new Dish("Hash Browns", 1),
                           new Dish("Orange Juice", 1.5)));

      p.Meals.Add(new Meal(p, new DateTime(2012, 2, 2),
                           new Dish("Lamb Chop", 2),
                           new Dish("Tomato Juice", 1.5)));
      this._persons.Add(p);

    }

    public IQueryable<Person> Persons {
      get { return _persons.AsQueryable(); }
    }

    public IQueryable<Meal> Meals {
      get { return Persons.SelectMany(p => p.Meals); }
    }
  }

  internal static class IdGenerator {
    private static int __nextId = 1;

    public static int GetNextId() {
      return __nextId++;
    }
  }

  public class Person {
    public Person(String firstName, String lastName, DateTime birthDate) {
      PersonId = IdGenerator.GetNextId();
      FirstName = firstName;
      LastName = lastName;
      BirthDate = birthDate;
      Meals = new List<Meal>();
    }

    public int PersonId { get; set; }
    public String FirstName { get; set; }
    public String LastName { get; set; }
    public DateTime BirthDate { get; set; }
    public IList<Meal> Meals { get; internal set; }
  }

  public class Meal {
    public Meal(Person person, DateTime dateConsumed, params Dish[] dishes) {
      // next deliberately omitted to see if entity fixup occurs on the client. 
      // Person = person;
      PersonId = person.PersonId;
      DateConsumed = dateConsumed;
      MealId = IdGenerator.GetNextId();
      Dishes = dishes.ToList();
    }

    public int MealId { get; set; }
    public int PersonId { get; set; }
    public Person Person { get; set; }
    public DateTime DateConsumed { get; set; }
    public IList<Dish> Dishes { get; internal set; }
  }

  public class Dish {
    public Dish(String foodName, double servingSize) {
      DishId = IdGenerator.GetNextId();
      FoodName = foodName;
      ServingSize = servingSize;
    }

    public int DishId { get; set; }
    public String FoodName { get; set; }
    public double ServingSize { get; set; }
    public Food Food { get; set; }
  }

  public class Food {
    public string FoodName { get; set; }
    public int Calories { get; set; }
  }

  
}


