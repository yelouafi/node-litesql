## What's this ?

litesql is a tiny library easing developpement with sqlite databases.

work was based upon the [massive-js][massive] library. massivejs is a nodejs module and provides an intuitive interface over raw Mysql and Postgre modules.

[massive]: https://github.com/robconery/massive-js

basically, litesql intends to brings the same interface into sqlite database. undeway the module use the [sqlite3][sqlite3]

[sqlite3]: https://github.com/mapbox/node-sqlite3

## Basic usage

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
        'todos',                                        // table name
        {                                               // table defintion
            id: 'pk',                                   // shortcut for id INTEGER PRIMARY KEY AUTOINCREMENT
            task: { type: 'text', required: true },     // you can pass it also 'unique: true'
            duedate: 'date',
            completed: 'boolean'                        // type alias is managed internally 
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
        done();
    });
    
})
```