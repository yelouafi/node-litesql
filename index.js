var sqlite3 = require('sqlite3');
var utils = require('./lib/utils');

var placeholder = '?';

var Query = exports.Query = function(sql, table, params) {

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
	
};

var Table = exports.Table = function (name, pk) {
	var self = this;
	self.name = name;
    self.pk = pk;
    
	self.find = function() {
		return new Query("SELECT * FROM " + self.name, self).parseArgs(arguments);
	};
	
	self.first = function() {
		return new Query("SELECT * FROM " + self.name, self).parseArgs(arguments).first();
	};
	
	self.last = function() {
		return new Query("SELECT * FROM " + self.name, self).parseArgs(arguments).last();
	};

	self.count = function(where) {
		return new Query("SELECT COUNT(1) as count FROM " + self.name, self).where(where).first();
	};
	
	self.all = function() {
		return new Query("SELECT * FROM " + self.name, self);
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
		return new Query(sql, self, params);
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
		return new Query(sql, self, params).where(where);
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
		return new Query("DELETE FROM " + self.name, self, []).parseArgs(arguments);
	};
};

exports.db = function(file, mode, cb) {
    
	var self = new sqlite3.Database(file, mode, cb);
    
    self.inspect = function(cb) {
		self.all('SELECT name FROM sqlite_master WHERE type="table";', function(err, tables) {
			if(err && cb) cb(err);
			else {
				for(var i=0; i<tables.length; i++) {
					var table = new Table(tables[i].name, 'id');                    
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
		var _result = typeName;

		switch (typeName) {
		case "pk":
			_result = "INTEGER PRIMARY KEY AUTOINCREMENT";
			break;
		case "int":
			_result = "INTEGER";
			break;
		case "decimal":
			_result = "NUMERIC";
			break;
		case "date":
			_result = "DATETIME";
			break;
		case "text":
			_result = "TEXT";
			break;
		case "boolean":
			_result = "BOOLEAN";
			break;
		}
		return _result;
	};
	function _createColumn(columnName, columnProps) {        
		if(utils.isString(columnProps)) {
			return columnName + " " + _translateType(columnProps);
		}
		return columnName + " " + _translateType(columnProps.type) +
			( columnProps.required ? " NOT NULL" : "" ) +
			( columnProps.unique ? " UNIQUE" : "");        
	};	
	
	self.dropTable = function (tableName) {
		return new Query("DROP TABLE IF EXISTS " + tableName);
	};	

	self.createTable = function (tableName, columns, force) {

		var _sql = "CREATE TABLE " + ( (!force) ? "IF NOT EXISTS " : "" ) + tableName + "(";
		var _cols = [];			

		_cols.push( _createColumn( 'id', "pk" ) );
		for (var c in columns) {
			if (c === "timestamps") {
				_cols.push("created_at INTEGER");
				_cols.push("updated_at INTEGER");
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
        
    self.runQuery = function run(query, cb) {
        return self.run(query.sql, query.params, cb);
    }
    self.getQuery = function get(query, cb) {
        return self.get(query.sql, query.params, cb);
    }
    
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
                self.runQuery(self.createModelsTable(), next); 
            },
            function(next) { 
                self._models = new Table("_models", "id");
                self.getQuery(self._models.last(), next);                  
            },
            function(modelAsJson, next) { 
                self.model = JSON.parse(modelAsJson.model);
                next(null, self.model);
            }
            
        ], cb);
        
        return self;
	}
	
	return self;
}