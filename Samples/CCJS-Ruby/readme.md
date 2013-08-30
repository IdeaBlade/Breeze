
#CCJS - Ruby on Rails

This sample illustrates a BreezeJS client working with a Ruby on Rails backend. 

The [Breeze CCJS-Ruby sample documentation](http://www.breezejs.com/samples/intro-spa-ruby) has more information about this sample.

There are two main directories, "client" and "rails".

##client
The client app (CCJS) is derived from the published source code for John Papa's "Code Camper Jumpstart". Learn about CCJS in his justly famous PluralSight course, ["Single Page Apps JumpStart"](http://pluralsight.com/training/Courses/TableOfContents/single-page-apps-jumpstart)

It has been modified in small but important ways to interact with a Rails backend instead of the ASP.NET Web API backend in the original. In all other respects (except the ruby re-coloring), it is the same as the original. John's course is the best guide to it's behavior and implementation.

##rails
This "rails" directory holds the Ruby on Rails code and database data for the CCJS-Ruby sample.

##prerequisites
We assume you are familiar with Ruby and have Rails, MySql, and some kind of web server installed in your environment. 

There are four principle steps to running the application.

##Setup and launch

###1. setup 

You only perform this step once.

a. Install all gems the project needs
   (correct the directory name as appropriate)

	~\ccjs_ruby\rails>bundle install 

b. Copy database.yml from the source (Ruby on Rails) to ~\>ccjs_ruby\rails/config

c. Update database.yml with your MySQL user credentials

d. Create the project database (make sure MySQL is running first!)

	~\ccjs_ruby\rails>bundle exec rake db:create

e. Create the project database structure

	~\ccjs_ruby\rails>bundle exec rake db:migrate

f.  Import Data

	~\ccjs_ruby\rails>mysql -u [user] -p ccjs_ruby_development < db/data.sql

###2. start the rails server

	~\ccjs_ruby\rails>bundle exec rails s

The rails server is running on port 3000

###3. start the client application server

The client application assets - html, css, JavaScript - are in the ~\ccjs_ruby\client directory.

Open a new command window, navigate to that directory, and launch your web server of choice. 
Here is an example running in Python.

    ~\ccjs_ruby\rails>cd ..\client
	~\ccjs_ruby\client>python -m http.server

The client application server is running on port 8000

###4. load the app in your browser

Open a browser to http://localhost:8000/