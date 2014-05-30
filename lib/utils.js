var self = module.exports;

self.noop = function() {}

self.startsWith = function(str, prefix) {
    return str && str.indexOf(prefix) === 0;
}

self.toArray = function(list) {
    return Array.prototype.slice.call(list);
};

self.isUndef = function(obj) {
    return obj === undefined;
};

self.isDef = function(obj) {
    return obj !== undefined && obj !== null;
};

self.isObject = function(A) {
    return (typeof A === "object") && (A !== null);
};

self.isFunction = function(object) {
    return !!(object && object.constructor && object.call && object.apply);
};

var types = ['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'];
types.forEach( function(name) {
    self['is' + name] = function(obj) {
        return Object.prototype.toString.call(obj) === '[object ' + name + ']';
    };
});

self.isBoolean = function(obj) {
    return obj === true || obj === false || Object.prototype.toString.call(obj) === '[object Boolean]';
};

self.each = function(obj, cb) {
    for(var k in obj) {
        cb(obj[k], k);
    }
};	

self.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
};

self.format = function(str) {
    var args = arguments;
    return str.replace(/{(\d+)}/g, function(match, number) { 
        var num = parseInt(number,10);
        return isFinite(num) ? args[1+num] : match;
    });
};

self.iterator = function (tasks) {
    var makeCallback = function (index) {
        var fn = function () {
            if (tasks.length) {
                tasks[index].apply(null, arguments);
            }
            return fn.next();
        };
        fn.next = function () {
            return (index < tasks.length - 1) ? makeCallback(index + 1): null;
        };
        return fn;
    };
    return makeCallback(0);
};

self.waterfall = function (tasks, callback) {
    callback = callback || self.noop;
    if (!Array.isArray(tasks)) {
      var err = new Error('First argument to waterfall must be an array of functions');
      return callback(err);
    }
    if (!tasks.length) {
        return callback();
    }
    var wrapIterator = function (iterator) {
        return function (err) {
            if (err) {
                callback.apply(null, arguments);
                callback = self.noop;
            }
            else {
                var args = Array.prototype.slice.call(arguments, 1);
                var next = iterator.next();
                if (next) {
                    args.push(wrapIterator(next));
                }
                else {
                    args.push(callback);
                }
				
                setImmediate(function () {
                    iterator.apply(null, args);
                });
            }
        };
    };
    wrapIterator(self.iterator(tasks))();
};


self.waterfall1 = function( fn_list, final_callback ) {
    //console.log('#waterfall fn_list '+fn_list.length+" final_callback "+final_callback)
    final_callback = final_callback || self.noop;
    if (fn_list.length) {
        var fn = fn_list.shift();
        //callback will be called by each function in the waterfall like: callback(err?, arg1, arg2, ...)
        var callback = function (err) {
            if (err) {
                final_callback(err); // error, abort
            }
             else {
                var fwdArgs = self.toArray(arguments).slice(1) || [];
                //console.log(args)
                var args = [];
                args.push(fn_list);
                args.push(final_callback);
                for(var i=0; i<fwdArgs.length; i++) {
                    args.push(fwdArgs[i]);
                }
                //console.log(args);
                self.waterfall.apply(null,args);
            }
        };
        var args = self.toArray(arguments).slice(2) || [];        
        args.push(callback);       
        fn.apply(null, args);
    }
    else {
        var args = self.toArray(arguments).slice(2) || [];
        args.unshift(null); // no errors
        //console.log(args)
        final_callback.apply(null, args); 
    }
 }
