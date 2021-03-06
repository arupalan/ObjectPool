﻿(function (exports) {

  var tempType;
  var tempValue;

  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  var isArray = Array.isArray || function (obj) {
    return (Object.prototype.toString.call(obj) == '[object Array]');
  };

  var isFunction = function (obj) {
    return (Object.prototype.toString.call(obj) == '[object Function]');
  }

  var isObject = function (value) {
    tempType = typeof (value)
    return !!(value && objectTypes[tempType]);
  }

  var shallowClone = function (obj) {
    if (!isObject(obj)) return obj;
    if (isArray(obj)) return obj.slice();
    var result = {};
    for (tempValue in obj) {
      result[tempValue] = obj[tempValue];
    }

    return result;
  };

  //Constructor for a new object pool
  exports.$Pool = function () {
    this._items = [];
    this._head = 0;

  }

  //Returns an object from the pool or null if the pool is empty;
  exports.$Pool.prototype.get = function () {
    if (this._head === 0) return null;
    this._head--;
    var tempValue = this._items[this._head];
    this._items.length = this._head;
    return tempValue;
  }

  //Adds an object to the pool;
  exports.$Pool.prototype.release = function (item) {
    this._items[this._head] = item;
    this._head++;
    this._items.length = this._head;
  }

  //Removes at most count items from the pool
  exports.$Pool.prototype.delete = function (count) {
    this._head = Math.max(0, this._head - count);
    this._items.length = this._head;
  }


  //Returns the number of objects in the pool
  exports.$Pool.prototype.count = function () {
    return this._head;
  }

  //A constructor for a Constructor Generator - A generator based on a itemConstructor function
  exports.$Generator = function (target, options) {
    this.options = options || {};
    if (isFunction(target) && !this.options.functionObject) {
      this.itemConstructor = target;
    } else {
      this.item = target;
      this.clone = this.options.clone || shallowClone;
    }

    this.pool = new exports.$Pool();

    if (this.options.data) {
      for (this.tempValue in this.options.data) {
        this.pool.release(this.tempValue);
      }
      this.options.data = null; //Don't want to hold reference to the initial data after it was instered into the pool
    }

    if (this.options.count) {
      this.create(this.options.count - this.pool.count());
    }
  }

  exports.$Generator.prototype.tryRegenerate = function () {
    if (isFunction(this.options.regenerate)) {
      this.tempValue = this.options.regenerate.apply(this);
    } else {
      this.tempValue = this.options.regenerate.valueOf();
    }

    this.create(this.tempValue);
  }

  //Returns an object generated by this generator
  //The args will be passed to the initializer if such was defined in the options
  exports.$Generator.prototype.get = function (args) {
    this.tempItem = this.pool.get();
    if (this.tempItem === null) {
      if (this.options.regenerate) {
        this.tryRegenerate();
        this.tempItem = this.pool.get();
      }
      if (this.tempItem === null) return null;
    }
    if (this.options.init) {
      this.options.init.apply(this.tempItem, arguments);
    }
    return this.tempItem;
  }

  //Releases an item into the pool - no validation is made
  exports.$Generator.prototype.release = function (item) {
    if (this.options.clear) {
      this.options.clear.apply(item);
    }
    this.pool.release(item);
  }

  //Removes objects from the pool
  // if size < 1 removes floor(size*number_of_items)
  exports.$Generator.prototype.delete = function (size) {
    this.tempCounter = size;
    if (size < 1) {
      this.tempCounter = this.pool.count() * size;
    }
    this.tempCounter = Math.floor(this.tempCounter);
    this.pool.delete(this.tempCounter);
  }

  //Creates the number of objects defined by size into the pool
  exports.$Generator.prototype.create = function (size) {
    this.tempCounter = size;

    while (this.tempCounter > 0) {
      if (this.itemConstructor) {
        this.pool.release(new this.itemConstructor());
      } else {
        this.pool.release(this.clone(this.item));
      }
      this.tempCounter--;
    }
  }

  //Returns the number of currently available items in the pool
  exports.$Generator.prototype.count = function () {
    return this.pool.count();
  }

  //Generates a token that can be used to request the object
  exports.generate = function (target, options) {
    return new exports.$Generator(target, options);
  }

  exports.array = exports.generate(function () { return [] }, {
    clear: function () { this.length = 0; },
    count: 60
  });
})(typeof exports === 'undefined' ? this['ObjectPool'] = {} : exports);