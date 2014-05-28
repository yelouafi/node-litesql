var sqlite3 = require('sqlite3');
var utils = require('./lib/utils');
var Promise = require("bluebird");

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

        if (utils.isNumber(conditions)) {
            return self.append(' WHERE "{0}" = {1}', self.table.pk, conditions);
        }

        if (utils.isString(conditions)) {
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
	
};

var Table = exports.Table = function (name, pk, db) {
	var self = this;
	
	self.get = function(where) {
		var qry = new Query("SELECT * FROM " + self.name, self).where(where);
		return db.get( qry );
	}
	
	self.find = function() {
		var qry = new Query("SELECT * FROM " + self.name, self).parseArgs(arguments);
		return db.all( qry );
	};
	
	self.first = function() {
		var qry = new Query("SELECT * FROM " + self.name, self).parseArgs(arguments).first();
		return db.get( qry );
	};
	
	self.last = function() {
		var qry = new Query("SELECT * FROM " + self.name, self).parseArgs(arguments).last();
		return db.get( qry );
	};

	self.count = function(where) {
		var qry = new Query("SELECT COUNT(1) as count FROM " + self.name, self).where(where).first();
		return db.get( qry );
	};
	
	self.all = function() {
		var qry = new Query("SELECT * FROM " + self.name, self);
		return db.all( qry );
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
		var qry = new Query(sql, self, params);
		return db.run( qry );
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
		var qry = new Query(sql, self, params).where(where);
		return db.run( qry );
	};
	
	self.save = function(data) {
		if(utils.isObject(fields) === false) {
			throw Error("Save requires a hash of fields=>values to update to");
		}
		if( utils.has(data, 'id') ) {
			var id = delete data.id;
			return self.update(data, id);
		} else {
			return self.insert(data);
		}
	}
	
	self.remove = function() {
		var qry = new Query("DELETE FROM " + self.name, self, []).parseArgs(arguments);
		return db.run( qry );
	};
};


exports.db = function(file, mode) {
	var self = this;
	var fnDb = function(file, mode, cb) {
		return new sqlite3.Database(file, mode, cb);
	}
	
	self.tables = [];
	self.cs = { 
			//sql types
			pk: 'pk', text: 'text', integer: 'integer', numeric: 'numeric', date: 'date', bool: 'boolean', 
		};
		
	self.modelsTableSchema = {
		model: 'text'				
	};
	
	self.model = {
		tables: {}
	};
	
	self.run = function ( qry ) {
		
	}
	
	self.inspect = function(cb) {
		self.client.all('SELECT name FROM sqlite_master WHERE type="table";', [], function(err, tables) {
			if(err && cb) cb(err);
			else {
				for(var i=0; i<tables.length; i++) {
					var tableName = tables[i].name;
					self[tableName] = new Table(tableName, 'id');
				}
				self.tables = tables;
				cb(tables);
			}
		});
	}
	
	var _translateType = function (typeName) {
		var _result = typeName;

		switch (typeName) {
		case "pk":
			_result = "INTEGER PRIMARY KEY  AUTOINCREMENT";
			break;
		case "int":
			_result = "INTEGER";
			break;
		case "decimal":
			_result = "numeric";
			break;
		case "date":
			_result = "datetime";
			break;
		case "text":
			_result = "text";
			break;
		case "boolean":
			_result = "boolean";
			break;
		}
		return _result;
	};
	
	var run = self.run = function(query, cb) {
		self.client.run(query.sql, query.params, cb);
		return self;
	}
	
	self.dropTable = function (tableName) {
		return new Query("DROP TABLE IF EXISTS " + tableName);
	};	
		
	var _createColumn = function (columnName, columnProps) {        
		if(utils.isString(columnProps)) {
			return columnName + " " + _translateType(columnProps);
		}
		return columnName + " " + _translateType(columnProps.type) +
			( columnProps.required ? " NOT NULL" : "" ) +
			( columnProps.unique ? " UNIQUE" : "");        
	};

	self.createTable = function (tableName, columns, force) {

		var _sql = "CREATE TABLE " + ( (!force) ? "IF NOT EXISTS " : "" ) + tableName + "(";
		var _cols = [];			

		_cols.push( _createColumn( 'id', "pk" ) );
		for (var c in columns) {
			if (c === "timestamps") {
				_cols.push("created_at int");
				_cols.push("updated_at int");
			} else if (c !== 'id') {
				_cols.push( _createColumn( c, columns[c] ) );
			}
		}


		_sql += _cols.join(", ") + ")";
		return new Query(_sql);		
	};
		
	self.createColumn = function(tableName, columnName, columnProps) {		
		return new Query("ALTER TABLE " + tableName + " ADD COLUMN " + _createColumn( columnName, columnProps ));
	};
		
	self.createModelsTable = function() {
		return createTable('_models', self.modelsTableSchema, false /* if not exists */);
	};
	
	this.loadModel = function(cb) {
			var p = self.createModelsTable();
					.then( function( res, tx ) {
						self._models = new websql.Table("_models", "id", self);
						return self._models.last(tx);
					})
					.then( function(modelAsJson, tx) {
						if(modelAsJson) {
							self.model = JSON.parse(modelAsJson.model);	
						}					
						return self.forward(self.newModel, tx);						
					});		
			return p;
		};
	
	return self;
}