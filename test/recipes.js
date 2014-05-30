var assert = require("assert")
var utils = require('../lib/utils');
var litesql = require('../index');


describe('recipes', function(){

    var db = litesql.db(":memory:");
    db.serialize(); // serialize all queries in this suite
    // helper class
    var todos = new litesql.Table('todos', 'id', db);
    
    it('should create a table and insert data into it', function(done) {     
        db.createTable(
            'todos',        // table name
            {               // table defintion
                id: 'pk',   // shortcut for id INTEGER PRIMARY KEY AUTOINCREMENT
                num: 'int',
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
            todos.insert({ num: i, task: 'Task #'+i, duedate: new Date(), completed: false }).run();
        }
        
        todos.find().all( function(err, tasks){
            //assert.equal(err, null);
            assert.equal(tasks.length, 10);       
            done();
        }); 
    });
    
    it('should update the first task by id', function(done) {     
            
        todos.update({ task: 'have to finish this' }, 1).run();
        todos.find(1).get(function(err, todo) {
            //assert.equal(err, null);
            assert.equal(todo.task, 'have to finish this');
            done();
        });
    });

    it('should mark first 5 todos as completed', function(done) {   
     
        todos.update({ completed: true }, { 'num <=': 5 }).run();
        todos.find({ completed: true }).all(function(err, completedTasks) {
            //assert.equal(err, null);
            //console.log(completedTasks)
            assert.equal(completedTasks.length, 5);
            done();
        });
        
    });
    
    it('should insert the new todo', function(done) {   
     
        todos.save({ task: 'give me more examples', completed: false }).run();
        todos.find({ task: 'give me more examples' }).all(function(err, tasks) {
            //assert.equal(err, null);
            assert.equal(tasks.length, 1);
            done();
        });
        
    });
    
    it('should update todo with id #1', function(done) {   
     
        todos.save({ id: '1', task: 'first of firsts' }).run();
        todos.find(1).get(function(err, todo) {
            //assert.equal(err, null);
            assert.equal(todo.task, 'first of firsts');
            done();
        });
        
    });
    
    it('should remove id #1', function(done) {   
     
        todos.remove(10).run();
        todos.find(10).all(function(err, todos) {
            //assert.equal(err, null);
            assert.equal(todos.length, 0);
            done();
        });
        
    });
    
    it('should remove all completed tasks', function(done) {   
        
        todos.find({ completed: true }).all(function(err, completedTasks) {
            assert.equal(completedTasks.length, 5);            
        });
        todos.remove({ completed: true }).run();
        todos.find({ completed: true }).all(function(err, todos) {
            //assert.equal(err, null);
            assert.equal(todos.length, 0);
            done();
        });
        
    });
    
    
})