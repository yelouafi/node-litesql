var self = module.exports;

self.toArray = function(list) {
    return Array.prototype.slice.call(list);
};

self.isUndef = function(obj) {
    return obj === undefined;
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
