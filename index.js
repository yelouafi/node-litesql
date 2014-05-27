var utils = require('./lib/utils');

exports.Query = function(sql, params, table, placeholder) {

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
    placeholder = placeholder || '?';

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
                value.forEach(function(v) {					
                    self.params.push(v);
                    arrayConditions.push(placeholder);
                });
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
    
    this.find = function() {
        self.sql = "select * from " + self.table.name;
        //self.queryType = self.db.cs.rowset;
        return self.parseArgs(arguments);			
    };
    /*
    this.run = function(tx, queryType) {
        var qt = queryType || self.queryType || self.db.cs.any;
        return self.db._exec(self.sql, self.params, tx, qt);
    };

    this.all = function(tx) {
        return self.db._exec(self.sql, self.params, tx, self.db.cs.rowset);
    };
    this.one = function(tx) {
        return self.db._exec(self.sql, self.params, tx, self.db.cs.row);
    };
    this.scalar = function(tx) {
        return self.db._exec(self.sql, self.params, tx, self.db.cs.scalar);
    };
    this.nonQuery = function(tx) {
        return self.db._exec(self.sql, self.params, tx, self.db.cs.nonQuery);
    };
    this.each = function(cb, tx) {
        var d = self.all(tx);
        if(cb) {
            d.done(function(res) {
                var len = res.length;
                for(var i=0; i<len; i++) {
                    cb(res[i]);
                }
            });
        }
        return d;
    };
    */

};
