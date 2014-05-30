var assert = require("assert")
var utils = require('../lib/utils');
var litesql = require('../index');
var sqlite = require('sqlite3').verbose();

describe('litesql', function(){
/*
    describe('sqlite3', function() {
        describe('#serialize', function() {
            it('should not permit other queries to intermix with those in #serialize', function(done) {
                var db = new sqlite.Database(':memory:');
                db.run('create table todos (task text)', function(err, cb) {
                    db.serialize(function() {
                        db.run('BEGIN');
                        console.log('insert 1');
                        db.run('insert into todos(task) values("my task 1")');   
                        db.all('select * from todos', function(err, res) {
                            console.log('before rollback ');
                            console.log(res);                                                               
                        })
                        setImmediate(function() {
                            console.log('rollback');
                            db.run('ROLLBACK', function() {
                                db.all('select * from todos', function(err, res) {
                                    console.log('after rollback ');
                                    console.log(res);
                                    assert.equal(res.length, 1);
                                    done()
                                    
                                })
                            }); 
                       });                       
                    });
                    console.log('insert 2');
                    db.run('insert into todos(task) values("my task 2")', function(err, res) {
                        db.all('select * from todos', function(err, res) {
                             console.log('out of rollback ')
                            console.log(res);
                        })
                       
                    })
                    
                    
                    
                })
                
            })
        })
    })
 */  
    describe('utils', function(){
        describe('#format', function() {
            it('should format "one {0} tow {1}" to "one 0 tow 1" given params(0,1) ', function() {
                var str = utils.format("one {0} tow {1}", 0,1);
                assert.equal(str, "one 0 tow 1");
            });
        });
        
        describe('#waterfall', function() {
            it('should forward arguments on the function chain ', function(done) {
                utils.waterfall( [
                    function(cb) {
                        cb(null, "fn1");
                    },
                    function(arg, cb) {
                        assert.equal(arg, 'fn1');
                        cb(null, "fn2-1", "fn2-2");
                    },
                    function(arg1, arg2, cb) {
                        assert.equal(arg1, 'fn2-1');
                        assert.equal(arg2, 'fn2-2')
                        cb(null, 'done');
                    }],
                    
                function(err, arg) {
                    assert.equal(err, null);
                    assert.equal(arg, 'done');
                    done();
                });
                
            });
            
            it('should skip to final callback due to error ', function(done) {
                utils.waterfall( [
                    function(cb) {
                        cb(null, "fn1");
                    },
                    function(arg, cb) {
                        assert.equal(arg, 'fn1');
                        cb("error on fn2");
                    },
                    function(arg1, arg2, cb) {
                        assert.equal(arg1, 'fn2-1');
                        assert.equal(arg2, 'fn2-2')
                        cb(null, 'done');
                    }],
                    
                function(err) {
                    assert.equal(err, "error on fn2");                 
                    done();
                });
                
            });
			
			it('should forward even undefined args ', function(done) {
                utils.waterfall( [
                    function(cb) {
                        cb(null, "fn1");
                    },
                    function(arg, cb) {
                        assert.equal(arg, 'fn1');
                        cb(null, undefined);
                    },
                    function(arg1, cb) {
                        assert.equal(typeof arg1, 'undefined');
                        cb(null, 'done');
                    }],
                    
                function(err, arg) {
                    assert.equal(err, null);   
					assert.equal(arg, 'done');   
                    done();
                });
                
            });
        });
        
    });
    
    describe("Query", function() {
        var table = { pk: 'id', name: 'table'};
        
        describe('#append', function(){            
            var sql = "select * from table";
            var qry = new litesql.Query(sql);
            
            it('should append "where 1=1" to the given sql statement', function() {                        
                qry.append(" where 1=1");
                sql += " where 1=1"
                assert.equal(qry.sql, sql);	
            });
            
            it('should append "limit 10 offset 20" to the given sql statement', function() {            
                qry.append(" limit {0} offset {1}", 10, 20);
                sql += " limit 10 offset 20";
                assert.equal(qry.sql, sql);
            });
        });
        
        describe('#order', function() {
            
            it('should append "ORDER BY code" to the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql);
                qry.order("code");
                sql += " ORDER BY code";
                assert.equal(qry.sql, sql);
            });
        });
            
        describe('#orderDesc', function() {
            
            it('should append "ORDER BY code DESC" to the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql);
                qry.orderDesc("code");
                sql += " ORDER BY code DESC";
                assert.equal(qry.sql, sql);
            });
        });
        
        describe('#limit', function() {
            
            it('should append "LIMIT 10 OFFSET 20" to the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql);
                qry.limit(10,20);
                sql += " LIMIT 10 OFFSET 20";
                assert.equal(qry.sql, sql);
            });
        });
        
        describe('#first', function() {
            
            it('should append "LIMIT (1)" to the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql);
                qry.first();
                sql += " LIMIT(1)";
                assert.equal(qry.sql, sql);
            });
        });
        
        describe('#last', function() {
            
            it('should append "ORDER BY id DESC LIMIT(1)" to the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql, table);
                qry.last();
                sql += " ORDER BY id DESC LIMIT(1)";
                assert.equal(qry.sql, sql);
            });
        });
        
        describe('#where', function() {
            
            it('should append "WHERE "id" = ?" to the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql, table);	
                qry.where(1);
                sql += ' WHERE "id" = ?';
                assert.equal(qry.sql, sql);
                assert.deepEqual(qry.params, [1]);
            });            
            
            it('should append "WHERE "name" = ? AND "age" < ? AND "status" IN (?, ?)" to the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql, table);	
                qry.where({name: 'yassine', 'age <': 30, status: ['single', 'married'] });
                sql += ' WHERE "name" = ? AND "age" < ? AND "status" IN (?, ?)';
                assert.equal(qry.sql, sql);
                assert.deepEqual(qry.params, ['yassine', 30, 'single', 'married']);
            });
            
        });
        
        describe('#find', function() {
            it('should append " WHERE "id" = ?" to the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql, table);	
                qry.find(1);
                sql += ' WHERE "id" = ?';
                assert.equal(qry.sql, sql);
            });
            
            it('should build "select name,age from table WHERE "name" = ? AND "age" < ?" on the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql, table);	
                qry.find({name: 'yassine', 'age <': 30}, ["name", "age"]);
                sql = 'select name,age from table WHERE "name" = ? AND "age" < ?';
                assert.equal(qry.sql, sql);
            });
        })        
    });
    
    describe('Table', function() {
        var table = new litesql.Table('table', 'id');	
        
        describe('#find', function() {
            it('should build "select * from table WHERE "id" = ?" on the given sql statement', function() {    
                var qry = table.find(1);
                var sql = 'SELECT * FROM table WHERE "id" = ?';
                assert.equal(qry.sql, sql);
            });
            
            it('should build "select name,age from table WHERE "name" = ? AND "age" < ?" on the given sql statement', function() {                         
                var qry = table.find({name: 'yassine', 'age <': 30}, ["name", "age"]);
                var sql = 'SELECT name,age FROM table WHERE "name" = ? AND "age" < ?';
                assert.equal(qry.sql, sql);
            });
                        
        });
        
        describe('#insert', function() {
            it('should build "insert into table (name, age) values(?, ?)" on the given sql statement', function() {    
                var qry = table.insert({name: 'yassine', age: 37});
                var sql = 'INSERT INTO table (name, age) VALUES(?, ?)';
                assert.equal(qry.sql, sql);
                assert.deepEqual(qry.params, ['yassine',37]);
            });
                       
        });
        
        describe('#update', function() {
            it('should build "UPDATE table SET name = ?, age = ? WHERE "id" = ?" on the given sql statement', function() {    
                var qry = table.update({name: 'yassine', age: 37}, 1);
                var sql = 'UPDATE table SET name = ?, age = ? WHERE "id" = ?';
                assert.equal(qry.sql, sql);
                assert.deepEqual(qry.params, ['yassine',37, 1]);
            });
                       
        });
        
        describe('#remove', function() {
            it('should build "DELETE FROM table WHERE "id" = ?" on the given sql statement', function() {    
                var qry = table.remove(1);
                var sql = 'DELETE FROM table WHERE "id" = ?';
                assert.equal(qry.sql, sql);
                assert.deepEqual(qry.params, [1]);
            });
                       
        });
    });
    
    describe('db', function() {
        var db = litesql.db(':memory:');
        
        describe('#dropTable', function() {            
            it('should build "DROP TABLE IF EXISTS table" on the given sql statement', function() {    
                var qry = db.dropTable('table');            
                var sql = 'DROP TABLE IF EXISTS table';
                assert.equal(qry.sql, sql);
            });                        
        });
        
        describe('#createTable', function() {            
            it('should build "CREATE TABLE IF NOT EXISTS table(id INTEGER PRIMARY KEY AUTOINCREMENT..." on the given sql statement', function() {    
                var qry = db.createTable('table', {
                    name  : { type: 'text', unique: true, required: true},
                    age   : { type: 'int', defaultValue: 0, check: 'age >= 0'},
                    salary: 'decimal',
                    birthDate: { type: 'date', defaultValue: 'CURRENT_DATE' },
                    single  : 'boolean',
                    refId: '#ref',
                    refId2: '#ref2'
                });            
                var sql = 'CREATE TABLE IF NOT EXISTS table(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, '+
                            'age INTEGER DEFAULT 0 CHECK (age >= 0), salary NUMERIC, birthDate DATETIME DEFAULT CURRENT_DATE, single BOOLEAN, refId INTEGER, refId2 INTEGER, '+
                            'FOREIGN KEY(refId) REFERENCES ref(id), FOREIGN KEY(refId2) REFERENCES ref2(id))';
                assert.equal(qry.sql, sql);
            });                        
        });
        
        describe('#createColumn', function() {            
            it('should build "ALTER TABLE table ADD COLUMN name TEXT UNIQUE" on the given sql statement', function() {    
                var qry = db.createColumn('table', 'name', { type: 'text', unique: true} );            
                var sql = 'ALTER TABLE table ADD COLUMN name TEXT UNIQUE';
                assert.equal(qry.sql, sql);
            });                        
        });
        
        describe('#inspect', function() {            
            it('should inspect the database and add tables to the db object', function(done) {
                db.serialize(function() {
                    db.run('create table todos(task text)');
                    db.inspect(function(err, tables) {
                        assert.equal(err, null);
                        assert.equal(db.tables.length, 1);                        
                        assert.equal(db.todos.name, 'todos');                       
                        done();                
                    });
                });
                
                
            });                        
        });
        
        describe('#createModelsTable', function() {  
            
            it('should create the models table', function(done) {
                db.serialize(function() {
                    db.createModelsTable().run();                                                    
                    var models = new litesql.Table('_models', 'id', db);
                    models.insert({ model: 'model'}).run();
                    models.first().get( function(err, model) {
                        assert.equal(err, null);
                        assert.equal(model.model, 'model');
                        done();
                    } );
                    
                });
                
                
            });                        
        });
        
        var model = {
                tables : {
                    todos : { task: 'text' },
                    users: {  name: 'text'}
                }
            }
            
        describe('#loadModel', function() {     
            
            it('should load models table', function(done) {
                db.serialize(function() {
                    db.dropTable('_models').run();  
                    db.createModelsTable().run();                                                    
                    var models = new litesql.Table('_models', 'id', db);
                    models.insert({ model: JSON.stringify(model) }).run();
                    db.loadModel(function(err, dbModel) {                        
                        assert.equal(err, null);
                        assert.deepEqual(dbModel, model);
                        done();
                    })
                    
                });
                
                
            });                        
        });
        
        describe('#reloadModel', function() {     
           
            it('should reload models table', function(done) {
                db.serialize(function() {
                   db.reloadModel(function(err, dbModel) {                        
                        assert.equal(err, null);
                        assert.deepEqual(dbModel, model);
                        done();
                    })
                    
                });
                
                
            });                        
        });
        
        describe('#runQueries', function() {     
           
            it('should run queries in order', function(done) {                               
                var todos = new litesql.Table('todos', 'id', db);
                var queries = [ db.createTable('todos', model.tables.todos) ];
                for(var i=1; i<=10; i++) {
                    queries.push( todos.insert({ task: 'task '+ i }) );
                }
                db.runQueries(queries, function(err) {
                    assert.equal(err, null);
                    db.get( 'select count(1) as count from todos', [], function(err, count) {
                        assert.equal(err, null);
                        assert.equal(count.count, 10);
                        done();
                    });
                });                                               
            });                        
        });
    });
		
    describe('recipe', function() {
        var db = litesql.db(":memory:");
        
        var model = { 
            tables: { 
                todos: {
                    task: 'text', duedate: 'date', completed: 'boolean'
                }
            }
        }                
        
        it( "should upgrade model", function(done) {	
			
            utils.waterfall([
                function(next) { db.runSqls(["drop table if exists _models", "drop table if exists contacts", "drop table if exists todos"], next); },
                function(next) { db.upgrade(model, next);  },
                function(res, next) { db.reloadModel( next);  },
                function(res, next) { 
                    assert.deepEqual(db.model, model);//1
                    model.tables.todos.amount = 'decimal';
                    model.tables.contacts = {
                        name: 'text', age: 'int'
                    };
                    db.upgrade(model, next);	
                },
                function(res, next) { 
                    db.reloadModel( next);  
                },
                function(res, next) { 
                    assert.deepEqual(db.model, model);	//2
                    db.runQueries([
                        db.todos.insert({ task: "task"}),
                        db.contacts.insert({ name: "yassine"})
                    ], next);		
                },
                function(next) {
                    db.contacts.first().get(next);
                },
                function(res, next) {
                    assert.equal(res.name, "yassine");//3
                    next(null);
                }],
                function(err) {
                    assert.equal(err, null);
                    done();
            });                                   
        });
        
        
    })

});

