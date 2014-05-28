var assert = require("assert")
var utils = require('../lib/utils');
var litesql = require('../index');

describe('litesql', function(){
    
    describe('utils', function(){
        it('should format "one {0} tow {1}" to "one 0 tow 1" given params(0,1) ', function() {
            var str = utils.format("one {0} tow {1}", 0,1);
            assert.equal(str, "one 0 tow 1");
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
            
            it('should append "WHERE "id" = 1" to the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql, table);	
                qry.where(1);
                sql += ' WHERE "id" = 1';
                assert.equal(qry.sql, sql);
            });
            
            it('should append "WHERE "id" = ?" to the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql, table);	
                qry.where("x");
                sql += ' WHERE "id" = ?';
                assert.equal(qry.sql, sql);
            });
            
            it('should append "WHERE "name" = ? AND "age" < ? AND "status" IN (?, ?)" to the given sql statement', function() {    
                var sql = "select * from table";
                var qry = new litesql.Query(sql, table);	
                qry.where({name: 'yassine', 'age <': 30, status: ['single', 'married'] });
                sql += ' WHERE "name" = ? AND "age" < ? AND "status" IN (?, ?)';
                assert.equal(qry.sql, sql);
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
    
});

