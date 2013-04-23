Application creates and populates the Todo.sdf and Inheritance.sdf SQL CE 4 databases if they do not exist in this folder. 
These databases are not part of the project structure; they becomes visible when you "show all files". 

They are also purged and reinitialized ever time the server starts or when the controller purge/reset actions are called.

The NorthwindIB.sdf database must exist and is part of the project structure.