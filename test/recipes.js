var assert = require("assert")
var utils = require('../lib/utils');
var litesql = require('../index');


describe('recipes', function(){

    var db = litesql.db(":memory:");
    // helper class
    var todos = new litesql.Table('todos', 'id', db);
    
    it('should create a table and insert data into it', function(done) {
        db.serialize(function() {
            db.createTable(
                'todos',        // table name
                {               // table defintion
                    id: 'pk',   // shortcut for id INTEGER PRIMARY KEY AUTOINCREMENT
                    task: { type: 'text', required: true }, // you can pass it also 'unique: true'
                    duedate: 'date',
                    completed: 'boolean'  // types alias are managed internally 
                }
            ).run(); 
            /*
                you can also write
                var query = db.createTable(...);
                query.run( function (err) { ... } );
            */
            
            
            
            for(var i = 1; i <= 10; i++) {
                todos.insert({ task: 'Task #'+i, duedate: new Date(), completed: false }).run();
            }
            
            todos.find().all( function(err, tasks){
                assert.equal(err, null);
                assert.equal(tasks.length, 10);
                done();
            });
            
        })
    });
})