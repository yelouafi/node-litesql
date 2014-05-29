var sqlite3 = require('sqlite3');
var utils = require('./lib/utils');

var placeholder = '?';

var Query = exports.Query = function(sql, table, params, db) {

    var operationsMap = {
        '=': '=',
        '!': '!=',
        '>': '>',
        '<': '<',
        '>=': '>=',
        '<=': '<=',
        '!=': '<>',
        '<>': '<>'
    };

    var self = this;
    self.sql = sql;
    self.params = params || [];
    self.table = table;

    self.append = function (sql) {
        self.sql += (arguments.length === 1 ? sql : utils.format.apply(null, utils.toArray(arguments)) );
        return self;
    };

    self.order = function (sort) {
        return self.append(" ORDER BY {0}", sort);			
    };
    
    self.orderDesc = function (sort) {
        return self.append(" ORDER BY {0} DESC", sort);			
    };

    self.limit = function (count, offset) {
        return utils.isUndef(offset) ? self.append(" LIMIT {0}", count) : self.append(" LIMIT {0} OFFSET {1}", count, offset);			
    };

    self.first = function () {
        return self.append(" LIMIT(1)");
    };

    self.last = function () {
        return self.append(" ORDER BY {0} DESC LIMIT(1)", self.table.pk);			
    };

    self.where = function (conditions) {
        if (utils.isUndef(conditions)) {
            return self;
        }

        if (!utils.isObject(conditions)) {
            self.params.push(conditions);
            return self.append(' WHERE "{0}" = {1}', self.table.pk, placeholder);
        }

        var _conditions = [];
        for(var key in conditions) {
            var value = conditions[key];

            var parts = key.trim().split(/\s+/);
            var property = parts[0];
            var operation = operationsMap[parts[1]] || '=';				

            if (!Array.isArray(value)) {
                self.params.push(value);
                _conditions.push(utils.format('"{0}" {1} {2}', property, operation, '?'));
            } else {
                var arrayConditions = [];
				for(var i=0; i<value.length; i++) {
					var v = value[i];
					self.params.push(v);
                    arrayConditions.push(placeholder);
				}
                _conditions.push(utils.format('"{0}" {1} ({2})', property, operation === '!=' || operation === '<>' ? 'NOT IN' : 'IN', arrayConditions.join(', ')));
            }				
        }			
        return self.append(' WHERE ' + _conditions.join(' AND '));
    };

    self.parseArgs = function (args) {
        var _args = utils.toArray(args);

        if (_args.length === 0) {
            return self;
        }

        var columns;

        _args.forEach(function(arg) {
            if (utils.isNumber(arg) || utils.isString(arg)) {
                var criteria = {};
                criteria[self.table.pk] = arg;
                self.where(criteria);
            } else  if (Array.isArray(arg)) {					
                columns = arg;
            } else  if(utils.isObject(arg)) {																		
                var where = arg.where || arg;
                columns = arg.columns;

                if (utils.isObject(where)) {
                    self.where(where);
                }
            }				
        });

        if(columns) {
            self.sql = self.sql.replace("*", columns.join(",") );
        }					

        return self;
    };
    
    self.find = function() {
        self.sql = "select * from " + self.table.name;
        return self.parseArgs(arguments);			
    };
    
    self.run = function(cb) {
        if(!db) throw Error('can\'t run, db unefined!');
        db.run(self.sql, self.params, cb);
    }
    
    self.all = function(cb) {
        if(!db) throw Error('can\'t run, db unefined!');
        db.all(self.sql, self.params, cb);
    }
    
    self.each = function(cb, complete) {
        if(!db) throw Error('can\'t run, db unefined!');
        db.each(self.sql, self.params, cb, complete);
    }
    
    self.get = function(cb) {
        if(!db) throw Error('can\'t run, db unefined!');
        db.get(self.sql, self.params, function(err, res) {
            if(cb)
                cb(err, res); //ensure cb called with 2 args; see issue #299 : https://github.com/mapbox/node-sqlite3/issues/299
        });
    }
    
    self.prepare = function(cb) {
        if(!db) throw Error('can\'t run, db unefined!');
        return db.prepare(self.sql, self.params, cb);
    }
	
};

var Table = exports.Table = function (name, pk, db) {
	var self = this;
	self.name = name;
    self.pk = pk;
    
	self.find = function() {
		return new Query("SELECT * FROM " + self.name, self, [], db).parseArgs(arguments);
	};
	
	self.first = function() {
		return new Query("SELECT * FROM " + self.name, self, [], db).parseArgs(arguments).first();
	};
	
	self.last = function() {
		return new Query("SELECT * FROM " + self.name, self, [], db).parseArgs(arguments).last();
	};

	self.count = function(where) {
		return new Query("SELECT COUNT(1) as count FROM " + self.name, self, [], db).where(where).first();
	};
	
	self.all = function() {
		return new Query("SELECT * FROM " + self.name, self, [], db);
	};
	
	self.insert = function(data) {
		if(!data) {
			throw Error("insert should be called with data");
		}
		
		var sql = utils.format("INSERT INTO {0} ({1}) VALUES(", self.name, Object.keys(data).join(", "));
		var params = [];
		var values = [];
		
		var seed = 0;
		for(var key in data) {
			values.push( placeholder );
			params.push( data[key] );
		}			
		
		sql += values.join(", ") + ")";
		return new Query(sql, self, params, db);
	};
	
	self.update = function(fields, where){
		if(utils.isObject(fields) === false) {
			throw Error("Update requires a hash of fields=>values to update to");
		}

		var params = [];
		var values = [];			
		
		for(var key in fields) {
			values.push( key + ' = ' + placeholder );
			params.push( fields[key] );
		}		
		
		var sql = utils.format("UPDATE {0} SET {1}", self.name, values.join(', '));
		return new Query(sql, self, params, db).where(where);
	};
	
	self.save = function(data) {
		if(utils.isObject(fields) === false) {
			throw Error("Save requires a hash of fields=>values to update to");
		}
		if( utils.has(data, 'id') ) {
			var id = data.id;
            delete data.id;
			return self.update(data, id);
		} else {
			return self.insert(data);
		}
	}
	
	self.remove = function() {
		return new Query("DELETE FROM " + self.name, self, [], db).parseArgs(arguments);
	};
};

exports.db = function(file, mode, cb) {
    
	var self = new sqlite3.Database(file, mode, cb);
    
    self.inspect = function(cb) {
		self.all('SELECT name FROM sqlite_master WHERE type="table";', function(err, tables) {
			if(err && cb) cb(err);
			else {
				for(var i=0; i<tables.length; i++) {
					var table = new Table(tables[i].name, 'id', self);                    
					self[tables[i].name] = table;
                    self.tables.push(table);
				}
				
				cb(null, tables);
			}
		});
	}    
    
    // Schema helper methods
	self.tables = [];
    function _translateType(typeName) {
		        
        // foreign key
        if(utils.startsWith(typeName, '#')) {
            var foreignTable  = typeName.substring(1);            
            return { type: 'INTEGER', foreignTable: foreignTable, constraints:[]  };
        } 
        var rawType = typeName;
        switch (typeName) {
        case "pk":
            rawType = "INTEGER PRIMARY KEY AUTOINCREMENT";
            break;
        case "int":
            rawType = "INTEGER";
            break;
        case "decimal":
            rawType = "NUMERIC";
            break;
        case "date":
            rawType = "DATETIME";
            break;
        case "text":
            rawType = "TEXT";
            break;
        case "boolean":
            rawType = "BOOLEAN";
            break;
        }
        return { type: rawType, constraints:[] };
        
	};
    
	function _createColumn(columnName, columnProps) {   
        var result = null;
		if(utils.isString(columnProps)) {
            result = _translateType(columnProps);	            
		} else {
            result = _translateType(columnProps.type);            
            if( columnProps.required)  result.constraints.push("NOT NULL");
            if( columnProps.unique)  result.constraints.push("UNIQUE");
        }
		return result;
	};	
	
	self.dropTable = function (tableName) {
		return new Query("DROP TABLE IF EXISTS " + tableName, null, [], self);
	};	

	self.createTable = function (tableName, columns, force) {
        var _sql = "CREATE TABLE " + ( (!force) ? "IF NOT EXISTS " : "" ) + tableName + "(";
        var _sqlFkey = "FOREIGN KEY({0}) REFERENCES {1}(id)";
		var _cols = [], _fkeys = [];	
        
        function addColumn(name, def) {
            var col = _createColumn( name, def );
            //console.log(col)
            _cols.push(name + ' ' + col.type + ( col.constraints.length ? ' ' + col.constraints.join(' ') : '' ));
            if(col.foreignTable) {
                _fkeys.push( utils.format( _sqlFkey, name, col.foreignTable ));
            }
        }

		addColumn( 'id', "pk" );
		for (var c in columns) {
			if (c === "timestamps") {
				addColumn("created_at", "INTEGER");
				addColumn("updated_at", "INTEGER");
			} else if (c !== 'id') {
				addColumn(c, columns[c]);
			}
		}


		_sql += _cols.join(", ") + (_fkeys.length ? (", " + _fkeys.join(", ")) : "") + ")";
		return new Query(_sql, null, [], self);		
	};
		
	self.createColumn = function(tableName, columnName, columnProps) {	
        var col = _createColumn( columnName, columnProps );
        var colstr = columnName + ' ' + col.type + ' ' + col.constraints;
		return new Query("ALTER TABLE " + tableName + " ADD COLUMN " + colstr, null, [], self);
	};
    
    self.begin = function(cb) {
        db.run('BEGIN');
    }
    
    self.commit = function(cb) {
        db.run('COMMIT');
    }
    
    self.rollback = function(cb) {
        db.run('rollback');
    }
    
    self.relai = function relai(qry) {
        return function() {
            var args = utils.toArray(arguments);            
            qry.run(args[args.length-1]);
        }
    }
    
    self.runQueries = function (queries, cb) {
        var fns = [];
        
        
        for(var i=0; i<queries.length; i++) {
            fns.push(self.relai(queries[i]));
        }
        utils.waterfall(fns, cb);    
        return self;
    }
    
    self.runSqls = function(sqls, cb) {
        var queries = [];
        for(var i=0; i<sqls.length; i++) {
            queries.push(new Query(sqls[i], null, [], self));
        }
        self.runQueries(queries, cb);
        return self;
    }
    
    
    
    /*
    self.runQuery = function run(query, cb) {
        return self.run(query.sql, query.params, cb);
    }
	
	function fixArgsFwd(cb) {
		return function(err, res) {
			cb(err, res);
		}
	}
	
    self.getQuery = function get(query, cb) {
        return self.get(query.sql, query.params, fixArgsFwd(cb));
    }
    
    self.relai = function relai(qry) {
        return function() {
            var args = utils.toArray(arguments);            
            self.runQuery(qry, args[args.length-1]);
        }
    }
    
    self.runQueries = function (queries, cb) {
        var fns = [];
        
        
        for(var i=0; i<queries.length; i++) {
            fns.push(self.relai(queries[i]));
        }
        utils.waterfall(fns, cb);    
        return self;
    }
    
    self.runSqls = function(sqls, cb) {
        var queries = [];
        for(var i=0; i<sqls.length; i++) {
            queries.push(new Query(sqls[i]));
        }
        self.runQueries(queries, cb);
        return self;
    }
    
    self.allQuery = function get(query, cb) {
        return self.all(query.sql, query.params, fixArgsFwd(cb));
    }
    */
    var modelsTableSchema = {
		model: 'text'				
	};
	
	self.model = {
		tables: {}
	};
		
	self.createModelsTable = function() {
		return self.createTable('_models', modelsTableSchema, false );
	};
	
	self.loadModel = function(cb) {
        utils.waterfall([
            function(next) { 
                self.createModelsTable().run(next); 
            },
            function(next) { 
				self._models = new Table("_models", "id", self);
                self._models.last().get(next);                  
            },
            function(modelAsJson, next) {
				if(modelAsJson && modelAsJson.model) {
					self.model = JSON.parse(modelAsJson.model);
				}
                next(null, self.model);
            }
            
        ], cb);
        
        return self;
	}
    
    self.reloadModel = function(cb) {
        utils.waterfall([
            function(next) { 
               self._models.last().get(next);                  
            },
            function(modelAsJson, next) {
                if(modelAsJson) {
                    self.model = JSON.parse(modelAsJson.model);	
                }					
                next(null, self.model)	;
            }
        ], cb)
        
        return self;
    };
    
    function buildUpgradeQueries(newModel) {
        var queries = [];
        for(var tableName in newModel.tables ) {
            var table = newModel.tables[tableName];
            if( ! utils.has( self.model.tables, tableName ) ) {
                queries.push( self.createTable( tableName, table ) );
            } else {
                var oldColumns = self.model.tables[tableName];	
                var newColumns = newModel.tables[tableName];
                utils.each( newColumns, function (column, columnName) {
                    if( ! utils.has(oldColumns, columnName) ) {
                        queries.push( self.createColumn( tableName, columnName, column ) );
                    }
                });
            }
        }
        return queries;
    }
    
    self.upgrade = function(newModel, cb) {
        utils.waterfall([
            function(next) { 
				self.loadModel(next); 
			},
            function(model, next) {
				//console.log('upgrade2 '+JSON.stringify(model));
                var queries = buildUpgradeQueries(newModel);               
                if(queries.length) {
                    queries.push( self._models.insert( { model: JSON.stringify(newModel) }) );
                    self.runQueries( queries, next );								
                } else {
                    next(null);
                }
            },
            function(next) {
                self.model = newModel;
                utils.each( newModel.tables, function(table, tableName) {
                    self[tableName] = new Table(tableName, "id", self);
                });
                next(null, self.model);
            }
        ], cb); 
        
        return self;
    };
	
	return self;
}