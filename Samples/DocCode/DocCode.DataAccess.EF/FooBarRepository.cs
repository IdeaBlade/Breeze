using System;
using System.Collections.Generic;
using System.Linq;
using FooBar.Models;

namespace DocCode.DataAccess
{
    /// <summary>
    /// Repository (a "Unit of Work" really) of Foo models.
    /// </summary>
    public class FooBarRepository
    {
        private static FooBarInMemDb _context;

        static FooBarRepository()
        {
            Reset();
        }

        public IEnumerable<Foo> Foos
        {
            get { return _context.Foos; }
        }

        public Foo GetFooById(int id)
        {
            return _context.GetFooById(id); 
        }

        public Foo Insert(Foo foo)
        {
            return _context.Insert(foo);
        }

        public Foo Update(Foo foo)
        {
            return _context.Update(foo);
        }

        public bool Delete(Foo foo)
        {
            return _context.Delete(foo);
        }

        public static void Reset()
        {
            _context = new FooBarInMemDb();
        }

    }

    internal class FooBarInMemDb
    {
        private int _idSeed = 1;

        public FooBarInMemDb()
        {
            var mother = new DataMother(ref _idSeed);
            Foos = mother.Foos;
        }

        public List<Foo> Foos { get; set; }

        public Foo GetFooById(int id)
        {
            return Foos.SingleOrDefault(f => f.ID == id);
        }

        public Foo Insert(Foo foo)
        {
            if (foo == null) {
                throw new ArgumentNullException("foo");
            }
            foo.ID = _idSeed++;
            Foos.Add(foo);
            return foo;
        }

        public Foo Update(Foo foo)
        {
            if (foo == null)
            {
                throw new ArgumentNullException("foo");
            }
            var existingFoo = GetFooById(foo.ID);
            if (existingFoo == null) { return null; }

            existingFoo.Name = foo.Name;
            existingFoo.SomethingVeryBig = foo.SomethingVeryBig;

            return existingFoo;
        }

        public bool Delete(Foo foo)
        {
            return Foos.Remove(foo);
        }
    }

    internal class DataMother
    {
        private int _idSeed;

        public DataMother(ref int idSeed)
        {
            _idSeed = idSeed;
        }

        public List<Foo> Foos
        {
            get
            {
                return new List<Foo>
                {
                  new Foo {ID = _idSeed++, Name = "Foo A", SomethingVeryBig = "Wow that's a lot of data."},
                  new Foo {ID = _idSeed++, Name = "Foo C", SomethingVeryBig = "Wow that's even more data."},
                  new Foo {ID = _idSeed++, Name = "Foo B", SomethingVeryBig = "Cut it out already."},
                  new Foo {ID = _idSeed++, Name = "Foo D", SomethingVeryBig = "When will this end?"},
                  new Foo {ID = _idSeed++, Name = "Foo F", SomethingVeryBig = "OMG! You've got to be kidding."},
                  new Foo {ID = _idSeed++, Name = "Foo E", SomethingVeryBig = "We've got to get a grip on all this data."},
                }; 
            }
        }
    }
}
