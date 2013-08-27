
#Ruby on Rails Server

This "rails" directory holds the Ruby on Rails code and database data for the CCJS-Ruby sample.

Assuming you have Ruby and MySql installed in your environment, there are four principle steps to running the application. 

##1. Ruby-CCJS Setup

You only perform this step once.

a. Install all gems the project needs
   (correct the directory name as appropriate)

	~\ccjs_ruby\rails>bundle install 

b. Copy database.yml from the source (Ruby on Rails) to ~\>ccjs_ruby\rails/config

c. Update database.yml with your MySQL user credentials

d. Create the project database

	~\ccjs_ruby\rails>bundle exec rake db:create

e. Create the project database structure

	~\ccjs_ruby\rails>bundle exec rake db:migrate

f.  Import Data

	~\ccjs_ruby\rails>mysql -u [user] -p ccjs_ruby_development < db/data.sql

##2. Start the rails server

	~\ccjs_ruby\rails>bundle exec rails s

The rails server is running on port 3000

##3. Start the client application server

The client application assets - html, css, JavaScript - are in the ~\ccjs_ruby\client directory.

Open a new command window, navigate to that directory, and launch your web server of choice. 
Here is an example running in Python.

    ~\ccjs_ruby\rails>cd ..\client
	~\ccjs_ruby\client>python -m http.server

The client application server is running on port 8000

##4. Load the app in your browser

Open a browser to http://localhost:8000/