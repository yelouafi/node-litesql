## What's this ?

litesql is a tiny library easing developpement with sqlite databases.

work was based upon the [massive-js][massive] library. massivejs is a nodejs module and provides an intuitive interface over raw Mysql and Postgre modules.

[massive]: https://github.com/robconery/massive-js

basically, litesql intends to bring the same interface into sqlite database. undeway the module use the [sqlite3][sqlite3] module, meaning you can access all the functions it offers.

[sqlite3]: https://github.com/mapbox/node-sqlite3

Of course you may also use the additional facilities this module offers (otherwise, you wouldn't be here, right?)

## Getting started

install it
```
npm install litesql
```

then use it
```javascript
var litesql = require('litesql');
var db = litesql.db(':memory:');

db.serialize(function() {
    db.createTable(
        // table name
        'todos', 
        
         // table defintion
        {   
            // shortcut for id INTEGER PRIMARY KEY AUTOINCREMENT                                           
            id: 'pk',    
            num: 'int',
            
            // column definition can be an object too; you can pass it also 'unique: true'
            task: { type: 'text', required: true },  

            // type alias is managed internally by the library
            duedate: 'date',
            completed: 'boolean'                        
        }
    ).run();
    /*
        you can also write
        var query = db.createTable(...);
        query.run( function (err) { ... } );
    */
    
    // helper class
    var todos = new litesql.Table('todos', 'id', db);
    
    for(var i = 1; i <= 10; i++) {
        todos.insert({ num: i,  task: 'Task #'+i, duedate: new Date(), completed: false }).run();
    }
    
    todos.find().all( function(err, tasks){        
        assert.equal(tasks.length, 10);    
    });
    
})
```
So basically, it works always the way you've seen it
- Construct a query via helper methods and classes
- then execute the query using methods like you are used to ( run, get, all, each )

## CRUD methods

We've already seen `#insert`, following we use `#update` to update an existing record given its primary key; usually (but not necessary) an `id` column;
```javascript

db.serialize(function() {
    // update by pk (id = 1)
    todos.update({ task: 'have to finish this' }, 1 /* pk */).run();
    
    // and also find by pk (id = 1)
    todos.find(1).get(function(err, todo) {
        assert.equal(todo.task, 'have to finish this');
    });
});
```
You can also update by another condition; here we update all records with `num <= 5`
```javascript
db.serialize(function() {
    // update all completed todos
    // set compteted = true on all records with num <= 5
    todos.update({ completed: true }, { 'num <=': 5 }).run();
    
    // we can also call #find with an object hash for conditions
    todos.find({ completed: true }).all(function(err, completedTasks) {
        assert.equal(completedTasks.length, 5);        
    });
});
```
Another way to insert a new record is via the `#save` method
```javascript
db.serialize(function() {
    // will insert a new record, since there is no pk field
    todos.save({ task: 'give me more examples', completed: false }).run();
    todos.find({ task: 'give me more examples' }).all(function(err, tasks) {
        assert.equal(tasks.length, 1);       
    });
});
```

You can use `#save` to update an existing record as well. Just include the pk field
```javascript
db.serialize(function() {
    // will update an existing record, since we have specified the pk field
    todos.save({ id: '1', task: 'first of firsts' }).run();
    todos.find(1).get(function(err, todo) {
        assert.equal(todo.task, 'first of firsts');       
    });
});
```
We use `#remove` to delete an existing record; below we remove by the pk field
```javascript
db.serialize(function() {
    // remove todo by pk (id=10)
    todos.remove(10).run();
    todos.find(10).all(function(err, todos) {
        assert.equal(todos.length, 0);        
    });
});
```
As you may have already guessed, you can call `#remove` with more conditions; below we remove all tasks with completed=true
```javascript
db.serialize(function() {
    // remove all completed tasks    
    todos.remove({ completed: true }).run();
    todos.find({ completed: true }).all(function(err, todos) {
        assert.equal(todos.length, 0);       
    });
});
```
## Schema helper methods
TBD
