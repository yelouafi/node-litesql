## What's this ?

litesql is a tiny library easing developpement with sqlite databases.

work was based upon the [massive-js][massive] library. massivejs is a nodejs module and provides an intuitive interface over raw Mysql and Postgre modules.

[massive]: https://github.com/robconery/massive-js

basically, litesql intends to brings the same interface into sqlite database. undeway the module use the [sqlite3][sqlite3]

[sqlite3]: https://github.com/mapbox/node-sqlite3

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
        todos.insert({ task: 'Task #'+i, duedate: new Date(), completed: false }).run();
    }
    
    todos.find().all( function(err, tasks){
        assert.equal(err, null);
        assert.equal(tasks.length, 10);    
    });
    
})
```
So basically, it works always the way you've seen it
- Construct a query via helper methods and classes
- then execute the query using methods like you are used to ( run, get, all, each )

## Documentation
More to come soon; for now, you may take a look on the tests to see how it's been used
