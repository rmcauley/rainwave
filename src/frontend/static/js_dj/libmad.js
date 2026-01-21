// libmad.js - port of libmad to JavaScript using emscripten
// by Romain Beauxis <toots@rastageeks.org>

(function() {
  var Module;
  var context = {};
  return (function() {

// Note: For maximum-speed code, see "Optimizing Code" on the Emscripten wiki, https://github.com/kripken/emscripten/wiki/Optimizing-Code
// Note: Some Emscripten settings may limit the speed of the generated code.
// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  Module['arguments'] = process['argv'].slice(2);

  module['exports'] = Module;
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    return read(f, 'binary');
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['Module'] = Module;

  eval("if (typeof gc === 'function' && gc.toString().indexOf('[native code]') > 0) var gc = undefined"); // wipe out the SpiderMonkey shell 'gc' function, which can confuse closure (uses it as a minified name, and it is then initted to a non-falsey value unexpectedly)
}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    this['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Auto-generated preamble library stuff ===

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      return '(((' +target + ')+' + (quantum-1) + ')&' + -quantum + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (isArrayType(type)) return true;
  if (/<?\{ ?[^}]* ?\}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  STACK_ALIGN: 8,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (vararg) return 8;
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    var index = 0;
    type.flatIndexes = type.fields.map(function(field) {
      index++;
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        if (field[1] === '0') {
          // this is [0 x something]. When inside another structure like here, it must be at the end,
          // and it adds no size
          // XXX this happens in java-nbody for example... assert(index === type.fields.length, 'zero-length in the middle!');
          size = 0;
          if (Types.types[field]) {
            alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
          } else {
            alignSize = type.alignSize || QUANTUM_SIZE;
          }
        } else {
          size = Types.types[field].flatSize;
          alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
        }
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else if (field[0] === '<') {
        // vector type
        size = alignSize = Types.types[field].flatSize; // fully aligned
      } else if (field[0] === 'i') {
        // illegal integer field, that could not be legalized because it is an internal structure field
        // it is ok to have such fields, if we just use them as markers of field size and nothing more complex
        size = alignSize = parseInt(field.substr(1))/8;
        assert(size % 1 === 0, 'cannot handle non-byte-size field ' + field);
      } else {
        assert(false, 'invalid type for calculateStructAlignment');
      }
      if (type.packed) alignSize = 1;
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    if (type.name_ && type.name_[0] === '[') {
      // arrays have 2 elements, so we get the proper difference. then we scale here. that way we avoid
      // allocating a potentially huge array for [999999 x i8] etc.
      type.flatSize = parseInt(type.name_.substr(1))*type.flatSize/2;
    }
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }) };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    code = Pointer_stringify(code);
    if (code[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (code.indexOf('"', 1) === code.length-1) {
        code = code.substr(1, code.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + code + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    return Runtime.asmConstCache[code] = eval('(function(' + args.join(',') + '){ ' + code + ' })'); // new Function does not allow upvars in node
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;

      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }

      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }

      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          Math.floor((codePoint - 0x10000) / 0x400) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+7)&-8); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+7)&-8); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+7)&-8); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 8))*(quantum ? quantum : 8); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;









//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays; note that arrays are 8-bit).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = Module['_' + ident]; // closure exported function
    if (!func) func = eval('_' + ident); // explicit lookup
  } catch(e) {
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      value = intArrayFromString(value);
      type = 'array';
    }
    if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}

// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;

// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;

// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)|0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }

  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16LE form. The copy will require at most (str.length*2+1)*2 bytes of space in the HEAP.
function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0;
}
Module['stringToUTF16'] = stringToUTF16;

// Given a pointer 'ptr' to a null-terminated UTF32LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32LE form. The copy will require at most (str.length+1)*4 bytes of space in the HEAP,
// but can use less, since str.length does not return the number of characters in the string, but the number of UTF-16 code units in the string.
function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit;
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0;
}
Module['stringToUTF32'] = stringToUTF32;

function demangle(func) {
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    return rawList ? list : ret + flushList();
  }
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    return parse();
  } catch(e) {
    return func;
  }
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function stackTrace() {
  var stack = new Error().stack;
  return stack ? demangleAll(stack) : '(no stack trace available)'; // Stack trace is not available at least on IE10 and Safari 6.
}

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}

var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

var totalMemory = 4096;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be more reasonable');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools

// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))|0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===



STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 44352;


/* global initializers */ __ATINIT__.push({ func: function() { runPostSets() } });








































































































































































































/* memory initializer */ allocate([162,162,22,2,170,120,31,6,160,124,189,9,70,147,177,12,232,53,200,14,73,245,220,15,73,245,220,15,232,53,200,14,70,147,177,12,160,124,189,9,170,120,31,6,162,162,22,2,62,170,178,0,162,162,22,2,98,137,118,3,226,176,207,4,170,120,31,6,132,82,99,7,121,199,152,8,160,124,189,9,173,55,207,10,82,227,203,11,70,147,177,12,7,136,126,13,69,50,49,14,232,53,200,14,181,108,66,15,144,232,158,15,73,245,220,15,253,25,252,15,253,25,252,15,73,245,220,15,144,232,158,15,181,108,66,15,232,53,200,14,69,50,49,14,7,136,126,13,70,147,177,12,82,227,203,11,173,55,207,10,160,124,189,9,121,199,152,8,132,82,99,7,170,120,31,6,226,176,207,4,98,137,118,3,162,162,22,2,62,170,178,0,0,0,0,1,0,2,0,3,3,0,1,1,1,2,1,3,2,1,2,2,2,3,3,1,3,2,3,3,4,2,4,3,16,2,0,0,192,1,0,0,232,1,0,0,120,2,0,0,40,2,0,0,80,2,0,0,224,2,0,0,144,2,0,0,184,2,0,0,72,3,0,0,248,2,0,0,32,3,0,0,176,3,0,0,96,3,0,0,136,3,0,0,176,3,0,0,200,3,0,0,240,3,0,0,176,3,0,0,200,3,0,0,240,3,0,0,176,3,0,0,200,3,0,0,240,3,0,0,168,1,0,0,88,1,0,0,128,1,0,0,0,0,0,0,8,8,8,8,8,8,8,8,8,12,12,12,16,16,16,20,20,20,24,24,24,28,28,28,36,36,36,2,2,2,2,2,2,2,2,2,26,26,26,0,12,12,12,4,4,4,8,8,8,12,12,12,16,16,16,20,20,20,24,24,24,28,28,28,36,36,36,2,2,2,2,2,2,2,2,2,26,26,26,0,12,12,12,12,12,12,16,20,24,28,32,40,48,56,64,76,90,2,2,2,2,2,0,0,4,4,4,4,4,4,4,4,4,4,4,4,6,6,6,6,6,6,10,10,10,12,12,12,14,14,14,16,16,16,20,20,20,26,26,26,66,66,66,0,4,4,4,4,4,4,6,6,4,4,4,6,6,6,6,6,6,10,10,10,12,12,12,14,14,14,16,16,16,20,20,20,26,26,26,66,66,66,0,0,4,4,4,4,4,4,6,6,6,8,10,12,16,18,22,28,34,40,46,54,54,192,0,0,4,4,4,4,4,4,4,4,4,4,4,4,6,6,6,8,8,8,10,10,10,12,12,12,14,14,14,18,18,18,22,22,22,30,30,30,56,56,56,0,4,4,4,4,4,4,6,6,4,4,4,6,6,6,8,8,8,10,10,10,12,12,12,14,14,14,18,18,18,22,22,22,30,30,30,56,56,56,0,0,4,4,4,4,4,4,6,6,8,8,10,12,16,20,24,28,34,42,50,54,76,158,0,0,4,4,4,4,4,4,4,4,4,4,4,4,6,6,6,8,8,8,12,12,12,16,16,16,20,20,20,26,26,26,34,34,34,42,42,42,12,12,12,0,4,4,4,4,4,4,6,6,4,4,4,6,6,6,8,8,8,12,12,12,16,16,16,20,20,20,26,26,26,34,34,34,42,42,42,12,12,12,0,0,4,4,4,4,4,4,6,6,8,10,12,16,20,24,30,38,46,56,68,84,102,26,0,0,4,4,4,4,4,4,4,4,4,6,6,6,8,8,8,10,10,10,12,12,12,14,14,14,18,18,18,24,24,24,32,32,32,44,44,44,12,12,12,0,6,6,6,6,6,6,6,6,6,8,8,8,10,10,10,12,12,12,14,14,14,18,18,18,24,24,24,32,32,32,44,44,44,12,12,12,0,0,0,0,6,6,6,6,6,6,8,10,12,14,16,18,22,26,32,38,46,54,62,70,76,36,0,0,4,4,4,4,4,4,4,4,4,6,6,6,6,6,6,8,8,8,10,10,10,14,14,14,18,18,18,26,26,26,32,32,32,42,42,42,18,18,18,0,6,6,6,6,6,6,6,6,6,6,6,6,8,8,8,10,10,10,14,14,14,18,18,18,26,26,26,32,32,32,42,42,42,18,18,18,0,0,0,0,6,6,6,6,6,6,8,10,12,14,16,20,24,28,32,38,46,52,60,68,58,54,0,0,4,4,4,4,4,4,4,4,4,6,6,6,8,8,8,10,10,10,12,12,12,14,14,14,18,18,18,24,24,24,30,30,30,40,40,40,18,18,18,0,6,6,6,6,6,6,6,6,6,8,8,8,10,10,10,12,12,12,14,14,14,18,18,18,24,24,24,30,30,30,40,40,40,18,18,18,0,0,0,0,0,0,0,32,165,254,101,25,250,162,40,20,0,0,0,16,83,255,178,12,125,81,20,10,0,0,0,8,169,127,89,6,190,40,10,5,0,0,0,4,213,191,44,3,95,20,133,2,0,0,0,2,234,95,150,1,48,138,66,1,0,0,0,1,245,47,203,0,24,69,161,0,0,0,128,0,251,151,101,0,140,162,80,0,0,0,64,0,253,203,50,0,70,81,40,0,0,0,32,0,255,101,25,0,163,40,20,0,0,0,16,0,255,178,12,0,81,20,10,0,0,0,8,0,128,89,6,0,41,10,5,0,0,0,4,0,192,44,3,0,20,133,2,0,0,0,2,0,96,150,1,0,138,66,1,0,0,0,1,0,48,203,0,0,69,161,0,0,0,128,0,0,152,101,0,0,163,80,0,0,0,64,0,0,204,50,0,0,81,40,0,0,0,32,0,0,102,25,0,0,41,20,0,0,0,16,0,0,179,12,0,0,20,10,0,0,0,8,0,0,89,6,0,0,10,5,0,0,0,4,0,0,45,3,0,0,133,2,0,0,0,2,0,0,150,1,0,0,67,1,0,0,0,0,0,0,180,211,224,31,71,221,232,30,48,121,0,29,89,126,54,26,102,158,160,22,248,188,90,18,188,22,134,13,225,62,72,8,215,250,201,2,0,0,0,0,27,0,0,0,7,7,7,6,6,6,6,6,6,6,6,3,3,3,3,3,3,3,3,3,3,3,3,0,0,0,0,0,0,0,0,0,30,0,0,0,7,7,7,6,6,6,6,6,6,6,6,3,3,3,3,3,3,3,3,3,3,3,3,0,0,0,0,0,0,0,0,0,8,0,0,0,5,5,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,5,5,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,30,0,0,0,4,4,4,4,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,68,172,0,0,128,187,0,0,0,125,0,0,0,0,0,0,0,0,0,0,0,0,0,20,190,40,10,29,205,165,83,36,169,127,89,38,117,98,70,44,114,140,115,45,129,252,177,46,0,0,0,52,215,32,174,52,148,214,98,53,150,174,29,54,244,71,222,54,122,79,164,55,101,190,55,60,36,200,159,60,190,40,10,61,245,198,118,61,11,140,229,61,97,99,86,62,46,58,201,62,62,255,61,63,188,162,180,63,5,139,22,68,205,165,83,68,106,155,145,68,251,101,208,68,0,0,16,69,81,100,80,69,21,142,145,69,187,120,211,69,243,31,22,70,169,127,89,70,0,148,157,70,76,89,226,70,17,204,39,71,252,232,109,71,227,172,180,71,191,20,252,71,215,14,34,76,117,98,70,76,231,3,107,76,232,241,143,76,63,43,181,76,192,174,218,76,73,123,0,77,198,143,38,77,42,235,76,77,114,140,115,77,165,114,154,77,211,156,193,77,18,10,233,77,130,185,16,78,72,170,56,78,145,219,96,78,144,76,137,78,129,252,177,78,161,234,218,78,54,22,4,79,139,126,45,79,239,34,87,79,184,2,129,79,62,29,171,79,224,113,213,79,0,0,0,84,129,99,21,84,42,227,42,84,177,126,64,84,207,53,86,84,62,8,108,84,187,245,129,84,3,254,151,84,215,32,174,84,246,93,196,84,36,181,218,84,36,38,241,84,188,176,7,85,177,84,30,85,203,17,53,85,212,231,75,85,148,214,98,85,216,221,121,85,108,253,144,85,28,53,168,85,184,132,191,85,14,236,214,85,239,106,238,85,43,1,6,86,150,174,29,86,2,115,53,86,67,78,77,86,45,64,101,86,150,72,125,86,83,103,149,86,61,156,173,86,43,231,197,86,244,71,222,86,115,190,246,86,128,74,15,87,247,235,39,87,178,162,64,87,141,110,89,87,100,79,114,87,20,69,139,87,122,79,164,87,117,110,189,87,226,161,214,87,161,233,239,87,201,162,4,92,202,90,17,92,196,28,30,92,167,232,42,92,101,190,55,92,238,157,68,92,51,135,81,92,38,122,94,92,185,118,107,92,220,124,120,92,131,140,133,92,159,165,146,92,36,200,159,92,2,244,172,92,46,41,186,92,154,103,199,92,58,175,212,92,0,0,226,92,224,89,239,92,206,188,252,92,190,40,10,93,164,157,23,93,115,27,37,93,32,162,50,93,160,49,64,93,231,201,77,93,233,106,91,93,156,20,105,93,245,198,118,93,233,129,132,93,109,69,146,93,118,17,160,93,250,229,173,93,239,194,187,93,74,168,201,93,1,150,215,93,11,140,229,93,93,138,243,93,238,144,1,94,179,159,15,94,165,182,29,94,184,213,43,94,228,252,57,94,31,44,72,94,97,99,86,94,160,162,100,94,212,233,114,94,243,56,129,94,245,143,143,94,209,238,157,94,127,85,172,94,246,195,186,94,46,58,201,94,31,184,215,94,192,61,230,94,9,203,244,94,243,95,3,95,117,252,17,95,135,160,32,95,34,76,47,95,62,255,61,95,211,185,76,95,219,123,91,95,76,69,106,95,32,22,121,95,80,238,135,95,212,205,150,95,165,180,165,95,188,162,180,95,18,152,195,95,160,148,210,95,95,152,225,95,72,163,240,95,84,181,255,95,63,103,7,100,94,247,14,100,5,139,22,100,48,34,30,100,221,188,37,100,7,91,45,100,173,252,52,100,201,161,60,100,90,74,68,100,93,246,75,100,205,165,83,100,169,88,91,100,237,14,99,100,150,200,106,100,162,133,114,100,12,70,122,100,211,9,130,100,244,208,137,100,106,155,145,100,53,105,153,100,80,58,161,100,186,14,169,100,110,230,176,100,108,193,184,100,175,159,192,100,53,129,200,100,251,101,208,100,255,77,216,100,62,57,224,100,182,39,232,100,99,25,240,100,68,14,248,100,85,6,0,101,149,1,8,101,0,0,16,101,148,1,24,101,79,6,32,101,45,14,40,101,46,25,48,101,78,39,56,101,138,56,64,101,226,76,72,101,81,100,80,101,213,126,88,101,110,156,96,101,23,189,104,101,207,224,112,101,147,7,121,101,98,49,129,101,57,94,137,101,21,142,145,101,244,192,153,101,213,246,161,101,181,47,170,101,146,107,178,101,105,170,186,101,57,236,194,101,0,49,203,101,187,120,211,101,104,195,219,101,5,17,228,101,144,97,236,101,7,181,244,101,104,11,253,101,177,100,5,102,224,192,13,102,243,31,22,102,232,129,30,102,188,230,38,102,111,78,47,102,253,184,55,102,102,38,64,102,167,150,72,102,190,9,81,102,169,127,89,102,103,248,97,102,245,115,106,102,82,242,114,102,124,115,123,102,113,247,131,102,47,126,140,102,181,7,149,102,0,148,157,102,15,35,166,102,224,180,174,102,113,73,183,102,192,224,191,102,204,122,200,102,148,23,209,102,20,183,217,102,76,89,226,102,58,254,234,102,220,165,243,102,48,80,252,102,53,253,4,103,234,172,13,103,75,95,22,103,89,20,31,103,17,204,39,103,113,134,48,103,120,67,57,103,37,3,66,103,117,197,74,103,103,138,83,103,250,81,92,103,44,28,101,103,252,232,109,103,103,184,118,103,109,138,127,103,11,95,136,103,65,54,145,103,12,16,154,103,108,236,162,103,95,203,171,103,227,172,180,103,246,144,189,103,152,119,198,103,199,96,207,103,129,76,216,103,197,58,225,103,146,43,234,103,230,30,243,103,191,20,252,103,142,134,2,108,255,3,7,108,176,130,11,108,161,2,16,108,209,131,20,108,64,6,25,108,237,137,29,108,215,14,34,108,254,148,38,108,96,28,43,108,254,164,47,108,215,46,52,108,233,185,56,108,53,70,61,108,185,211,65,108,117,98,70,108,105,242,74,108,147,131,79,108,243,21,84,108,137,169,88,108,83,62,93,108,81,212,97,108,131,107,102,108,231,3,107,108,126,157,111,108,71,56,116,108,64,212,120,108,106,113,125,108,195,15,130,108,76,175,134,108,3,80,139,108,232,241,143,108,251,148,148,108,58,57,153,108,165,222,157,108,60,133,162,108,254,44,167,108,234,213,171,108,0,128,176,108,63,43,181,108,167,215,185,108,55,133,190,108,238,51,195,108,204,227,199,108,209,148,204,108,251,70,209,108,75,250,213,108,192,174,218,108,88,100,223,108,20,27,228,108,243,210,232,108,245,139,237,108,24,70,242,108,93,1,247,108,195,189,251,108,73,123,0,109,239,57,5,109,180,249,9,109,152,186,14,109,154,124,19,109,186,63,24,109,247,3,29,109,80,201,33,109,198,143,38,109,87,87,43,109,3,32,48,109,202,233,52,109,171,180,57,109,166,128,62,109,185,77,67,109,229,27,72,109,42,235,76,109,133,187,81,109,248,140,86,109,129,95,91,109,33,51,96,109,214,7,101,109,160,221,105,109,127,180,110,109,114,140,115,109,120,101,120,109,146,63,125,109,191,26,130,109,253,246,134,109,78,212,139,109,176,178,144,109,34,146,149,109,165,114,154,109,56,84,159,109,218,54,164,109,140,26,169,109,76,255,173,109,26,229,178,109,245,203,183,109,222,179,188,109,211,156,193,109,213,134,198,109,226,113,203,109,251,93,208,109,31,75,213,109,77,57,218,109,133,40,223,109,199,24,228,109,18,10,233,109,102,252,237,109,194,239,242,109,38,228,247,109,146,217,252,109,4,208,1,110,125,199,6,110,253,191,11,110,130,185,16,110,12,180,21,110,156,175,26,110,47,172,31,110,199,169,36,110,99,168,41,110,2,168,46,110,163,168,51,110,72,170,56,110,238,172,61,110,150,176,66,110,63,181,71,110,233,186,76,110,147,193,81,110,61,201,86,110,231,209,91,110,145,219,96,110,57,230,101,110,223,241,106,110,132,254,111,110,38,12,117,110,198,26,122,110,98,42,127,110,251,58,132,110,144,76,137,110,33,95,142,110,174,114,147,110,53,135,152,110,183,156,157,110,51,179,162,110,169,202,167,110,24,227,172,110,129,252,177,110,226,22,183,110,59,50,188,110,141,78,193,110,214,107,198,110,23,138,203,110,78,169,208,110,124,201,213,110,161,234,218,110,187,12,224,110,202,47,229,110,207,83,234,110,200,120,239,110,182,158,244,110,151,197,249,110,109,237,254,110,54,22,4,111,242,63,9,111,160,106,14,111,65,150,19,111,211,194,24,111,88,240,29,111,205,30,35,111,52,78,40,111,139,126,45,111,210,175,50,111,9,226,55,111,48,21,61,111,70,73,66,111,75,126,71,111,62,180,76,111,32,235,81,111,239,34,87,111,172,91,92,111,87,149,97,111,238,207,102,111,114,11,108,111,226,71,113,111,62,133,118,111,133,195,123,111,184,2,129,111,214,66,134,111,222,131,139,111,209,197,144,111,174,8,150,111,116,76,155,111,36,145,160,111,189,214,165,111,62,29,171,111,168,100,176,111,251,172,181,111,53,246,186,111,86,64,192,111,95,139,197,111,78,215,202,111,36,36,208,111,224,113,213,111,131,192,218,111,10,16,224,111,120,96,229,111,202,177,234,111,1,4,240,111,29,87,245,111,28,171,250,111,0,0,0,116,227,170,2,116,56,86,5,116,255,1,8,116,55,174,10,116,224,90,13,116,250,7,16,116,134,181,18,116,129,99,21,116,238,17,24,116,203,192,26,116,24,112,29,116,213,31,32,116,3,208,34,116,160,128,37,116,173,49,40,116,42,227,42,116,22,149,45,116,114,71,48,116,61,250,50,116,118,173,53,116,31,97,56,116,54,21,59,116,188,201,61,116,177,126,64,116,20,52,67,116,229,233,69,116,36,160,72,116,209,86,75,116,236,13,78,116,117,197,80,116,107,125,83,116,207,53,86,116,159,238,88,116,221,167,91,116,136,97,94,116,160,27,97,116,37,214,99,116,22,145,102,116,116,76,105,116,62,8,108,116,116,196,110,116,22,129,113,116,37,62,116,116,159,251,118,116,132,185,121,116,214,119,124,116,147,54,127,116,187,245,129,116,78,181,132,116,76,117,135,116,182,53,138,116,138,246,140,116,200,183,143,116,114,121,146,116,133,59,149,116,3,254,151,116,235,192,154,116,62,132,157,116,250,71,160,116,32,12,163,116,175,208,165,116,168,149,168,116,11,91,171,116,215,32,174,116,12,231,176,116,170,173,179,116,177,116,182,116,33,60,185,116,250,3,188,116,59,204,190,116,228,148,193,116,246,93,196,116,113,39,199,116,83,241,201,116,157,187,204,116,79,134,207,116,105,81,210,116,235,28,213,116,212,232,215,116,36,181,218,116,220,129,221,116,251,78,224,116,129,28,227,116,110,234,229,116,194,184,232,116,124,135,235,116,157,86,238,116,36,38,241,116,18,246,243,116,102,198,246,116,33,151,249,116,65,104,252,116,199,57,255,116,179,11,2,117,5,222,4,117,188,176,7,117,216,131,10,117,91,87,13,117,66,43,16,117,142,255,18,117,64,212,21,117,86,169,24,117,209,126,27,117,177,84,30,117,245,42,33,117,158,1,36,117,171,216,38,117,29,176,41,117,242,135,44,117,44,96,47,117,202,56,50,117,203,17,53,117,48,235,55,117,249,196,58,117,37,159,61,117,181,121,64,117,168,84,67,117,254,47,70,117,183,11,73,117,212,231,75,117,83,196,78,117,52,161,81,117,121,126,84,117,32,92,87,117,42,58,90,117,150,24,93,117,100,247,95,117,148,214,98,117,39,182,101,117,27,150,104,117,113,118,107,117,41,87,110,117,67,56,113,117,190,25,116,117,154,251,118,117,216,221,121,117,119,192,124,117,120,163,127,117,217,134,130,117,155,106,133,117,190,78,136,117,66,51,139,117,39,24,142,117,108,253,144,117,17,227,147,117,23,201,150,117,125,175,153,117,67,150,156,117,106,125,159,117,240,100,162,117,214,76,165,117,28,53,168,117,194,29,171,117,199,6,174,117,43,240,176,117,240,217,179,117,19,196,182,117,149,174,185,117,119,153,188,117,184,132,191,117,87,112,194,117,86,92,197,117,179,72,200,117,110,53,203,117,137,34,206,117,1,16,209,117,216,253,211,117,14,236,214,117,161,218,217,117,147,201,220,117,226,184,223,117,144,168,226,117,155,152,229,117,4,137,232,117,203,121,235,117,239,106,238,117,112,92,241,117,79,78,244,117,139,64,247,117,36,51,250,117,27,38,253,117,110,25,0,118,30,13,3,118,43,1,6,118,149,245,8,118,92,234,11,118,127,223,14,118,254,212,17,118,218,202,20,118,18,193,23,118,166,183,26,118,150,174,29,118,227,165,32,118,139,157,35,118,143,149,38,118,239,141,41,118,170,134,44,118,193,127,47,118,52,121,50,118,2,115,53,118,43,109,56,118,176,103,59,118,144,98,62,118,203,93,65,118,96,89,68,118,81,85,71,118,156,81,74,118,67,78,77,118,68,75,80,118,159,72,83,118,85,70,86,118,101,68,89,118,208,66,92,118,149,65,95,118,180,64,98,118,45,64,101,118,0,64,104,118,45,64,107,118,179,64,110,118,148,65,113,118,206,66,116,118,98,68,119,118,79,70,122,118,150,72,125,118,54,75,128,118,47,78,131,118,129,81,134,118,44,85,137,118,49,89,140,118,142,93,143,118,69,98,146,118,83,103,149,118,187,108,152,118,123,114,155,118,148,120,158,118,5,127,161,118,207,133,164,118,241,140,167,118,107,148,170,118,61,156,173,118,104,164,176,118,234,172,179,118,196,181,182,118,246,190,185,118,128,200,188,118,97,210,191,118,154,220,194,118,43,231,197,118,19,242,200,118,82,253,203,118,233,8,207,118,215,20,210,118,28,33,213,118,184,45,216,118,170,58,219,118,244,71,222,118,149,85,225,118,141,99,228,118,219,113,231,118,127,128,234,118,123,143,237,118,204,158,240,118,117,174,243,118,115,190,246,118,200,206,249,118,114,223,252,118,115,240,255,118,202,1,3,119,119,19,6,119,122,37,9,119,210,55,12,119,128,74,15,119,132,93,18,119,222,112,21,119,141,132,24,119,145,152,27,119,235,172,30,119,154,193,33,119,158,214,36,119,247,235,39,119,166,1,43,119,169,23,46,119,1,46,49,119,174,68,52,119,176,91,55,119,7,115,58,119,178,138,61,119,178,162,64,119,6,187,67,119,175,211,70,119,172,236,73,119,254,5,77,119,163,31,80,119,157,57,83,119,235,83,86,119,141,110,89,119,131,137,92,119,204,164,95,119,106,192,98,119,91,220,101,119,160,248,104,119,56,21,108,119,36,50,111,119,100,79,114,119,247,108,117,119,221,138,120,119,22,169,123,119,163,199,126,119,131,230,129,119,181,5,133,119,59,37,136,119,20,69,139,119,63,101,142,119,190,133,145,119,143,166,148,119,178,199,151,119,41,233,154,119,241,10,158,119,12,45,161,119,122,79,164,119,58,114,167,119,76,149,170,119,176,184,173,119,103,220,176,119,111,0,180,119,202,36,183,119,118,73,186,119,117,110,189,119,197,147,192,119,103,185,195,119,90,223,198,119,159,5,202,119,54,44,205,119,30,83,208,119,87,122,211,119,226,161,214,119,190,201,217,119,236,241,220,119,106,26,224,119,58,67,227,119,90,108,230,119,204,149,233,119,142,191,236,119,161,233,239,119,5,20,243,119,186,62,246,119,192,105,249,119,22,149,252,119,188,192,255,119,89,118,1,124,125,12,3,124,201,162,4,124,61,57,6,124,217,207,7,124,157,102,9,124,137,253,10,124,158,148,12,124,218,43,14,124,62,195,15,124,202,90,17,124,126,242,18,124,90,138,20,124,93,34,22,124,137,186,23,124,220,82,25,124,87,235,26,124,250,131,28,124,196,28,30,124,182,181,31,124,208,78,33,124,17,232,34,124,121,129,36,124,10,27,38,124,194,180,39,124,161,78,41,124,167,232,42,124,214,130,44,124,43,29,46,124,168,183,47,124,76,82,49,124,23,237,50,124,10,136,52,124,36,35,54,124,101,190,55,124,205,89,57,124,93,245,58,124,19,145,60,124,241,44,62,124,246,200,63,124,34,101,65,124,116,1,67,124,238,157,68,124,143,58,70,124,86,215,71,124,69,116,73,124,90,17,75,124,150,174,76,124,249,75,78,124,131,233,79,124,51,135,81,124,10,37,83,124,8,195,84,124,45,97,86,124,120,255,87,124,234,157,89,124,130,60,91,124,65,219,92,124,38,122,94,124,50,25,96,124,100,184,97,124,189,87,99,124,60,247,100,124,226,150,102,124,174,54,104,124,160,214,105,124,185,118,107,124,247,22,109,124,92,183,110,124,232,87,112,124,153,248,113,124,113,153,115,124,111,58,117,124,146,219,118,124,220,124,120,124,76,30,122,124,226,191,123,124,158,97,125,124,128,3,127,124,136,165,128,124,182,71,130,124,10,234,131,124,131,140,133,124,34,47,135,124,232,209,136,124,211,116,138,124,227,23,140,124,26,187,141,124,118,94,143,124,248,1,145,124,159,165,146,124,108,73,148,124,95,237,149,124,119,145,151,124,181,53,153,124,25,218,154,124,161,126,156,124,80,35,158,124,36,200,159,124,29,109,161,124,59,18,163,124,127,183,164,124,232,92,166,124,119,2,168,124,43,168,169,124,4,78,171,124,2,244,172,124,38,154,174,124,110,64,176,124,220,230,177,124,111,141,179,124,39,52,181,124,5,219,182,124,7,130,184,124,46,41,186,124,122,208,187,124,236,119,189,124,130,31,191,124,61,199,192,124,29,111,194,124,34,23,196,124,76,191,197,124,154,103,199,124,13,16,201,124,166,184,202,124,99,97,204,124,68,10,206,124,75,179,207,124,118,92,209,124,197,5,211,124,58,175,212,124,210,88,214,124,144,2,216,124,114,172,217,124,121,86,219,124,164,0,221,124,243,170,222,124,103,85,224,124,0,0,226,124,189,170,227,124,158,85,229,124,163,0,231,124,205,171,232,124,28,87,234,124,142,2,236,124,37,174,237,124,224,89,239,124,191,5,241,124,195,177,242,124,234,93,244,124,54,10,246,124,166,182,247,124,58,99,249,124,242,15,251,124,206,188,252,124,206,105,254,124,243,22,0,125,59,196,1,125,167,113,3,125,55,31,5,125,235,204,6,125,194,122,8,125,190,40,10,125,222,214,11,125,33,133,13,125,136,51,15,125,19,226,16,125,194,144,18,125,148,63,20,125,138,238,21,125,164,157,23,125,225,76,25,125,66,252,26,125,199,171,28,125,111,91,30,125,58,11,32,125,42,187,33,125,61,107,35,125,115,27,37,125,205,203,38,125,74,124,40,125,234,44,42,125,174,221,43,125,150,142,45,125,161,63,47,125,207,240,48,125,32,162,50,125,149,83,52,125,45,5,54,125,232,182,55,125,198,104,57,125,200,26,59,125,237,204,60,125,53,127,62,125,160,49,64,125,46,228,65,125,223,150,67,125,180,73,69,125,171,252,70,125,198,175,72,125,3,99,74,125,99,22,76,125,231,201,77,125,141,125,79,125,86,49,81,125,66,229,82,125,81,153,84,125,131,77,86,125,216,1,88,125,79,182,89,125,233,106,91,125,166,31,93,125,134,212,94,125,136,137,96,125,173,62,98,125,245,243,99,125,96,169,101,125,237,94,103,125,156,20,105,125,111,202,106,125,100,128,108,125,123,54,110,125,181,236,111,125,17,163,113,125,144,89,115,125,50,16,117,125,245,198,118,125,220,125,120,125,228,52,122,125,15,236,123,125,93,163,125,125,204,90,127,125,94,18,129,125,18,202,130,125,233,129,132,125,226,57,134,125,253,241,135,125,58,170,137,125,154,98,139,125,27,27,141,125,191,211,142,125,133,140,144,125,109,69,146,125,119,254,147,125,163,183,149,125,241,112,151,125,97,42,153,125,243,227,154,125,168,157,156,125,126,87,158,125,118,17,160,125,144,203,161,125,204,133,163,125,42,64,165,125,169,250,166,125,75,181,168,125,14,112,170,125,243,42,172,125,250,229,173,125,35,161,175,125,109,92,177,125,217,23,179,125,103,211,180,125,22,143,182,125,231,74,184,125,218,6,186,125,239,194,187,125,37,127,189,125,124,59,191,125,245,247,192,125,144,180,194,125,76,113,196,125,42,46,198,125,41,235,199,125,74,168,201,125,140,101,203,125,239,34,205,125,116,224,206,125,27,158,208,125,226,91,210,125,203,25,212,125,213,215,213,125,1,150,215,125,78,84,217,125,188,18,219,125,76,209,220,125,252,143,222,125,206,78,224,125,193,13,226,125,213,204,227,125,11,140,229,125,97,75,231,125,217,10,233,125,114,202,234,125,43,138,236,125,6,74,238,125,2,10,240,125,31,202,241,125,93,138,243,125,188,74,245,125,60,11,247,125,220,203,248,125,158,140,250,125,129,77,252,125,132,14,254,125,168,207,255,125,238,144,1,126,84,82,3,126,218,19,5,126,130,213,6,126,74,151,8,126,52,89,10,126,61,27,12,126,104,221,13,126,179,159,15,126,31,98,17,126,172,36,19,126,89,231,20,126,39,170,22,126,22,109,24,126,37,48,26,126,84,243,27,126,165,182,29,126,21,122,31,126,167,61,33,126,88,1,35,126,42,197,36,126,29,137,38,126,48,77,40,126,100,17,42,126,184,213,43,126,44,154,45,126,193,94,47,126,118,35,49,126,75,232,50,126,65,173,52,126,87,114,54,126,141,55,56,126,228,252,57,126,91,194,59,126,242,135,61,126,169,77,63,126,128,19,65,126,120,217,66,126,143,159,68,126,199,101,70,126,31,44,72,126,151,242,73,126,47,185,75,126,232,127,77,126,192,70,79,126,184,13,81,126,208,212,82,126,9,156,84,126,97,99,86,126,217,42,88,126,113,242,89,126,41,186,91,126,1,130,93,126,249,73,95,126,17,18,97,126,73,218,98,126,160,162,100,126,23,107,102,126,174,51,104,126,101,252,105,126,60,197,107,126,50,142,109,126,72,87,111,126,126,32,113,126,212,233,114,126,73,179,116,126,222,124,118,126,146,70,120,126,102,16,122,126,90,218,123,126,109,164,125,126,160,110,127,126,243,56,129,126,101,3,131,126,246,205,132,126,168,152,134,126,120,99,136,126,104,46,138,126,120,249,139,126,167,196,141,126,245,143,143,126,99,91,145,126,240,38,147,126,156,242,148,126,104,190,150,126,84,138,152,126,94,86,154,126,136,34,156,126,209,238,157,126,58,187,159,126,193,135,161,126,104,84,163,126,47,33,165,126,20,238,166,126,24,187,168,126,60,136,170,126,127,85,172,126,225,34,174,126,98,240,175,126,3,190,177,126,194,139,179,126,161,89,181,126,158,39,183,126,187,245,184,126,246,195,186,126,81,146,188,126,203,96,190,126,99,47,192,126,27,254,193,126,241,204,195,126,231,155,197,126,251,106,199,126,46,58,201,126,129,9,203,126,242,216,204,126,129,168,206,126,48,120,208,126,254,71,210,126,234,23,212,126,245,231,213,126,31,184,215,126,104,136,217,126,207,88,219,126,85,41,221,126,250,249,222,126,190,202,224,126,160,155,226,126,161,108,228,126,192,61,230,126,254,14,232,126,91,224,233,126,214,177,235,126,112,131,237,126,41,85,239,126,0,39,241,126,245,248,242,126,9,203,244,126,60,157,246,126,141,111,248,126,253,65,250,126,139,20,252,126,55,231,253,126,2,186,255,126,235,140,1,127,243,95,3,127,25,51,5,127,93,6,7,127,192,217,8,127,65,173,10,127,225,128,12,127,159,84,14,127,123,40,16,127,117,252,17,127,141,208,19,127,196,164,21,127,25,121,23,127,140,77,25,127,30,34,27,127,206,246,28,127,155,203,30,127,135,160,32,127,145,117,34,127,185,74,36,127,0,32,38,127,100,245,39,127,231,202,41,127,135,160,43,127,70,118,45,127,34,76,47,127,29,34,49,127,53,248,50,127,108,206,52,127,193,164,54,127,51,123,56,127,196,81,58,127,114,40,60,127,62,255,61,127,40,214,63,127,48,173,65,127,86,132,67,127,154,91,69,127,252,50,71,127,123,10,73,127,24,226,74,127,211,185,76,127,172,145,78,127,163,105,80,127,183,65,82,127,233,25,84,127,57,242,85,127,167,202,87,127,50,163,89,127,219,123,91,127,161,84,93,127,133,45,95,127,135,6,97,127,166,223,98,127,227,184,100,127,62,146,102,127,182,107,104,127,76,69,106,127,255,30,108,127,208,248,109,127,190,210,111,127,202,172,113,127,243,134,115,127,58,97,117,127,158,59,119,127,32,22,121,127,191,240,122,127,124,203,124,127,86,166,126,127,77,129,128,127,98,92,130,127,148,55,132,127,227,18,134,127,80,238,135,127,218,201,137,127,129,165,139,127,70,129,141,127,40,93,143,127,39,57,145,127,67,21,147,127,125,241,148,127,212,205,150,127,72,170,152,127,217,134,154,127,136,99,156,127,83,64,158,127,60,29,160,127,66,250,161,127,101,215,163,127,165,180,165,127,2,146,167,127,125,111,169,127,20,77,171,127,200,42,173,127,154,8,175,127,136,230,176,127,148,196,178,127,188,162,180,127,2,129,182,127,100,95,184,127,228,61,186,127,128,28,188,127,57,251,189,127,15,218,191,127,2,185,193,127,18,152,195,127,63,119,197,127,137,86,199,127,239,53,201,127,115,21,203,127,19,245,204,127,208,212,206,127,170,180,208,127,160,148,210,127,179,116,212,127,228,84,214,127,48,53,216,127,154,21,218,127,32,246,219,127,195,214,221,127,131,183,223,127,95,152,225,127,88,121,227,127,110,90,229,127,160,59,231,127,239,28,233,127,90,254,234,127,226,223,236,127,135,193,238,127,72,163,240,127,38,133,242,127,32,103,244,127,55,73,246,127,106,43,248,127,186,13,250,127,38,240,251,127,175,210,253,127,84,181,255,127,11,204,0,132,122,189,1,132,247,174,2,132,131,160,3,132,28,146,4,132,196,131,5,132,122,117,6,132,63,103,7,132,17,89,8,132,241,74,9,132,224,60,10,132,221,46,11,132,232,32,12,132,1,19,13,132,41,5,14,132,94,247,14,132,161,233,15,132,243,219,16,132,83,206,17,132,193,192,18,132,61,179,19,132,199,165,20,132,95,152,21,132,5,139,22,132,185,125,23,132,124,112,24,132,76,99,25,132,42,86,26,132,23,73,27,132,17,60,28,132,26,47,29,132,48,34,30,132,85,21,31,132,136,8,32,132,200,251,32,132,23,239,33,132,115,226,34,132,222,213,35,132,86,201,36,132,221,188,37,132,113,176,38,132,20,164,39,132,196,151,40,132,131,139,41,132,79,127,42,132,41,115,43,132,17,103,44,132,7,91,45,132,11,79,46,132,29,67,47,132,61,55,48,132,107,43,49,132,166,31,50,132,240,19,51,132,71,8,52,132,173,252,52,132,32,241,53,132,161,229,54,132,47,218,55,132,204,206,56,132,119,195,57,132,47,184,58,132,245,172,59,132,201,161,60,132,171,150,61,132,155,139,62,132,152,128,63,132,163,117,64,132,188,106,65,132,227,95,66,132,24,85,67,132,90,74,68,132,171,63,69,132,8,53,70,132,116,42,71,132,238,31,72,132,117,21,73,132,10,11,74,132,172,0,75,132,93,246,75,132,27,236,76,132,231,225,77,132,192,215,78,132,168,205,79,132,156,195,80,132,159,185,81,132,175,175,82,132,205,165,83,132,249,155,84,132,50,146,85,132,121,136,86,132,206,126,87,132,48,117,88,132,160,107,89,132,30,98,90,132,169,88,91,132,66,79,92,132,233,69,93,132,157,60,94,132,94,51,95,132,46,42,96,132,11,33,97,132,245,23,98,132,237,14,99,132,243,5,100,132,6,253,100,132,39,244,101,132,85,235,102,132,145,226,103,132,219,217,104,132,50,209,105,132,150,200,106,132,9,192,107,132,136,183,108,132,21,175,109,132,176,166,110,132,88,158,111,132,14,150,112,132,209,141,113,132,162,133,114,132,128,125,115,132,108,117,116,132,101,109,117,132,107,101,118,132,127,93,119,132,161,85,120,132,208,77,121,132,12,70,122,132,86,62,123,132,174,54,124,132,18,47,125,132,132,39,126,132,4,32,127,132,145,24,128,132,43,17,129,132,211,9,130,132,136,2,131,132,75,251,131,132,27,244,132,132,248,236,133,132,227,229,134,132,219,222,135,132,225,215,136,132,244,208,137,132,20,202,138,132,65,195,139,132,124,188,140,132,196,181,141,132,26,175,142,132,125,168,143,132,237,161,144,132,106,155,145,132,245,148,146,132,141,142,147,132,51,136,148,132,229,129,149,132,165,123,150,132,115,117,151,132,77,111,152,132,53,105,153,132,42,99,154,132,44,93,155,132,60,87,156,132,89,81,157,132,131,75,158,132,186,69,159,132,254,63,160,132,80,58,161,132,175,52,162,132,27,47,163,132,149,41,164,132,27,36,165,132,175,30,166,132,80,25,167,132,254,19,168,132,186,14,169,132,130,9,170,132,88,4,171,132,59,255,171,132,43,250,172,132,40,245,173,132,50,240,174,132,74,235,175,132,110,230,176,132,160,225,177,132,223,220,178,132,43,216,179,132,132,211,180,132,234,206,181,132,94,202,182,132,222,197,183,132,108,193,184,132,6,189,185,132,174,184,186,132,99,180,187,132,36,176,188,132,243,171,189,132,207,167,190,132,184,163,191,132,175,159,192,132,178,155,193,132,194,151,194,132,223,147,195,132,9,144,196,132,65,140,197,132,133,136,198,132,214,132,199,132,53,129,200,132,160,125,201,132,24,122,202,132,158,118,203,132,48,115,204,132,207,111,205,132,123,108,206,132,53,105,207,132,251,101,208,132,206,98,209,132,174,95,210,132,155,92,211,132,149,89,212,132,156,86,213,132,176,83,214,132,209,80,215,132,255,77,216,132,58,75,217,132,129,72,218,132,214,69,219,132,55,67,220,132,166,64,221,132,33,62,222,132,169,59,223,132,62,57,224,132,224,54,225,132,143,52,226,132,75,50,227,132,19,48,228,132,233,45,229,132,203,43,230,132,186,41,231,132,182,39,232,132,191,37,233,132,212,35,234,132,247,33,235,132,38,32,236,132,98,30,237,132,171,28,238,132,1,27,239,132,99,25,240,132,211,23,241,132,79,22,242,132,216,20,243,132,109,19,244,132,16,18,245,132,191,16,246,132,123,15,247,132,68,14,248,132,25,13,249,132,252,11,250,132,235,10,251,132,231,9,252,132,239,8,253,132,5,8,254,132,39,7,255,132,85,6,0,133,145,5,1,133,217,4,2,133,46,4,3,133,143,3,4,133,254,2,5,133,121,2,6,133,0,2,7,133,149,1,8,133,54,1,9,133,227,0,10,133,158,0,11,133,101,0,12,133,57,0,13,133,25,0,14,133,6,0,15,133,0,0,16,133,6,0,17,133,25,0,18,133,57,0,19,133,101,0,20,133,158,0,21,133,227,0,22,133,53,1,23,133,148,1,24,133,255,1,25,133,119,2,26,133,252,2,27,133,141,3,28,133,42,4,29,133,212,4,30,133,139,5,31,133,79,6,32,133,31,7,33,133,251,7,34,133,228,8,35,133,218,9,36,133,220,10,37,133,234,11,38,133,6,13,39,133,45,14,40,133,98,15,41,133,163,16,42,133,240,17,43,133,74,19,44,133,176,20,45,133,35,22,46,133,162,23,47,133,46,25,48,133,198,26,49,133,107,28,50,133,28,30,51,133,218,31,52,133,164,33,53,133,123,35,54,133,94,37,55,133,78,39,56,133,74,41,57,133,82,43,58,133,103,45,59,133,137,47,60,133,182,49,61,133,241,51,62,133,55,54,63,133,138,56,64,133,234,58,65,133,86,61,66,133,206,63,67,133,83,66,68,133,228,68,69,133,129,71,70,133,43,74,71,133,226,76,72,133,164,79,73,133,115,82,74,133,78,85,75,133,54,88,76,133,42,91,77,133,43,94,78,133,56,97,79,133,81,100,80,133,118,103,81,133,168,106,82,133,230,109,83,133,49,113,84,133,135,116,85,133,234,119,86,133,90,123,87,133,213,126,88,133,94,130,89,133,242,133,90,133,146,137,91,133,63,141,92,133,249,144,93,133,190,148,94,133,144,152,95,133,110,156,96,133,88,160,97,133,79,164,98,133,81,168,99,133,96,172,100,133,124,176,101,133,163,180,102,133,215,184,103,133,23,189,104,133,99,193,105,133,188,197,106,133,32,202,107,133,145,206,108,133,14,211,109,133,152,215,110,133,45,220,111,133,207,224,112,133,125,229,113,133,55,234,114,133,253,238,115,133,208,243,116,133,174,248,117,133,153,253,118,133,144,2,120,133,147,7,121,133,163,12,122,133,190,17,123,133,230,22,124,133,26,28,125,133,89,33,126,133,166,38,127,133,254,43,128,133,98,49,129,133,210,54,130,133,79,60,131,133,216,65,132,133,108,71,133,133,13,77,134,133,186,82,135,133,115,88,136,133,57,94,137,133,10,100,138,133,231,105,139,133,209,111,140,133,198,117,141,133,200,123,142,133,213,129,143,133,239,135,144,133,21,142,145,133,71,148,146,133,132,154,147,133,206,160,148,133,36,167,149,133,134,173,150,133,244,179,151,133,110,186,152,133,244,192,153,133,134,199,154,133,37,206,155,133,207,212,156,133,133,219,157,133,71,226,158,133,21,233,159,133,239,239,160,133,213,246,161,133,199,253,162,133,197,4,164,133,207,11,165,133,229,18,166,133,7,26,167,133,53,33,168,133,111,40,169,133,181,47,170,133,7,55,171,133,101,62,172,133,206,69,173,133,68,77,174,133,198,84,175,133,83,92,176,133,237,99,177,133,146,107,178,133,67,115,179,133,0,123,180,133,201,130,181,133,158,138,182,133,127,146,183,133,108,154,184,133,101,162,185,133,105,170,186,133,122,178,187,133,150,186,188,133,190,194,189,133,242,202,190,133,50,211,191,133,126,219,192,133,214,227,193,133,57,236,194,133,169,244,195,133,36,253,196,133,171,5,198,133,62,14,199,133,221,22,200,133,135,31,201,133,62,40,202,133,0,49,203,133,206,57,204,133,168,66,205,133,141,75,206,133,127,84,207,133,124,93,208,133,133,102,209,133,154,111,210,133,187,120,211,133,231,129,212,133,31,139,213,133,99,148,214,133,179,157,215,133,15,167,216,133,118,176,217,133,233,185,218,133,104,195,219,133,242,204,220,133,137,214,221,133,43,224,222,133,216,233,223,133,146,243,224,133,87,253,225,133,40,7,227,133,5,17,228,133,237,26,229,133,225,36,230,133,225,46,231,133,237,56,232,133,4,67,233,133,39,77,234,133,86,87,235,133,144,97,236,133,214,107,237,133,40,118,238,133,133,128,239,133,238,138,240,133,99,149,241,133,227,159,242,133,111,170,243,133,7,181,244,133,171,191,245,133,90,202,246,133,20,213,247,133,219,223,248,133,173,234,249,133,138,245,250,133,115,0,252,133,104,11,253,133,105,22,254,133,117,33,255,133,141,44,0,134,176,55,1,134,223,66,2,134,25,78,3,134,95,89,4,134,177,100,5,134,15,112,6,134,119,123,7,134,236,134,8,134,108,146,9,134,248,157,10,134,143,169,11,134,50,181,12,134,224,192,13,134,154,204,14,134,96,216,15,134,49,228,16,134,13,240,17,134,245,251,18,134,233,7,20,134,232,19,21,134,243,31,22,134,9,44,23,134,43,56,24,134,88,68,25,134,145,80,26,134,213,92,27,134,37,105,28,134,129,117,29,134,232,129,30,134,90,142,31,134,216,154,32,134,97,167,33,134,246,179,34,134,150,192,35,134,66,205,36,134,249,217,37,134,188,230,38,134,138,243,39,134,100,0,41,134,73,13,42,134,58,26,43,134,54,39,44,134,61,52,45,134,80,65,46,134,111,78,47,134,153,91,48,134,206,104,49,134,15,118,50,134,91,131,51,134,178,144,52,134,21,158,53,134,131,171,54,134,253,184,55,134,130,198,56,134,19,212,57,134,175,225,58,134,86,239,59,134,9,253,60,134,199,10,62,134,145,24,63,134,102,38,64,134,70,52,65,134,50,66,66,134,41,80,67,134,43,94,68,134,57,108,69,134,82,122,70,134,119,136,71,134,167,150,72,134,226,164,73,134,40,179,74,134,122,193,75,134,216,207,76,134,64,222,77,134,180,236,78,134,51,251,79,134,190,9,81,134,84,24,82,134,245,38,83,134,161,53,84,134,89,68,85,134,28,83,86,134,234,97,87,134,196,112,88,134,169,127,89,134,153,142,90,134,149,157,91,134,156,172,92,134,174,187,93,134,203,202,94,134,244,217,95,134,40,233,96,134,103,248,97,134,177,7,99,134,7,23,100,134,104,38,101,134,212,53,102,134,76,69,103,134,206,84,104,134,92,100,105,134,245,115,106,134,154,131,107,134,73,147,108,134,4,163,109,134,202,178,110,134,155,194,111,134,120,210,112,134,95,226,113,134,82,242,114,134,80,2,116,134,90,18,117,134,110,34,118,134,142,50,119,134,185,66,120,134,239,82,121,134,48,99,122,134,124,115,123,134,212,131,124,134,54,148,125,134,164,164,126,134,29,181,127,134,162,197,128,134,49,214,129,134,203,230,130,134,113,247,131,134,34,8,133,134,222,24,134,134,165,41,135,134,119,58,136,134,85,75,137,134,61,92,138,134,49,109,139,134,47,126,140,134,57,143,141,134,78,160,142,134,110,177,143,134,153,194,144,134,207,211,145,134,17,229,146,134,93,246,147,134,181,7,149,134,23,25,150,134,133,42,151,134,254,59,152,134,130,77,153,134,17,95,154,134,171,112,155,134,80,130,156,134,0,148,157,134,187,165,158,134,129,183,159,134,83,201,160,134,47,219,161,134,22,237,162,134,9,255,163,134,6,17,165,134,15,35,166,134,34,53,167,134,65,71,168,134,106,89,169,134,159,107,170,134,223,125,171,134,41,144,172,134,127,162,173,134,224,180,174,134,75,199,175,134,194,217,176,134,67,236,177,134,208,254,178,134,104,17,180,134,10,36,181,134,184,54,182,134,113,73,183,134,52,92,184,134,3,111,185,134,220,129,186,134,193,148,187,134,176,167,188,134,170,186,189,134,176,205,190,134,192,224,191,134,219,243,192,134,2,7,194,134,51,26,195,134,111,45,196,134,182,64,197,134,8,84,198,134,101,103,199,134,204,122,200,134,63,142,201,134,189,161,202,134,69,181,203,134,217,200,204,134,119,220,205,134,32,240,206,134,212,3,208,134,148,23,209,134,94,43,210,134,50,63,211,134,18,83,212,134,253,102,213,134,242,122,214,134,243,142,215,134,254,162,216,134,20,183,217,134,53,203,218,134,97,223,219,134,152,243,220,134,217,7,222,134,38,28,223,134,125,48,224,134,223,68,225,134], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([76,89,226,134,196,109,227,134,70,130,228,134,212,150,229,134,108,171,230,134,15,192,231,134,189,212,232,134,118,233,233,134,58,254,234,134,8,19,236,134,226,39,237,134,198,60,238,134,180,81,239,134,174,102,240,134,179,123,241,134,194,144,242,134,220,165,243,134,1,187,244,134,48,208,245,134,107,229,246,134,176,250,247,134,0,16,249,134,90,37,250,134,192,58,251,134,48,80,252,134,171,101,253,134,49,123,254,134,194,144,255,134,93,166,0,135,3,188,1,135,180,209,2,135,111,231,3,135,53,253,4,135,6,19,6,135,226,40,7,135,201,62,8,135,186,84,9,135,182,106,10,135,188,128,11,135,206,150,12,135,234,172,13,135,16,195,14,135,66,217,15,135,126,239,16,135,197,5,18,135,23,28,19,135,115,50,20,135,218,72,21,135,75,95,22,135,200,117,23,135,79,140,24,135,224,162,25,135,125,185,26,135,36,208,27,135,214,230,28,135,146,253,29,135,89,20,31,135,43,43,32,135,7,66,33,135,238,88,34,135,224,111,35,135,220,134,36,135,227,157,37,135,244,180,38,135,17,204,39,135,56,227,40,135,105,250,41,135,165,17,43,135,236,40,44,135,61,64,45,135,153,87,46,135,0,111,47,135,113,134,48,135,237,157,49,135,115,181,50,135,4,205,51,135,160,228,52,135,70,252,53,135,247,19,55,135,178,43,56,135,120,67,57,135,73,91,58,135,36,115,59,135,10,139,60,135,250,162,61,135,245,186,62,135,250,210,63,135,10,235,64,135,37,3,66,135,74,27,67,135,122,51,68,135,180,75,69,135,248,99,70,135,72,124,71,135,162,148,72,135,6,173,73,135,117,197,74,135,238,221,75,135,114,246,76,135,1,15,78,135,154,39,79,135,62,64,80,135,236,88,81,135,164,113,82,135,103,138,83,135,53,163,84,135,13,188,85,135,240,212,86,135,221,237,87,135,213,6,89,135,215,31,90,135,227,56,91,135,250,81,92,135,28,107,93,135,72,132,94,135,127,157,95,135,192,182,96,135,11,208,97,135,97,233,98,135,193,2,100,135,44,28,101,135,162,53,102,135,34,79,103,135,172,104,104,135,64,130,105,135,224,155,106,135,137,181,107,135,61,207,108,135,252,232,109,135,197,2,111,135,152,28,112,135,118,54,113,135,94,80,114,135,81,106,115,135,78,132,116,135,85,158,117,135,103,184,118,135,131,210,119,135,170,236,120,135,219,6,122,135,23,33,123,135,93,59,124,135,173,85,125,135,8,112,126,135,109,138,127,135,220,164,128,135,86,191,129,135,218,217,130,135,105,244,131,135,2,15,133,135,165,41,134,135,83,68,135,135,11,95,136,135,206,121,137,135,154,148,138,135,114,175,139,135,83,202,140,135,63,229,141,135,53,0,143,135,54,27,144,135,65,54,145,135,86,81,146,135,118,108,147,135,160,135,148,135,212,162,149,135,19,190,150,135,92,217,151,135,175,244,152,135,12,16,154,135,116,43,155,135,231,70,156,135,99,98,157,135,234,125,158,135,123,153,159,135,22,181,160,135,188,208,161,135,108,236,162,135,39,8,164,135,235,35,165,135,186,63,166,135,147,91,167,135,119,119,168,135,100,147,169,135,92,175,170,135,95,203,171,135,107,231,172,135,130,3,174,135,163,31,175,135,207,59,176,135,4,88,177,135,68,116,178,135,142,144,179,135,227,172,180,135,65,201,181,135,170,229,182,135,29,2,184,135,155,30,185,135,34,59,186,135,180,87,187,135,80,116,188,135,246,144,189,135,167,173,190,135,97,202,191,135,38,231,192,135,245,3,194,135,207,32,195,135,178,61,196,135,160,90,197,135,152,119,198,135,154,148,199,135,167,177,200,135,189,206,201,135,222,235,202,135,9,9,204,135,62,38,205,135,125,67,206,135,199,96,207,135,27,126,208,135,121,155,209,135,225,184,210,135,83,214,211,135,207,243,212,135,86,17,214,135,230,46,215,135,129,76,216,135,38,106,217,135,213,135,218,135,143,165,219,135,82,195,220,135,32,225,221,135,247,254,222,135,217,28,224,135,197,58,225,135,188,88,226,135,188,118,227,135,198,148,228,135,219,178,229,135,249,208,230,135,34,239,231,135,85,13,233,135,146,43,234,135,217,73,235,135,42,104,236,135,134,134,237,135,235,164,238,135,91,195,239,135,212,225,240,135,88,0,242,135,230,30,243,135,126,61,244,135,32,92,245,135,204,122,246,135,130,153,247,135,66,184,248,135,12,215,249,135,225,245,250,135,191,20,252,135,168,51,253,135,154,82,254,135,151,113,255,135,79,72,0,140,215,215,0,140,100,103,1,140,247,246,1,140,142,134,2,140,43,22,3,140,204,165,3,140,115,53,4,140,30,197,4,140,207,84,5,140,132,228,5,140,63,116,6,140,255,3,7,140,195,147,7,140,141,35,8,140,91,179,8,140,47,67,9,140,8,211,9,140,229,98,10,140,200,242,10,140,176,130,11,140,156,18,12,140,142,162,12,140,132,50,13,140,128,194,13,140,129,82,14,140,134,226,14,140,145,114,15,140,161,2,16,140,181,146,16,140,207,34,17,140,237,178,17,140,17,67,18,140,57,211,18,140,103,99,19,140,153,243,19,140,209,131,20,140,13,20,21,140,79,164,21,140,149,52,22,140,225,196,22,140,49,85,23,140,134,229,23,140,225,117,24,140,64,6,25,140,164,150,25,140,13,39,26,140,123,183,26,140,239,71,27,140,103,216,27,140,228,104,28,140,102,249,28,140,237,137,29,140,121,26,30,140,10,171,30,140,159,59,31,140,58,204,31,140,218,92,32,140,127,237,32,140,40,126,33,140,215,14,34,140,138,159,34,140,67,48,35,140,0,193,35,140,195,81,36,140,138,226,36,140,86,115,37,140,40,4,38,140,254,148,38,140,217,37,39,140,185,182,39,140,158,71,40,140,136,216,40,140,118,105,41,140,106,250,41,140,99,139,42,140,96,28,43,140,99,173,43,140,106,62,44,140,119,207,44,140,136,96,45,140,158,241,45,140,185,130,46,140,217,19,47,140,254,164,47,140,40,54,48,140,87,199,48,140,139,88,49,140,195,233,49,140,1,123,50,140,67,12,51,140,138,157,51,140,215,46,52,140,40,192,52,140,126,81,53,140,217,226,53,140,57,116,54,140,158,5,55,140,7,151,55,140,118,40,56,140,233,185,56,140,97,75,57,140,223,220,57,140,97,110,58,140,232,255,58,140,116,145,59,140,5,35,60,140,154,180,60,140,53,70,61,140,212,215,61,140,121,105,62,140,34,251,62,140,208,140,63,140,131,30,64,140,59,176,64,140,247,65,65,140,185,211,65,140,128,101,66,140,75,247,66,140,27,137,67,140,240,26,68,140,202,172,68,140,169,62,69,140,141,208,69,140,117,98,70,140,99,244,70,140,85,134,71,140,76,24,72,140,72,170,72,140,73,60,73,140,79,206,73,140,89,96,74,140,105,242,74,140,125,132,75,140,150,22,76,140,180,168,76,140,215,58,77,140,255,204,77,140,43,95,78,140,93,241,78,140,147,131,79,140,206,21,80,140,14,168,80,140,83,58,81,140,156,204,81,140,235,94,82,140,62,241,82,140,150,131,83,140,243,21,84,140,85,168,84,140,187,58,85,140,39,205,85,140,151,95,86,140,12,242,86,140,134,132,87,140,5,23,88,140,137,169,88,140,17,60,89,140,158,206,89,140,48,97,90,140,199,243,90,140,99,134,91,140,3,25,92,140,169,171,92,140,83,62,93,140,2,209,93,140,182,99,94,140,110,246,94,140,43,137,95,140,238,27,96,140,181,174,96,140,128,65,97,140,81,212,97,140,39,103,98,140,1,250,98,140,224,140,99,140,196,31,100,140,172,178,100,140,154,69,101,140,140,216,101,140,131,107,102,140,127,254,102,140,127,145,103,140,133,36,104,140,143,183,104,140,158,74,105,140,178,221,105,140,202,112,106,140,231,3,107,140,10,151,107,140,49,42,108,140,92,189,108,140,141,80,109,140,194,227,109,140,252,118,110,140,59,10,111,140,126,157,111,140,199,48,112,140,20,196,112,140,102,87,113,140,188,234,113,140,24,126,114,140,120,17,115,140,221,164,115,140,71,56,116,140,181,203,116,140,41,95,117,140,161,242,117,140,29,134,118,140,159,25,119,140,37,173,119,140,176,64,120,140,64,212,120,140,213,103,121,140,110,251,121,140,12,143,122,140,175,34,123,140,87,182,123,140,3,74,124,140,180,221,124,140,106,113,125,140,36,5,126,140,228,152,126,140,168,44,127,140,113,192,127,140,62,84,128,140,17,232,128,140,232,123,129,140,195,15,130,140,164,163,130,140,137,55,131,140,115,203,131,140,98,95,132,140,85,243,132,140,77,135,133,140,74,27,134,140,76,175,134,140,82,67,135,140,93,215,135,140,109,107,136,140,130,255,136,140,155,147,137,140,185,39,138,140,220,187,138,140,3,80,139,140,47,228,139,140,96,120,140,140,150,12,141,140,208,160,141,140,15,53,142,140,83,201,142,140,155,93,143,140,232,241,143,140,58,134,144,140,145,26,145,140,236,174,145,140,76,67,146,140,176,215,146,140,26,108,147,140,136,0,148,140,251,148,148,140,114,41,149,140,238,189,149,140,111,82,150,140,245,230,150,140,127,123,151,140,14,16,152,140,161,164,152,140,58,57,153,140,215,205,153,140,120,98,154,140,31,247,154,140,202,139,155,140,122,32,156,140,46,181,156,140,231,73,157,140,165,222,157,140,103,115,158,140,47,8,159,140,250,156,159,140,203,49,160,140,160,198,160,140,122,91,161,140,89,240,161,140,60,133,162,140,36,26,163,140,16,175,163,140,1,68,164,140,247,216,164,140,242,109,165,140,241,2,166,140,245,151,166,140,254,44,167,140,11,194,167,140,29,87,168,140,51,236,168,140,78,129,169,140,110,22,170,140,147,171,170,140,188,64,171,140,234,213,171,140,28,107,172,140,83,0,173,140,143,149,173,140,208,42,174,140,21,192,174,140,94,85,175,140,173,234,175,140,0,128,176,140,87,21,177,140,180,170,177,140,21,64,178,140,122,213,178,140,228,106,179,140,83,0,180,140,199,149,180,140,63,43,181,140,188,192,181,140,61,86,182,140,195,235,182,140,78,129,183,140,221,22,184,140,113,172,184,140,10,66,185,140,167,215,185,140,73,109,186,140,239,2,187,140,154,152,187,140,74,46,188,140,254,195,188,140,183,89,189,140,116,239,189,140,55,133,190,140,253,26,191,140,201,176,191,140,153,70,192,140,109,220,192,140,71,114,193,140,36,8,194,140,7,158,194,140,238,51,195,140,218,201,195,140,202,95,196,140,191,245,196,140,184,139,197,140,182,33,198,140,185,183,198,140,192,77,199,140,204,227,199,140,221,121,200,140,242,15,201,140,12,166,201,140,42,60,202,140,77,210,202,140,116,104,203,140,160,254,203,140,209,148,204,140,6,43,205,140,64,193,205,140,127,87,206,140,194,237,206,140,9,132,207,140,85,26,208,140,166,176,208,140,251,70,209,140,85,221,209,140,180,115,210,140,23,10,211,140,127,160,211,140,235,54,212,140,92,205,212,140,209,99,213,140,75,250,213,140,202,144,214,140,77,39,215,140,213,189,215,140,97,84,216,140,242,234,216,140,135,129,217,140,33,24,218,140,192,174,218,140,99,69,219,140,10,220,219,140,183,114,220,140,103,9,221,140,29,160,221,140,215,54,222,140,149,205,222,140,88,100,223,140,32,251,223,140,236,145,224,140,188,40,225,140,146,191,225,140,107,86,226,140,74,237,226,140,45,132,227,140,20,27,228,140,0,178,228,140,241,72,229,140,230,223,229,140,223,118,230,140,222,13,231,140,224,164,231,140,231,59,232,140,243,210,232,140,4,106,233,140,24,1,234,140,50,152,234,140,80,47,235,140,114,198,235,140,153,93,236,140,197,244,236,140,245,139,237,140,41,35,238,140,99,186,238,140,160,81,239,140,226,232,239,140,41,128,240,140,116,23,241,140,196,174,241,140,24,70,242,140,113,221,242,140,207,116,243,140,48,12,244,140,151,163,244,140,2,59,245,140,113,210,245,140,229,105,246,140,93,1,247,140,218,152,247,140,92,48,248,140,226,199,248,140,108,95,249,140,251,246,249,140,143,142,250,140,39,38,251,140,195,189,251,140,100,85,252,140,10,237,252,140,180,132,253,140,98,28,254,140,21,180,254,140,205,75,255,140,137,227,255,140,73,123,0,141,14,19,1,141,216,170,1,141,166,66,2,141,120,218,2,141,79,114,3,141,43,10,4,141,11,162,4,141,239,57,5,141,216,209,5,141,197,105,6,141,183,1,7,141,174,153,7,141,169,49,8,141,168,201,8,141,172,97,9,141,180,249,9,141,193,145,10,141,210,41,11,141,232,193,11,141,2,90,12,141,33,242,12,141,68,138,13,141,108,34,14,141,152,186,14,141,201,82,15,141,254,234,15,141,55,131,16,141,117,27,17,141,184,179,17,141,255,75,18,141,74,228,18,141,154,124,19,141,238,20,20,141,71,173,20,141,165,69,21,141,6,222,21,141,109,118,22,141,215,14,23,141,70,167,23,141,186,63,24,141,50,216,24,141,174,112,25,141,47,9,26,141,181,161,26,141,63,58,27,141,205,210,27,141,96,107,28,141,247,3,29,141,146,156,29,141,50,53,30,141,215,205,30,141,128,102,31,141,45,255,31,141,223,151,32,141,149,48,33,141,80,201,33,141,15,98,34,141,211,250,34,141,155,147,35,141,104,44,36,141,56,197,36,141,14,94,37,141,232,246,37,141,198,143,38,141,169,40,39,141,144,193,39,141,123,90,40,141,107,243,40,141,95,140,41,141,88,37,42,141,85,190,42,141,87,87,43,141,93,240,43,141,104,137,44,141,119,34,45,141,138,187,45,141,162,84,46,141,190,237,46,141,222,134,47,141,3,32,48,141,45,185,48,141,91,82,49,141,141,235,49,141,196,132,50,141,255,29,51,141,62,183,51,141,130,80,52,141,202,233,52,141,23,131,53,141,104,28,54,141,190,181,54,141,23,79,55,141,118,232,55,141,217,129,56,141,64,27,57,141,171,180,57,141,27,78,58,141,143,231,58,141,8,129,59,141,133,26,60,141,7,180,60,141,141,77,61,141,23,231,61,141,166,128,62,141,57,26,63,141,208,179,63,141,108,77,64,141,12,231,64,141,177,128,65,141,90,26,66,141,7,180,66,141,185,77,67,141,111,231,67,141,42,129,68,141,233,26,69,141,172,180,69,141,116,78,70,141,64,232,70,141,17,130,71,141,229,27,72,141,191,181,72,141,156,79,73,141,126,233,73,141,100,131,74,141,79,29,75,141,62,183,75,141,50,81,76,141,42,235,76,141,38,133,77,141,38,31,78,141,43,185,78,141,52,83,79,141,66,237,79,141,84,135,80,141,107,33,81,141,133,187,81,141,164,85,82,141,200,239,82,141,240,137,83,141,28,36,84,141,76,190,84,141,129,88,85,141,186,242,85,141,248,140,86,141,58,39,87,141,128,193,87,141,203,91,88,141,26,246,88,141,109,144,89,141,197,42,90,141,33,197,90,141,129,95,91,141,230,249,91,141,79,148,92,141,189,46,93,141,46,201,93,141,165,99,94,141,31,254,94,141,158,152,95,141,33,51,96,141,168,205,96,141,52,104,97,141,196,2,98,141,89,157,98,141,242,55,99,141,143,210,99,141,48,109,100,141,214,7,101,141,128,162,101,141,47,61,102,141,225,215,102,141,152,114,103,141,84,13,104,141,20,168,104,141,216,66,105,141,160,221,105,141,109,120,106,141,62,19,107,141,19,174,107,141,237,72,108,141,203,227,108,141,173,126,109,141,148,25,110,141,127,180,110,141,110,79,111,141,98,234,111,141,90,133,112,141,86,32,113,141,86,187,113,141,91,86,114,141,100,241,114,141,114,140,115,141,132,39,116,141,154,194,116,141,180,93,117,141,211,248,117,141,246,147,118,141,29,47,119,141,73,202,119,141,120,101,120,141,173,0,121,141,229,155,121,141,34,55,122,141,99,210,122,141,168,109,123,141,242,8,124,141,64,164,124,141,146,63,125,141,233,218,125,141,68,118,126,141,163,17,127,141,6,173,127,141,110,72,128,141,218,227,128,141,74,127,129,141,191,26,130,141,56,182,130,141,181,81,131,141,54,237,131,141,188,136,132,141,70,36,133,141,212,191,133,141,103,91,134,141,253,246,134,141,152,146,135,141,56,46,136,141,220,201,136,141,131,101,137,141,48,1,138,141,224,156,138,141,149,56,139,141,78,212,139,141,11,112,140,141,205,11,141,141,147,167,141,141,93,67,142,141,43,223,142,141,254,122,143,141,213,22,144,141,176,178,144,141,143,78,145,141,115,234,145,141,91,134,146,141,71,34,147,141,55,190,147,141,44,90,148,141,37,246,148,141,34,146,149,141,36,46,150,141,42,202,150,141,52,102,151,141,66,2,152,141,84,158,152,141,107,58,153,141,134,214,153,141,165,114,154,141,201,14,155,141,241,170,155,141,29,71,156,141,77,227,156,141,129,127,157,141,186,27,158,141,247,183,158,141,56,84,159,141,126,240,159,141,199,140,160,141,21,41,161,141,103,197,161,141,190,97,162,141,24,254,162,141,119,154,163,141,218,54,164,141,66,211,164,141,173,111,165,141,29,12,166,141,145,168,166,141,10,69,167,141,134,225,167,141,7,126,168,141,140,26,169,141,21,183,169,141,162,83,170,141,52,240,170,141,202,140,171,141,100,41,172,141,2,198,172,141,165,98,173,141,76,255,173,141,247,155,174,141,166,56,175,141,89,213,175,141,17,114,176,141,205,14,177,141,141,171,177,141,81,72,178,141,26,229,178,141,230,129,179,141,183,30,180,141,140,187,180,141,102,88,181,141,67,245,181,141,37,146,182,141,11,47,183,141,245,203,183,141,227,104,184,141,214,5,185,141,205,162,185,141,200,63,186,141,199,220,186,141,202,121,187,141,210,22,188,141,222,179,188,141,238,80,189,141,2,238,189,141,26,139,190,141,55,40,191,141,88,197,191,141,125,98,192,141,166,255,192,141,211,156,193,141,5,58,194,141,58,215,194,141,116,116,195,141,178,17,196,141,245,174,196,141,59,76,197,141,134,233,197,141,213,134,198,141,40,36,199,141,127,193,199,141,218,94,200,141,58,252,200,141,158,153,201,141,6,55,202,141,114,212,202,141,226,113,203,141,87,15,204,141,207,172,204,141,76,74,205,141,205,231,205,141,82,133,206,141,220,34,207,141,105,192,207,141,251,93,208,141,145,251,208,141,43,153,209,141,201,54,210,141,108,212,210,141,18,114,211,141,189,15,212,141,108,173,212,141,31,75,213,141,214,232,213,141,145,134,214,141,81,36,215,141,21,194,215,141,220,95,216,141,168,253,216,141,121,155,217,141,77,57,218,141,38,215,218,141,2,117,219,141,227,18,220,141,200,176,220,141,177,78,221,141,158,236,221,141,144,138,222,141,133,40,223,141,127,198,223,141,125,100,224,141,127,2,225,141,133,160,225,141,143,62,226,141,158,220,226,141,176,122,227,141,199,24,228,141,226,182,228,141,1,85,229,141,36,243,229,141,76,145,230,141,119,47,231,141,167,205,231,141,218,107,232,141,18,10,233,141,78,168,233,141,142,70,234,141,211,228,234,141,27,131,235,141,104,33,236,141,184,191,236,141,13,94,237,141,102,252,237,141,195,154,238,141,36,57,239,141,138,215,239,141,243,117,240,141,97,20,241,141,211,178,241,141,72,81,242,141,194,239,242,141,64,142,243,141,195,44,244,141,73,203,244,141,211,105,245,141,98,8,246,141,245,166,246,141,139,69,247,141,38,228,247,141,197,130,248,141,105,33,249,141,16,192,249,141,187,94,250,141,107,253,250,141,30,156,251,141,214,58,252,141,146,217,252,141,82,120,253,141,22,23,254,141,222,181,254,141,170,84,255,141,123,243,255,141,79,146,0,142,40,49,1,142,4,208,1,142,229,110,2,142,202,13,3,142,179,172,3,142,160,75,4,142,145,234,4,142,135,137,5,142,128,40,6,142,125,199,6,142,127,102,7,142,133,5,8,142,143,164,8,142,156,67,9,142,174,226,9,142,196,129,10,142,223,32,11,142,253,191,11,142,31,95,12,142,70,254,12,142,112,157,13,142,159,60,14,142,209,219,14,142,8,123,15,142,67,26,16,142,130,185,16,142,197,88,17,142,12,248,17,142,87,151,18,142,166,54,19,142,250,213,19,142,81,117,20,142,173,20,21,142,12,180,21,142,112,83,22,142,216,242,22,142,67,146,23,142,179,49,24,142,39,209,24,142,159,112,25,142,27,16,26,142,156,175,26,142,32,79,27,142,168,238,27,142,52,142,28,142,197,45,29,142,89,205,29,142,242,108,30,142,143,12,31,142,47,172,31,142,212,75,32,142,125,235,32,142,42,139,33,142,219,42,34,142,144,202,34,142,73,106,35,142,6,10,36,142,199,169,36,142,141,73,37,142,86,233,37,142,35,137,38,142,245,40,39,142,202,200,39,142,164,104,40,142,129,8,41,142,99,168,41,142,73,72,42,142,50,232,42,142,32,136,43,142,18,40,44,142,8,200,44,142,2,104,45,142,0,8,46,142,2,168,46,142,8,72,47,142,18,232,47,142,32,136,48,142,50,40,49,142,73,200,49,142,99,104,50,142,129,8,51,142,163,168,51,142,202,72,52,142,244,232,52,142,35,137,53,142,85,41,54,142,140,201,54,142,198,105,55,142,5,10,56,142,72,170,56,142,142,74,57,142,217,234,57,142,40,139,58,142,123,43,59,142,209,203,59,142,44,108,60,142,139,12,61,142,238,172,61,142,85,77,62,142,192,237,62,142,47,142,63,142,162,46,64,142,25,207,64,142,148,111,65,142,19,16,66,142,150,176,66,142,29,81,67,142,168,241,67,142,55,146,68,142,202,50,69,142,97,211,69,142,252,115,70,142,156,20,71,142,63,181,71,142,230,85,72,142,145,246,72,142,64,151,73,142,244,55,74,142,171,216,74,142,102,121,75,142,37,26,76,142,233,186,76,142,176,91,77,142,123,252,77,142,75,157,78,142,30,62,79,142,245,222,79,142,208,127,80,142,176,32,81,142,147,193,81,142,122,98,82,142,102,3,83,142,85,164,83,142,72,69,84,142,64,230,84,142,59,135,85,142,58,40,86,142,61,201,86,142,69,106,87,142,80,11,88,142,95,172,88,142,115,77,89,142,138,238,89,142,165,143,90,142,196,48,91,142,231,209,91,142,15,115,92,142,58,20,93,142,105,181,93,142,156,86,94,142,211,247,94,142,14,153,95,142,78,58,96,142,145,219,96,142,216,124,97,142,35,30,98,142,114,191,98,142,197,96,99,142,28,2,100,142,119,163,100,142,214,68,101,142,57,230,101,142,160,135,102,142,11,41,103,142,121,202,103,142,236,107,104,142,99,13,105,142,222,174,105,142,93,80,106,142,223,241,106,142,102,147,107,142,241,52,108,142,127,214,108,142,18,120,109,142,169,25,110,142,67,187,110,142,226,92,111,142,132,254,111,142,42,160,112,142,213,65,113,142,131,227,113,142,53,133,114,142,236,38,115,142,166,200,115,142,100,106,116,142,38,12,117,142,236,173,117,142,182,79,118,142,132,241,118,142,86,147,119,142,44,53,120,142,6,215,120,142,228,120,121,142,198,26,122,142,172,188,122,142,149,94,123,142,131,0,124,142,117,162,124,142,106,68,125,142,100,230,125,142,97,136,126,142,98,42,127,142,104,204,127,142,113,110,128,142,126,16,129,142,143,178,129,142,164,84,130,142,189,246,130,142,218,152,131,142,251,58,132,142,32,221,132,142,73,127,133,142,118,33,134,142,166,195,134,142,219,101,135,142,20,8,136,142,80,170,136,142,144,76,137,142,213,238,137,142,29,145,138,142,105,51,139,142,185,213,139,142,14,120,140,142,102,26,141,142,193,188,141,142,33,95,142,142,133,1,143,142,237,163,143,142,88,70,144,142,200,232,144,142,60,139,145,142,179,45,146,142,46,208,146,142,174,114,147,142,49,21,148,142,184,183,148,142,67,90,149,142,210,252,149,142,101,159,150,142,251,65,151,142,150,228,151,142,53,135,152,142,215,41,153,142,126,204,153,142,40,111,154,142,214,17,155,142,137,180,155,142,63,87,156,142,249,249,156,142,183,156,157,142,120,63,158,142,62,226,158,142,8,133,159,142,213,39,160,142,167,202,160,142,124,109,161,142,85,16,162,142,51,179,162,142,20,86,163,142,249,248,163,142,226,155,164,142,206,62,165,142,191,225,165,142,180,132,166,142,172,39,167,142,169,202,167,142,169,109,168,142,173,16,169,142,181,179,169,142,193,86,170,142,209,249,170,142,229,156,171,142,252,63,172,142,24,227,172,142,55,134,173,142,91,41,174,142,130,204,174,142,173,111,175,142,220,18,176,142,15,182,176,142,70,89,177,142,129,252,177,142,191,159,178,142,2,67,179,142,72,230,179,142,146,137,180,142,224,44,181,142,50,208,181,142,136,115,182,142,226,22,183,142,63,186,183,142,161,93,184,142,6,1,185,142,112,164,185,142,221,71,186,142,78,235,186,142,195,142,187,142,59,50,188,142,184,213,188,142,57,121,189,142,189,28,190,142,69,192,190,142,209,99,191,142,97,7,192,142,245,170,192,142,141,78,193,142,41,242,193,142,200,149,194,142,108,57,195,142,19,221,195,142,190,128,196,142,109,36,197,142,32,200,197,142,214,107,198,142,145,15,199,142,79,179,199,142,18,87,200,142,216,250,200,142,162,158,201,142,112,66,202,142,65,230,202,142,23,138,203,142,240,45,204,142,206,209,204,142,175,117,205,142,148,25,206,142,125,189,206,142,105,97,207,142,90,5,208,142,78,169,208,142,71,77,209,142,67,241,209,142,67,149,210,142,71,57,211,142,78,221,211,142,90,129,212,142,105,37,213,142,124,201,213,142,147,109,214,142,174,17,215,142,205,181,215,142,240,89,216,142,22,254,216,142,64,162,217,142,111,70,218,142,161,234,218,142,214,142,219,142,16,51,220,142,77,215,220,142,143,123,221,142,212,31,222,142,29,196,222,142,106,104,223,142,187,12,224,142,15,177,224,142,103,85,225,142,196,249,225,142,36,158,226,142,135,66,227,142,239,230,227,142,91,139,228,142,202,47,229,142,61,212,229,142,180,120,230,142,47,29,231,142,174,193,231,142,48,102,232,142,183,10,233,142,65,175,233,142,207,83,234,142,96,248,234,142,246,156,235,142,143,65,236,142,45,230,236,142,206,138,237,142,115,47,238,142,27,212,238,142,200,120,239,142,120,29,240,142,44,194,240,142,228,102,241,142,160,11,242,142,96,176,242,142,35,85,243,142,235,249,243,142,182,158,244,142,133,67,245,142,87,232,245,142,46,141,246,142,8,50,247,142,230,214,247,142,200,123,248,142,174,32,249,142,151,197,249,142,133,106,250,142,118,15,251,142,107,180,251,142,100,89,252,142,96,254,252,142,97,163,253,142,101,72,254,142,109,237,254,142,121,146,255,142,136,55,0,143,156,220,0,143,179,129,1,143,206,38,2,143,237,203,2,143,15,113,3,143,54,22,4,143,96,187,4,143,142,96,5,143,192,5,6,143,245,170,6,143,47,80,7,143,108,245,7,143,173,154,8,143,242,63,9,143,58,229,9,143,134,138,10,143,215,47,11,143,42,213,11,143,130,122,12,143,222,31,13,143,61,197,13,143,160,106,14,143,7,16,15,143,113,181,15,143,224,90,16,143,82,0,17,143,200,165,17,143,66,75,18,143,191,240,18,143,65,150,19,143,198,59,20,143,79,225,20,143,219,134,21,143,108,44,22,143,0,210,22,143,152,119,23,143,52,29,24,143,211,194,24,143,119,104,25,143,30,14,26,143,201,179,26,143,119,89,27,143,42,255,27,143,224,164,28,143,154,74,29,143,88,240,29,143,25,150,30,143,222,59,31,143,168,225,31,143,116,135,32,143,69,45,33,143,25,211,33,143,241,120,34,143,205,30,35,143,173,196,35,143,144,106,36,143,119,16,37,143,98,182,37,143,81,92,38,143,68,2,39,143,58,168,39,143,52,78,40,143,49,244,40,143,51,154,41,143,56,64,42,143,65,230,42,143,78,140,43,143,94,50,44,143,115,216,44,143,139,126,45,143,167,36,46,143,198,202,46,143,233,112,47,143,16,23,48,143,59,189,48,143,106,99,49,143,156,9,50,143,210,175,50,143,12,86,51,143,73,252,51,143,139,162,52,143,208,72,53,143,24,239,53,143,101,149,54,143,181,59,55,143,9,226,55,143,97,136,56,143,188,46,57,143,28,213,57,143,127,123,58,143,229,33,59,143,80,200,59,143,190,110,60,143,48,21,61,143,166,187,61,143,31,98,62,143,156,8,63,143,29,175,63,143,162,85,64,143,42,252,64,143,182,162,65,143,70,73,66,143,217,239,66,143,113,150,67,143,12,61,68,143,170,227,68,143,77,138,69,143,243,48,70,143,157,215,70,143,75,126,71,143,252,36,72,143,177,203,72,143,106,114,73,143,39,25,74,143,231,191,74,143,171,102,75,143,115,13,76,143,62,180,76,143,13,91,77,143,224,1,78,143,183,168,78,143,145,79,79,143,111,246,79,143,81,157,80,143,55,68,81,143,32,235,81,143,13,146,82,143,253,56,83,143,242,223,83,143,234,134,84,143,230,45,85,143,229,212,85,143,232,123,86,143,239,34,87,143,250,201,87,143,8,113,88,143,26,24,89,143,48,191,89,143,74,102,90,143,103,13,91,143,136,180,91,143,172,91,92,143,213,2,93,143,1,170,93,143,48,81,94,143,100,248,94,143,155,159,95,143,214,70,96,143,20,238,96,143,87,149,97,143,157,60,98,143,230,227,98,143,52,139,99,143,133,50,100,143,217,217,100,143,50,129,101,143,142,40,102,143,238,207,102,143,81,119,103,143,185,30,104,143,36,198,104,143,146,109,105,143,5,21,106,143,123,188,106,143,244,99,107,143,114,11,108,143,243,178,108,143,120,90,109,143,0,2,110,143,140,169,110,143,28,81,111,143,176,248,111,143,71,160,112,143,226,71,113,143,128,239,113,143,35,151,114,143,201,62,115,143,114,230,115,143,32,142,116,143,209,53,117,143,133,221,117,143,62,133,118,143,250,44,119,143,186,212,119,143,125,124,120,143,68,36,121,143,15,204,121,143,221,115,122,143,175,27,123,143,133,195,123,143,95,107,124,143,60,19,125,143,29,187,125,143,1,99,126,143,233,10,127,143,213,178,127,143,197,90,128,143,184,2,129,143,175,170,129,143,170,82,130,143,168,250,130,143,170,162,131,143,175,74,132,143,184,242,132,143,197,154,133,143,214,66,134,143,234,234,134,143,2,147,135,143,30,59,136,143,61,227,136,143,96,139,137,143,134,51,138,143,176,219,138,143,222,131,139,143,16,44,140,143,69,212,140,143,126,124,141,143,186,36,142,143,251,204,142,143,62,117,143,143,134,29,144,143,209,197,144,143,32,110,145,143,114,22,146,143,200,190,146,143,34,103,147,143,128,15,148,143,225,183,148,143,69,96,149,143,174,8,150,143,26,177,150,143,138,89,151,143,253,1,152,143,116,170,152,143,238,82,153,143,109,251,153,143,239,163,154,143,116,76,155,143,253,244,155,143,138,157,156,143,27,70,157,143,175,238,157,143,71,151,158,143,226,63,159,143,129,232,159,143,36,145,160,143,202,57,161,143,116,226,161,143,34,139,162,143,211,51,163,143,136,220,163,143,65,133,164,143,253,45,165,143,189,214,165,143,128,127,166,143,71,40,167,143,18,209,167,143,225,121,168,143,179,34,169,143,136,203,169,143,98,116,170,143,62,29,171,143,31,198,171,143,3,111,172,143,235,23,173,143,214,192,173,143,198,105,174,143,184,18,175,143,175,187,175,143,168,100,176,143,166,13,177,143,167,182,177,143,172,95,178,143,181,8,179,143,193,177,179,143,208,90,180,143,228,3,181,143,251,172,181,143,21,86,182,143,51,255,182,143,85,168,183,143,123,81,184,143,164,250,184,143,208,163,185,143,1,77,186,143,53,246,186,143,108,159,187,143,167,72,188,143,230,241,188,143,40,155,189,143,110,68,190,143,184,237,190,143,5,151,191,143,86,64,192,143,170,233,192,143,2,147,193,143,94,60,194,143,189,229,194,143,32,143,195,143,135,56,196,143,241,225,196,143,95,139,197,143,208,52,198,143,69,222,198,143,189,135,199,143,57,49,200,143,185,218,200,143,60,132,201,143,195,45,202,143,78,215,202,143,220,128,203,143,110,42,204,143,3,212,204,143,156,125,205,143,57,39,206,143,217,208,206,143,125,122,207,143,36,36,208,143,207,205,208,143,126,119,209,143,48,33,210,143,229,202,210,143,159,116,211,143,92,30,212,143,28,200,212,143,224,113,213,143,168,27,214,143,115,197,214,143,66,111,215,143,21,25,216,143,235,194,216,143,196,108,217,143,162,22,218,143,131,192,218,143,103,106,219,143,79,20,220,143,59,190,220,143,42,104,221,143,29,18,222,143,19,188,222,143,13,102,223,143,10,16,224,143,12,186,224,143,16,100,225,143,25,14,226,143,36,184,226,143,52,98,227,143,71,12,228,143,94,182,228,143,120,96,229,143,149,10,230,143,183,180,230,143,220,94,231,143,4,9,232,143,48,179,232,143,96,93,233,143,147,7,234,143,202,177,234,143,4,92,235,143,66,6,236,143,132,176,236,143,201,90,237,143,18,5,238,143,94,175,238,143,174,89,239,143,1,4,240,143,88,174,240,143,179,88,241,143,17,3,242,143,114,173,242,143,216,87,243,143,64,2,244,143,173,172,244,143,29,87,245,143,144,1,246,143,7,172,246,143,130,86,247,143,0,1,248,143,130,171,248,143,7,86,249,143,144,0,250,143,28,171,250,143,172,85,251,143,64,0,252,143,215,170,252,143,114,85,253,143,16,0,254,143,178,170,254,143,87,85,255,143,0,0,0,148,86,85,0,148,174,170,0,148,8,0,1,148,99,85,1,148,193,170,1,148,32,0,2,148,129,85,2,148,227,170,2,148,72,0,3,148,174,85,3,148,22,171,3,148,128,0,4,148,235,85,4,148,89,171,4,148,200,0,5,148,56,86,5,148,171,171,5,148,31,1,6,148,150,86,6,148,14,172,6,148,135,1,7,148,3,87,7,148,128,172,7,148,255,1,8,148,128,87,8,148,2,173,8,148,135,2,9,148,13,88,9,148,149,173,9,148,30,3,10,148,170,88,10,148,55,174,10,148,198,3,11,148,87,89,11,148,233,174,11,148,126,4,12,148,20,90,12,148,171,175,12,148,69,5,13,148,224,90,13,148,125,176,13,148,28,6,14,148,189,91,14,148,95,177,14,148,3,7,15,148,169,92,15,148,81,178,15,148,250,7,16,148,166,93,16,148,83,179,16,148,1,9,17,148,178,94,17,148,100,180,17,148,24,10,18,148,206,95,18,148,134,181,18,148,63,11,19,148,250,96,19,148,183,182,19,148,117,12,20,148,54,98,20,148,248,183,20,148,188,13,21,148,129,99,21,148,73,185,21,148,18,15,22,148,221,100,22,148,170,186,22,148,120,16,23,148,72,102,23,148,26,188,23,148,238,17,24,148,195,103,24,148,155,189,24,148,116,19,25,148,78,105,25,148,43,191,25,148,9,21,26,148,233,106,26,148,203,192,26,148,174,22,27,148,148,108,27,148,123,194,27,148,99,24,28,148,78,110,28,148,58,196,28,148,40,26,29,148,24,112,29,148,10,198,29,148,253,27,30,148,242,113,30,148,233,199,30,148,225,29,31,148,220,115,31,148,216,201,31,148,213,31,32,148,213,117,32,148,214,203,32,148,217,33,33,148,222,119,33,148,229,205,33,148,237,35,34,148,247,121,34,148,3,208,34,148,17,38,35,148,32,124,35,148,49,210,35,148,68,40,36,148,88,126,36,148,110,212,36,148,135,42,37,148,160,128,37,148,188,214,37,148,217,44,38,148,248,130,38,148,25,217,38,148,59,47,39,148,96,133,39,148,134,219,39,148,173,49,40,148,215,135,40,148,2,222,40,148,47,52,41,148,94,138,41,148,142,224,41,148,192,54,42,148,244,140,42,148,42,227,42,148,98,57,43,148,155,143,43,148,214,229,43,148,18,60,44,148,81,146,44,148,145,232,44,148,211,62,45,148,22,149,45,148,92,235,45,148,163,65,46,148,236,151,46,148,54,238,46,148,130,68,47,148,209,154,47,148,32,241,47,148,114,71,48,148,197,157,48,148,26,244,48,148,113,74,49,148,201,160,49,148,35,247,49,148,127,77,50,148,221,163,50,148,61,250,50,148,158,80,51,148,1,167,51,148,101,253,51,148,204,83,52,148,52,170,52,148,157,0,53,148,9,87,53,148,118,173,53,148,229,3,54,148,86,90,54,148,201,176,54,148,61,7,55,148,179,93,55,148,42,180,55,148,164,10,56,148,31,97,56,148,156,183,56,148,26,14,57,148,155,100,57,148,29,187,57,148,161,17,58,148,38,104,58,148,173,190,58,148,54,21,59,148,193,107,59,148,77,194,59,148,220,24,60,148,108,111,60,148,253,197,60,148,145,28,61,148,38,115,61,148,188,201,61,148,85,32,62,148,239,118,62,148,139,205,62,148,41,36,63,148,200,122,63,148,105,209,63,148,12,40,64,148,177,126,64,148,87,213,64,148,255,43,65,148,169,130,65,148,85,217,65,148,2,48,66,148,177,134,66,148,97,221,66,148,20,52,67,148,200,138,67,148,126,225,67,148,53,56,68,148,239,142,68,148,170,229,68,148,102,60,69,148,37,147,69,148,229,233,69,148,167,64,70,148,106,151,70,148,48,238,70,148,247,68,71,148,192,155,71,148,138,242,71,148,86,73,72,148,36,160,72,148,244,246,72,148,197,77,73,148,152,164,73,148,109,251,73,148,67,82,74,148,28,169,74,148,246,255,74,148,209,86,75,148,175,173,75,148,142,4,76,148,111,91,76,148,81,178,76,148,53,9,77,148,27,96,77,148,3,183,77,148,236,13,78,148,215,100,78,148,196,187,78,148,179,18,79,148,163,105,79,148,149,192,79,148,136,23,80,148,126,110,80,148,117,197,80,148,110,28,81,148,104,115,81,148,100,202,81,148,98,33,82,148,98,120,82,148,99,207,82,148,102,38,83,148,107,125,83,148,114,212,83,148,122,43,84,148,132,130,84,148,143,217,84,148,156,48,85,148,171,135,85,148,188,222,85,148,207,53,86,148,227,140,86,148,249,227,86,148,16,59,87,148,41,146,87,148,68,233,87,148,97,64,88,148,127,151,88,148,159,238,88,148,193,69,89,148,229,156,89,148,10,244,89,148,49,75,90,148,89,162,90,148,132,249,90,148,176,80,91,148,221,167,91,148,13,255,91,148,62,86,92,148,113,173,92,148,165,4,93,148,220,91,93,148,19,179,93,148,77,10,94,148,136,97,94,148,197,184,94,148,4,16,95,148,69,103,95,148,135,190,95,148,203,21,96,148,16,109,96,148,87,196,96,148,160,27,97,148,235,114,97,148,55,202,97,148,133,33,98,148,213,120,98,148,38,208,98,148,122,39,99,148,206,126,99,148,37,214,99,148,125,45,100,148,215,132,100,148,51,220,100,148,144,51,101,148,239,138,101,148,80,226,101,148,178,57,102,148,22,145,102,148,124,232,102,148,227,63,103,148,77,151,103,148,183,238,103,148,36,70,104,148,146,157,104,148,2,245,104,148,116,76,105,148,231,163,105,148,92,251,105,148,211,82,106,148,75,170,106,148,197,1,107,148,65,89,107,148,191,176,107,148,62,8,108,148,191,95,108,148,65,183,108,148,197,14,109,148,75,102,109,148,211,189,109,148,92,21,110,148,231,108,110,148,116,196,110,148,2,28,111,148,146,115,111,148,36,203,111,148,184,34,112,148,77,122,112,148,228,209,112,148,124,41,113,148,22,129,113,148,178,216,113,148,80,48,114,148,239,135,114,148,144,223,114,148,51,55,115,148,215,142,115,148,125,230,115,148,37,62,116,148,206,149,116,148,121,237,116,148,38,69,117,148,212,156,117,148,132,244,117,148,54,76,118,148,234,163,118,148,159,251,118,148,86,83,119,148,14,171,119,148,200,2,120,148,132,90,120,148,66,178,120,148,1,10,121,148,194,97,121,148,132,185,121,148,73,17,122,148,15,105,122,148,214,192,122,148,160,24,123,148,107,112,123,148,55,200,123,148,6,32,124,148,214,119,124,148,168,207,124,148,123,39,125,148,80,127,125,148,39,215,125,148,255,46,126,148,217,134,126,148,181,222,126,148,147,54,127,148,114,142,127,148,83,230,127,148,53,62,128,148,25,150,128,148,255,237,128,148,231,69,129,148,208,157,129,148,187,245,129,148,167,77,130,148,149,165,130,148,133,253,130,148,119,85,131,148,106,173,131,148,95,5,132,148,86,93,132,148,78,181,132,148,72,13,133,148,68,101,133,148,65,189,133,148,64,21,134,148,64,109,134,148,67,197,134,148,71,29,135,148,76,117,135,148,84,205,135,148,93,37,136,148,103,125,136,148,116,213,136,148,130,45,137,148,145,133,137,148,163,221,137,148,182,53,138,148,202,141,138,148,225,229,138,148,249,61,139,148,18,150,139,148,46,238,139,148,75,70,140,148,105,158,140,148,138,246,140,148,172,78,141,148,207,166,141,148,245,254,141,148,28,87,142,148,68,175,142,148,111,7,143,148,155,95,143,148,200,183,143,148,248,15,144,148,41,104,144,148,91,192,144,148,144,24,145,148,198,112,145,148,253,200,145,148,55,33,146,148,114,121,146,148,174,209,146,148,237,41,147,148,44,130,147,148,110,218,147,148,177,50,148,148,246,138,148,148,61,227,148,148,133,59,149,148,207,147,149,148,27,236,149,148,104,68,150,148,183,156,150,148,8,245,150,148,90,77,151,148,174,165,151,148,3,254,151,148,90,86,152,148,179,174,152,148,14,7,153,148,106,95,153,148,200,183,153,148,39,16,154,148,137,104,154,148,235,192,154,148,80,25,155,148,182,113,155,148,30,202,155,148,135,34,156,148,242,122,156,148,95,211,156,148,206,43,157,148,62,132,157,148,175,220,157,148,35,53,158,148,152,141,158,148,14,230,158,148,135,62,159,148,1,151,159,148,124,239,159,148,250,71,160,148,121,160,160,148,249,248,160,148,124,81,161,148,255,169,161,148,133,2,162,148,12,91,162,148,149,179,162,148,32,12,163,148,172,100,163,148,58,189,163,148,201,21,164,148,90,110,164,148,237,198,164,148,129,31,165,148,24,120,165,148,175,208,165,148,73,41,166,148,228,129,166,148,128,218,166,148,31,51,167,148,191,139,167,148,96,228,167,148,3,61,168,148,168,149,168,148,79,238,168,148,247,70,169,148,161,159,169,148,76,248,169,148,250,80,170,148,168,169,170,148,89,2,171,148,11,91,171,148,191,179,171,148,116,12,172,148,43,101,172,148,228,189,172,148,158,22,173,148,90,111,173,148,24,200,173,148,215,32,174,148,152,121,174,148,90,210,174,148,30,43,175,148,228,131,175,148,172,220,175,148,117,53,176,148,64,142,176,148,12,231,176,148,218,63,177,148,170,152,177,148,123,241,177,148,78,74,178,148,34,163,178,148,249,251,178,148,209,84,179,148,170,173,179,148,133,6,180,148,98,95,180,148,64,184,180,148,32,17,181,148,2,106,181,148,230,194,181,148,203,27,182,148,177,116,182,148,153,205,182,148,131,38,183,148,111,127,183,148,92,216,183,148,75,49,184,148,59,138,184,148,45,227,184,148,33,60,185,148,22,149,185,148,13,238,185,148,6,71,186,148,0,160,186,148,252,248,186,148,250,81,187,148,249,170,187,148,250,3,188,148,252,92,188,148,0,182,188,148,6,15,189,148,13,104,189,148,22,193,189,148,33,26,190,148,45,115,190,148,59,204,190,148,74,37,191,148,91,126,191,148,110,215,191,148,131,48,192,148,153,137,192,148,176,226,192,148,202,59,193,148,228,148,193,148,1,238,193,148,31,71,194,148,63,160,194,148,96,249,194,148,131,82,195,148,168,171,195,148,206,4,196,148,246,93,196,148,32,183,196,148,75,16,197,148,120,105,197,148,167,194,197,148,215,27,198,148,8,117,198,148,60,206,198,148,113,39,199,148,167,128,199,148,223,217,199,148,25,51,200,148,85,140,200,148,146,229,200,148,209,62,201,148,17,152,201,148,83,241,201,148,151,74,202,148,220,163,202,148,35,253,202,148,107,86,203,148,181,175,203,148,1,9,204,148,78,98,204,148,157,187,204,148,238,20,205,148,64,110,205,148,148,199,205,148,233,32,206,148,64,122,206,148,153,211,206,148,243,44,207,148,79,134,207,148,173,223,207,148,12,57,208,148,109,146,208,148,207,235,208,148,51,69,209,148,153,158,209,148,0,248,209,148,105,81,210,148,212,170,210,148,64,4,211,148,174,93,211,148,29,183,211,148,142,16,212,148,1,106,212,148,117,195,212,148,235,28,213,148,98,118,213,148,219,207,213,148,86,41,214,148,210,130,214,148,80,220,214,148,208,53,215,148,81,143,215,148,212,232,215,148,88,66,216,148,222,155,216,148,102,245,216,148,239,78,217,148,122,168,217,148,7,2,218,148,149,91,218,148], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+10240);
/* memory initializer */ allocate([36,181,218,148,182,14,219,148,73,104,219,148,221,193,219,148,115,27,220,148,11,117,220,148,165,206,220,148,64,40,221,148,220,129,221,148,122,219,221,148,26,53,222,148,188,142,222,148,95,232,222,148,3,66,223,148,170,155,223,148,82,245,223,148,251,78,224,148,166,168,224,148,83,2,225,148,1,92,225,148,177,181,225,148,99,15,226,148,22,105,226,148,203,194,226,148,129,28,227,148,57,118,227,148,243,207,227,148,174,41,228,148,107,131,228,148,41,221,228,148,233,54,229,148,171,144,229,148,110,234,229,148,51,68,230,148,249,157,230,148,193,247,230,148,139,81,231,148,86,171,231,148,35,5,232,148,242,94,232,148,194,184,232,148,147,18,233,148,103,108,233,148,59,198,233,148,18,32,234,148,234,121,234,148,196,211,234,148,159,45,235,148,124,135,235,148,91,225,235,148,59,59,236,148,28,149,236,148,0,239,236,148,229,72,237,148,203,162,237,148,179,252,237,148,157,86,238,148,136,176,238,148,117,10,239,148,100,100,239,148,84,190,239,148,70,24,240,148,57,114,240,148,46,204,240,148,36,38,241,148,29,128,241,148,22,218,241,148,18,52,242,148,15,142,242,148,13,232,242,148,13,66,243,148,15,156,243,148,18,246,243,148,23,80,244,148,30,170,244,148,38,4,245,148,48,94,245,148,59,184,245,148,72,18,246,148,86,108,246,148,102,198,246,148,120,32,247,148,139,122,247,148,160,212,247,148,183,46,248,148,207,136,248,148,233,226,248,148,4,61,249,148,33,151,249,148,63,241,249,148,95,75,250,148,129,165,250,148,164,255,250,148,201,89,251,148,239,179,251,148,23,14,252,148,65,104,252,148,108,194,252,148,153,28,253,148,199,118,253,148,247,208,253,148,41,43,254,148,92,133,254,148,145,223,254,148,199,57,255,148,255,147,255,148,56,238,255,148,116,72,0,149,176,162,0,149,239,252,0,149,46,87,1,149,112,177,1,149,179,11,2,149,248,101,2,149,62,192,2,149,134,26,3,149,207,116,3,149,26,207,3,149,103,41,4,149,181,131,4,149,5,222,4,149,86,56,5,149,169,146,5,149,253,236,5,149,84,71,6,149,171,161,6,149,4,252,6,149,95,86,7,149,188,176,7,149,26,11,8,149,121,101,8,149,219,191,8,149,61,26,9,149,162,116,9,149,8,207,9,149,111,41,10,149,216,131,10,149,67,222,10,149,175,56,11,149,29,147,11,149,141,237,11,149,254,71,12,149,113,162,12,149,229,252,12,149,91,87,13,149,210,177,13,149,75,12,14,149,197,102,14,149,65,193,14,149,191,27,15,149,62,118,15,149,191,208,15,149,66,43,16,149,198,133,16,149,75,224,16,149,211,58,17,149,91,149,17,149,230,239,17,149,114,74,18,149,255,164,18,149,142,255,18,149,31,90,19,149,177,180,19,149,69,15,20,149,218,105,20,149,113,196,20,149,10,31,21,149,164,121,21,149,64,212,21,149,221,46,22,149,124,137,22,149,28,228,22,149,190,62,23,149,98,153,23,149,7,244,23,149,174,78,24,149,86,169,24,149,0,4,25,149,171,94,25,149,88,185,25,149,7,20,26,149,183,110,26,149,105,201,26,149,28,36,27,149,209,126,27,149,135,217,27,149,64,52,28,149,249,142,28,149,180,233,28,149,113,68,29,149,47,159,29,149,239,249,29,149,177,84,30,149,116,175,30,149,56,10,31,149,255,100,31,149,198,191,31,149,144,26,32,149,91,117,32,149,39,208,32,149,245,42,33,149,197,133,33,149,150,224,33,149,105,59,34,149,61,150,34,149,19,241,34,149,234,75,35,149,195,166,35,149,158,1,36,149,122,92,36,149,88,183,36,149,55,18,37,149,24,109,37,149,251,199,37,149,223,34,38,149,196,125,38,149,171,216,38,149,148,51,39,149,126,142,39,149,106,233,39,149,87,68,40,149,70,159,40,149,55,250,40,149,41,85,41,149,29,176,41,149,18,11,42,149,9,102,42,149,1,193,42,149,251,27,43,149,247,118,43,149,244,209,43,149,242,44,44,149,242,135,44,149,244,226,44,149,247,61,45,149,252,152,45,149,3,244,45,149,11,79,46,149,20,170,46,149,31,5,47,149,44,96,47,149,58,187,47,149,74,22,48,149,91,113,48,149,110,204,48,149,131,39,49,149,153,130,49,149,176,221,49,149,202,56,50,149,228,147,50,149,1,239,50,149,30,74,51,149,62,165,51,149,95,0,52,149,129,91,52,149,165,182,52,149,203,17,53,149,242,108,53,149,27,200,53,149,69,35,54,149,113,126,54,149,159,217,54,149,206,52,55,149,254,143,55,149,48,235,55,149,100,70,56,149,153,161,56,149,208,252,56,149,8,88,57,149,66,179,57,149,125,14,58,149,186,105,58,149,249,196,58,149,57,32,59,149,123,123,59,149,190,214,59,149,3,50,60,149,73,141,60,149,145,232,60,149,218,67,61,149,37,159,61,149,114,250,61,149,192,85,62,149,15,177,62,149,97,12,63,149,179,103,63,149,8,195,63,149,94,30,64,149,181,121,64,149,14,213,64,149,104,48,65,149,196,139,65,149,34,231,65,149,129,66,66,149,226,157,66,149,68,249,66,149,168,84,67,149,13,176,67,149,116,11,68,149,221,102,68,149,71,194,68,149,178,29,69,149,31,121,69,149,142,212,69,149,254,47,70,149,112,139,70,149,227,230,70,149,88,66,71,149,206,157,71,149,70,249,71,149,192,84,72,149,59,176,72,149,183,11,73,149,53,103,73,149,181,194,73,149,54,30,74,149,185,121,74,149,61,213,74,149,195,48,75,149,75,140,75,149,212,231,75,149,94,67,76,149,234,158,76,149,120,250,76,149,7,86,77,149,151,177,77,149,42,13,78,149,189,104,78,149,83,196,78,149,233,31,79,149,130,123,79,149,28,215,79,149,183,50,80,149,84,142,80,149,243,233,80,149,147,69,81,149,52,161,81,149,216,252,81,149,124,88,82,149,35,180,82,149,202,15,83,149,116,107,83,149,31,199,83,149,203,34,84,149,121,126,84,149,41,218,84,149,218,53,85,149,140,145,85,149,64,237,85,149,246,72,86,149,173,164,86,149,102,0,87,149,32,92,87,149,220,183,87,149,153,19,88,149,88,111,88,149,25,203,88,149,219,38,89,149,158,130,89,149,99,222,89,149,42,58,90,149,242,149,90,149,187,241,90,149,135,77,91,149,83,169,91,149,34,5,92,149,241,96,92,149,195,188,92,149,150,24,93,149,106,116,93,149,64,208,93,149,23,44,94,149,240,135,94,149,203,227,94,149,167,63,95,149,133,155,95,149,100,247,95,149,68,83,96,149,39,175,96,149,10,11,97,149,240,102,97,149,215,194,97,149,191,30,98,149,169,122,98,149,148,214,98,149,129,50,99,149,112,142,99,149,96,234,99,149,81,70,100,149,68,162,100,149,57,254,100,149,47,90,101,149,39,182,101,149,32,18,102,149,26,110,102,149,23,202,102,149,20,38,103,149,20,130,103,149,21,222,103,149,23,58,104,149,27,150,104,149,32,242,104,149,39,78,105,149,48,170,105,149,58,6,106,149,69,98,106,149,82,190,106,149,97,26,107,149,113,118,107,149,131,210,107,149,150,46,108,149,171,138,108,149,193,230,108,149,217,66,109,149,242,158,109,149,13,251,109,149,41,87,110,149,71,179,110,149,102,15,111,149,135,107,111,149,170,199,111,149,205,35,112,149,243,127,112,149,26,220,112,149,67,56,113,149,109,148,113,149,152,240,113,149,197,76,114,149,244,168,114,149,36,5,115,149,86,97,115,149,137,189,115,149,190,25,116,149,244,117,116,149,44,210,116,149,101,46,117,149,160,138,117,149,220,230,117,149,26,67,118,149,89,159,118,149,154,251,118,149,221,87,119,149,33,180,119,149,102,16,120,149,173,108,120,149,245,200,120,149,63,37,121,149,139,129,121,149,216,221,121,149,39,58,122,149,119,150,122,149,200,242,122,149,28,79,123,149,112,171,123,149,198,7,124,149,30,100,124,149,119,192,124,149,210,28,125,149,46,121,125,149,140,213,125,149,235,49,126,149,76,142,126,149,174,234,126,149,18,71,127,149,120,163,127,149,222,255,127,149,71,92,128,149,177,184,128,149,28,21,129,149,137,113,129,149,247,205,129,149,103,42,130,149,217,134,130,149,76,227,130,149,192,63,131,149,54,156,131,149,174,248,131,149,39,85,132,149,161,177,132,149,30,14,133,149,155,106,133,149,26,199,133,149,155,35,134,149,29,128,134,149,161,220,134,149,38,57,135,149,172,149,135,149,53,242,135,149,190,78,136,149,73,171,136,149,214,7,137,149,100,100,137,149,244,192,137,149,133,29,138,149,24,122,138,149,172,214,138,149,66,51,139,149,217,143,139,149,114,236,139,149,12,73,140,149,168,165,140,149,70,2,141,149,228,94,141,149,133,187,141,149,39,24,142,149,202,116,142,149,111,209,142,149,21,46,143,149,189,138,143,149,102,231,143,149,17,68,144,149,190,160,144,149,108,253,144,149,27,90,145,149,204,182,145,149,126,19,146,149,50,112,146,149,232,204,146,149,159,41,147,149,87,134,147,149,17,227,147,149,205,63,148,149,138,156,148,149,72,249,148,149,8,86,149,149,202,178,149,149,140,15,150,149,81,108,150,149,23,201,150,149,222,37,151,149,167,130,151,149,114,223,151,149,62,60,152,149,12,153,152,149,219,245,152,149,171,82,153,149,125,175,153,149,81,12,154,149,38,105,154,149,252,197,154,149,212,34,155,149,174,127,155,149,137,220,155,149,101,57,156,149,67,150,156,149,35,243,156,149,4,80,157,149,230,172,157,149,203,9,158,149,176,102,158,149,151,195,158,149,128,32,159,149,106,125,159,149,85,218,159,149,66,55,160,149,49,148,160,149,33,241,160,149,18,78,161,149,5,171,161,149,250,7,162,149,240,100,162,149,231,193,162,149,225,30,163,149,219,123,163,149,215,216,163,149,213,53,164,149,212,146,164,149,212,239,164,149,214,76,165,149,218,169,165,149,223,6,166,149,229,99,166,149,237,192,166,149,247,29,167,149,2,123,167,149,14,216,167,149,28,53,168,149,44,146,168,149,60,239,168,149,79,76,169,149,99,169,169,149,120,6,170,149,143,99,170,149,168,192,170,149,194,29,171,149,221,122,171,149,250,215,171,149,24,53,172,149,56,146,172,149,90,239,172,149,125,76,173,149,161,169,173,149,199,6,174,149,238,99,174,149,23,193,174,149,65,30,175,149,109,123,175,149,155,216,175,149,201,53,176,149,250,146,176,149,43,240,176,149,95,77,177,149,148,170,177,149,202,7,178,149,2,101,178,149,59,194,178,149,118,31,179,149,178,124,179,149,240,217,179,149,47,55,180,149,111,148,180,149,178,241,180,149,245,78,181,149,58,172,181,149,129,9,182,149,201,102,182,149,19,196,182,149,94,33,183,149,171,126,183,149,249,219,183,149,72,57,184,149,153,150,184,149,236,243,184,149,64,81,185,149,149,174,185,149,236,11,186,149,69,105,186,149,159,198,186,149,250,35,187,149,87,129,187,149,182,222,187,149,22,60,188,149,119,153,188,149,218,246,188,149,62,84,189,149,164,177,189,149,11,15,190,149,116,108,190,149,223,201,190,149,74,39,191,149,184,132,191,149,38,226,191,149,151,63,192,149,8,157,192,149,124,250,192,149,240,87,193,149,102,181,193,149,222,18,194,149,87,112,194,149,210,205,194,149,78,43,195,149,203,136,195,149,75,230,195,149,203,67,196,149,77,161,196,149,209,254,196,149,86,92,197,149,220,185,197,149,100,23,198,149,237,116,198,149,120,210,198,149,5,48,199,149,147,141,199,149,34,235,199,149,179,72,200,149,69,166,200,149,217,3,201,149,110,97,201,149,5,191,201,149,157,28,202,149,55,122,202,149,210,215,202,149,110,53,203,149,13,147,203,149,172,240,203,149,77,78,204,149,240,171,204,149,148,9,205,149,57,103,205,149,224,196,205,149,137,34,206,149,51,128,206,149,222,221,206,149,139,59,207,149,57,153,207,149,233,246,207,149,154,84,208,149,77,178,208,149,1,16,209,149,183,109,209,149,110,203,209,149,39,41,210,149,225,134,210,149,157,228,210,149,90,66,211,149,24,160,211,149,216,253,211,149,154,91,212,149,93,185,212,149,33,23,213,149,231,116,213,149,175,210,213,149,120,48,214,149,66,142,214,149,14,236,214,149,219,73,215,149,170,167,215,149,122,5,216,149,76,99,216,149,31,193,216,149,244,30,217,149,202,124,217,149,161,218,217,149,122,56,218,149,85,150,218,149,49,244,218,149,14,82,219,149,237,175,219,149,206,13,220,149,175,107,220,149,147,201,220,149,120,39,221,149,94,133,221,149,70,227,221,149,47,65,222,149,26,159,222,149,6,253,222,149,243,90,223,149,226,184,223,149,211,22,224,149,197,116,224,149,184,210,224,149,173,48,225,149,164,142,225,149,156,236,225,149,149,74,226,149,144,168,226,149,140,6,227,149,138,100,227,149,137,194,227,149,138,32,228,149,140,126,228,149,143,220,228,149,148,58,229,149,155,152,229,149,163,246,229,149,172,84,230,149,183,178,230,149,196,16,231,149,210,110,231,149,225,204,231,149,242,42,232,149,4,137,232,149,24,231,232,149,45,69,233,149,67,163,233,149,92,1,234,149,117,95,234,149,144,189,234,149,173,27,235,149,203,121,235,149,234,215,235,149,11,54,236,149,45,148,236,149,81,242,236,149,118,80,237,149,157,174,237,149,197,12,238,149,239,106,238,149,26,201,238,149,70,39,239,149,116,133,239,149,164,227,239,149,213,65,240,149,7,160,240,149,59,254,240,149,112,92,241,149,167,186,241,149,223,24,242,149,25,119,242,149,84,213,242,149,144,51,243,149,207,145,243,149,14,240,243,149,79,78,244,149,145,172,244,149,213,10,245,149,27,105,245,149,97,199,245,149,170,37,246,149,243,131,246,149,63,226,246,149,139,64,247,149,217,158,247,149,41,253,247,149,122,91,248,149,204,185,248,149,32,24,249,149,117,118,249,149,204,212,249,149,36,51,250,149,126,145,250,149,217,239,250,149,54,78,251,149,148,172,251,149,243,10,252,149,84,105,252,149,183,199,252,149,27,38,253,149,128,132,253,149,231,226,253,149,79,65,254,149,185,159,254,149,36,254,254,149,145,92,255,149,255,186,255,149,110,25,0,150,223,119,0,150,81,214,0,150,197,52,1,150,59,147,1,150,177,241,1,150,42,80,2,150,163,174,2,150,30,13,3,150,155,107,3,150,25,202,3,150,152,40,4,150,25,135,4,150,156,229,4,150,31,68,5,150,165,162,5,150,43,1,6,150,180,95,6,150,61,190,6,150,200,28,7,150,85,123,7,150,227,217,7,150,114,56,8,150,3,151,8,150,149,245,8,150,41,84,9,150,190,178,9,150,85,17,10,150,237,111,10,150,134,206,10,150,33,45,11,150,190,139,11,150,92,234,11,150,251,72,12,150,156,167,12,150,62,6,13,150,225,100,13,150,135,195,13,150,45,34,14,150,213,128,14,150,127,223,14,150,41,62,15,150,214,156,15,150,131,251,15,150,51,90,16,150,227,184,16,150,149,23,17,150,73,118,17,150,254,212,17,150,180,51,18,150,108,146,18,150,37,241,18,150,224,79,19,150,156,174,19,150,90,13,20,150,25,108,20,150,218,202,20,150,156,41,21,150,95,136,21,150,36,231,21,150,234,69,22,150,178,164,22,150,123,3,23,150,70,98,23,150,18,193,23,150,223,31,24,150,174,126,24,150,126,221,24,150,80,60,25,150,36,155,25,150,248,249,25,150,206,88,26,150,166,183,26,150,127,22,27,150,89,117,27,150,53,212,27,150,19,51,28,150,241,145,28,150,210,240,28,150,179,79,29,150,150,174,29,150,123,13,30,150,97,108,30,150,72,203,30,150,49,42,31,150,27,137,31,150,7,232,31,150,244,70,32,150,227,165,32,150,211,4,33,150,196,99,33,150,183,194,33,150,171,33,34,150,161,128,34,150,152,223,34,150,145,62,35,150,139,157,35,150,134,252,35,150,131,91,36,150,130,186,36,150,129,25,37,150,131,120,37,150,133,215,37,150,137,54,38,150,143,149,38,150,150,244,38,150,158,83,39,150,168,178,39,150,179,17,40,150,192,112,40,150,206,207,40,150,222,46,41,150,239,141,41,150,1,237,41,150,21,76,42,150,42,171,42,150,65,10,43,150,89,105,43,150,115,200,43,150,142,39,44,150,170,134,44,150,200,229,44,150,232,68,45,150,8,164,45,150,42,3,46,150,78,98,46,150,115,193,46,150,154,32,47,150,193,127,47,150,235,222,47,150,22,62,48,150,66,157,48,150,111,252,48,150,158,91,49,150,207,186,49,150,1,26,50,150,52,121,50,150,105,216,50,150,159,55,51,150,215,150,51,150,16,246,51,150,74,85,52,150,134,180,52,150,195,19,53,150,2,115,53,150,66,210,53,150,132,49,54,150,199,144,54,150,11,240,54,150,81,79,55,150,153,174,55,150,225,13,56,150,43,109,56,150,119,204,56,150,196,43,57,150,18,139,57,150,98,234,57,150,180,73,58,150,6,169,58,150,90,8,59,150,176,103,59,150,7,199,59,150,95,38,60,150,185,133,60,150,20,229,60,150,113,68,61,150,207,163,61,150,47,3,62,150,144,98,62,150,242,193,62,150,86,33,63,150,187,128,63,150,34,224,63,150,138,63,64,150,243,158,64,150,94,254,64,150,203,93,65,150,56,189,65,150,167,28,66,150,24,124,66,150,138,219,66,150,253,58,67,150,114,154,67,150,233,249,67,150,96,89,68,150,217,184,68,150,84,24,69,150,208,119,69,150,77,215,69,150,204,54,70,150,76,150,70,150,206,245,70,150,81,85,71,150,213,180,71,150,91,20,72,150,227,115,72,150,107,211,72,150,246,50,73,150,129,146,73,150,14,242,73,150,156,81,74,150,44,177,74,150,190,16,75,150,80,112,75,150,228,207,75,150,122,47,76,150,17,143,76,150,169,238,76,150,67,78,77,150,222,173,77,150,122,13,78,150,24,109,78,150,184,204,78,150,89,44,79,150,251,139,79,150,158,235,79,150,68,75,80,150,234,170,80,150,146,10,81,150,59,106,81,150,230,201,81,150,146,41,82,150,64,137,82,150,239,232,82,150,159,72,83,150,81,168,83,150,4,8,84,150,185,103,84,150,111,199,84,150,38,39,85,150,223,134,85,150,153,230,85,150,85,70,86,150,18,166,86,150,208,5,87,150,144,101,87,150,82,197,87,150,20,37,88,150,217,132,88,150,158,228,88,150,101,68,89,150,46,164,89,150,247,3,90,150,195,99,90,150,143,195,90,150,93,35,91,150,45,131,91,150,254,226,91,150,208,66,92,150,163,162,92,150,121,2,93,150,79,98,93,150,39,194,93,150,0,34,94,150,219,129,94,150,183,225,94,150,149,65,95,150,116,161,95,150,84,1,96,150,54,97,96,150,25,193,96,150,253,32,97,150,227,128,97,150,203,224,97,150,180,64,98,150,158,160,98,150,137,0,99,150,119,96,99,150,101,192,99,150,85,32,100,150,70,128,100,150,57,224,100,150,45,64,101,150,34,160,101,150,25,0,102,150,17,96,102,150,11,192,102,150,6,32,103,150,3,128,103,150,0,224,103,150,0,64,104,150,0,160,104,150,3,0,105,150,6,96,105,150,11,192,105,150,17,32,106,150,25,128,106,150,34,224,106,150,45,64,107,150,57,160,107,150,70,0,108,150,85,96,108,150,101,192,108,150,118,32,109,150,137,128,109,150,158,224,109,150,179,64,110,150,203,160,110,150,227,0,111,150,253,96,111,150,24,193,111,150,53,33,112,150,83,129,112,150,115,225,112,150,148,65,113,150,182,161,113,150,218,1,114,150,255,97,114,150,38,194,114,150,78,34,115,150,119,130,115,150,162,226,115,150,206,66,116,150,252,162,116,150,43,3,117,150,91,99,117,150,141,195,117,150,192,35,118,150,244,131,118,150,42,228,118,150,98,68,119,150,155,164,119,150,213,4,120,150,16,101,120,150,77,197,120,150,140,37,121,150,203,133,121,150,12,230,121,150,79,70,122,150,147,166,122,150,216,6,123,150,31,103,123,150,103,199,123,150,177,39,124,150,252,135,124,150,72,232,124,150,150,72,125,150,229,168,125,150,53,9,126,150,135,105,126,150,218,201,126,150,47,42,127,150,133,138,127,150,221,234,127,150,54,75,128,150,144,171,128,150,235,11,129,150,73,108,129,150,167,204,129,150,7,45,130,150,104,141,130,150,203,237,130,150,47,78,131,150,148,174,131,150,251,14,132,150,99,111,132,150,205,207,132,150,56,48,133,150,164,144,133,150,18,241,133,150,129,81,134,150,242,177,134,150,100,18,135,150,215,114,135,150,76,211,135,150,194,51,136,150,57,148,136,150,178,244,136,150,44,85,137,150,168,181,137,150,37,22,138,150,164,118,138,150,36,215,138,150,165,55,139,150,39,152,139,150,172,248,139,150,49,89,140,150,184,185,140,150,64,26,141,150,202,122,141,150,84,219,141,150,225,59,142,150,111,156,142,150,254,252,142,150,142,93,143,150,32,190,143,150,180,30,144,150,72,127,144,150,222,223,144,150,118,64,145,150,15,161,145,150,169,1,146,150,69,98,146,150,226,194,146,150,128,35,147,150,32,132,147,150,193,228,147,150,99,69,148,150,7,166,148,150,173,6,149,150,83,103,149,150,252,199,149,150,165,40,150,150,80,137,150,150,252,233,150,150,170,74,151,150,89,171,151,150,9,12,152,150,187,108,152,150,110,205,152,150,35,46,153,150,217,142,153,150,144,239,153,150,73,80,154,150,3,177,154,150,191,17,155,150,123,114,155,150,58,211,155,150,249,51,156,150,186,148,156,150,125,245,156,150,65,86,157,150,6,183,157,150,204,23,158,150,148,120,158,150,94,217,158,150,40,58,159,150,244,154,159,150,194,251,159,150,145,92,160,150,97,189,160,150,50,30,161,150,5,127,161,150,218,223,161,150,176,64,162,150,135,161,162,150,95,2,163,150,57,99,163,150,20,196,163,150,241,36,164,150,207,133,164,150,174,230,164,150,143,71,165,150,113,168,165,150,85,9,166,150,58,106,166,150,32,203,166,150,8,44,167,150,241,140,167,150,219,237,167,150,199,78,168,150,180,175,168,150,163,16,169,150,147,113,169,150,132,210,169,150,119,51,170,150,107,148,170,150,97,245,170,150,87,86,171,150,80,183,171,150,73,24,172,150,68,121,172,150,65,218,172,150,62,59,173,150,61,156,173,150,62,253,173,150,64,94,174,150,67,191,174,150,71,32,175,150,77,129,175,150,85,226,175,150,94,67,176,150,104,164,176,150,115,5,177,150,128,102,177,150,142,199,177,150,158,40,178,150,175,137,178,150,193,234,178,150,213,75,179,150,234,172,179,150,0,14,180,150,24,111,180,150,49,208,180,150,76,49,181,150,104,146,181,150,133,243,181,150,164,84,182,150,196,181,182,150,230,22,183,150,8,120,183,150,45,217,183,150,82,58,184,150,121,155,184,150,161,252,184,150,203,93,185,150,246,190,185,150,35,32,186,150,80,129,186,150,128,226,186,150,176,67,187,150,226,164,187,150,21,6,188,150,74,103,188,150,128,200,188,150,183,41,189,150,240,138,189,150,42,236,189,150,102,77,190,150,163,174,190,150,225,15,191,150,32,113,191,150,97,210,191,150,164,51,192,150,231,148,192,150,44,246,192,150,115,87,193,150,187,184,193,150,4,26,194,150,78,123,194,150,154,220,194,150,232,61,195,150,54,159,195,150,134,0,196,150,216,97,196,150,42,195,196,150,127,36,197,150,212,133,197,150,43,231,197,150,131,72,198,150,221,169,198,150,56,11,199,150,148,108,199,150,242,205,199,150,81,47,200,150,177,144,200,150,19,242,200,150,118,83,201,150,218,180,201,150,64,22,202,150,168,119,202,150,16,217,202,150,122,58,203,150,229,155,203,150,82,253,203,150,192,94,204,150,48,192,204,150,160,33,205,150,19,131,205,150,134,228,205,150,251,69,206,150,113,167,206,150,233,8,207,150,98,106,207,150,220,203,207,150,88,45,208,150,213,142,208,150,83,240,208,150,211,81,209,150,84,179,209,150,215,20,210,150,90,118,210,150,224,215,210,150,102,57,211,150,238,154,211,150,119,252,211,150,2,94,212,150,142,191,212,150,28,33,213,150,170,130,213,150,58,228,213,150,204,69,214,150,95,167,214,150,243,8,215,150,136,106,215,150,31,204,215,150,184,45,216,150,81,143,216,150,236,240,216,150,136,82,217,150,38,180,217,150,197,21,218,150,102,119,218,150,7,217,218,150,170,58,219,150,79,156,219,150,245,253,219,150,156,95,220,150,69,193,220,150,238,34,221,150,154,132,221,150,70,230,221,150,244,71,222,150,164,169,222,150,84,11,223,150,6,109,223,150,186,206,223,150,111,48,224,150,37,146,224,150,220,243,224,150,149,85,225,150,79,183,225,150,11,25,226,150,200,122,226,150,134,220,226,150,70,62,227,150,7,160,227,150,201,1,228,150,141,99,228,150,82,197,228,150,24,39,229,150,224,136,229,150,169,234,229,150,115,76,230,150,63,174,230,150,12,16,231,150,219,113,231,150,171,211,231,150,124,53,232,150,78,151,232,150,34,249,232,150,248,90,233,150,206,188,233,150,166,30,234,150,127,128,234,150,90,226,234,150,54,68,235,150,20,166,235,150,242,7,236,150,210,105,236,150,180,203,236,150,151,45,237,150,123,143,237,150,96,241,237,150,71,83,238,150,47,181,238,150,25,23,239,150,4,121,239,150,240,218,239,150,222,60,240,150,204,158,240,150,189,0,241,150,174,98,241,150,161,196,241,150,150,38,242,150,139,136,242,150,130,234,242,150,123,76,243,150,117,174,243,150,112,16,244,150,108,114,244,150,106,212,244,150,105,54,245,150,105,152,245,150,107,250,245,150,110,92,246,150,115,190,246,150,121,32,247,150,128,130,247,150,137,228,247,150,147,70,248,150,158,168,248,150,170,10,249,150,184,108,249,150,200,206,249,150,216,48,250,150,234,146,250,150,254,244,250,150,18,87,251,150,40,185,251,150,64,27,252,150,88,125,252,150,114,223,252,150,142,65,253,150,171,163,253,150,201,5,254,150,232,103,254,150,9,202,254,150,43,44,255,150,79,142,255,150,115,240,255,150,154,82,0,151,193,180,0,151,234,22,1,151,20,121,1,151,64,219,1,151,108,61,2,151,155,159,2,151,202,1,3,151,251,99,3,151,45,198,3,151,97,40,4,151,150,138,4,151,204,236,4,151,4,79,5,151,61,177,5,151,119,19,6,151,179,117,6,151,240,215,6,151,46,58,7,151,110,156,7,151,175,254,7,151,241,96,8,151,53,195,8,151,122,37,9,151,192,135,9,151,8,234,9,151,81,76,10,151,155,174,10,151,231,16,11,151,52,115,11,151,131,213,11,151,210,55,12,151,35,154,12,151,118,252,12,151,202,94,13,151,31,193,13,151,117,35,14,151,205,133,14,151,38,232,14,151,128,74,15,151,220,172,15,151,57,15,16,151,152,113,16,151,248,211,16,151,89,54,17,151,187,152,17,151,31,251,17,151,132,93,18,151,235,191,18,151,83,34,19,151,188,132,19,151,38,231,19,151,146,73,20,151,255,171,20,151,110,14,21,151,222,112,21,151,79,211,21,151,193,53,22,151,53,152,22,151,170,250,22,151,33,93,23,151,153,191,23,151,18,34,24,151,141,132,24,151,9,231,24,151,134,73,25,151,4,172,25,151,132,14,26,151,5,113,26,151,136,211,26,151,12,54,27,151,145,152,27,151,24,251,27,151,159,93,28,151,41,192,28,151,179,34,29,151,63,133,29,151,204,231,29,151,91,74,30,151,235,172,30,151,124,15,31,151,14,114,31,151,162,212,31,151,55,55,32,151,206,153,32,151,102,252,32,151,255,94,33,151,154,193,33,151,54,36,34,151,211,134,34,151,113,233,34,151,17,76,35,151,178,174,35,151,85,17,36,151,249,115,36,151,158,214,36,151,68,57,37,151,236,155,37,151,149,254,37,151,64,97,38,151,236,195,38,151,153,38,39,151,71,137,39,151,247,235,39,151,168,78,40,151,91,177,40,151,15,20,41,151,196,118,41,151,122,217,41,151,50,60,42,151,235,158,42,151,166,1,43,151,97,100,43,151,30,199,43,151,221,41,44,151,157,140,44,151,94,239,44,151,32,82,45,151,228,180,45,151,169,23,46,151,111,122,46,151,55,221,46,151,0,64,47,151,202,162,47,151,150,5,48,151,99,104,48,151,50,203,48,151,1,46,49,151,210,144,49,151,165,243,49,151,120,86,50,151,77,185,50,151,35,28,51,151,251,126,51,151,212,225,51,151,174,68,52,151,138,167,52,151,103,10,53,151,69,109,53,151,37,208,53,151,6,51,54,151,232,149,54,151,203,248,54,151,176,91,55,151,150,190,55,151,126,33,56,151,103,132,56,151,81,231,56,151,61,74,57,151,41,173,57,151,23,16,58,151,7,115,58,151,248,213,58,151,234,56,59,151,221,155,59,151,210,254,59,151,200,97,60,151,191,196,60,151,184,39,61,151,178,138,61,151,174,237,61,151,170,80,62,151,168,179,62,151,168,22,63,151,168,121,63,151,170,220,63,151,173,63,64,151,178,162,64,151,184,5,65,151,191,104,65,151,200,203,65,151,210,46,66,151,221,145,66,151,233,244,66,151,247,87,67,151,6,187,67,151,23,30,68,151,41,129,68,151,60,228,68,151,80,71,69,151,102,170,69,151,125,13,70,151,149,112,70,151,175,211,70,151,202,54,71,151,231,153,71,151,4,253,71,151,35,96,72,151,68,195,72,151,101,38,73,151,136,137,73,151,172,236,73,151,210,79,74,151,249,178,74,151,33,22,75,151,75,121,75,151,117,220,75,151,161,63,76,151,207,162,76,151,254,5,77,151,46,105,77,151,95,204,77,151,146,47,78,151,198,146,78,151,251,245,78,151,50,89,79,151,106,188,79,151,163,31,80,151,222,130,80,151,26,230,80,151,87,73,81,151,150,172,81,151,214,15,82,151,23,115,82,151,89,214,82,151,157,57,83,151,226,156,83,151,41,0,84,151,113,99,84,151,186,198,84,151,4,42,85,151,80,141,85,151,157,240,85,151,235,83,86,151,59,183,86,151,140,26,87,151,222,125,87,151,49,225,87,151,134,68,88,151,221,167,88,151,52,11,89,151,141,110,89,151,231,209,89,151,66,53,90,151,159,152,90,151,253,251,90,151,93,95,91,151,189,194,91,151,31,38,92,151,131,137,92,151,231,236,92,151,77,80,93,151,181,179,93,151,29,23,94,151,135,122,94,151,242,221,94,151,95,65,95,151,204,164,95,151,59,8,96,151,172,107,96,151,30,207,96,151,145,50,97,151,5,150,97,151,123,249,97,151,242,92,98,151,106,192,98,151,227,35,99,151,94,135,99,151,219,234,99,151,88,78,100,151,215,177,100,151,87,21,101,151,216,120,101,151,91,220,101,151,223,63,102,151,100,163,102,151,235,6,103,151,115,106,103,151,252,205,103,151,135,49,104,151,19,149,104,151,160,248,104,151,46,92,105,151,190,191,105,151,79,35,106,151,226,134,106,151,117,234,106,151,10,78,107,151,161,177,107,151,56,21,108,151,209,120,108,151,108,220,108,151,7,64,109,151,164,163,109,151,66,7,110,151,226,106,110,151,130,206,110,151,36,50,111,151,200,149,111,151,108,249,111,151,18,93,112,151,186,192,112,151,98,36,113,151,12,136,113,151,183,235,113,151,100,79,114,151,18,179,114,151,193,22,115,151,113,122,115,151,35,222,115,151,214,65,116,151,138,165,116,151,64,9,117,151,247,108,117,151,175,208,117,151,104,52,118,151,35,152,118,151,223,251,118,151,157,95,119,151,92,195,119,151,28,39,120,151,221,138,120,151,159,238,120,151,99,82,121,151,41,182,121,151,239,25,122,151,183,125,122,151,128,225,122,151,75,69,123,151,22,169,123,151,227,12,124,151,178,112,124,151,129,212,124,151,82,56,125,151,36,156,125,151,248,255,125,151,205,99,126,151,163,199,126,151,122,43,127,151,83,143,127,151,45,243,127,151,8,87,128,151,229,186,128,151,195,30,129,151,162,130,129,151,131,230,129,151,100,74,130,151,71,174,130,151,44,18,131,151,18,118,131,151,249,217,131,151,225,61,132,151,202,161,132,151,181,5,133,151,162,105,133,151,143,205,133,151,126,49,134,151,110,149,134,151,95,249,134,151,82,93,135,151,70,193,135,151,59,37,136,151,50,137,136,151,42,237,136,151,35,81,137,151,29,181,137,151,25,25,138,151,22,125,138,151,20,225,138,151,20,69,139,151,21,169,139,151,23,13,140,151,26,113,140,151,31,213,140,151,37,57,141,151,45,157,141,151,53,1,142,151,63,101,142,151,75,201,142,151,87,45,143,151,101,145,143,151,116,245,143,151,133,89,144,151,150,189,144,151,169,33,145,151,190,133,145,151,211,233,145,151,234,77,146,151,2,178,146,151,28,22,147,151,55,122,147,151,83,222,147,151,112,66,148,151,143,166,148,151,175,10,149,151,208,110,149,151,242,210,149,151,22,55,150,151,59,155,150,151,98,255,150,151,137,99,151,151,178,199,151,151,221,43,152,151,8,144,152,151,53,244,152,151,99,88,153,151,146,188,153,151,195,32,154,151,245,132,154,151,41,233,154,151,93,77,155,151,147,177,155,151,202,21,156,151,3,122,156,151,60,222,156,151,119,66,157,151,180,166,157,151,241,10,158,151,48,111,158,151,112,211,158,151,178,55,159,151,245,155,159,151,57,0,160,151,126,100,160,151,197,200,160,151,12,45,161,151,86,145,161,151,160,245,161,151,236,89,162,151,57,190,162,151,135,34,163,151,215,134,163,151,40,235,163,151,122,79,164,151,206,179,164,151,34,24,165,151,120,124,165,151,208,224,165,151,40,69,166,151,130,169,166,151,221,13,167,151,58,114,167,151,152,214,167,151,247,58,168,151,87,159,168,151,185,3,169,151,28,104,169,151,128,204,169,151,229,48,170,151,76,149,170,151,180,249,170,151,30,94,171,151,136,194,171,151,244,38,172,151,97,139,172,151,208,239,172,151,63,84,173,151,176,184,173,151,35,29,174,151,150,129,174,151,11,230,174,151,129,74,175,151,249,174,175,151,114,19,176,151,236,119,176,151,103,220,176,151,228,64,177,151,97,165,177,151,225,9,178,151,97,110,178,151,227,210,178,151,102,55,179,151,234,155,179,151,111,0,180,151,246,100,180,151,126,201,180,151,8,46,181,151,146,146,181,151,30,247,181,151,172,91,182,151,58,192,182,151,202,36,183,151,91,137,183,151,237,237,183,151,129,82,184,151,22,183,184,151,172,27,185,151,68,128,185,151,220,228,185,151,118,73,186,151,18,174,186,151,174,18,187,151,76,119,187,151,235,219,187,151,140,64,188,151,45,165,188,151,208,9,189,151,117,110,189,151,26,211,189,151,193,55,190,151,105,156,190,151,19,1,191,151,189,101,191,151,105,202,191,151,22,47,192,151,197,147,192,151,117,248,192,151,38,93,193,151,216,193,193,151,139,38,194,151,64,139,194,151,246,239,194,151,174,84,195,151,103,185,195,151,33,30,196,151,220,130,196,151,152,231,196,151,86,76,197,151,21,177,197,151,214,21,198,151,151,122,198,151,90,223,198,151,30,68,199,151,228,168,199,151,170,13,200,151,114,114,200,151,60,215,200,151,6,60,201,151,210,160,201,151,159,5,202,151,109,106,202,151,61,207,202,151,14,52,203,151,224,152,203,151,180,253,203,151,136,98,204,151,94,199,204,151,54,44,205,151,14,145,205,151,232,245,205,151,195,90,206,151,160,191,206,151,125,36,207,151,92,137,207,151,60,238,207,151,30,83,208,151,1,184,208,151,229,28,209,151,202,129,209,151,176,230,209,151,152,75,210,151,129,176,210,151,108,21,211,151,87,122,211,151,68,223,211,151,50,68,212,151,34,169,212,151,19,14,213,151,5,115,213,151,248,215,213,151,236,60,214,151,226,161,214,151,217,6,215,151,210,107,215,151,203,208,215,151,198,53,216,151,194,154,216,151,192,255,216,151,190,100,217,151,190,201,217,151,191,46,218,151,194,147,218,151,198,248,218,151,203,93,219,151,209,194,219,151,217,39,220,151,225,140,220,151,236,241,220,151,247,86,221,151,4,188,221,151,17,33,222,151,33,134,222,151,49,235,222,151,67,80,223,151,86,181,223,151,106,26,224,151,128,127,224,151,150,228,224,151,174,73,225,151,200,174,225,151,226,19,226,151,254,120,226,151,27,222,226,151,58,67,227,151,89,168,227,151,122,13,228,151,156,114,228,151,192,215,228,151,228,60,229,151,10,162,229,151,50,7,230,151,90,108,230,151,132,209,230,151,175,54,231,151,219,155,231,151,9,1,232,151,56,102,232,151,104,203,232,151,153,48,233,151,204,149,233,151,0,251,233,151,53,96,234,151,107,197,234,151,163,42,235,151,220,143,235,151,22,245,235,151,81,90,236,151,142,191,236,151,204,36,237,151,11,138,237,151,76,239,237,151,142,84,238,151,209,185,238,151,21,31,239,151,91,132,239,151,161,233,239,151,233,78,240,151,51,180,240,151,125,25,241,151,201,126,241,151,22,228,241,151,101,73,242,151,181,174,242,151,5,20,243,151,88,121,243,151,171,222,243,151,0,68,244,151,86,169,244,151,173,14,245,151,5,116,245,151,95,217,245,151,186,62,246,151,22,164,246,151,116,9,247,151,211,110,247,151,51,212,247,151,148,57,248,151,247,158,248,151,90,4,249,151,192,105,249,151,38,207,249,151,142,52,250,151,246,153,250,151,96,255,250,151,204,100,251,151,56,202,251,151,166,47,252,151,22,149,252,151,134,250,252,151,248,95,253,151,107,197,253,151,223,42,254,151,84,144,254,151,203,245,254,151,67,91,255,151,188,192,255,151,27,19,0,156,217,69,0,156,151,120,0,156,87,171,0,156,22,222,0,156,215,16,1,156,152,67,1,156,89,118,1,156,28,169,1,156,223,219,1,156,162,14,2,156,102,65,2,156,43,116,2,156,240,166,2,156,182,217,2,156,125,12,3,156,68,63,3,156,12,114,3,156,213,164,3,156,158,215,3,156,104,10,4,156,50,61,4,156,253,111,4,156,201,162,4,156,149,213,4,156,98,8,5,156,48,59,5,156,254,109,5,156,205,160,5,156,156,211,5,156,108,6,6,156,61,57,6,156,14,108,6,156,224,158,6,156,179,209,6,156,134,4,7,156,90,55,7,156,46,106,7,156,3,157,7,156,217,207,7,156,175,2,8,156,134,53,8,156,94,104,8,156,54,155,8,156,15,206,8,156,232,0,9,156,194,51,9,156,157,102,9,156,120,153,9,156,84,204,9,156,49,255,9,156,14,50,10,156,236,100,10,156,203,151,10,156,170,202,10,156,137,253,10,156,106,48,11,156,75,99,11,156,44,150,11,156,14,201,11,156,241,251,11,156,213,46,12,156,185,97,12,156,158,148,12,156,131,199,12,156,105,250,12,156,79,45,13,156,55,96,13,156,30,147,13,156,7,198,13,156,240,248,13,156,218,43,14,156,196,94,14,156,175,145,14,156,155,196,14,156,135,247,14,156,116,42,15,156,97,93,15,156,79,144,15,156,62,195,15,156,45,246,15,156,29,41,16,156,14,92,16,156,255,142,16,156,241,193,16,156,227,244,16,156,214,39,17,156,202,90,17,156,190,141,17,156,179,192,17,156,169,243,17,156,159,38,18,156,150,89,18,156,141,140,18,156,133,191,18,156,126,242,18,156,119,37,19,156,113,88,19,156,108,139,19,156,103,190,19,156,99,241,19,156,95,36,20,156,92,87,20,156,90,138,20,156,88,189,20,156,87,240,20,156,86,35,21,156,87,86,21,156,87,137,21,156,89,188,21,156,91,239,21,156,93,34,22,156,97,85,22,156,100,136,22,156,105,187,22,156,110,238,22,156,116,33,23,156,122,84,23,156,129,135,23,156,137,186,23,156,145,237,23,156,154,32,24,156,163,83,24,156,173,134,24,156,184,185,24,156,195,236,24,156,207,31,25,156,220,82,25,156,233,133,25,156,247,184,25,156,5,236,25,156,21,31,26,156,36,82,26,156,52,133,26,156,69,184,26,156,87,235,26,156,105,30,27,156,124,81,27,156,143,132,27,156,163,183,27,156,184,234,27,156,205,29,28,156,227,80,28,156,250,131,28,156,17,183,28,156,40,234,28,156,65,29,29,156,90,80,29,156,115,131,29,156,142,182,29,156,168,233,29,156,196,28,30,156,224,79,30,156,253,130,30,156,26,182,30,156,56,233,30,156,87,28,31,156,118,79,31,156,150,130,31,156,182,181,31,156,215,232,31,156,249,27,32,156,27,79,32,156,62,130,32,156,97,181,32,156,133,232,32,156,170,27,33,156,208,78,33,156,246,129,33,156,28,181,33,156,67,232,33,156,107,27,34,156,148,78,34,156,189,129,34,156,230,180,34,156,17,232,34,156,60,27,35,156,103,78,35,156,147,129,35,156,192,180,35,156,238,231,35,156,28,27,36,156,74,78,36,156,121,129,36,156,169,180,36,156,218,231,36,156,11,27,37,156,61,78,37,156,111,129,37,156,162,180,37,156,214,231,37,156,10,27,38,156,63,78,38,156,116,129,38,156,170,180,38,156,225,231,38,156,24,27,39,156,80,78,39,156,136,129,39,156,194,180,39,156,251,231,39,156,54,27,40,156,113,78,40,156,172,129,40,156,232,180,40,156,37,232,40,156,99,27,41,156,161,78,41,156,223,129,41,156,31,181,41,156,95,232,41,156,159,27,42,156,224,78,42,156,34,130,42,156,100,181,42,156,167,232,42,156,235,27,43,156,47,79,43,156,116,130,43,156,186,181,43,156,0,233,43,156,70,28,44,156,142,79,44,156,214,130,44,156,30,182,44,156,103,233,44,156,177,28,45,156,251,79,45,156,70,131,45,156,146,182,45,156,222,233,45,156,43,29,46,156,120,80,46,156,198,131,46,156,21,183,46,156,100,234,46,156,180,29,47,156,5,81,47,156,86,132,47,156,168,183,47,156,250,234,47,156,77,30,48,156,161,81,48,156,245,132,48,156,74,184,48,156,159,235,48,156,245,30,49,156,76,82,49,156,163,133,49,156,251,184,49,156,84,236,49,156,173,31,50,156,6,83,50,156,97,134,50,156,188,185,50,156,23,237,50,156,116,32,51,156,208,83,51,156,46,135,51,156,140,186,51,156,234,237,51,156,74,33,52,156,170,84,52,156,10,136,52,156,107,187,52,156,205,238,52,156,47,34,53,156,146,85,53,156,246,136,53,156,90,188,53,156,191,239,53,156,36,35,54,156,138,86,54,156,241,137,54,156,88,189,54,156,192,240,54,156,40,36,55,156,145,87,55,156,251,138,55,156,101,190,55,156,208,241,55,156,60,37,56,156,168,88,56,156,20,140,56,156,130,191,56,156,240,242,56,156,94,38,57,156,205,89,57,156,61,141,57,156,174,192,57,156,31,244,57,156,144,39,58,156,2,91,58,156,117,142,58,156,233,193,58,156,93,245,58,156,210,40,59,156,71,92,59,156,189,143,59,156,51,195,59,156,170,246,59,156,34,42,60,156,154,93,60,156,19,145,60,156,141,196,60,156,7,248,60,156,130,43,61,156,253,94,61,156,121,146,61,156,246,197,61,156,115,249,61,156,241,44,62,156,112,96,62,156,239,147,62,156,110,199,62,156,239,250,62,156,111,46,63,156,241,97,63,156,115,149,63,156,246,200,63,156,121,252,63,156,253,47,64,156,130,99,64,156,7,151,64,156,141,202,64,156,19,254,64,156,154,49,65,156,34,101,65,156,170,152,65,156,51,204,65,156,188,255,65,156,70,51,66,156,209,102,66,156,92,154,66,156,232,205,66,156,116,1,67,156,1,53,67,156,143,104,67,156,29,156,67,156,172,207,67,156,60,3,68,156,204,54,68,156,93,106,68,156,238,157,68,156,128,209,68,156,19,5,69,156,166,56,69,156,57,108,69,156,206,159,69,156,99,211,69,156,248,6,70,156,143,58,70,156,37,110,70,156,189,161,70,156,85,213,70,156,238,8,71,156,135,60,71,156,33,112,71,156,187,163,71,156,86,215,71,156,242,10,72,156,142,62,72,156,43,114,72,156,201,165,72,156,103,217,72,156,5,13,73,156,165,64,73,156,69,116,73,156,229,167,73,156,134,219,73,156,40,15,74,156,202,66,74,156,109,118,74,156,17,170,74,156,181,221,74,156,90,17,75,156,255,68,75,156,165,120,75,156,76,172,75,156,243,223,75,156,155,19,76,156,67,71,76,156,236,122,76,156,150,174,76,156,64,226,76,156,235,21,77,156,151,73,77,156,67,125,77,156,239,176,77,156,157,228,77,156,75,24,78,156,249,75,78,156,168,127,78,156,88,179,78,156,8,231,78,156,185,26,79,156,107,78,79,156,29,130,79,156,207,181,79,156,131,233,79,156,55,29,80,156,235,80,80,156,160,132,80,156,86,184,80,156,13,236,80,156,196,31,81,156,123,83,81,156], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+20480);
/* memory initializer */ allocate([51,135,81,156,236,186,81,156,165,238,81,156,95,34,82,156,26,86,82,156,213,137,82,156,145,189,82,156,77,241,82,156,10,37,83,156,200,88,83,156,134,140,83,156,69,192,83,156,5,244,83,156,197,39,84,156,133,91,84,156,70,143,84,156,8,195,84,156,203,246,84,156,142,42,85,156,81,94,85,156,22,146,85,156,219,197,85,156,160,249,85,156,102,45,86,156,45,97,86,156,244,148,86,156,188,200,86,156,132,252,86,156,78,48,87,156,23,100,87,156,226,151,87,156,172,203,87,156,120,255,87,156,68,51,88,156,17,103,88,156,222,154,88,156,172,206,88,156,123,2,89,156,74,54,89,156,25,106,89,156,234,157,89,156,187,209,89,156,140,5,90,156,94,57,90,156,49,109,90,156,4,161,90,156,216,212,90,156,173,8,91,156,130,60,91,156,88,112,91,156,46,164,91,156,5,216,91,156,221,11,92,156,181,63,92,156,142,115,92,156,103,167,92,156,65,219,92,156,27,15,93,156,247,66,93,156,210,118,93,156,175,170,93,156,140,222,93,156,105,18,94,156,71,70,94,156,38,122,94,156,6,174,94,156,230,225,94,156,198,21,95,156,167,73,95,156,137,125,95,156,108,177,95,156,79,229,95,156,50,25,96,156,22,77,96,156,251,128,96,156,225,180,96,156,199,232,96,156,173,28,97,156,148,80,97,156,124,132,97,156,100,184,97,156,77,236,97,156,55,32,98,156,33,84,98,156,12,136,98,156,247,187,98,156,227,239,98,156,208,35,99,156,189,87,99,156,171,139,99,156,153,191,99,156,136,243,99,156,120,39,100,156,104,91,100,156,89,143,100,156,74,195,100,156,60,247,100,156,47,43,101,156,34,95,101,156,22,147,101,156,10,199,101,156,255,250,101,156,245,46,102,156,235,98,102,156,226,150,102,156,217,202,102,156,209,254,102,156,202,50,103,156,195,102,103,156,189,154,103,156,183,206,103,156,178,2,104,156,174,54,104,156,170,106,104,156,167,158,104,156,164,210,104,156,162,6,105,156,161,58,105,156,160,110,105,156,160,162,105,156,160,214,105,156,161,10,106,156,163,62,106,156,165,114,106,156,168,166,106,156,171,218,106,156,175,14,107,156,179,66,107,156,185,118,107,156,190,170,107,156,197,222,107,156,204,18,108,156,211,70,108,156,219,122,108,156,228,174,108,156,238,226,108,156,247,22,109,156,2,75,109,156,13,127,109,156,25,179,109,156,37,231,109,156,50,27,110,156,64,79,110,156,78,131,110,156,92,183,110,156,108,235,110,156,124,31,111,156,140,83,111,156,157,135,111,156,175,187,111,156,193,239,111,156,212,35,112,156,232,87,112,156,252,139,112,156,17,192,112,156,38,244,112,156,60,40,113,156,82,92,113,156,105,144,113,156,129,196,113,156,153,248,113,156,178,44,114,156,204,96,114,156,230,148,114,156,0,201,114,156,27,253,114,156,55,49,115,156,84,101,115,156,113,153,115,156,142,205,115,156,173,1,116,156,203,53,116,156,235,105,116,156,11,158,116,156,44,210,116,156,77,6,117,156,111,58,117,156,145,110,117,156,180,162,117,156,215,214,117,156,252,10,118,156,32,63,118,156,70,115,118,156,108,167,118,156,146,219,118,156,186,15,119,156,225,67,119,156,10,120,119,156,51,172,119,156,92,224,119,156,134,20,120,156,177,72,120,156,220,124,120,156,8,177,120,156,53,229,120,156,98,25,121,156,143,77,121,156,190,129,121,156,237,181,121,156,28,234,121,156,76,30,122,156,125,82,122,156,174,134,122,156,224,186,122,156,18,239,122,156,70,35,123,156,121,87,123,156,173,139,123,156,226,191,123,156,24,244,123,156,78,40,124,156,132,92,124,156,187,144,124,156,243,196,124,156,44,249,124,156,101,45,125,156,158,97,125,156,216,149,125,156,19,202,125,156,78,254,125,156,138,50,126,156,199,102,126,156,4,155,126,156,66,207,126,156,128,3,127,156,191,55,127,156,255,107,127,156,63,160,127,156,127,212,127,156,193,8,128,156,2,61,128,156,69,113,128,156,136,165,128,156,204,217,128,156,16,14,129,156,85,66,129,156,154,118,129,156,224,170,129,156,39,223,129,156,110,19,130,156,182,71,130,156,254,123,130,156,71,176,130,156,145,228,130,156,219,24,131,156,38,77,131,156,113,129,131,156,189,181,131,156,10,234,131,156,87,30,132,156,164,82,132,156,243,134,132,156,66,187,132,156,145,239,132,156,225,35,133,156,50,88,133,156,131,140,133,156,213,192,133,156,39,245,133,156,122,41,134,156,206,93,134,156,34,146,134,156,119,198,134,156,204,250,134,156,34,47,135,156,121,99,135,156,208,151,135,156,40,204,135,156,128,0,136,156,217,52,136,156,51,105,136,156,141,157,136,156,232,209,136,156,67,6,137,156,159,58,137,156,251,110,137,156,88,163,137,156,182,215,137,156,20,12,138,156,115,64,138,156,211,116,138,156,51,169,138,156,147,221,138,156,245,17,139,156,86,70,139,156,185,122,139,156,28,175,139,156,127,227,139,156,227,23,140,156,72,76,140,156,173,128,140,156,19,181,140,156,122,233,140,156,225,29,141,156,73,82,141,156,177,134,141,156,26,187,141,156,131,239,141,156,237,35,142,156,88,88,142,156,195,140,142,156,47,193,142,156,155,245,142,156,8,42,143,156,118,94,143,156,228,146,143,156,83,199,143,156,194,251,143,156,50,48,144,156,163,100,144,156,20,153,144,156,134,205,144,156,248,1,145,156,107,54,145,156,222,106,145,156,82,159,145,156,199,211,145,156,60,8,146,156,178,60,146,156,40,113,146,156,159,165,146,156,23,218,146,156,143,14,147,156,8,67,147,156,129,119,147,156,251,171,147,156,118,224,147,156,241,20,148,156,108,73,148,156,233,125,148,156,102,178,148,156,227,230,148,156,97,27,149,156,224,79,149,156,95,132,149,156,223,184,149,156,95,237,149,156,224,33,150,156,98,86,150,156,228,138,150,156,103,191,150,156,234,243,150,156,110,40,151,156,242,92,151,156,119,145,151,156,253,197,151,156,131,250,151,156,10,47,152,156,146,99,152,156,26,152,152,156,162,204,152,156,44,1,153,156,181,53,153,156,64,106,153,156,203,158,153,156,86,211,153,156,226,7,154,156,111,60,154,156,252,112,154,156,138,165,154,156,25,218,154,156,168,14,155,156,55,67,155,156,200,119,155,156,88,172,155,156,234,224,155,156,124,21,156,156,14,74,156,156,161,126,156,156,53,179,156,156,202,231,156,156,94,28,157,156,244,80,157,156,138,133,157,156,33,186,157,156,184,238,157,156,80,35,158,156,232,87,158,156,129,140,158,156,27,193,158,156,181,245,158,156,80,42,159,156,235,94,159,156,135,147,159,156,36,200,159,156,193,252,159,156,94,49,160,156,253,101,160,156,155,154,160,156,59,207,160,156,219,3,161,156,123,56,161,156,29,109,161,156,190,161,161,156,97,214,161,156,4,11,162,156,167,63,162,156,75,116,162,156,240,168,162,156,149,221,162,156,59,18,163,156,226,70,163,156,137,123,163,156,48,176,163,156,216,228,163,156,129,25,164,156,43,78,164,156,213,130,164,156,127,183,164,156,42,236,164,156,214,32,165,156,130,85,165,156,47,138,165,156,221,190,165,156,139,243,165,156,57,40,166,156,232,92,166,156,152,145,166,156,72,198,166,156,249,250,166,156,171,47,167,156,93,100,167,156,16,153,167,156,195,205,167,156,119,2,168,156,43,55,168,156,224,107,168,156,150,160,168,156,76,213,168,156,3,10,169,156,186,62,169,156,114,115,169,156,43,168,169,156,228,220,169,156,157,17,170,156,88,70,170,156,19,123,170,156,206,175,170,156,138,228,170,156,71,25,171,156,4,78,171,156,194,130,171,156,128,183,171,156,63,236,171,156,254,32,172,156,190,85,172,156,127,138,172,156,64,191,172,156,2,244,172,156,197,40,173,156,136,93,173,156,75,146,173,156,15,199,173,156,212,251,173,156,153,48,174,156,95,101,174,156,38,154,174,156,237,206,174,156,180,3,175,156,125,56,175,156,69,109,175,156,15,162,175,156,217,214,175,156,163,11,176,156,110,64,176,156,58,117,176,156,6,170,176,156,211,222,176,156,161,19,177,156,111,72,177,156,61,125,177,156,12,178,177,156,220,230,177,156,173,27,178,156,125,80,178,156,79,133,178,156,33,186,178,156,244,238,178,156,199,35,179,156,155,88,179,156,111,141,179,156,68,194,179,156,26,247,179,156,240,43,180,156,199,96,180,156,158,149,180,156,118,202,180,156,78,255,180,156,39,52,181,156,1,105,181,156,219,157,181,156,182,210,181,156,145,7,182,156,109,60,182,156,74,113,182,156,39,166,182,156,5,219,182,156,227,15,183,156,194,68,183,156,161,121,183,156,129,174,183,156,98,227,183,156,67,24,184,156,36,77,184,156,7,130,184,156,234,182,184,156,205,235,184,156,177,32,185,156,150,85,185,156,123,138,185,156,97,191,185,156,71,244,185,156,46,41,186,156,22,94,186,156,254,146,186,156,230,199,186,156,208,252,186,156,185,49,187,156,164,102,187,156,143,155,187,156,122,208,187,156,102,5,188,156,83,58,188,156,64,111,188,156,46,164,188,156,29,217,188,156,12,14,189,156,251,66,189,156,236,119,189,156,220,172,189,156,206,225,189,156,192,22,190,156,178,75,190,156,165,128,190,156,153,181,190,156,141,234,190,156,130,31,191,156,119,84,191,156,109,137,191,156,100,190,191,156,91,243,191,156,82,40,192,156,75,93,192,156,67,146,192,156,61,199,192,156,55,252,192,156,49,49,193,156,45,102,193,156,40,155,193,156,37,208,193,156,33,5,194,156,31,58,194,156,29,111,194,156,27,164,194,156,27,217,194,156,26,14,195,156,27,67,195,156,28,120,195,156,29,173,195,156,31,226,195,156,34,23,196,156,37,76,196,156,41,129,196,156,45,182,196,156,50,235,196,156,56,32,197,156,62,85,197,156,68,138,197,156,76,191,197,156,83,244,197,156,92,41,198,156,101,94,198,156,110,147,198,156,120,200,198,156,131,253,198,156,142,50,199,156,154,103,199,156,167,156,199,156,180,209,199,156,193,6,200,156,207,59,200,156,222,112,200,156,237,165,200,156,253,218,200,156,13,16,201,156,30,69,201,156,48,122,201,156,66,175,201,156,85,228,201,156,104,25,202,156,124,78,202,156,145,131,202,156,166,184,202,156,187,237,202,156,209,34,203,156,232,87,203,156,0,141,203,156,23,194,203,156,48,247,203,156,73,44,204,156,99,97,204,156,125,150,204,156,152,203,204,156,179,0,205,156,207,53,205,156,235,106,205,156,8,160,205,156,38,213,205,156,68,10,206,156,99,63,206,156,130,116,206,156,162,169,206,156,195,222,206,156,228,19,207,156,6,73,207,156,40,126,207,156,75,179,207,156,110,232,207,156,146,29,208,156,182,82,208,156,219,135,208,156,1,189,208,156,39,242,208,156,78,39,209,156,118,92,209,156,158,145,209,156,198,198,209,156,239,251,209,156,25,49,210,156,67,102,210,156,110,155,210,156,153,208,210,156,197,5,211,156,242,58,211,156,31,112,211,156,77,165,211,156,123,218,211,156,170,15,212,156,217,68,212,156,9,122,212,156,58,175,212,156,107,228,212,156,156,25,213,156,207,78,213,156,1,132,213,156,53,185,213,156,105,238,213,156,157,35,214,156,210,88,214,156,8,142,214,156,62,195,214,156,117,248,214,156,173,45,215,156,229,98,215,156,29,152,215,156,86,205,215,156,144,2,216,156,202,55,216,156,5,109,216,156,64,162,216,156,124,215,216,156,185,12,217,156,246,65,217,156,52,119,217,156,114,172,217,156,177,225,217,156,240,22,218,156,48,76,218,156,113,129,218,156,178,182,218,156,244,235,218,156,54,33,219,156,121,86,219,156,188,139,219,156,0,193,219,156,68,246,219,156,138,43,220,156,207,96,220,156,22,150,220,156,92,203,220,156,164,0,221,156,236,53,221,156,52,107,221,156,125,160,221,156,199,213,221,156,17,11,222,156,92,64,222,156,167,117,222,156,243,170,222,156,64,224,222,156,141,21,223,156,219,74,223,156,41,128,223,156,120,181,223,156,199,234,223,156,23,32,224,156,103,85,224,156,184,138,224,156,10,192,224,156,92,245,224,156,175,42,225,156,2,96,225,156,86,149,225,156,171,202,225,156,0,0,226,156,85,53,226,156,172,106,226,156,2,160,226,156,90,213,226,156,178,10,227,156,10,64,227,156,99,117,227,156,189,170,227,156,23,224,227,156,114,21,228,156,205,74,228,156,41,128,228,156,133,181,228,156,226,234,228,156,64,32,229,156,158,85,229,156,253,138,229,156,92,192,229,156,188,245,229,156,28,43,230,156,125,96,230,156,223,149,230,156,65,203,230,156,163,0,231,156,7,54,231,156,107,107,231,156,207,160,231,156,52,214,231,156,153,11,232,156,0,65,232,156,102,118,232,156,205,171,232,156,53,225,232,156,158,22,233,156,7,76,233,156,112,129,233,156,218,182,233,156,69,236,233,156,176,33,234,156,28,87,234,156,136,140,234,156,245,193,234,156,98,247,234,156,208,44,235,156,63,98,235,156,174,151,235,156,30,205,235,156,142,2,236,156,255,55,236,156,113,109,236,156,227,162,236,156,85,216,236,156,200,13,237,156,60,67,237,156,176,120,237,156,37,174,237,156,154,227,237,156,16,25,238,156,135,78,238,156,254,131,238,156,118,185,238,156,238,238,238,156,103,36,239,156,224,89,239,156,90,143,239,156,213,196,239,156,80,250,239,156,203,47,240,156,71,101,240,156,196,154,240,156,65,208,240,156,191,5,241,156,62,59,241,156,189,112,241,156,60,166,241,156,189,219,241,156,61,17,242,156,191,70,242,156,64,124,242,156,195,177,242,156,70,231,242,156,201,28,243,156,77,82,243,156,210,135,243,156,87,189,243,156,221,242,243,156,100,40,244,156,234,93,244,156,114,147,244,156,250,200,244,156,131,254,244,156,12,52,245,156,150,105,245,156,32,159,245,156,171,212,245,156,54,10,246,156,194,63,246,156,79,117,246,156,220,170,246,156,106,224,246,156,248,21,247,156,135,75,247,156,22,129,247,156,166,182,247,156,55,236,247,156,200,33,248,156,89,87,248,156,236,140,248,156,126,194,248,156,18,248,248,156,166,45,249,156,58,99,249,156,207,152,249,156,101,206,249,156,251,3,250,156,146,57,250,156,41,111,250,156,193,164,250,156,89,218,250,156,242,15,251,156,140,69,251,156,38,123,251,156,193,176,251,156,92,230,251,156,248,27,252,156,148,81,252,156,49,135,252,156,206,188,252,156,108,242,252,156,11,40,253,156,170,93,253,156,74,147,253,156,234,200,253,156,139,254,253,156,44,52,254,156,206,105,254,156,113,159,254,156,20,213,254,156,184,10,255,156,92,64,255,156,1,118,255,156,166,171,255,156,76,225,255,156,243,22,0,157,154,76,0,157,65,130,0,157,233,183,0,157,146,237,0,157,59,35,1,157,229,88,1,157,144,142,1,157,59,196,1,157,230,249,1,157,146,47,2,157,63,101,2,157,236,154,2,157,154,208,2,157,72,6,3,157,247,59,3,157,167,113,3,157,87,167,3,157,7,221,3,157,185,18,4,157,106,72,4,157,29,126,4,157,207,179,4,157,131,233,4,157,55,31,5,157,235,84,5,157,160,138,5,157,86,192,5,157,12,246,5,157,195,43,6,157,122,97,6,157,50,151,6,157,235,204,6,157,164,2,7,157,93,56,7,157,23,110,7,157,210,163,7,157,141,217,7,157,73,15,8,157,6,69,8,157,194,122,8,157,128,176,8,157,62,230,8,157,253,27,9,157,188,81,9,157,124,135,9,157,60,189,9,157,253,242,9,157,190,40,10,157,128,94,10,157,67,148,10,157,6,202,10,157,201,255,10,157,142,53,11,157,82,107,11,157,24,161,11,157,222,214,11,157,164,12,12,157,107,66,12,157,51,120,12,157,251,173,12,157,196,227,12,157,141,25,13,157,0,0,0,0,5,127,131,9,51,79,80,11,205,79,116,13,0,0,0,16,10,254,6,19,102,158,160,22,153,159,232,26,0,0,0,0,3,0,2,5,85,85,85,21,0,0,0,8,5,0,3,7,154,153,153,25,0,0,0,8,7,0,0,3,146,36,73,18,0,0,0,4,9,0,4,10,28,199,113,28,0,0,0,8,15,0,0,4,17,17,17,17,0,0,0,2,31,0,0,5,8,33,132,16,0,0,0,1,63,0,0,6,16,4,65,16,0,0,128,0,127,0,0,7,129,64,32,16,0,0,64,0,255,0,0,8,16,16,16,16,0,0,32,0,255,1,0,9,2,4,8,16,0,0,16,0,255,3,0,10,0,1,4,16,0,0,8,0,255,7,0,11,64,0,2,16,0,0,4,0,255,15,0,12,16,0,1,16,0,0,2,0,255,31,0,13,4,128,0,16,0,0,1,0,255,63,0,14,1,64,0,16,0,128,0,0,255,127,0,15,0,32,0,16,0,64,0,0,255,255,0,16,0,16,0,16,0,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,2,2,3,3,3,2,0,0,0,0,1,16,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,5,16,0,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,0,1,3,4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3,4,5,6,7,8,9,10,11,12,13,16,0,2,4,5,6,7,8,9,10,11,12,13,14,15,16,0,0,0,0,0,0,6,5,5,5,9,9,9,9,6,9,9,9,6,5,7,3,9,9,12,6,6,9,12,6,11,10,0,0,18,18,0,0,15,18,0,0,7,7,7,0,12,12,12,0,6,15,12,0,6,6,6,3,12,9,9,6,6,12,9,6,8,8,5,0,15,12,9,0,6,18,9,0,128,138,0,0,96,138,0,0,152,155,0,0,0,0,0,0,136,155,0,0,0,0,3,0,200,143,0,0,0,0,3,0,160,140,0,0,0,0,3,0,0,0,0,0,0,0,0,0,104,140,0,0,0,0,3,0,48,140,0,0,0,0,4,0,176,139,0,0,0,0,4,0,40,139,0,0,0,0,4,0,184,138,0,0,0,0,4,0,184,154,0,0,0,0,4,0,232,153,0,0,0,0,4,0,40,153,0,0,0,0,4,0,8,150,0,0,0,0,4,0,0,0,0,0,0,0,0,0,16,147,0,0,0,0,4,0,232,143,0,0,1,0,4,0,232,143,0,0,2,0,4,0,232,143,0,0,3,0,4,0,232,143,0,0,4,0,4,0,232,143,0,0,6,0,4,0,232,143,0,0,8,0,4,0,232,143,0,0,10,0,4,0,232,143,0,0,13,0,4,0,192,140,0,0,4,0,4,0,192,140,0,0,5,0,4,0,192,140,0,0,6,0,4,0,192,140,0,0,7,0,4,0,192,140,0,0,8,0,4,0,192,140,0,0,9,0,4,0,192,140,0,0,11,0,4,0,192,140,0,0,13,0,4,0,85,85,85,21,146,36,73,18,17,17,17,17,8,33,132,16,16,4,65,16,129,64,32,16,16,16,16,16,2,4,8,16,0,1,4,16,64,0,2,16,16,0,1,16,4,128,0,16,1,64,0,16,0,32,0,16,0,0,0,0,47,150,97,3,116,61,219,5,0,0,0,8,140,194,36,10,209,105,158,12,0,0,0,16,0,0,0,0,205,79,116,13,51,79,80,11,5,127,131,9,0,0,0,8,230,39,186,6,154,39,168,5,131,191,193,4,0,0,0,4,243,19,93,3,205,19,212,2,193,223,96,2,0,0,0,2,250,137,174,1,230,9,106,1,225,111,48,1,51,79,80,11,0,0,0,8,154,39,168,5,0,0,0,4,205,19,212,2,0,0,0,2,230,9,106,1,0,0,0,1,243,4,181,0,0,0,128,0,122,130,90,0,0,0,64,0,61,65,45,0,0,0,32,0,158,160,22,0,160,124,189,9,24,202,55,241,94,93,233,253,73,245,220,15,86,135,224,249,186,108,78,243,186,108,78,243,170,120,31,6,73,245,220,15,162,162,22,2,24,202,55,241,96,131,66,246,170,120,31,6,24,202,55,241,232,53,200,14,86,135,224,249,86,135,224,249,232,53,200,14,24,202,55,241,86,135,224,249,170,120,31,6,232,53,200,14,232,53,200,14,170,120,31,6,162,162,22,2,86,135,224,249,160,124,189,9,186,108,78,243,232,53,200,14,183,10,35,240,183,10,35,240,24,202,55,241,186,108,78,243,96,131,66,246,86,135,224,249,94,93,233,253,249,0,121,0,185,0,57,0,217,0,89,0,153,0,25,0,233,0,105,0,169,0,41,0,201,0,73,0,137,0,9,0,4,1,68,1,130,1,162,1,73,0,137,0,41,0,25,0,3,0,3,0,3,0,3,0,3,0,3,0,3,0,3,0,213,0,245,0,181,0,117,0,229,0,165,0,147,0,147,0,99,0,195,0,83,0,51,0,8,1,6,2,132,2,196,2,2,3,25,2,41,1,41,0,23,1,23,1,7,1,7,1,23,0,23,0,7,0,7,0,34,3,57,5,89,3,66,3,73,4,41,5,89,2,25,5,87,1,87,1,55,4,55,4,71,3,71,3,89,0,9,4,39,4,71,2,55,3,71,0,21,4,21,4,69,1,69,1,37,3,53,2,19,3,19,3,51,1,51,1,5,3,53,0,35,2,3,2,83,5,67,5,83,4,3,5,0,0,0,0,8,1,8,2,25,2,41,1,21,1,21,1,21,1,21,1,7,1,7,1,23,0,23,0,5,0,5,0,5,0,5,0,6,3,132,3,194,3,25,5,89,1,226,3,2,4,41,4,73,2,25,4,71,1,71,1,9,4,73,0,41,3,57,2,25,3,57,1,9,3,57,0,37,2,37,2,37,2,37,2,5,2,5,2,5,2,5,2,37,0,37,0,37,0,37,0,87,5,87,4,69,5,69,5,83,3,83,3,83,3,83,3,53,5,69,4,35,5,35,5,83,2,3,5,51,4,67,3,83,0,51,3,0,0,0,0,8,1,8,2,4,3,25,1,7,1,7,1,23,0,23,0,3,0,3,0,3,0,3,0,3,0,3,0,3,0,3,0,68,3,130,3,162,3,25,5,89,1,194,3,89,0,226,3,41,4,73,2,23,4,23,4,71,1,71,1,71,0,71,0,9,4,41,3,57,2,9,3,23,3,23,3,55,1,55,1,55,0,55,0,39,2,39,2,21,2,21,2,21,2,21,2,35,1,35,1,5,2,37,0,85,5,69,5,85,4,85,3,51,5,67,4,35,5,83,2,3,5,51,4,67,3,51,3,6,1,130,1,162,1,25,2,41,1,41,0,7,1,7,1,21,1,21,1,21,1,21,1,23,0,23,0,7,0,7,0,55,3,7,3,37,3,37,3,53,2,53,2,53,0,53,0,19,3,51,1,35,2,3,2,136,0,23,1,7,1,23,0,3,0,3,0,3,0,3,0,130,1,57,2,55,1,55,1,25,3,9,3,57,0,41,2,23,2,23,2,39,1,39,1,7,2,7,2,39,0,39,0,51,3,35,3,0,0,0,0,134,0,23,0,21,1,21,1,5,1,5,1,5,0,5,0,39,2,7,2,21,2,21,2,37,1,37,1,37,0,37,0,8,1,8,2,8,3,249,15,8,4,8,5,8,6,8,7,8,8,8,9,6,10,132,10,25,1,9,1,25,0,9,0,233,15,249,14,217,15,249,13,201,15,249,12,185,15,249,11,247,10,247,10,169,15,153,15,247,9,247,9,247,8,247,8,137,15,121,15,247,7,247,7,103,15,103,15,247,6,247,6,87,15,87,15,247,5,247,5,71,15,71,15,247,4,247,4,55,15,55,15,247,3,247,3,39,15,39,15,247,2,247,2,247,1,247,1,25,15,249,0,198,10,70,11,198,11,70,12,200,12,198,13,70,14,198,14,68,15,132,15,196,15,4,16,68,16,132,16,196,16,4,17,68,17,134,17,4,18,68,18,132,18,198,18,68,19,134,19,2,20,36,20,100,20,162,20,196,20,2,21,34,21,66,21,98,21,130,21,162,21,194,21,226,21,2,22,34,22,66,22,98,22,130,22,162,22,194,22,226,22,2,23,36,23,98,23,132,23,121,3,194,23,121,2,73,6,105,4,89,5,121,1,57,6,105,3,73,5,89,4,41,6,105,2,25,6,105,1,226,23,57,5,89,3,73,4,41,5,89,2,25,5,2,24,87,1,87,1,57,4,73,3,39,4,39,4,71,2,71,2,55,3,55,3,23,4,23,4,71,1,71,1,9,4,73,0,39,3,39,3,55,2,55,2,21,3,21,3,21,3,21,3,53,1,53,1,53,1,53,1,7,3,55,0,37,2,37,2,19,2,19,2,19,2,19,2,35,1,35,1,5,2,37,0,3,15,3,15,3,15,3,15,231,14,215,14,231,13,199,14,231,12,215,13,183,14,231,11,199,13,215,12,167,14,231,10,183,13,215,11,199,12,151,14,231,9,167,13,215,10,183,12,199,11,135,14,231,8,151,13,215,9,119,14,231,7,167,12,199,10,199,10,183,11,183,11,135,13,135,13,215,8,215,8,9,14,233,0,7,13,7,13,229,6,229,6,229,6,229,6,103,14,151,12,197,9,197,9,85,14,85,14,181,10,181,10,229,5,229,5,167,11,119,13,213,7,213,7,229,4,229,4,133,12,133,12,197,8,197,8,71,14,39,14,53,14,53,14,101,13,213,6,229,3,149,11,181,9,165,10,229,2,21,14,229,1,85,13,213,5,117,12,197,7,69,13,133,11,181,8,213,4,149,10,165,9,101,12,197,6,53,13,213,3,37,13,213,2,21,13,117,11,181,7,213,1,85,12,197,5,133,10,165,8,149,9,69,12,197,4,101,11,101,11,181,6,181,6,215,0,7,12,53,12,53,12,197,3,117,10,165,7,37,12,197,2,85,11,181,5,21,12,133,9,149,8,197,1,69,11,199,0,7,11,53,11,53,11,183,0,7,10,21,10,21,10,179,4,179,4,101,10,165,6,117,9,117,9,149,7,149,7,167,0,7,9,149,0,149,0,179,3,131,8,37,11,85,10,179,2,179,2,165,5,21,11,181,1,101,9,147,6,163,4,69,10,117,8,131,7,131,7,51,10,163,3,83,9,147,5,35,10,163,2,163,1,99,8,131,6,115,7,67,9,147,4,51,9,147,3,83,8,131,5,35,9,99,7,115,6,147,2,19,9,147,1,67,8,131,4,83,7,115,5,51,8,131,3,99,6,35,8,131,2,19,8,67,7,115,4,131,1,131,1,5,8,133,0,83,6,99,5,19,7,19,7,5,7,117,0,51,7,35,7,3,6,99,0,3,5,83,0,0,0,0,0,134,0,23,1,7,1,23,0,3,0,3,0,3,0,3,0,39,2,7,2,21,2,21,2,37,1,37,1,37,0,37,0,8,1,8,2,8,3,4,4,25,1,9,1,23,0,23,0,3,0,3,0,3,0,3,0,3,0,3,0,3,0,3,0,70,4,198,4,68,5,249,15,132,5,194,5,232,5,249,2,226,6,25,15,249,1,8,7,8,8,8,9,8,10,8,11,8,12,6,13,134,13,6,14,134,14,6,15,134,15,6,16,132,16,196,16,2,17,36,17,100,17,162,17,89,1,194,17,226,17,2,18,34,18,25,4,73,1,66,18,41,3,57,2,23,3,23,3,55,1,55,1,9,3,57,0,39,2,39,2,21,2,37,1,5,2,37,0,231,15,247,14,215,15,247,13,199,15,247,12,183,15,247,11,165,15,165,15,247,10,151,15,247,9,247,8,133,15,133,15,117,15,245,7,101,15,245,6,85,15,245,5,67,15,67,15,243,4,243,3,243,0,243,0,243,0,243,0,243,0,243,0,243,0,243,0,53,15,53,15,53,15,53,15,104,18,102,19,230,19,102,20,35,15,3,15,228,20,36,21,100,21,162,21,196,21,4,22,66,22,100,22,164,22,228,22,36,23,233,3,98,23,130,23,162,23,194,23,226,23,2,24,34,24,9,13,66,24,98,24,130,24,57,12,162,24,25,12,201,0,194,24,231,2,231,2,41,14,25,14,217,3,41,13,217,2,217,1,57,11,226,24,23,13,23,13,201,4,105,11,201,3,169,7,39,12,39,12,201,2,185,5,201,1,9,12,73,11,185,4,105,10,169,6,183,3,183,3,89,10,169,5,39,11,39,11,183,2,183,2,23,11,23,11,183,1,183,1,9,11,185,0,105,9,153,6,73,10,169,4,121,8,137,7,167,3,167,3,57,10,89,9,39,10,39,10,153,5,105,8,167,1,167,1,137,6,121,7,151,4,151,4,73,9,89,7,103,7,103,7,165,2,165,2,165,2,165,2,21,10,21,10,7,10,167,0,55,9,151,3,87,8,135,5,37,9,37,9,149,2,149,2,119,6,7,9,21,9,21,9,149,1,149,1,151,0,71,8,135,4,119,5,55,8,135,3,103,6,39,8,133,2,133,2,71,7,119,4,21,8,21,8,133,1,133,1,133,0,133,0,7,8,87,6,53,7,53,7,117,3,117,3,103,5,71,6,37,7,37,7,117,2,117,2,103,4,87,5,5,7,5,7,19,7,19,7,19,7,19,7,115,1,115,1,117,0,53,6,101,3,69,5,85,4,37,6,99,2,19,6,99,1,99,1,5,6,101,0,83,3,83,3,53,5,69,4,35,5,83,2,19,5,3,5,51,4,67,3,83,0,35,4,67,2,51,3,3,4,67,0,201,14,2,25,215,14,215,14,231,9,231,9,233,10,217,9,229,14,229,14,229,14,229,14,231,13,231,13,231,11,231,11,181,14,181,14,197,13,197,13,215,12,215,11,165,14,165,14,197,12,197,12,167,13,215,10,119,14,167,12,197,10,197,10,199,9,119,13,85,14,85,14,179,13,179,13,179,13,179,13,147,14,147,14,181,12,197,11,133,14,229,8,149,13,229,7,181,11,133,13,213,8,101,14,227,6,147,12,165,11,181,10,229,5,213,7,67,14,67,14,229,4,133,12,195,8,51,14,99,13,99,13,213,6,149,11,181,9,165,10,227,1,227,1,211,4,211,4,181,8,165,9,115,11,115,11,181,7,213,0,3,14,227,0,83,13,211,5,115,12,195,7,67,13,131,11,147,10,99,12,195,6,51,13,83,12,195,5,131,10,163,8,147,9,67,12,179,6,115,10,83,11,131,9,147,8,115,9,147,7,131,8,227,12,211,13,0,0,0,0,8,1,8,2,8,3,8,4,8,5,6,6,134,6,4,7,66,7,98,7,23,1,23,1,9,1,25,0,7,0,7,0,136,7,136,8,136,9,136,10,136,11,134,12,6,13,136,13,134,14,6,15,134,15,6,16,132,16,198,16,70,17,196,17,4,18,68,18,132,18,196,18,4,19,68,19,132,19,196,19,2,20,34,20,66,20,100,20,162,20,194,20,228,20,34,21,66,21,98,21,153,1,130,21,162,21,194,21,226,21,2,22,41,8,137,2,25,8,137,1,34,22,66,22,98,22,130,22,41,7,121,2,105,4,25,7,89,5,121,1,162,22,57,6,105,3,73,5,89,4,41,6,105,2,25,6,194,22,57,5,103,1,103,1,89,3,73,4,39,5,39,5,87,2,87,2,23,5,23,5,87,1,87,1,9,5,89,0,55,4,55,4,71,3,39,4,71,2,55,3,69,1,69,1,23,4,7,4,37,3,37,3,53,2,53,2,71,0,7,3,21,3,21,3,53,1,53,0,35,2,35,2,19,2,35,1,3,2,35,0,226,22,2,23,233,14,34,23,66,23,98,23,249,11,130,23,217,13,169,15,249,10,185,14,233,11,201,13,217,12,153,15,249,9,233,10,185,13,217,11,137,15,249,8,201,12,153,14,233,9,121,15,249,7,169,13,217,10,185,12,105,15,162,23,199,11,199,11,247,6,247,6,137,14,233,8,89,15,153,13,247,5,247,5,119,14,119,14,231,7,231,7,167,12,167,12,199,10,199,10,183,11,183,11,217,9,137,13,71,15,71,15,247,4,247,4,55,15,55,15,247,3,247,3,215,8,215,8,231,6,231,6,39,15,39,15,247,2,247,2,105,14,249,0,23,15,23,15,247,1,247,1,151,12,151,12,199,9,199,9,87,14,167,11,183,10,231,5,119,13,215,7,71,14,231,4,135,12,199,8,55,14,103,13,215,6,231,3,151,11,183,9,39,14,39,14,167,10,167,10,231,2,231,2,23,14,23,14,231,1,231,1,9,14,233,0,87,13,87,13,215,5,215,5,119,12,199,7,71,13,135,11,213,4,213,4,183,8,151,10,167,9,103,12,199,6,55,13,213,3,213,3,213,2,213,2,39,13,7,13,21,13,21,13,117,11,117,11,181,7,181,7,213,1,213,1,87,12,215,0,197,5,197,5,133,10,133,10,165,8,69,12,197,4,101,11,181,6,181,6,151,9,7,12,53,12,53,12,197,3,197,3,117,10,117,10,165,7,165,7,165,6,165,6,199,0,7,11,195,2,195,2,37,12,85,11,181,5,21,12,133,9,149,8,197,1,69,11,181,4,101,10,53,11,117,9,179,3,179,3,149,7,133,8,37,11,85,10,179,2,179,2,165,5,21,11,179,1,179,1,181,0,101,9,149,6,69,10,165,4,117,8,133,7,53,10,163,3,163,3,83,9,147,5,35,10,163,2,19,10,163,1,5,10,165,0,99,8,99,8,131,6,67,9,147,4,51,9,147,3,147,3,117,7,5,9,83,8,131,5,35,9,99,7,115,6,147,2,19,9,147,0,67,8,131,4,83,7,115,5,51,8,131,3,99,6,67,7,115,4,3,8,131,0,83,6,99,5,51,7,115,3,67,6,3,7,115,0,3,6,99,0,243,15,227,15,243,14,211,15,243,13,195,15,243,12,211,14,227,13,179,15,195,14,227,12,163,14,3,15,8,1,8,2,8,3,4,4,25,1,9,1,23,0,23,0,3,0,3,0,3,0,3,0,3,0,3,0,3,0,3,0,72,4,72,5,72,6,72,7,72,8,72,9,70,10,198,10,70,11,198,11,70,12,198,12,66,13,100,13,166,13,34,14,68,14,132,14,196,14,4,15,137,1,66,15,98,15,130,15,164,15,226,15,25,5,89,1,2,16,34,16,66,16,25,4,71,1,71,1,9,4,73,0,41,3,57,2,23,3,23,3,55,1,55,1,7,3,7,3,55,0,55,0,39,2,39,2,21,2,37,1,5,2,37,0,104,16,104,17,104,18,102,19,228,19,36,20,102,20,228,20,34,21,68,21,132,21,196,21,4,22,68,22,25,15,249,1,249,0,130,22,162,22,194,22,233,2,226,22,25,14,233,1,2,23,34,23,66,23,98,23,130,23,162,23,201,6,57,13,194,23,41,13,217,2,25,13,185,7,226,23,2,24,201,3,34,24,73,11,215,1,215,1,9,13,217,0,137,10,169,8,73,12,201,4,105,11,185,6,55,12,55,12,39,12,39,12,199,2,199,2,87,11,87,11,185,5,137,9,23,12,23,12,199,1,199,1,153,8,9,12,199,0,199,0,185,4,105,10,169,6,121,9,55,11,55,11,183,3,183,3,137,8,89,10,39,11,39,11,169,5,105,9,167,4,167,4,121,8,137,7,151,4,151,4,121,7,121,6,181,2,181,2,181,2,181,2,21,11,21,11,181,1,181,1,7,11,183,0,151,6,71,10,55,10,167,3,87,9,151,5,37,10,37,10,165,2,165,2,21,10,21,10,165,1,165,1,7,10,103,8,165,0,165,0,135,6,71,9,149,3,149,3,55,9,87,8,135,5,103,7,37,9,37,9,149,2,149,2,87,7,119,5,53,8,53,8,133,3,133,3,103,6,71,7,119,4,87,6,103,5,119,3,19,9,147,1,5,9,149,0,69,8,133,4,117,2,117,2,71,6,103,4,35,8,35,8,35,8,35,8,131,2,19,8,53,7,37,7,19,7,19,7,115,1,115,1,85,5,5,7,117,0,53,6,101,3,69,5,85,4,37,6,101,2,53,5,3,8,131,0,19,6,99,1,3,6,99,0,85,3,69,4,35,5,35,5,83,2,3,5,51,4,67,3,83,0,35,4,67,2,51,3,70,24,249,15,233,15,217,15,233,14,201,15,217,14,185,15,249,11,201,14,217,12,194,24,231,12,231,12,215,13,215,13,249,10,201,13,183,14,183,14,231,11,231,11,151,15,151,15,247,9,247,9,231,10,231,10,183,13,183,13,215,11,215,11,135,15,135,15,247,8,247,8,199,12,199,12,169,14,153,14,135,14,135,14,121,15,121,14,245,7,245,7,245,7,245,7,213,10,213,10,167,13,183,12,199,11,247,6,101,15,101,15,229,8,85,15,149,13,213,9,245,5,229,7,165,12,181,11,69,15,69,15,245,4,245,4,199,10,231,6,245,3,245,3,51,15,51,15,133,13,213,8,35,15,243,2,101,14,149,12,3,15,3,15,197,9,85,14,163,11,163,11,117,13,213,7,67,14,67,14,197,8,213,6,51,14,51,14,179,9,179,9,149,11,165,10,179,10,227,5,227,4,131,12,99,13,227,3,35,14,3,14,227,0,83,13,211,5,115,12,195,7,67,13,131,11,179,8,211,4,147,10,163,9,99,12,211,3,115,11,83,12,195,5,147,9,115,10,163,7,147,7,247,14,247,12,245,13,245,13,227,13,227,13,227,13,227,13,163,15,227,9,0,0,0,0,8,1,8,2,8,3,4,4,70,4,194,4,25,2,41,1,226,4,9,0,23,1,23,1,7,1,7,1,23,0,23,0,4,5,66,5,98,5,130,5,89,6,57,7,162,5,41,7,121,2,73,6,105,4,25,7,121,1,194,5,57,6,105,3,73,5,89,4,73,4,226,5,39,6,39,6,103,2,103,2,103,1,103,1,25,6,105,0,57,5,89,3,41,5,89,2,23,5,23,5,87,1,87,1,55,4,55,4,71,3,71,3,89,0,9,4,39,4,39,4,71,2,71,2,23,4,23,4,53,3,69,1,37,3,53,2,71,0,7,3,53,0,53,0,19,3,19,3,19,3,19,3,51,1,35,2,3,2,35,0,117,7,101,7,115,6,115,6,83,7,115,5,99,6,67,7,115,4,99,5,115,3,83,5,3,7,115,0,3,6,3,5,8,1,8,2,8,3,6,4,25,2,130,4,23,1,23,1,7,1,7,1,23,0,23,0,5,0,5,0,5,0,5,0,164,4,230,4,100,5,162,5,196,5,41,7,121,2,2,6,119,1,119,1,25,7,121,0,57,6,105,3,105,0,34,6,66,6,25,5,103,2,103,2,41,6,9,6,23,6,23,6,103,1,103,1,89,1,57,4,89,0,98,6,41,4,73,2,25,4,73,1,9,4,73,0,39,3,39,3,55,2,55,2,21,3,21,3,21,3,21,3,53,1,53,1,53,1,53,1,7,3,55,0,37,2,37,2,35,1,35,1,35,1,35,1,3,2,35,0,117,7,101,7,117,6,117,5,101,6,101,6,69,7,69,7,117,4,117,4,87,7,87,5,85,6,101,5,51,7,51,7,115,3,67,6,69,5,85,4,53,5,85,3,99,4,3,7,67,4,35,5,83,2,3,5,67,3,51,3,8,1,8,2,4,3,25,1,7,1,7,1,23,0,23,0,3,0,3,0,3,0,3,0,3,0,3,0,3,0,3,0,70,3,196,3,6,4,130,4,164,4,228,4,36,5,25,7,121,1,98,5,132,5,196,5,25,6,105,1,105,0,2,6,34,6,66,6,25,4,73,1,73,0,41,3,57,2,9,3,23,3,23,3,55,1,55,1,55,0,55,0,39,2,39,2,21,2,37,1,5,2,37,0,119,7,103,7,119,6,87,7,119,5,103,6,69,7,69,7,117,4,85,6,101,5,53,7,117,3,117,3,69,6,69,6,87,5,87,4,101,3,101,3,35,7,115,2,101,4,5,7,115,0,115,0,99,2,99,2,69,5,53,5,3,6,3,6,85,3,69,4,51,6,35,6,37,5,85,2,19,5,19,5,83,1,83,1,53,4,69,3,3,5,83,0,35,4,67,2,51,3,3,4,0,0,0,0,23,1,7,1,21,0,21,0,3,0,3,0,3,0,3,0,1,0,0,0,0,0,0,0,2,0,0,0,4,0,0,0,6,0,0,0,0,0,0,0,250,51,248,31,147,234,185,31,32,209,61,31,105,217,132,30,207,107,144,29,139,100,98,28,15,16,253,26,139,38,99,25,164,198,151,23,91,111,158,21,64,249,122,19,243,142,49,17,7,165,198,14,83,241,62,12,197,97,159,9,197,18,237,6,68,69,45,4,124,84,101,1,129,74,184,13,127,157,27,14,207,173,49,15,21,168,187,15,23,164,237,15,200,143,252,15,76,150,255,15,211,248,255,15,0,0,5,128,15,128,10,0,27,128,30,0,20,0,17,128,51,128,54,0,60,0,57,128,40,0,45,128,39,128,34,0,99,128,102,0,108,0,105,128,120,0,125,128,119,128,114,0,80,0,85,128,95,128,90,0,75,128,78,0,68,0,65,128,195,128,198,0,204,0,201,128,216,0,221,128,215,128,210,0,240,0,245,128,255,128,250,0,235,128,238,0,228,0,225,128,160,0,165,128,175,128,170,0,187,128,190,0,180,0,177,128,147,128,150,0,156,0,153,128,136,0,141,128,135,128,130,0,131,129,134,1,140,1,137,129,152,1,157,129,151,129,146,1,176,1,181,129,191,129,186,1,171,129,174,1,164,1,161,129,224,1,229,129,239,129,234,1,251,129,254,1,244,1,241,129,211,129,214,1,220,1,217,129,200,1,205,129,199,129,194,1,64,1,69,129,79,129,74,1,91,129,94,1,84,1,81,129,115,129,118,1,124,1,121,129,104,1,109,129,103,129,98,1,35,129,38,1,44,1,41,129,56,1,61,129,55,129,50,1,16,1,21,129,31,129,26,1,11,129,14,1,4,1,1,129,3,131,6,3,12,3,9,131,24,3,29,131,23,131,18,3,48,3,53,131,63,131,58,3,43,131,46,3,36,3,33,131,96,3,101,131,111,131,106,3,123,131,126,3,116,3,113,131,83,131,86,3,92,3,89,131,72,3,77,131,71,131,66,3,192,3,197,131,207,131,202,3,219,131,222,3,212,3,209,131,243,131,246,3,252,3,249,131,232,3,237,131,231,131,226,3,163,131,166,3,172,3,169,131,184,3,189,131,183,131,178,3,144,3,149,131,159,131,154,3,139,131,142,3,132,3,129,131,128,2,133,130,143,130,138,2,155,130,158,2,148,2,145,130,179,130,182,2,188,2,185,130,168,2,173,130,167,130,162,2,227,130,230,2,236,2,233,130,248,2,253,130,247,130,242,2,208,2,213,130,223,130,218,2,203,130,206,2,196,2,193,130,67,130,70,2,76,2,73,130,88,2,93,130,87,130,82,2,112,2,117,130,127,130,122,2,107,130,110,2,100,2,97,130,32,2,37,130,47,130,42,2,59,130,62,2,52,2,49,130,19,130,22,2,28,2,25,130,8,2,13,130,7,130,2,2,25,160,196,247,46,201,115,248,236,103,252,250,47,226,22,253,198,159,124,254,121,52,88,255,185,215,197,255,76,216,240,255,0,0,0,0,0,125,0,0,0,250,0,0,0,119,1,0,0,244,1,0,0,113,2,0,0,238,2,0,0,107,3,0,0,232,3,0,0,101,4,0,0,226,4,0,0,95,5,0,0,220,5,0,0,89,6,0,0,214,6,0,0,0,0,0,0,125,0,0,128,187,0,0,192,218,0,0,0,250,0,0,128,56,1,0,0,119,1,0,128,181,1,0,0,244,1,0,0,113,2,0,0,238,2,0,0,107,3,0,0,232,3,0,0,226,4,0,0,220,5,0,0,0,0,0,0,125,0,0,64,156,0,0,128,187,0,0,192,218,0,0,0,250,0,0,128,56,1,0,0,119,1,0,128,181,1,0,0,244,1,0,0,113,2,0,0,238,2,0,0,107,3,0,0,232,3,0,0,226,4,0,0,0,0,0,0,125,0,0,128,187,0,0,192,218,0,0,0,250,0,0,128,56,1,0,0,119,1,0,128,181,1,0,0,244,1,0,128,50,2,0,0,113,2,0,128,175,2,0,0,238,2,0,0,107,3,0,0,232,3,0,0,0,0,0,64,31,0,0,128,62,0,0,192,93,0,0,0,125,0,0,64,156,0,0,128,187,0,0,192,218,0,0,0,250,0,0,128,56,1,0,0,119,1,0,128,181,1,0,0,244,1,0,128,50,2,0,0,113,2,0,0,0,0,0,2,0,0,0,2,0,3,0,3,0,3,0,3,0,1,0,4,0,2,0,4,0,3,0,4,0,4,0,4,0,5,0,67,82,67,32,99,104,101,99,107,32,102,97,105,108,101,100,0,0,0,0,0,0,0,0,114,101,115,101,114,118,101,100,32,101,109,112,104,97,115,105,115,32,118,97,108,117,101,0,114,101,115,101,114,118,101,100,32,115,97,109,112,108,101,32,102,114,101,113,117,101,110,99,121,32,118,97,108,117,101,0,102,111,114,98,105,100,100,101,110,32,98,105,116,114,97,116,101,32,118,97,108,117,101,0,114,101,115,101,114,118,101,100,32,104,101,97,100,101,114,32,108,97,121,101,114,32,118,97], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+30720);
/* memory initializer */ allocate([108,117,101,0,0,0,0,0,108,111,115,116,32,115,121,110,99,104,114,111,110,105,122,97,116,105,111,110,0,0,0,0,100,101,110,111,109,32,33,61,32,48,0,0,0,0,0,0,110,111,116,32,101,110,111,117,103,104,32,109,101,109,111,114,121,0,0,0,0,0,0,0,102,97,99,116,111,114,32,33,61,32,48,0,0,0,0,0,105,110,118,97,108,105,100,32,40,110,117,108,108,41,32,98,117,102,102,101,114,32,112,111,105,110,116,101,114,0,0,0,105,110,99,111,109,112,97,116,105,98,108,101,32,98,108,111,99,107,95,116,121,112,101,32,102,111,114,32,74,83,0,0,72,117,102,102,109,97,110,32,100,97,116,97,32,111,118,101,114,114,117,110,0,0,0,0,45,98,105,116,115,95,108,101,102,116,32,60,61,32,77,65,68,95,66,85,70,70,69,82,95,71,85,65,82,68,32,42,32,67,72,65,82,95,66,73,84,0,0,0,0,0,0,0,98,97,100,32,72,117,102,102,109,97,110,32,116,97,98,108,101,32,115,101,108,101,99,116,0,0,0,0,0,0,0,0,98,97,100,32,97,117,100,105,111,32,100,97,116,97,32,108,101,110,103,116,104,0,0,0,98,97,100,32,109,97,105,110,95,100,97,116,97,95,98,101,103,105,110,32,112,111,105,110,116,101,114,0,0,0,0,0,110,111,32,101,114,114,111,114,0,0,0,0,0,0,0,0,98,97,100,32,115,99,97,108,101,102,97,99,116,111,114,32,115,101,108,101,99,116,105,111,110,32,105,110,102,111,0,0,114,101,115,101,114,118,101,100,32,98,108,111,99,107,95,116,121,112,101,0,0,0,0,0,98,97,100,32,98,105,103,95,118,97,108,117,101,115,32,99,111,117,110,116,0,0,0,0,116,105,109,101,114,46,99,0,98,97,100,32,102,114,97,109,101,32,108,101,110,103,116,104,0,0,0,0,0,0,0,0,98,97,100,32,98,105,116,114,97,116,101,47,109,111,100,101,32,99,111,109,98,105,110,97,116,105,111,110,0,0,0,0,105,110,112,117,116,32,98,117,102,102,101,114,32,116,111,111,32,115,109,97,108,108,32,40,111,114,32,69,79,70,41,0,98,97,100,32,115,99,97,108,101,102,97,99,116,111,114,32,105,110,100,101,120,0,0,0,102,111,114,98,105,100,100,101,110,32,98,105,116,32,97,108,108,111,99,97,116,105,111,110,32,118,97,108,117,101,0,0,108,97,121,101,114,51,46,99,0,0,0,0,0,0,0,0,115,116,114,101,97,109,45,62,109,100,95,108,101,110,32,43,32,109,100,95,108,101,110,32,45,32,115,105,46,109,97,105,110,95,100,97,116,97,95,98,101,103,105,110,32,60,61,32,77,65,68,95,66,85,70,70,69,82,95,77,68,76,69,78,0,0,0,0,0,0,0,0,115,99,97,108,101,95,114,97,116,105,111,110,97,108,0,0,114,101,100,117,99,101,95,114,97,116,105,111,110,97,108,0,109,97,100,95,108,97,121,101,114,95,73,73,73,0,0,0,73,73,73,95,104,117,102,102,100,101,99,111,100,101,0,0,0,0,0,0,249,255,255,255,53,0,0,0,141,255,255,255,253,1,0,0,248,250,255,255,108,6,0,0,100,219,255,255,72,73,0,0,156,36,0,0,108,6,0,0,8,5,0,0,253,1,0,0,115,0,0,0,53,0,0,0,7,0,0,0,0,0,0,0,249,255,255,255,53,0,0,0,141,255,255,255,253,1,0,0,248,250,255,255,108,6,0,0,100,219,255,255,72,73,0,0,156,36,0,0,108,6,0,0,8,5,0,0,253,1,0,0,115,0,0,0,53,0,0,0,7,0,0,0,0,0,0,0,248,255,255,255,55,0,0,0,126,255,255,255,244,1,0,0,157,250,255,255,210,5,0,0,150,217,255,255,60,73,0,0,206,34,0,0,248,6,0,0,173,4,0,0,4,2,0,0,100,0,0,0,52,0,0,0,7,0,0,0,0,0,0,0,248,255,255,255,55,0,0,0,126,255,255,255,244,1,0,0,157,250,255,255,210,5,0,0,150,217,255,255,60,73,0,0,206,34,0,0,248,6,0,0,173,4,0,0,4,2,0,0,100,0,0,0,52,0,0,0,7,0,0,0,0,0,0,0,247,255,255,255,56,0,0,0,111,255,255,255,232,1,0,0,66,250,255,255,42,5,0,0,202,215,255,255,26,73,0,0,0,33,0,0,118,7,0,0,82,4,0,0,8,2,0,0,87,0,0,0,51,0,0,0,6,0,0,0,0,0,0,0,247,255,255,255,56,0,0,0,111,255,255,255,232,1,0,0,66,250,255,255,42,5,0,0,202,215,255,255,26,73,0,0,0,33,0,0,118,7,0,0,82,4,0,0,8,2,0,0,87,0,0,0,51,0,0,0,6,0,0,0,0,0,0,0,246,255,255,255,56,0,0,0,95,255,255,255,217,1,0,0,233,249,255,255,116,4,0,0,0,214,255,255,226,72,0,0,51,31,0,0,231,7,0,0,248,3,0,0,10,2,0,0,74,0,0,0,49,0,0,0,5,0,0,0,0,0,0,0,246,255,255,255,56,0,0,0,95,255,255,255,217,1,0,0,233,249,255,255,116,4,0,0,0,214,255,255,226,72,0,0,51,31,0,0,231,7,0,0,248,3,0,0,10,2,0,0,74,0,0,0,49,0,0,0,5,0,0,0,0,0,0,0,246,255,255,255,57,0,0,0,78,255,255,255,200,1,0,0,145,249,255,255,176,3,0,0,59,212,255,255,146,72,0,0,104,29,0,0,75,8,0,0,158,3,0,0,9,2,0,0,61,0,0,0,48,0,0,0,5,0,0,0,0,0,0,0,246,255,255,255,57,0,0,0,78,255,255,255,200,1,0,0,145,249,255,255,176,3,0,0,59,212,255,255,146,72,0,0,104,29,0,0,75,8,0,0,158,3,0,0,9,2,0,0,61,0,0,0,48,0,0,0,5,0,0,0,0,0,0,0,245,255,255,255,57,0,0,0,61,255,255,255,179,1,0,0,58,249,255,255,222,2,0,0,122,210,255,255,45,72,0,0,160,27,0,0,162,8,0,0,70,3,0,0,7,2,0,0,49,0,0,0,46,0,0,0,4,0,0,0,0,0,0,0,245,255,255,255,57,0,0,0,61,255,255,255,179,1,0,0,58,249,255,255,222,2,0,0,122,210,255,255,45,72,0,0,160,27,0,0,162,8,0,0,70,3,0,0,7,2,0,0,49,0,0,0,46,0,0,0,4,0,0,0,0,0,0,0,244,255,255,255,57,0,0,0,44,255,255,255,155,1,0,0,230,248,255,255,253,1,0,0,190,208,255,255,178,71,0,0,221,25,0,0,237,8,0,0,239,2,0,0,2,2,0,0,38,0,0,0,44,0,0,0,4,0,0,0,0,0,0,0,244,255,255,255,57,0,0,0,44,255,255,255,155,1,0,0,230,248,255,255,253,1,0,0,190,208,255,255,178,71,0,0,221,25,0,0,237,8,0,0,239,2,0,0,2,2,0,0,38,0,0,0,44,0,0,0,4,0,0,0,255,255,255,255,243,255,255,255,57,0,0,0,26,255,255,255,128,1,0,0,149,248,255,255,15,1,0,0,10,207,255,255,33,71,0,0,30,24,0,0,43,9,0,0,154,2,0,0,252,1,0,0,28,0,0,0,42,0,0,0,4,0,0,0,255,255,255,255,243,255,255,255,57,0,0,0,26,255,255,255,128,1,0,0,149,248,255,255,15,1,0,0,10,207,255,255,33,71,0,0,30,24,0,0,43,9,0,0,154,2,0,0,252,1,0,0,28,0,0,0,42,0,0,0,4,0,0,0,255,255,255,255,241,255,255,255,56,0,0,0,8,255,255,255,98,1,0,0,70,248,255,255,18,0,0,0,93,205,255,255,122,70,0,0,100,22,0,0,94,9,0,0,71,2,0,0,244,1,0,0,18,0,0,0,40,0,0,0,3,0,0,0,255,255,255,255,241,255,255,255,56,0,0,0,8,255,255,255,98,1,0,0,70,248,255,255,18,0,0,0,93,205,255,255,122,70,0,0,100,22,0,0,94,9,0,0,71,2,0,0,244,1,0,0,18,0,0,0,40,0,0,0,3,0,0,0,255,255,255,255,240,255,255,255,55,0,0,0,246,254,255,255,64,1,0,0,252,247,255,255,6,255,255,255,184,203,255,255,191,69,0,0,177,20,0,0,134,9,0,0,246,1,0,0,235,1,0,0,9,0,0,0,39,0,0,0,3,0,0,0,255,255,255,255,240,255,255,255,55,0,0,0,246,254,255,255,64,1,0,0,252,247,255,255,6,255,255,255,184,203,255,255,191,69,0,0,177,20,0,0,134,9,0,0,246,1,0,0,235,1,0,0,9,0,0,0,39,0,0,0,3,0,0,0,255,255,255,255,239,255,255,255,54,0,0,0,228,254,255,255,27,1,0,0,181,247,255,255,237,253,255,255,29,202,255,255,240,68,0,0,6,19,0,0,162,9,0,0,167,1,0,0,224,1,0,0,1,0,0,0,37,0,0,0,3,0,0,0,255,255,255,255,239,255,255,255,54,0,0,0,228,254,255,255,27,1,0,0,181,247,255,255,237,253,255,255,29,202,255,255,240,68,0,0,6,19,0,0,162,9,0,0,167,1,0,0,224,1,0,0,1,0,0,0,37,0,0,0,3,0,0,0,255,255,255,255,238,255,255,255,52,0,0,0,209,254,255,255,243,0,0,0,115,247,255,255,199,252,255,255,141,200,255,255,12,68,0,0,98,17,0,0,180,9,0,0,91,1,0,0,212,1,0,0,249,255,255,255,35,0,0,0,2,0,0,0,255,255,255,255,238,255,255,255,52,0,0,0,209,254,255,255,243,0,0,0,115,247,255,255,199,252,255,255,141,200,255,255,12,68,0,0,98,17,0,0,180,9,0,0,91,1,0,0,212,1,0,0,249,255,255,255,35,0,0,0,2,0,0,0,255,255,255,255,236,255,255,255,50,0,0,0,191,254,255,255,199,0,0,0,54,247,255,255,147,251,255,255,9,199,255,255,21,67,0,0,199,15,0,0,188,9,0,0,18,1,0,0,198,1,0,0,242,255,255,255,33,0,0,0,2,0,0,0,255,255,255,255,236,255,255,255,50,0,0,0,191,254,255,255,199,0,0,0,54,247,255,255,147,251,255,255,9,199,255,255,21,67,0,0,199,15,0,0,188,9,0,0,18,1,0,0,198,1,0,0,242,255,255,255,33,0,0,0,2,0,0,0,255,255,255,255,235,255,255,255,47,0,0,0,173,254,255,255,151,0,0,0,255,246,255,255,81,250,255,255,144,197,255,255,11,66,0,0,53,14,0,0,186,9,0,0,204,0,0,0,184,1,0,0,235,255,255,255,31,0,0,0,2,0,0,0,255,255,255,255,235,255,255,255,47,0,0,0,173,254,255,255,151,0,0,0,255,246,255,255,81,250,255,255,144,197,255,255,11,66,0,0,53,14,0,0,186,9,0,0,204,0,0,0,184,1,0,0,235,255,255,255,31,0,0,0,2,0,0,0,255,255,255,255,233,255,255,255,44,0,0,0,155,254,255,255,101,0,0,0,206,246,255,255,3,249,255,255,38,196,255,255,240,64,0,0,173,12,0,0,175,9,0,0,136,0,0,0,169,1,0,0,229,255,255,255,29,0,0,0,2,0,0,0,255,255,255,255,233,255,255,255,44,0,0,0,155,254,255,255,101,0,0,0,206,246,255,255,3,249,255,255,38,196,255,255,240,64,0,0,173,12,0,0,175,9,0,0,136,0,0,0,169,1,0,0,229,255,255,255,29,0,0,0,2,0,0,0,255,255,255,255,232,255,255,255,41,0,0,0,137,254,255,255,46,0,0,0,164,246,255,255,169,247,255,255,201,194,255,255,195,63,0,0,48,11,0,0,156,9,0,0,72,0,0,0,153,1,0,0,224,255,255,255,28,0,0,0,2,0,0,0,255,255,255,255,232,255,255,255,41,0,0,0,137,254,255,255,46,0,0,0,164,246,255,255,169,247,255,255,201,194,255,255,195,63,0,0,48,11,0,0,156,9,0,0,72,0,0,0,153,1,0,0,224,255,255,255,28,0,0,0,2,0,0,0,255,255,255,255,230,255,255,255,37,0,0,0,120,254,255,255,245,255,255,255,128,246,255,255,66,246,255,255,123,193,255,255,133,62,0,0,190,9,0,0,128,9,0,0,11,0,0,0,136,1,0,0,219,255,255,255,26,0,0,0,1,0,0,0,255,255,255,255,230,255,255,255,37,0,0,0,120,254,255,255,245,255,255,255,128,246,255,255,66,246,255,255,123,193,255,255,133,62,0,0,190,9,0,0,128,9,0,0,11,0,0,0,136,1,0,0,219,255,255,255,26,0,0,0,1,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+40960);



var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }function ___errno_location() {
      return ___errno_state;
    }

  function _llvm_lifetime_start() {}

  function _llvm_lifetime_end() {}

  
  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;

  
   
  Module["_memset"] = _memset;var _llvm_memset_p0i8_i64=_memset;

  var _llvm_memset_p0i8_i32=_memset;

  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }

  
   
  Module["_memmove"] = _memmove;var _llvm_memmove_p0i8_p0i8_i32=_memmove;

  
  function _htonl(value) {
      return ((value & 0xff) << 24) + ((value & 0xff00) << 8) +
             ((value & 0xff0000) >>> 8) + ((value & 0xff000000) >>> 24);
    }var _ntohl=_htonl;

  function __mad_js_read(mf, buf, position, len, rem) {
      var file = Mad.getDecoder(mf)._file;
  
      if (position>=file.size) {
        return Mad.getDecoder(mf)._decode_callback("End of File");
      }
  
      var data = Module.HEAPU8.subarray(buf, buf+len);
  
      var reader = new FileReader();
      reader.onload = function(e) {
        data.set(new Uint8Array(e.target.result));
        return _mad_js_after_read(mf, len, rem);
      }
  
      reader.readAsArrayBuffer(file.slice(position, position+len));
    }

  function __mad_js_decode_callback(mf) {
      Mad.getDecoder(mf)._decode_callback();
    }

  function __mad_js_raise(error) {
      throw Pointer_stringify(error);
    }

  function _abort() {
      Module['abort']();
    }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }





   
  Module["_strlen"] = _strlen;

  
  
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          if (stream.tty.output.length) {
            stream.tty.ops.put_char(stream.tty, 10);
          }
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }}};
  
  var MEMFS={ops_table:null,CONTENT_OWNING:1,CONTENT_FLEXIBLE:2,CONTENT_FIXED:3,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            },
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.contents = [];
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },ensureFlexible:function (node) {
        if (node.contentMode !== MEMFS.CONTENT_FLEXIBLE) {
          var contents = node.contents;
          node.contents = Array.prototype.slice.call(contents);
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        }
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.contents.length;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.ensureFlexible(node);
            var contents = node.contents;
            if (attr.size < contents.length) contents.length = attr.size;
            else while (attr.size > contents.length) contents.push(0);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          var node = stream.node;
          node.timestamp = Date.now();
          var contents = node.contents;
          if (length && contents.length === 0 && position === 0 && buffer.subarray) {
            // just replace it with the new data
            if (canOwn && offset === 0) {
              node.contents = buffer; // this could be a subarray of Emscripten HEAP, or allocated from some other source.
              node.contentMode = (buffer.buffer === HEAP8.buffer) ? MEMFS.CONTENT_OWNING : MEMFS.CONTENT_FIXED;
            } else {
              node.contents = new Uint8Array(buffer.subarray(offset, offset+length));
              node.contentMode = MEMFS.CONTENT_FIXED;
            }
            return length;
          }
          MEMFS.ensureFlexible(node);
          var contents = node.contents;
          while (contents.length < position) contents.push(0);
          for (var i = 0; i < length; i++) {
            contents[position + i] = buffer[offset + i];
          }
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.contents.length;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.ungotten = [];
          stream.position = position;
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.ensureFlexible(stream.node);
          var contents = stream.node.contents;
          var limit = offset + length;
          while (limit > contents.length) contents.push(0);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          fileStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function() { callback(this.error); };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function() { done(this.error); };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          stream.position = position;
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      // we don't currently perform any user-space buffering of data
    }var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); },
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); },
            },
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        return FS.nodePermissions(dir, 'x');
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        if (stream.__proto__) {
          // reuse the object
          stream.__proto__ = FS.FSStream.prototype;
        } else {
          var newStream = new FS.FSStream();
          for (var p in stream) {
            newStream[p] = stream[p];
          }
          stream = newStream;
        }
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions
        var err = FS.mayOpen(node, flags);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        return stream.stream_ops.llseek(stream, offset, whence);
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno) {
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
          this.message = ERRNO_MESSAGES[errno];
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
          function LazyUint8Array() {
            this.lengthKnown = false;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = Math.floor(idx / this.chunkSize);
            return this.getter(chunkNum)[chunkOffset];
          }
          LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter;
          }
          LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
              // Find length
              var xhr = new XMLHttpRequest();
              xhr.open('HEAD', url, false);
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              var datalength = Number(xhr.getResponseHeader("Content-length"));
              var header;
              var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
              var chunkSize = 1024*1024; // Chunk size in bytes
  
              if (!hasByteServing) chunkSize = datalength;
  
              // Function to get a range from the remote URL.
              var doXHR = (function(from, to) {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
                // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
                // Some hints to the browser that we want binary data.
                if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
                if (xhr.overrideMimeType) {
                  xhr.overrideMimeType('text/plain; charset=x-user-defined');
                }
  
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                  return new Uint8Array(xhr.response || []);
                } else {
                  return intArrayFromString(xhr.responseText || '', true);
                }
              });
              var lazyArray = this;
              lazyArray.setDataGetter(function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum+1) * chunkSize - 1; // including this byte
                end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
                  lazyArray.chunks[chunkNum] = doXHR(start, end);
                }
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum];
              });
  
              this._length = datalength;
              this._chunkSize = chunkSize;
              this.lengthKnown = true;
          }
  
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            continue;
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};var Browser={mainLoop:{scheduler:null,method:"",shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted || ENVIRONMENT_IS_WORKER) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'];
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'] ||
                                 function(){}; // no-op if function does not exist
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas;
        }
  
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
  
        if (Module['elementPointerLock']) {
          canvas.addEventListener("click", function(ev) {
            if (!Browser.pointerLock && canvas.requestPointerLock) {
              canvas.requestPointerLock();
              ev.preventDefault();
            }
          }, false);
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        var ctx;
        var errorInfo = '?';
        function onContextCreationError(event) {
          errorInfo = event.statusMessage || errorInfo;
        }
        try {
          if (useWebGL) {
            var contextAttributes = {
              antialias: false,
              alpha: false
            };
  
            if (webGLContextAttributes) {
              for (var attribute in webGLContextAttributes) {
                contextAttributes[attribute] = webGLContextAttributes[attribute];
              }
            }
  
  
            canvas.addEventListener('webglcontextcreationerror', onContextCreationError, false);
            try {
              ['experimental-webgl', 'webgl'].some(function(webglId) {
                return ctx = canvas.getContext(webglId, contextAttributes);
              });
            } finally {
              canvas.removeEventListener('webglcontextcreationerror', onContextCreationError, false);
            }
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas: ' + [errorInfo, e]);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
  
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          GLctx = Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement']) === canvas) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'];
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else if (Browser.resizeCanvas){
            Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
        }
  
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen();
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          setTimeout(func, 1000/60);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           window['setTimeout'];
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        return Math.max(-1, Math.min(1, event.type === 'DOMMouseScroll' ? event.detail : -event.wheelDelta));
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var x, y;
          
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          if (event.type == 'touchstart' ||
              event.type == 'touchend' ||
              event.type == 'touchmove') {
            var t = event.touches.item(0);
            if (t) {
              x = t.pageX - (scrollX + rect.left);
              y = t.pageY - (scrollY + rect.top);
            } else {
              return;
            }
          } else {
            x = event.pageX - (scrollX + rect.left);
            y = event.pageY - (scrollY + rect.top);
          }
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        canvas.width = width;
        canvas.height = height;
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        var canvas = Module['canvas'];
        this.windowedWidth = canvas.width;
        this.windowedHeight = canvas.height;
        canvas.width = screen.width;
        canvas.height = screen.height;
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      }};
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + 5242880;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");


var Math_min = Math.min;
function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function asmPrintInt(x, y) {
  Module.print('int ' + x + ',' + y);// + ' ' + new Error().stack);
}
function asmPrintFloat(x, y) {
  Module.print('float ' + x + ',' + y);// + ' ' + new Error().stack);
}
// EMSCRIPTEN_START_ASM
var asm=(function(global,env,buffer){"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=+env.NaN;var n=+env.Infinity;var o=0;var p=0;var q=0;var r=0;var s=0,t=0,u=0,v=0,w=0.0,x=0,y=0,z=0,A=0.0;var B=0;var C=0;var D=0;var E=0;var F=0;var G=0;var H=0;var I=0;var J=0;var K=0;var L=global.Math.floor;var M=global.Math.abs;var N=global.Math.sqrt;var O=global.Math.pow;var P=global.Math.cos;var Q=global.Math.sin;var R=global.Math.tan;var S=global.Math.acos;var T=global.Math.asin;var U=global.Math.atan;var V=global.Math.atan2;var W=global.Math.exp;var X=global.Math.log;var Y=global.Math.ceil;var Z=global.Math.imul;var _=env.abort;var $=env.assert;var aa=env.asmPrintInt;var ba=env.asmPrintFloat;var ca=env.min;var da=env.invoke_vi;var ea=env.invoke_ii;var fa=env.invoke_v;var ga=env.invoke_iii;var ha=env.invoke_viiii;var ia=env._llvm_lifetime_end;var ja=env._sysconf;var ka=env._abort;var la=env._htonl;var ma=env._sbrk;var na=env.___assert_fail;var oa=env.___setErrNo;var pa=env.___errno_location;var qa=env.__mad_js_decode_callback;var ra=env._llvm_lifetime_start;var sa=env.__mad_js_raise;var ta=env.__mad_js_read;var ua=env._time;var va=env._emscripten_memcpy_big;var wa=env._fflush;var xa=0.0;
// EMSCRIPTEN_START_FUNCS
function Da(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+7&-8;return b|0}function Ea(){return i|0}function Fa(a){a=a|0;i=a}function Ga(a,b){a=a|0;b=b|0;if((o|0)==0){o=a;p=b}}function Ha(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0]}function Ia(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0];a[k+4|0]=a[b+4|0];a[k+5|0]=a[b+5|0];a[k+6|0]=a[b+6|0];a[k+7|0]=a[b+7|0]}function Ja(a){a=a|0;B=a}function Ka(a){a=a|0;C=a}function La(a){a=a|0;D=a}function Ma(a){a=a|0;E=a}function Na(a){a=a|0;F=a}function Oa(a){a=a|0;G=a}function Pa(a){a=a|0;H=a}function Qa(a){a=a|0;I=a}function Ra(a){a=a|0;J=a}function Sa(a){a=a|0;K=a}function Ta(){}function Ua(a,d){a=a|0;d=d|0;c[a>>2]=d;b[a+4>>1]=0;b[a+6>>1]=8;return}function Va(a,b){a=a|0;b=b|0;return(e[a+6>>1]|0)+8-(e[b+6>>1]|0)+((c[b>>2]|0)-((c[a>>2]|0)+1)<<3)|0}function Wa(a){a=a|0;var d=0;d=c[a>>2]|0;return((b[a+6>>1]|0)==8?d:d+1|0)|0}function Xa(a,f){a=a|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;g=f>>>3;h=a|0;i=c[h>>2]|0;j=i+g|0;c[h>>2]=j;k=a+6|0;l=(e[k>>1]|0)-(f&7)|0;f=l&65535;b[k>>1]=f;if((l&65535)>>>0>8>>>0){l=i+(g+1)|0;c[h>>2]=l;h=f+8&65535;b[k>>1]=h;m=h;n=l}else{m=f;n=j}if(!((m&65535)>>>0<8>>>0)){return}b[a+4>>1]=d[n]|0;return}function Ya(e,f){e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;g=e+6|0;h=b[g>>1]|0;if(h<<16>>16==8){i=d[c[e>>2]|0]|0;b[e+4>>1]=i;j=i}else{j=b[e+4>>1]|0}i=h&65535;h=e+4|0;k=(1<<i)+65535&(j&65535);if(i>>>0>f>>>0){j=i-f|0;b[g>>1]=j;l=k>>>(j>>>0);return l|0}j=f-i|0;i=e|0;e=(c[i>>2]|0)+1|0;c[i>>2]=e;b[g>>1]=8;if(j>>>0>7>>>0){f=j;m=k;n=e;while(1){o=n+1|0;c[i>>2]=o;p=d[n]|0|m<<8;q=f-8|0;if(q>>>0>7>>>0){f=q;m=p;n=o}else{r=q;s=p;t=o;break}}}else{r=j;s=k;t=e}if((r|0)==0){l=s;return l|0}e=a[t]|0;b[h>>1]=e&255;h=8-r|0;b[g>>1]=h;l=(e&255)>>>(h>>>0)|s<<r;return l|0}function Za(f,g,h){f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0;j=i;k=f;f=i;i=i+8|0;c[f>>2]=c[k>>2];c[f+4>>2]=c[k+4>>2];k=h&65535;if(g>>>0>31>>>0){h=f+6|0;l=f|0;m=f+4|0;n=k;o=g;p=b[h>>1]|0;while(1){do{if(p<<16>>16==8){q=a[c[l>>2]|0]|0;b[m>>1]=q&255;r=p&65535;s=r;t=q&255&(1<<r)+65535;u=7}else{r=p&65535;q=(e[m>>1]|0)&(1<<r)+65535;if(!((p&65535)>>>0>32>>>0)){s=r;t=q;u=7;break}v=r-32|0;r=v&65535;b[h>>1]=r;w=q>>>(v>>>0);x=r}}while(0);do{if((u|0)==7){u=0;r=32-s|0;v=(c[l>>2]|0)+1|0;c[l>>2]=v;b[h>>1]=8;if(r>>>0>7>>>0){q=r;y=t;z=v;while(1){A=z+1|0;c[l>>2]=A;B=d[z]|0|y<<8;C=q-8|0;if(C>>>0>7>>>0){q=C;y=B;z=A}else{D=C;E=B;F=A;break}}}else{D=r;E=t;F=v}if((D|0)==0){w=E;x=8;break}z=a[F]|0;b[m>>1]=z&255;y=8-D|0;q=y&65535;b[h>>1]=q;w=(z&255)>>>(y>>>0)|E<<D;x=q}}while(0);q=(e[39960+((w>>>24^n>>>8&255)<<1)>>1]|0)^n<<8;y=q<<8^(e[39960+(((q>>>8^w>>>16)&255)<<1)>>1]|0);q=y<<8^(e[39960+(((y^w)>>>8&255)<<1)>>1]|0);y=q<<8^(e[39960+(((q>>>8^w)&255)<<1)>>1]|0);q=o-32|0;if(q>>>0>31>>>0){n=y;o=q;p=x}else{G=y;H=q;break}}}else{G=k;H=g}g=H>>>3;if((g|0)==2){I=G;J=b[f+6>>1]|0;u=25}else if((g|0)==1){K=G;L=b[f+6>>1]|0;u=35}else if((g|0)==3){g=G<<8;k=G>>>8;x=f+6|0;p=b[x>>1]|0;if(p<<16>>16==8){o=d[c[f>>2]|0]|0;b[f+4>>1]=o;M=o}else{M=b[f+4>>1]|0}o=p&65535;n=f+4|0;w=M&65535&(1<<o)+65535;do{if((p&65535)>>>0>8>>>0){M=o-8|0;D=M&65535;b[x>>1]=D;N=w>>>(M>>>0);O=D}else{D=8-o|0;M=f|0;E=(c[M>>2]|0)+1|0;c[M>>2]=E;b[x>>1]=8;if(D>>>0>7>>>0){h=D;m=w;F=E;while(1){t=F+1|0;c[M>>2]=t;l=d[F]|0|m<<8;s=h-8|0;if(s>>>0>7>>>0){h=s;m=l;F=t}else{P=s;Q=l;R=t;break}}}else{P=D;Q=w;R=E}if((P|0)==0){N=Q;O=8;break}F=a[R]|0;b[n>>1]=F&255;m=8-P|0;h=m&65535;b[x>>1]=h;N=(F&255)>>>(m>>>0)|Q<<P;O=h}}while(0);I=(e[39960+(((N^k)&255)<<1)>>1]|0)^g;J=O;u=25}else{S=H;T=G}if((u|0)==25){G=I<<8;O=I>>>8;I=f+6|0;if(J<<16>>16==8){g=d[c[f>>2]|0]|0;b[f+4>>1]=g;U=g}else{U=b[f+4>>1]|0}g=J&65535;k=f+4|0;N=U&65535&(1<<g)+65535;do{if((J&65535)>>>0>8>>>0){U=g-8|0;P=U&65535;b[I>>1]=P;V=N>>>(U>>>0);W=P}else{P=8-g|0;U=f|0;Q=(c[U>>2]|0)+1|0;c[U>>2]=Q;b[I>>1]=8;if(P>>>0>7>>>0){x=P;n=N;R=Q;while(1){w=R+1|0;c[U>>2]=w;o=d[R]|0|n<<8;p=x-8|0;if(p>>>0>7>>>0){x=p;n=o;R=w}else{X=p;Y=o;Z=w;break}}}else{X=P;Y=N;Z=Q}if((X|0)==0){V=Y;W=8;break}R=a[Z]|0;b[k>>1]=R&255;n=8-X|0;x=n&65535;b[I>>1]=x;V=(R&255)>>>(n>>>0)|Y<<X;W=x}}while(0);K=(e[39960+(((V^O)&255)<<1)>>1]|0)^G;L=W;u=35}if((u|0)==35){W=K<<8;G=K>>>8;K=f+6|0;if(L<<16>>16==8){O=d[c[f>>2]|0]|0;b[f+4>>1]=O;_=O}else{_=b[f+4>>1]|0}O=L&65535;V=f+4|0;X=_&65535&(1<<O)+65535;do{if((L&65535)>>>0>8>>>0){_=O-8|0;b[K>>1]=_;$=X>>>(_>>>0)}else{_=8-O|0;Y=f|0;I=(c[Y>>2]|0)+1|0;c[Y>>2]=I;b[K>>1]=8;if(_>>>0>7>>>0){k=_;Z=X;N=I;while(1){g=N+1|0;c[Y>>2]=g;J=d[N]|0|Z<<8;x=k-8|0;if(x>>>0>7>>>0){k=x;Z=J;N=g}else{aa=x;ba=J;ca=g;break}}}else{aa=_;ba=X;ca=I}if((aa|0)==0){$=ba;break}N=a[ca]|0;b[V>>1]=N&255;Z=8-aa|0;b[K>>1]=Z;$=(N&255)>>>(Z>>>0)|ba<<aa}}while(0);S=H&7;T=(e[39960+((($^G)&255)<<1)>>1]|0)^W}if((S|0)==0){da=T&65535;i=j;return da|0}W=f+6|0;G=f|0;$=f+4|0;f=T;T=S;S=b[W>>1]|0;while(1){H=T-1|0;do{if(S<<16>>16==8){aa=a[c[G>>2]|0]|0;b[$>>1]=aa&255;ba=S&65535;ea=ba;fa=aa&255&(1<<ba)+65535;u=50}else{ba=S&65535;aa=(e[$>>1]|0)&(1<<ba)+65535;if((S&65535)>>>0>1>>>0){ea=ba;fa=aa;u=50;break}K=1-ba|0;ba=(c[G>>2]|0)+1|0;c[G>>2]=ba;b[W>>1]=8;if(K>>>0>7>>>0){V=K;ca=aa;X=ba;while(1){O=X+1|0;c[G>>2]=O;L=d[X]|0|ca<<8;Z=V-8|0;if(Z>>>0>7>>>0){V=Z;ca=L;X=O}else{ga=Z;ha=L;ia=O;break}}}else{ga=K;ha=aa;ia=ba}if((ga|0)==0){ja=ha;ka=8;break}X=a[ia]|0;b[$>>1]=X&255;ca=8-ga|0;V=ca&65535;b[W>>1]=V;ja=(X&255)>>>(ca>>>0)|ha<<ga;ka=V}}while(0);if((u|0)==50){u=0;I=ea-1|0;_=I&65535;b[W>>1]=_;ja=fa>>>(I>>>0);ka=_}_=f<<1;la=((ja^f>>>15)&1|0)==0?_:_^32773;if((H|0)==0){break}else{f=la;T=H;S=ka}}da=la&65535;i=j;return da|0}function _a(a){a=a|0;var b=0,d=0,e=0,f=0;b=a+36|0;Hb(a|0,0,36)|0;d=43880;e=c[d+4>>2]|0;c[b>>2]=c[d>>2];c[b+4>>2]=e;c[a+44>>2]=0;e=a+9264|0;c[e>>2]=0;b=0;do{d=0;do{c[a+4656+(b<<7)+(d<<2)>>2]=0;c[a+48+(b<<7)+(d<<2)>>2]=0;d=d+1|0;}while(d>>>0<32>>>0);b=b+1|0;}while(b>>>0<36>>>0);b=c[e>>2]|0;if((b|0)==0){return}else{f=0}do{e=0;do{c[b+2304+(e*72|0)+(f<<2)>>2]=0;c[b+(e*72|0)+(f<<2)>>2]=0;e=e+1|0;}while(e>>>0<32>>>0);f=f+1|0;}while(f>>>0<18>>>0);return}function $a(a){a=a|0;var b=0;b=a+9264|0;a=c[b>>2]|0;if((a|0)==0){return}Eb(a);c[b>>2]=0;return}function ab(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0;e=i;i=i+112|0;f=e|0;g=e+64|0;h=d+24|0;j=c[h>>2]|0;k=c[d+4>>2]|0;a:do{if((j|0)==0){c[d+60>>2]=2;l=d+12|0}else{m=d+8|0;n=c[m>>2]|0;o=d+12|0;p=c[o>>2]|0;do{if((n|0)==0){q=j;r=p;s=k}else{if((p|0)==0){t=c[d+20>>2]|0}else{t=j}u=k;v=u-t|0;if(v>>>0<n>>>0){c[m>>2]=n-v;c[h>>2]=k;c[d+60>>2]=1;l=o;break a}else{c[m>>2]=0;c[o>>2]=1;q=t+n|0;r=1;s=u;break}}}while(0);n=d+12|0;o=d+28|0;m=d+20|0;p=b+36|0;u=b|0;v=b+20|0;w=b+16|0;x=d+16|0;y=f;z=g;A=o;B=b+28|0;C=d;D=b;E=g|0;F=g+20|0;G=q;H=r;while(1){if((H|0)==0){Ua(o,G);if((mb(d)|0)==-1){I=18;break}J=Wa(o)|0}else{if((s-G|0)<8){I=13;break}K=G+1|0;if(!((a[G]|0)==-1)){I=16;break}if((a[K]&-32)<<24>>24==-32){J=G}else{I=16;break}}c[m>>2]=J;c[h>>2]=J+1;Ua(o,J);if((bb(b,d)|0)==-1){l=n;break a}L=c[u>>2]|0;if((L|0)==3){M=(c[B>>2]&4096|0)!=0?576:1152;I=25}else if((L|0)==1){N=384}else{M=1152;I=25}if((I|0)==25){I=0;N=M}ub(p,0,N,c[v>>2]|0);L=c[w>>2]|0;if((L|0)==0){O=c[x>>2]|0;do{if((O|0)==0){I=31}else{if((c[n>>2]|0)==0){I=31;break}P=c[u>>2]|0;if((P|0)==3&O>>>0>64e4>>>0){I=31}else{Q=O;R=P}}}while(0);if((I|0)==31){I=0;S=c[A>>2]|0;T=c[A+4>>2]|0;O=c[B>>2]|0;P=O>>>7&1;if((c[u>>2]|0)==3){U=(O&4096|0)!=0?72:144}else{U=144}if((mb(d)|0)!=0){I=34;break}O=4-(P<<2)|0;V=P^1;P=0;b:while(1){Gb(y|0,C|0,64)|0;Gb(z|0,D|0,44)|0;do{if((bb(g,f)|0)==0){if((c[E>>2]|0)!=(c[u>>2]|0)){W=P;break}if((c[F>>2]|0)!=(c[v>>2]|0)){W=P;break}X=Wa(o)|0;Y=X-(c[m>>2]|0)|0;X=c[v>>2]|0;if((c[u>>2]|0)==1){_=((Z(O+Y|0,X)|0)>>>0)/48|0}else{_=((Z(Y+V|0,X)|0)>>>0)/(U>>>0)|0}X=(_>>>0)/1e3|0;if(_>>>0>7999>>>0){$=X;break b}else{W=X}}else{W=P}}while(0);Xa(o,8);if((mb(d)|0)==0){P=W}else{$=W;break}}c[A>>2]=S;c[A+4>>2]=T;if($>>>0<8>>>0){I=46;break}P=c[u>>2]|0;if((P|0)==3&$>>>0>640>>>0){I=46;break}V=$*1e3|0;c[x>>2]=V;Q=V;R=P}c[w>>2]=Q;P=c[B>>2]|1024;c[B>>2]=P;aa=Q;ba=P;ca=R}else{aa=L;ba=c[B>>2]|0;ca=c[u>>2]|0}P=ba>>>7&1;if((ca|0)==1){da=(((aa*12|0)>>>0)/((c[v>>2]|0)>>>0)|0)+P<<2}else if((ca|0)==3){ea=(ba&4096|0)!=0?72:144;I=52}else{ea=144;I=52}if((I|0)==52){I=0;V=Z(aa,ea)|0;da=((V>>>0)/((c[v>>2]|0)>>>0)|0)+P|0}fa=c[m>>2]|0;if((da+8|0)>>>0>(s-fa|0)>>>0){I=54;break}P=fa+da|0;c[h>>2]=P;if((c[n>>2]|0)!=0){ga=ba;break}if((a[P]|0)==-1){if((a[fa+(da+1)|0]&-32)<<24>>24==-32){I=59;break}}P=fa+1|0;c[h>>2]=P;G=P;H=0}if((I|0)==13){c[h>>2]=G;c[d+60>>2]=1;l=n;break}else if((I|0)==16){c[m>>2]=G;c[h>>2]=K;c[d+60>>2]=257;l=n;break}else if((I|0)==18){if((s-(c[h>>2]|0)|0)>7){c[h>>2]=k-8}c[d+60>>2]=1;l=n;break}else if((I|0)==34){c[A>>2]=S;c[A+4>>2]=T;I=46}else if((I|0)==54){c[h>>2]=fa;c[d+60>>2]=1;l=n;break}else if((I|0)==59){c[n>>2]=1;ga=c[B>>2]|0}if((I|0)==46){c[d+60>>2]=257;l=n;break}c[B>>2]=ga|8;ha=0;i=e;return ha|0}}while(0);c[l>>2]=0;ha=-1;i=e;return ha|0}function bb(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;e=a+28|0;c[e>>2]=0;f=a+32|0;c[f>>2]=0;g=d+28|0;Xa(g,11);if((Ya(g,1)|0)==0){c[e>>2]=c[e>>2]|16384}h=(Ya(g,1)|0)==0;i=c[e>>2]|0;do{if(h){c[e>>2]=i|4096}else{if((i&16384|0)==0){break}c[d+60>>2]=257;j=-1;return j|0}}while(0);i=Ya(g,2)|0;h=a|0;c[h>>2]=4-i;if((i|0)==0){c[d+60>>2]=258;j=-1;return j|0}if((Ya(g,1)|0)==0){c[e>>2]=c[e>>2]|16;b[a+24>>1]=Za(g,16,-1)|0}i=Ya(g,4)|0;if((i|0)==15){c[d+60>>2]=259;j=-1;return j|0}k=c[h>>2]|0;if((c[e>>2]&4096|0)==0){c[a+16>>2]=c[40504+((k-1|0)*60|0)+(i<<2)>>2]}else{c[a+16>>2]=c[40504+(((k>>>1)+3|0)*60|0)+(i<<2)>>2]}i=Ya(g,2)|0;if((i|0)==3){c[d+60>>2]=260;j=-1;return j|0}d=c[1528+(i<<2)>>2]|0;i=a+20|0;c[i>>2]=d;k=c[e>>2]|0;do{if((k&4096|0)!=0){c[i>>2]=d>>>1;if((k&16384|0)==0){break}c[i>>2]=d>>>2}}while(0);if((Ya(g,1)|0)!=0){c[e>>2]=c[e>>2]|128}if((Ya(g,1)|0)!=0){c[f>>2]=c[f>>2]|256}c[a+4>>2]=3-(Ya(g,2)|0);c[a+8>>2]=Ya(g,2)|0;if((Ya(g,1)|0)!=0){c[e>>2]=c[e>>2]|32}if((Ya(g,1)|0)!=0){c[e>>2]=c[e>>2]|64}c[a+12>>2]=Ya(g,2)|0;if((c[e>>2]&16|0)==0){j=0;return j|0}b[a+26>>1]=Ya(g,16)|0;j=0;return j|0}function cb(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;d=i;i=i+8|0;e=d|0;c[a+44>>2]=c[b+56>>2];f=a+28|0;g=c[f>>2]|0;do{if((g&8|0)==0){if((ab(a|0,b)|0)==-1){break}h=c[f>>2]|0;j=4}else{h=g;j=4}}while(0);do{if((j|0)==4){c[f>>2]=h&-9;g=a|0;if((Ba[c[39840+((c[g>>2]|0)-1<<2)>>2]&7](b,a)|0)==-1){if((c[b+60>>2]&65280|0)!=0){break}c[b+24>>2]=c[b+20>>2];break}if((c[g>>2]|0)==3){k=0;i=d;return k|0}Ua(e,c[b+24>>2]|0);g=b+28|0;l=g;m=b+36|0;n=c[l+4>>2]|0;c[m>>2]=c[l>>2];c[m+4>>2]=n;c[b+44>>2]=Va(g,e)|0;k=0;i=d;return k|0}}while(0);c[b+44>>2]=0;k=-1;i=d;return k|0}function db(e,f){e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;g=i;i=i+128|0;h=g|0;j=g+64|0;k=c[f+4>>2]|0;l=(k|0)!=0?2:1;m=f+28|0;n=c[m>>2]|0;if((k|0)==2){k=n|256;c[m>>2]=k;o=(c[f+8>>2]<<2)+4|0;p=k}else{o=32;p=n}do{if((p&16|0)!=0){n=32-o+(Z(o,l)|0)<<2;k=f+24|0;m=Za(e+28|0,n,b[k>>1]|0)|0;b[k>>1]=m;if(m<<16>>16==(b[f+26>>1]|0)){break}if((c[f+44>>2]&1|0)!=0){break}c[e+60>>2]=513;q=-1;i=g;return q|0}}while(0);p=(o|0)==0;do{if(p){r=12}else{m=e+28|0;k=0;a:while(1){n=0;do{s=Ya(m,4)|0;if((s|0)==15){r=14;break a}else if((s|0)==0){t=0}else{t=s+1&255}a[h+(n<<5)+k|0]=t;n=n+1|0;}while(n>>>0<l>>>0);n=k+1|0;if(n>>>0<o>>>0){k=n}else{r=10;break}}if((r|0)==10){if(o>>>0<32>>>0){r=12;break}u=e+28|0;v=0;break}else if((r|0)==14){c[e+60>>2]=529;q=-1;i=g;return q|0}}}while(0);b:do{if((r|0)==12){t=e+28|0;k=o;while(1){m=Ya(t,4)|0;if((m|0)==15){break}else if((m|0)==0){w=0}else{w=m+1&255}a[h+32+k|0]=w;a[h+k|0]=w;m=k+1|0;if(m>>>0<32>>>0){k=m}else{u=t;v=1;break b}}c[e+60>>2]=529;q=-1;i=g;return q|0}}while(0);e=0;do{w=0;do{if((a[h+(w<<5)+e|0]|0)!=0){a[j+(w<<5)+e|0]=Ya(u,6)|0}w=w+1|0;}while(w>>>0<l>>>0);e=e+1|0;}while(e>>>0<32>>>0);if(p){p=0;while(1){if(v){e=0;do{w=a[h+e|0]|0;if(w<<24>>24==0){r=0;do{c[f+48+(r*4608|0)+(p<<7)+(e<<2)>>2]=0;r=r+1|0;}while(r>>>0<l>>>0)}else{r=w&255;t=r-1|0;k=1<<t;m=(Ya(u,r)|0)^k;n=(Z((268435456>>>(t>>>0))+2048+((m|-(m&k))<<29-r)>>12,(c[35072+(r-2<<2)>>2]|0)+32768>>16)|0)+2048>>12;r=0;do{c[f+48+(r*4608|0)+(p<<7)+(e<<2)>>2]=Z((c[1048+(d[j+(r<<5)+e|0]<<2)>>2]|0)+32768>>16,n)|0;r=r+1|0;}while(r>>>0<l>>>0)}e=e+1|0;}while(e>>>0<32>>>0)}e=p+1|0;if(e>>>0<12>>>0){p=e}else{q=0;break}}i=g;return q|0}else{x=0}while(1){p=0;do{e=0;do{r=a[h+(e<<5)+p|0]|0;if(r<<24>>24==0){y=0}else{n=r&255;r=n-1|0;w=1<<r;k=(Ya(u,n)|0)^w;m=(Z((268435456>>>(r>>>0))+2048+((k|-(k&w))<<29-n)>>12,(c[35072+(n-2<<2)>>2]|0)+32768>>16)|0)+2048>>12;y=Z(m,(c[1048+(d[j+(e<<5)+p|0]<<2)>>2]|0)+32768>>16)|0}c[f+48+(e*4608|0)+(x<<7)+(p<<2)>>2]=y;e=e+1|0;}while(e>>>0<l>>>0);p=p+1|0;}while(p>>>0<o>>>0);if(v){p=o;do{e=a[h+p|0]|0;if(e<<24>>24==0){m=0;do{c[f+48+(m*4608|0)+(x<<7)+(p<<2)>>2]=0;m=m+1|0;}while(m>>>0<l>>>0)}else{m=e&255;n=m-1|0;w=1<<n;k=(Ya(u,m)|0)^w;r=(Z((268435456>>>(n>>>0))+2048+((k|-(k&w))<<29-m)>>12,(c[35072+(m-2<<2)>>2]|0)+32768>>16)|0)+2048>>12;m=0;do{c[f+48+(m*4608|0)+(x<<7)+(p<<2)>>2]=Z((c[1048+(d[j+(m<<5)+p|0]<<2)>>2]|0)+32768>>16,r)|0;m=m+1|0;}while(m>>>0<l>>>0)}p=p+1|0;}while(p>>>0<32>>>0)}p=x+1|0;if(p>>>0<12>>>0){x=p}else{q=0;break}}i=g;return q|0}function eb(f,g){f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;h=i;i=i+8|0;j=h|0;k=j;l=i;i=i+64|0;m=i;i=i+64|0;n=i;i=i+192|0;o=i;i=i+12|0;i=i+7&-8;p=c[g+4>>2]|0;q=(p|0)!=0;r=q?2:1;s=g+28|0;t=c[s>>2]|0;a:do{if((t&4096|0)==0){do{if((t&1024|0)==0){u=c[g+16>>2]|0;do{if(q){v=u>>>1}else{if(!(u>>>0>192e3>>>0)){v=u;break}c[f+60>>2]=546;w=-1;i=h;return w|0}}while(0);if(v>>>0<48001>>>0){x=(c[g+20>>2]|0)==32e3?3:2;break a}else{if(v>>>0<80001>>>0){x=0;break a}else{break}}}}while(0);x=(c[g+20>>2]|0)!=48e3|0}else{x=4}}while(0);v=c[1344+(x*36|0)>>2]|0;if((p|0)==2){c[s>>2]=t|256;y=(c[g+8>>2]<<2)+4|0}else{y=32}t=y>>>0>v>>>0?v:y;y=f+28|0;p=y;q=c[p+4>>2]|0;c[j>>2]=c[p>>2];c[j+4>>2]=q;q=(t|0)==0;if(!q){j=0;do{p=e[40808+(d[1348+(x*36|0)+j|0]<<2)>>1]|0;u=0;do{a[l+(u<<5)+j|0]=Ya(y,p)|0;u=u+1|0;}while(u>>>0<r>>>0);j=j+1|0;}while(j>>>0<t>>>0)}j=t>>>0<v>>>0;if(j){u=t;do{p=(Ya(y,e[40808+(d[1348+(x*36|0)+u|0]<<2)>>1]|0)|0)&255;a[l+32+u|0]=p;a[l+u|0]=p;u=u+1|0;}while(u>>>0<v>>>0)}u=(v|0)==0;if(!u){p=0;do{z=0;do{if((a[l+(z<<5)+p|0]|0)!=0){a[m+(z<<5)+p|0]=Ya(y,2)|0}z=z+1|0;}while(z>>>0<r>>>0);p=p+1|0;}while(p>>>0<v>>>0)}do{if((c[s>>2]&16|0)!=0){p=Va(k,y)|0;z=g+24|0;A=Za(k,p,b[z>>1]|0)|0;b[z>>1]=A;if(A<<16>>16==(b[g+26>>1]|0)){break}if((c[g+44>>2]&1|0)!=0){break}c[f+60>>2]=513;w=-1;i=h;return w|0}}while(0);if(!u){u=0;do{f=0;do{do{if((a[l+(f<<5)+u|0]|0)!=0){k=(Ya(y,6)|0)&255;a[n+(f*96|0)+(u*3|0)|0]=k;s=d[m+(f<<5)+u|0]|0;if((s|0)==2){a[n+(f*96|0)+(u*3|0)+1|0]=k;a[n+(f*96|0)+(u*3|0)+2|0]=k;break}else if((s|0)==0){a[n+(f*96|0)+(u*3|0)+1|0]=Ya(y,6)|0;B=36}else if((s|0)==1|(s|0)==3){B=36}if((B|0)==36){B=0;a[n+(f*96|0)+(u*3|0)+2|0]=Ya(y,6)|0}if((s&1|0)==0){break}a[n+(f*96|0)+(u*3|0)+1|0]=a[s-1+(n+(f*96|0)+(u*3|0))|0]|0}}while(0);f=f+1|0;}while(f>>>0<r>>>0);u=u+1|0;}while(u>>>0<v>>>0)}u=v>>>0<32>>>0;B=o|0;m=128-(v<<2)|0;f=0;while(1){s=f*3|0;if(!q){k=f>>>2;A=0;do{z=1348+(x*36|0)+A|0;p=0;do{C=a[l+(p<<5)+A|0]|0;if(C<<24>>24==0){c[g+48+(p*4608|0)+(s<<7)+(A<<2)>>2]=0;c[g+48+(p*4608|0)+(s+1<<7)+(A<<2)>>2]=0;c[g+48+(p*4608|0)+(s+2<<7)+(A<<2)>>2]=0}else{fb(y,34408+((d[(C&255)-1+(34640+((e[40810+(d[z]<<2)>>1]|0)*15|0))|0]|0)*12|0)|0,B);C=(c[1048+(d[n+(p*96|0)+(A*3|0)+k|0]<<2)>>2]|0)+32768>>16;c[g+48+(p*4608|0)+(s<<7)+(A<<2)>>2]=Z(C,(c[B>>2]|0)+2048>>12)|0;c[g+48+(p*4608|0)+(s+1<<7)+(A<<2)>>2]=Z(C,(c[o+4>>2]|0)+2048>>12)|0;c[g+48+(p*4608|0)+(s+2<<7)+(A<<2)>>2]=Z(C,(c[o+8>>2]|0)+2048>>12)|0}p=p+1|0;}while(p>>>0<r>>>0);A=A+1|0;}while(A>>>0<t>>>0)}if(j){A=f>>>2;k=t;while(1){p=a[l+k|0]|0;if(p<<24>>24==0){z=0;do{c[g+48+(z*4608|0)+(s<<7)+(k<<2)>>2]=0;c[g+48+(z*4608|0)+(s+1<<7)+(k<<2)>>2]=0;c[g+48+(z*4608|0)+(s+2<<7)+(k<<2)>>2]=0;z=z+1|0;}while(z>>>0<r>>>0)}else{fb(y,34408+((d[(p&255)-1+(34640+((e[40810+(d[1348+(x*36|0)+k|0]<<2)>>1]|0)*15|0))|0]|0)*12|0)|0,B);z=c[B>>2]|0;C=c[o+4>>2]|0;D=c[o+8>>2]|0;E=0;do{F=(c[1048+(d[n+(E*96|0)+(k*3|0)+A|0]<<2)>>2]|0)+32768>>16;c[g+48+(E*4608|0)+(s<<7)+(k<<2)>>2]=Z(F,z+2048>>12)|0;c[g+48+(E*4608|0)+(s+1<<7)+(k<<2)>>2]=Z(F,C+2048>>12)|0;c[g+48+(E*4608|0)+(s+2<<7)+(k<<2)>>2]=Z(F,D+2048>>12)|0;E=E+1|0;}while(E>>>0<r>>>0)}E=k+1|0;if(E>>>0<v>>>0){k=E}else{G=0;break}}}else{G=0}do{if(u){Hb(g+48+(G*4608|0)+(s<<7)+(v<<2)|0,0,m|0)|0;Hb(g+48+(G*4608|0)+(s+1<<7)+(v<<2)|0,0,m|0)|0;Hb(g+48+(G*4608|0)+(s+2<<7)+(v<<2)|0,0,m|0)|0}G=G+1|0;}while(G>>>0<r>>>0);s=f+1|0;if(s>>>0<12>>>0){f=s}else{w=0;break}}i=h;return w|0}function fb(b,f,g){b=b|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;h=a[f+2|0]|0;i=d[f+3|0]|0;if(h<<24>>24==0){j=Ya(b,i)|0;k=Ya(b,i)|0;l=i;m=j;n=k;o=Ya(b,i)|0}else{k=Ya(b,i)|0;i=e[f>>1]|0;b=(k>>>0)/(i>>>0)|0;l=h&255;m=(k>>>0)%(i>>>0)|0;n=(b>>>0)%(i>>>0)|0;o=(((b>>>0)/(i>>>0)|0)>>>0)%(i>>>0)|0}i=1<<l-1;b=29-l|0;l=f+8|0;k=f+4|0;f=m^i;c[g>>2]=Z((c[l>>2]|0)+2048+((f|-(f&i))<<b)>>12,(c[k>>2]|0)+32768>>16)|0;f=n^i;c[g+4>>2]=Z((c[l>>2]|0)+2048+((f|-(f&i))<<b)>>12,(c[k>>2]|0)+32768>>16)|0;f=o^i;c[g+8>>2]=Z((c[l>>2]|0)+2048+((f|-(f&i))<<b)>>12,(c[k>>2]|0)+32768>>16)|0;return}function gb(f,g){f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Eb=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0,lc=0,mc=0,nc=0,oc=0,pc=0,qc=0,rc=0,sc=0,tc=0,uc=0,vc=0,wc=0,xc=0,yc=0,zc=0,Ac=0,Bc=0,Cc=0,Dc=0,Ec=0,Fc=0,Gc=0,Hc=0,Ic=0,Jc=0,Kc=0,Lc=0,Mc=0,Nc=0,Oc=0,Pc=0,Qc=0,Rc=0,Sc=0,Tc=0,Uc=0,Vc=0,Wc=0,Xc=0,Yc=0,Zc=0,_c=0,$c=0,ad=0,bd=0,cd=0,dd=0,ed=0,fd=0,gd=0,hd=0,id=0,jd=0,kd=0,ld=0,md=0,nd=0,od=0,pd=0,qd=0,rd=0,sd=0,td=0,ud=0,vd=0,wd=0,xd=0,yd=0,zd=0,Ad=0,Bd=0,Cd=0,Dd=0,Ed=0,Fd=0,Gd=0,Hd=0,Id=0,Jd=0,Kd=0,Ld=0,Md=0,Nd=0,Od=0,Pd=0,Qd=0,Rd=0,Sd=0,Td=0,Ud=0,Vd=0,Wd=0,Xd=0,Yd=0,Zd=0,_d=0,$d=0,ae=0,be=0,ce=0,de=0,ee=0,fe=0,ge=0,he=0,ie=0,je=0,ke=0,le=0,me=0,ne=0,oe=0,pe=0,qe=0,re=0,se=0,te=0;h=i;i=i+7432|0;j=h|0;k=h+2304|0;l=h+2320|0;m=h+2400|0;n=h+2416|0;o=h+2576|0;p=h+2584|0;q=h+2648|0;r=h+2656|0;s=h+2664|0;t=h+2672|0;u=h+7280|0;v=h+7424|0;w=v;x=i;i=i+244|0;i=i+7&-8;y=i;i=i+8|0;z=f+48|0;do{if((c[z>>2]|0)==0){A=Db(2567)|0;c[z>>2]=A;if((A|0)!=0){break}c[f+60>>2]=49;B=-1;i=h;return B|0}}while(0);A=g+9264|0;do{if((c[A>>2]|0)==0){C=Fb(1152,4)|0;c[A>>2]=C;if((C|0)!=0){break}c[f+60>>2]=49;B=-1;i=h;return B|0}}while(0);C=g+4|0;D=(c[C>>2]|0)!=0;E=D?2:1;F=g+28|0;if((c[F>>2]&4096|0)==0){G=D?32:17}else{G=D?17:9}H=f+24|0;I=c[H>>2]|0;J=f+28|0;if((I-(Wa(J)|0)|0)<(G|0)){c[f+60>>2]=561;c[f+52>>2]=0;B=-1;i=h;return B|0}do{if((c[F>>2]&16|0)==0){K=0}else{I=g+24|0;L=Za(J,G<<3,b[I>>1]|0)|0;b[I>>1]=L;if(L<<16>>16==(b[g+26>>1]|0)){K=0;break}if((c[g+44>>2]&1|0)!=0){K=0;break}c[f+60>>2]=513;K=-1}}while(0);G=c[F>>2]&4096;L=(G|0)!=0;if(L){M=E}else{M=D?3:5}D=G>>>12;G=x|0;c[G>>2]=Ya(J,D^9)|0;I=x+4|0;c[I>>2]=Ya(J,M)|0;if(L){N=1}else{O=0;while(1){a[x+8+O|0]=Ya(J,4)|0;P=O+1|0;if(P>>>0<E>>>0){O=P}else{N=2;break}}}O=L?9:4;P=D^3;D=0;Q=0;R=0;while(1){if(L){S=0;T=D;U=R;while(1){V=x+10+(Q*116|0)+(S*58|0)|0;b[V>>1]=Ya(J,12)|0;W=x+10+(Q*116|0)+(S*58|0)+2|0;b[W>>1]=Ya(J,9)|0;b[x+10+(Q*116|0)+(S*58|0)+4>>1]=Ya(J,8)|0;b[x+10+(Q*116|0)+(S*58|0)+6>>1]=Ya(J,O)|0;X=(e[V>>1]|0)+U|0;V=(e[W>>1]|0)>>>0>288>>>0&(T|0)==0?562:T;W=x+10+(Q*116|0)+(S*58|0)+8|0;a[W]=0;if((Ya(J,1)|0)==0){a[x+10+(Q*116|0)+(S*58|0)+9|0]=0;a[x+10+(Q*116|0)+(S*58|0)+10|0]=Ya(J,5)|0;a[x+10+(Q*116|0)+(S*58|0)+11|0]=Ya(J,5)|0;a[x+10+(Q*116|0)+(S*58|0)+12|0]=Ya(J,5)|0;a[x+10+(Q*116|0)+(S*58|0)+16|0]=Ya(J,4)|0;a[x+10+(Q*116|0)+(S*58|0)+17|0]=Ya(J,3)|0;Y=V}else{_=Ya(J,2)|0;$=x+10+(Q*116|0)+(S*58|0)+9|0;a[$]=_;aa=(_&255|V|0)==0?563:V;V=x+10+(Q*116|0)+(S*58|0)+16|0;a[V]=7;a[x+10+(Q*116|0)+(S*58|0)+17|0]=36;do{if((Ya(J,1)|0)==0){if((a[$]|0)!=2){break}a[V]=8}else{a[W]=a[W]|8}}while(0);a[x+10+(Q*116|0)+(S*58|0)+10|0]=Ya(J,5)|0;a[x+10+(Q*116|0)+(S*58|0)+11|0]=Ya(J,5)|0;a[x+10+(Q*116|0)+(S*58|0)+13|0]=Ya(J,3)|0;a[x+10+(Q*116|0)+(S*58|0)+14|0]=Ya(J,3)|0;a[x+10+(Q*116|0)+(S*58|0)+15|0]=Ya(J,3)|0;Y=aa}V=Ya(J,P)|0;a[W]=d[W]|V;V=S+1|0;if(V>>>0<E>>>0){S=V;T=Y;U=X}else{ba=Y;ca=X;break}}}else{U=0;T=D;S=R;while(1){V=x+10+(Q*116|0)+(U*58|0)|0;b[V>>1]=Ya(J,12)|0;$=x+10+(Q*116|0)+(U*58|0)+2|0;b[$>>1]=Ya(J,9)|0;b[x+10+(Q*116|0)+(U*58|0)+4>>1]=Ya(J,8)|0;b[x+10+(Q*116|0)+(U*58|0)+6>>1]=Ya(J,O)|0;_=(e[V>>1]|0)+S|0;V=(e[$>>1]|0)>>>0>288>>>0&(T|0)==0?562:T;$=x+10+(Q*116|0)+(U*58|0)+8|0;a[$]=0;if((Ya(J,1)|0)==0){a[x+10+(Q*116|0)+(U*58|0)+9|0]=0;a[x+10+(Q*116|0)+(U*58|0)+10|0]=Ya(J,5)|0;a[x+10+(Q*116|0)+(U*58|0)+11|0]=Ya(J,5)|0;a[x+10+(Q*116|0)+(U*58|0)+12|0]=Ya(J,5)|0;a[x+10+(Q*116|0)+(U*58|0)+16|0]=Ya(J,4)|0;a[x+10+(Q*116|0)+(U*58|0)+17|0]=Ya(J,3)|0;da=V}else{ea=Ya(J,2)|0;fa=ea&255;ga=x+10+(Q*116|0)+(U*58|0)+9|0;a[ga]=fa;ha=(ea&255|V|0)==0?563:V;if(fa<<24>>24==2){ia=(a[x+8+U|0]|0)!=0&(ha|0)==0?564:ha}else{ia=ha}ha=x+10+(Q*116|0)+(U*58|0)+16|0;a[ha]=7;a[x+10+(Q*116|0)+(U*58|0)+17|0]=36;do{if((Ya(J,1)|0)==0){if((a[ga]|0)!=2){break}a[ha]=8}else{a[$]=a[$]|8}}while(0);a[x+10+(Q*116|0)+(U*58|0)+10|0]=Ya(J,5)|0;a[x+10+(Q*116|0)+(U*58|0)+11|0]=Ya(J,5)|0;a[x+10+(Q*116|0)+(U*58|0)+13|0]=Ya(J,3)|0;a[x+10+(Q*116|0)+(U*58|0)+14|0]=Ya(J,3)|0;a[x+10+(Q*116|0)+(U*58|0)+15|0]=Ya(J,3)|0;da=ia}ha=Ya(J,P)|0;a[$]=d[$]|ha;ha=U+1|0;if(ha>>>0<E>>>0){U=ha;T=da;S=_}else{ba=da;ca=_;break}}}S=Q+1|0;if(S>>>0<N>>>0){D=ba;Q=S;R=ca}else{break}}if((ba|0)!=0&(K|0)==0){c[f+60>>2]=ba;ja=-1}else{ja=K}c[F>>2]=c[F>>2]|M;M=g+32|0;c[M>>2]=c[M>>2]|c[I>>2];Ua(y,c[H>>2]|0);I=Ya(y,32)|0;if((I&-1703936|0)==-1966080){if((I&65536|0)==0){Xa(y,16)}ka=Ya(y,I>>>19&1|8)|0}else{ka=0}I=c[H>>2]|0;y=I-(Wa(J)|0)|0;I=c[G>>2]|0;M=y+I|0;K=ka>>>0>M>>>0?0:ka;ka=M-K|0;do{if((I|0)==0){M=J;ba=c[M+4>>2]|0;c[v>>2]=c[M>>2];c[v+4>>2]=ba;c[f+52>>2]=0;la=ka;ma=56}else{ba=f+52|0;M=c[ba>>2]|0;if(I>>>0>M>>>0){if((ja|0)!=0){oa=ja;pa=y;break}c[f+60>>2]=565;oa=-1;pa=y;break}Ua(w,(c[z>>2]|0)+(M-I)|0);M=c[G>>2]|0;if(!(ka>>>0>M>>>0)){la=0;ma=56;break}R=c[ba>>2]|0;if((ka-M+R|0)>>>0<2568>>>0){M=(c[z>>2]|0)+R|0;R=Wa(J)|0;Q=ka-(c[G>>2]|0)|0;Gb(M|0,R|0,Q)|0;c[ba>>2]=(c[ba>>2]|0)+Q;la=Q;ma=56;break}else{na(41544,41528,2633,41648);return 0}}}while(0);do{if((ma|0)==56){J=y-la|0;if((ja|0)!=0){oa=ja;pa=J;break}I=c[F>>2]|0;Q=I&16384;ba=c[g+20>>2]<<(Q>>>14);R=(ba>>>15&1)+((Q|0)==0?-8:-5)+(ba>>>7&15)|0;ba=2-(I>>>12&1)|0;I=232+(R*12|0)|0;Q=236+(R*12|0)|0;M=240+(R*12|0)|0;R=q;D=o;N=n|0;da=n+4|0;P=x+184|0;ia=g+8|0;O=r;Y=s|0;L=t+2304|0;S=m+8|0;T=m+4|0;U=m|0;ha=k;ga=u|0;X=0;a:while(1){W=(X|0)==0;aa=0;while(1){if(!(aa>>>0<E>>>0)){break}fa=c[I>>2]|0;V=s+(aa<<2)|0;c[V>>2]=fa;ea=x+10+(X*116|0)+(aa*58|0)+9|0;qa=(a[ea]|0)==2;if(qa){ra=c[((a[x+10+(X*116|0)+(aa*58|0)+8|0]&8)==0?Q:M)>>2]|0;c[V>>2]=ra;sa=ra}else{sa=fa}if((c[F>>2]&4096|0)==0){if(W){ta=0}else{ta=d[x+8+aa|0]|0}fa=c[v+4>>2]|0;c[q>>2]=c[v>>2];c[q+4>>2]=fa;fa=e[x+10+(X*116|0)+(aa*58|0)+6>>1]|0;ra=d[200+(fa<<1)|0]|0;V=d[201+(fa<<1)|0]|0;if(qa){fa=(a[x+10+(X*116|0)+(aa*58|0)+8|0]&8)!=0?17:18;ua=0;va=fa;while(1){wa=va-1|0;a[x+10+(X*116|0)+(aa*58|0)+18+ua|0]=Ya(w,ra)|0;if((wa|0)==0){xa=fa;ya=18;break}else{ua=ua+1|0;va=wa}}while(1){va=ya-1|0;a[x+10+(X*116|0)+(aa*58|0)+18+xa|0]=Ya(w,V)|0;if((va|0)==0){break}else{xa=xa+1|0;ya=va}}Hb(fa+18+(x+10+(X*116|0)+(aa*58|0)+18)|0,0,3)|0}else{if((ta&8|0)==0){a[x+10+(X*116|0)+(aa*58|0)+18|0]=Ya(w,ra)|0;a[x+10+(X*116|0)+(aa*58|0)+19|0]=Ya(w,ra)|0;a[x+10+(X*116|0)+(aa*58|0)+20|0]=Ya(w,ra)|0;a[x+10+(X*116|0)+(aa*58|0)+21|0]=Ya(w,ra)|0;a[x+10+(X*116|0)+(aa*58|0)+22|0]=Ya(w,ra)|0;a[x+10+(X*116|0)+(aa*58|0)+23|0]=Ya(w,ra)|0}else{a[x+10+(X*116|0)+(aa*58|0)+18|0]=a[x+10+(aa*58|0)+18|0]|0;a[x+10+(X*116|0)+(aa*58|0)+19|0]=a[x+10+(aa*58|0)+19|0]|0;a[x+10+(X*116|0)+(aa*58|0)+20|0]=a[x+10+(aa*58|0)+20|0]|0;a[x+10+(X*116|0)+(aa*58|0)+21|0]=a[x+10+(aa*58|0)+21|0]|0;a[x+10+(X*116|0)+(aa*58|0)+22|0]=a[x+10+(aa*58|0)+22|0]|0;a[x+10+(X*116|0)+(aa*58|0)+23|0]=a[x+10+(aa*58|0)+23|0]|0}if((ta&4|0)==0){a[x+10+(X*116|0)+(aa*58|0)+24|0]=Ya(w,ra)|0;a[x+10+(X*116|0)+(aa*58|0)+25|0]=Ya(w,ra)|0;a[x+10+(X*116|0)+(aa*58|0)+26|0]=Ya(w,ra)|0;a[x+10+(X*116|0)+(aa*58|0)+27|0]=Ya(w,ra)|0;a[x+10+(X*116|0)+(aa*58|0)+28|0]=Ya(w,ra)|0}else{a[x+10+(X*116|0)+(aa*58|0)+24|0]=a[x+10+(aa*58|0)+24|0]|0;a[x+10+(X*116|0)+(aa*58|0)+25|0]=a[x+10+(aa*58|0)+25|0]|0;a[x+10+(X*116|0)+(aa*58|0)+26|0]=a[x+10+(aa*58|0)+26|0]|0;a[x+10+(X*116|0)+(aa*58|0)+27|0]=a[x+10+(aa*58|0)+27|0]|0;a[x+10+(X*116|0)+(aa*58|0)+28|0]=a[x+10+(aa*58|0)+28|0]|0}if((ta&2|0)==0){a[x+10+(X*116|0)+(aa*58|0)+29|0]=Ya(w,V)|0;a[x+10+(X*116|0)+(aa*58|0)+30|0]=Ya(w,V)|0;a[x+10+(X*116|0)+(aa*58|0)+31|0]=Ya(w,V)|0;a[x+10+(X*116|0)+(aa*58|0)+32|0]=Ya(w,V)|0;a[x+10+(X*116|0)+(aa*58|0)+33|0]=Ya(w,V)|0}else{a[x+10+(X*116|0)+(aa*58|0)+29|0]=a[x+10+(aa*58|0)+29|0]|0;a[x+10+(X*116|0)+(aa*58|0)+30|0]=a[x+10+(aa*58|0)+30|0]|0;a[x+10+(X*116|0)+(aa*58|0)+31|0]=a[x+10+(aa*58|0)+31|0]|0;a[x+10+(X*116|0)+(aa*58|0)+32|0]=a[x+10+(aa*58|0)+32|0]|0;a[x+10+(X*116|0)+(aa*58|0)+33|0]=a[x+10+(aa*58|0)+33|0]|0}if((ta&1|0)==0){a[x+10+(X*116|0)+(aa*58|0)+34|0]=Ya(w,V)|0;a[x+10+(X*116|0)+(aa*58|0)+35|0]=Ya(w,V)|0;a[x+10+(X*116|0)+(aa*58|0)+36|0]=Ya(w,V)|0;a[x+10+(X*116|0)+(aa*58|0)+37|0]=Ya(w,V)|0;a[x+10+(X*116|0)+(aa*58|0)+38|0]=Ya(w,V)|0}else{a[x+10+(X*116|0)+(aa*58|0)+34|0]=a[x+10+(aa*58|0)+34|0]|0;a[x+10+(X*116|0)+(aa*58|0)+35|0]=a[x+10+(aa*58|0)+35|0]|0;a[x+10+(X*116|0)+(aa*58|0)+36|0]=a[x+10+(aa*58|0)+36|0]|0;a[x+10+(X*116|0)+(aa*58|0)+37|0]=a[x+10+(aa*58|0)+37|0]|0;a[x+10+(X*116|0)+(aa*58|0)+38|0]=a[x+10+(aa*58|0)+38|0]|0}a[x+10+(X*116|0)+(aa*58|0)+39|0]=0}za=Va(R,w)|0}else{va=(aa|0)==0;ua=va?0:P;wa=c[ia>>2]|0;Aa=c[v+4>>2]|0;c[r>>2]=c[v>>2];c[r+4>>2]=Aa;Aa=b[x+10+(X*116|0)+(aa*58|0)+6>>1]|0;Ba=Aa&65535;if(qa){Ca=(a[x+10+(X*116|0)+(aa*58|0)+8|0]&8)!=0?2:1}else{Ca=0}do{if((wa&1|0)==0|va){do{if((Aa&65535)>>>0<400>>>0){Da=34736+(Ca<<2)|0;Ea=((Aa&65535)/80|0)&65535;Fa=Ba>>>2&3;Ga=Ba&3;Ha=(Ba>>>4>>>0)%5|0}else{if((Aa&65535)>>>0<500>>>0){Ia=Ba-400|0;Da=34748+(Ca<<2)|0;Ea=(Ia>>>0)/20|0;Fa=Ia&3;Ga=0;Ha=(Ia>>>2>>>0)%5|0;break}else{Ia=Ba-500|0;Ja=x+10+(X*116|0)+(aa*58|0)+8|0;a[Ja]=a[Ja]|4;Da=34760+(Ca<<2)|0;Ea=(Ia>>>0)/3|0;Fa=0;Ga=0;Ha=(Ia>>>0)%3|0;break}}}while(0);if((a[Da]|0)==0){Ka=0}else{Ia=0;Ja=1;while(1){La=Ia+1|0;a[x+10+(X*116|0)+(aa*58|0)+18+Ia|0]=Ya(w,Ea)|0;if(Ja>>>0<(d[Da]|0)>>>0){Ia=La;Ja=Ja+1|0}else{Ka=La;break}}}Ja=Da+1|0;if((a[Ja]|0)==0){Ma=Ka}else{Ia=Ka;La=1;while(1){Na=Ia+1|0;a[x+10+(X*116|0)+(aa*58|0)+18+Ia|0]=Ya(w,Ha)|0;if(La>>>0<(d[Ja]|0)>>>0){Ia=Na;La=La+1|0}else{Ma=Na;break}}}La=Da+2|0;if((a[La]|0)==0){Oa=Ma}else{Ia=Ma;Ja=1;while(1){Na=Ia+1|0;a[x+10+(X*116|0)+(aa*58|0)+18+Ia|0]=Ya(w,Fa)|0;if(Ja>>>0<(d[La]|0)>>>0){Ia=Na;Ja=Ja+1|0}else{Oa=Na;break}}}Ja=Da+3|0;if((a[Ja]|0)==0){Pa=Oa}else{Ia=Oa;La=1;while(1){Na=Ia+1|0;a[x+10+(X*116|0)+(aa*58|0)+18+Ia|0]=Ya(w,Ga)|0;if(La>>>0<(d[Ja]|0)>>>0){Ia=Na;La=La+1|0}else{Pa=Na;break}}}if(!(Pa>>>0<39>>>0)){break}Hb(x+10+(X*116|0)+(aa*58|0)+18+Pa|0,0,39-Pa|0)|0}else{La=Ba>>>1;do{if((Aa&65535)>>>0<360>>>0){Ia=(La>>>0)%36|0;Qa=34772+(Ca<<2)|0;Ra=((Aa&65535)/72|0)&65535;Sa=(Ia>>>0)/6|0;Ta=(Ia>>>0)%6|0}else{if((Aa&65535)>>>0<488>>>0){Ia=La-180|0;Qa=34784+(Ca<<2)|0;Ra=Ia>>>4&3;Sa=Ia>>>2&3;Ta=Ia&3;break}else{Ia=La-244|0;Qa=34796+(Ca<<2)|0;Ra=(Ia>>>0)/3|0;Sa=(Ia>>>0)%3|0;Ta=0;break}}}while(0);La=(1<<Ra)-1|0;if((a[Qa]|0)==0){_a=0}else{Ia=0;Ja=1;while(1){Na=Ya(w,Ra)|0;a[x+10+(X*116|0)+(aa*58|0)+18+Ia|0]=Na;$a=Ia+1|0;a[ua+18+Ia|0]=(Na|0)==(La|0)|0;if(Ja>>>0<(d[Qa]|0)>>>0){Ia=$a;Ja=Ja+1|0}else{_a=$a;break}}}Ja=(1<<Sa)-1|0;Ia=Qa+1|0;if((a[Ia]|0)==0){ab=_a}else{La=_a;$a=1;while(1){Na=Ya(w,Sa)|0;a[x+10+(X*116|0)+(aa*58|0)+18+La|0]=Na;bb=La+1|0;a[ua+18+La|0]=(Na|0)==(Ja|0)|0;if($a>>>0<(d[Ia]|0)>>>0){La=bb;$a=$a+1|0}else{ab=bb;break}}}$a=(1<<Ta)-1|0;La=Qa+2|0;if((a[La]|0)==0){cb=ab}else{Ia=ab;Ja=1;while(1){bb=Ya(w,Ta)|0;a[x+10+(X*116|0)+(aa*58|0)+18+Ia|0]=bb;Na=Ia+1|0;a[ua+18+Ia|0]=(bb|0)==($a|0)|0;if(Ja>>>0<(d[La]|0)>>>0){Ia=Na;Ja=Ja+1|0}else{cb=Na;break}}}Ja=Qa+3|0;if((a[Ja]|0)==0){db=cb}else{Ia=cb;La=1;while(1){$a=Ya(w,0)|0;a[x+10+(X*116|0)+(aa*58|0)+18+Ia|0]=$a;Na=Ia+1|0;a[ua+18+Ia|0]=($a|0)==0|0;if(La>>>0<(d[Ja]|0)>>>0){Ia=Na;La=La+1|0}else{db=Na;break}}}if(db>>>0<39>>>0){eb=db}else{break}while(1){a[x+10+(X*116|0)+(aa*58|0)+18+eb|0]=0;La=eb+1|0;a[ua+18+eb|0]=0;if(La>>>0<39>>>0){eb=La}else{break}}}}while(0);za=Va(O,w)|0}ua=t+(aa*2304|0)|0;Aa=(e[x+10+(X*116|0)+(aa*58|0)>>1]|0)-za|0;b:do{if((Aa|0)<0){fb=566}else{Ba=(e[x+10+(X*116|0)+(aa*58|0)+4>>1]|0)-210|0;va=x+10+(X*116|0)+(aa*58|0)+8|0;wa=d[va]|0;qa=(wa>>>1&1)+1|0;do{if((a[ea]|0)==2){if((wa&8|0)==0){gb=0;jb=0}else{V=wa<<29>>31;ra=0;fa=0;while(1){c[n+(fa<<2)>>2]=Ba-((d[34616+fa|0]&V)+(d[x+10+(X*116|0)+(aa*58|0)+18+fa|0]|0)<<qa);La=fa+1|0;Ia=(d[sa+fa|0]|0)+ra|0;if(Ia>>>0<36>>>0){ra=Ia;fa=La}else{gb=La;jb=Ia;break}}}fa=Ba-(d[x+10+(X*116|0)+(aa*58|0)+13|0]<<3)|0;ra=Ba-(d[x+10+(X*116|0)+(aa*58|0)+14|0]<<3)|0;V=Ba-(d[x+10+(X*116|0)+(aa*58|0)+15|0]<<3)|0;if(jb>>>0<576>>>0){kb=jb;lb=gb}else{break}while(1){c[n+(lb<<2)>>2]=fa-(d[x+10+(X*116|0)+(aa*58|0)+18+lb|0]<<qa);Ia=lb+1|0;c[n+(Ia<<2)>>2]=ra-(d[x+10+(X*116|0)+(aa*58|0)+18+Ia|0]<<qa);Ia=lb+2|0;c[n+(Ia<<2)>>2]=V-(d[x+10+(X*116|0)+(aa*58|0)+18+Ia|0]<<qa);Ia=((d[sa+lb|0]|0)*3|0)+kb|0;if(Ia>>>0<576>>>0){kb=Ia;lb=lb+3|0}else{break}}}else{if((wa&4|0)==0){V=0;do{c[n+(V<<2)>>2]=Ba-(d[x+10+(X*116|0)+(aa*58|0)+18+V|0]<<qa);V=V+1|0;}while(V>>>0<22>>>0)}else{V=0;do{c[n+(V<<2)>>2]=Ba-((d[34616+V|0]|0)+(d[x+10+(X*116|0)+(aa*58|0)+18+V|0]|0)<<qa);V=V+1|0;}while(V>>>0<22>>>0)}}}while(0);qa=c[v+4>>2]|0;c[o>>2]=c[v>>2];c[o+4>>2]=qa;Xa(w,Aa);Ba=qa>>>16|0<<16;qa=(31-Ba&-8)+Ba|0;Ba=Ya(D,qa)|0;wa=d[x+10+(X*116|0)+(aa*58|0)+10|0]|0;V=c[34816+(wa<<3)>>2]|0;if((V|0)==0){fb=567;break}ra=t+(aa*2304|0)+(d[sa]<<2)|0;fa=sa+1|0;Ia=Aa-qa|0;La=c[N>>2]|0;Ja=b[x+10+(X*116|0)+(aa*58|0)+2>>1]|0;c:do{if(Ja<<16>>16==0){mb=La;nb=da;ob=Ia;pb=qa;qb=ua;rb=ra;sb=Ba;tb=fa}else{Na=x+10+(X*116|0)+(aa*58|0)+17|0;$a=La;bb=da;ub=Ia;vb=qa;wb=ua;xb=ra;yb=Ba;zb=0;Ab=(d[x+10+(X*116|0)+(aa*58|0)+16|0]|0)+1|0;Bb=V;Cb=e[34820+(wa<<3)>>1]|0;Eb=e[34822+(wa<<3)>>1]|0;Jb=0;Kb=fa;Lb=Ja&65535;while(1){Mb=Lb-1|0;if((ub+vb|0)<=0){mb=$a;nb=bb;ob=ub;pb=vb;qb=wb;rb=xb;sb=yb;tb=Kb;break c}if((wb|0)==(xb|0)){Nb=Kb+1|0;Ob=xb+(d[Kb]<<2)|0;Pb=Ab-1|0;if((Pb|0)==0){if((zb|0)==0){Qb=(d[Na]|0)+1|0}else{Qb=0}Rb=zb+1|0;Sb=d[x+10+(X*116|0)+(aa*58|0)+10+Rb|0]|0;Tb=c[34816+(Sb<<3)>>2]|0;if((Tb|0)==0){fb=567;break b}Ub=e[34822+(Sb<<3)>>1]|0;Vb=e[34820+(Sb<<3)>>1]|0;Wb=Tb;Xb=Qb;Yb=Rb}else{Ub=Eb;Vb=Cb;Wb=Bb;Xb=Pb;Yb=zb}Pb=c[bb>>2]|0;Zb=Nb;_b=($a|0)==(Pb|0)?Jb:0;$b=Ub;ac=Vb;bc=Wb;cc=Xb;dc=Yb;ec=Ob;fc=bb+4|0;gc=Pb}else{Zb=Kb;_b=Jb;$b=Eb;ac=Cb;bc=Bb;cc=Ab;dc=zb;ec=xb;fc=bb;gc=$a}if((vb|0)<21){Pb=31-vb&-8;hc=Ya(D,Pb)|0|yb<<Pb;ic=Pb+vb|0;jc=ub-Pb|0}else{hc=yb;ic=vb;jc=ub}Pb=bc+((hc>>>((ic-$b|0)>>>0)&(1<<$b)-1)<<1)|0;Ob=b[Pb>>1]|0;if((Ob&1)==0){Nb=ic;Rb=$b;Tb=Ob;while(1){Sb=Nb-Rb|0;kc=(Tb&65535)>>>1&7;lc=bc+((hc>>>((Sb-kc|0)>>>0)&(1<<kc)-1)+((Tb&65535)>>>4&65535)<<1)|0;mc=b[lc>>1]|0;if((mc&1)==0){Nb=Sb;Rb=kc;Tb=mc}else{nc=Sb;oc=lc;pc=mc;break}}}else{nc=ic;oc=Pb;pc=Ob}Tb=nc-((pc&65535)>>>1&7)|0;Rb=(pc&65535)>>>4&15;Nb=Rb&65535;d:do{if((ac|0)==0){if(Rb<<16>>16==0){qc=_b;rc=Tb;sc=0}else{mc=1<<Nb;if((mc&_b|0)==0){lc=mc|_b;mc=(gc|0)%4|0;Sb=c[1544+(Nb<<2)>>2]&134217727;kc=((e[1546+(Nb<<2)>>1]|0)>>>11&65535)+((gc|0)/4|0)|0;do{if((kc|0)<0){tc=-kc|0;if(tc>>>0>31>>>0){uc=0;break}uc=(1<<~kc)+Sb>>tc}else{uc=(kc|0)>4?2147483647:Sb<<kc}}while(0);if((mc|0)==0){vc=uc}else{vc=Z((c[34376+(mc+3<<2)>>2]|0)+32768>>16,uc+2048>>12)|0}c[p+(Nb<<2)>>2]=vc;wc=vc;xc=lc}else{wc=c[p+(Nb<<2)>>2]|0;xc=_b}kc=Tb-1|0;qc=xc;rc=kc;sc=(1<<kc&hc|0)!=0?-wc|0:wc}c[wb>>2]=sc;kc=(e[oc>>1]|0)>>>8&15;Sb=kc&65535;if(kc<<16>>16==0){c[wb+4>>2]=0;yc=qc;zc=hc;Ac=rc;Bc=jc;break}kc=1<<Sb;if((kc&qc|0)==0){tc=kc|qc;kc=(gc|0)%4|0;Cc=c[1544+(Sb<<2)>>2]&134217727;Dc=((e[1546+(Sb<<2)>>1]|0)>>>11&65535)+((gc|0)/4|0)|0;do{if((Dc|0)<0){Ec=-Dc|0;if(Ec>>>0>31>>>0){Fc=0;break}Fc=(1<<~Dc)+Cc>>Ec}else{Fc=(Dc|0)>4?2147483647:Cc<<Dc}}while(0);if((kc|0)==0){Gc=Fc}else{Gc=Z((c[34376+(kc+3<<2)>>2]|0)+32768>>16,Fc+2048>>12)|0}c[p+(Sb<<2)>>2]=Gc;Hc=Gc;Ic=tc}else{Hc=c[p+(Sb<<2)>>2]|0;Ic=qc}Dc=rc-1|0;c[wb+4>>2]=(1<<Dc&hc|0)!=0?-Hc|0:Hc;yc=Ic;zc=hc;Ac=Dc;Bc=jc}else{do{if((Nb|0)==15){if(Tb>>>0<(ac+2|0)>>>0){Jc=Ya(D,16)|0|hc<<16;Kc=Tb+16|0;Lc=jc-16|0}else{Jc=hc;Kc=Tb;Lc=jc}Dc=Kc-ac|0;Cc=(Jc>>>(Dc>>>0)&(1<<ac)-1)+15|0;lc=(gc|0)%4|0;mc=c[1544+(Cc<<2)>>2]&134217727;Ec=((e[1546+(Cc<<2)>>1]|0)>>>11&65535)+((gc|0)/4|0)|0;do{if((Ec|0)<0){Cc=-Ec|0;if(Cc>>>0>31>>>0){Mc=0;break}Mc=(1<<~Ec)+mc>>Cc}else{Mc=(Ec|0)>4?2147483647:mc<<Ec}}while(0);if((lc|0)==0){Nc=Mc;Oc=_b;Pc=Jc;Qc=Dc;Rc=Lc;ma=162;break}Nc=Z((c[34376+(lc+3<<2)>>2]|0)+32768>>16,Mc+2048>>12)|0;Oc=_b;Pc=Jc;Qc=Dc;Rc=Lc;ma=162}else if((Nb|0)==0){Sc=_b;Tc=hc;Uc=Tb;Vc=jc;Wc=0}else{Ec=1<<Nb;if((Ec&_b|0)!=0){Nc=c[p+(Nb<<2)>>2]|0;Oc=_b;Pc=hc;Qc=Tb;Rc=jc;ma=162;break}mc=Ec|_b;Ec=(gc|0)%4|0;Cc=c[1544+(Nb<<2)>>2]&134217727;Xc=((e[1546+(Nb<<2)>>1]|0)>>>11&65535)+((gc|0)/4|0)|0;do{if((Xc|0)<0){Yc=-Xc|0;if(Yc>>>0>31>>>0){Zc=0;break}Zc=(1<<~Xc)+Cc>>Yc}else{Zc=(Xc|0)>4?2147483647:Cc<<Xc}}while(0);if((Ec|0)==0){_c=Zc}else{_c=Z((c[34376+(Ec+3<<2)>>2]|0)+32768>>16,Zc+2048>>12)|0}c[p+(Nb<<2)>>2]=_c;Nc=_c;Oc=mc;Pc=hc;Qc=Tb;Rc=jc;ma=162}}while(0);if((ma|0)==162){ma=0;Sb=Qc-1|0;Sc=Oc;Tc=Pc;Uc=Sb;Vc=Rc;Wc=(1<<Sb&Pc|0)!=0?-Nc|0:Nc}c[wb>>2]=Wc;Sb=(e[oc>>1]|0)>>>8&15;do{if((Sb|0)==0){c[wb+4>>2]=0;yc=Sc;zc=Tc;Ac=Uc;Bc=Vc;break d}else if((Sb|0)==15){if(Uc>>>0<(ac+1|0)>>>0){$c=Ya(D,16)|0|Tc<<16;ad=Uc+16|0;bd=Vc-16|0}else{$c=Tc;ad=Uc;bd=Vc}tc=ad-ac|0;kc=($c>>>(tc>>>0)&(1<<ac)-1)+15|0;Xc=(gc|0)%4|0;Cc=c[1544+(kc<<2)>>2]&134217727;Dc=((e[1546+(kc<<2)>>1]|0)>>>11&65535)+((gc|0)/4|0)|0;do{if((Dc|0)<0){kc=-Dc|0;if(kc>>>0>31>>>0){cd=0;break}cd=(1<<~Dc)+Cc>>kc}else{cd=(Dc|0)>4?2147483647:Cc<<Dc}}while(0);if((Xc|0)==0){dd=cd;ed=Sc;fd=$c;gd=tc;hd=bd;break}dd=Z((c[34376+(Xc+3<<2)>>2]|0)+32768>>16,cd+2048>>12)|0;ed=Sc;fd=$c;gd=tc;hd=bd}else{Dc=1<<Sb;if((Dc&Sc|0)!=0){dd=c[p+(Sb<<2)>>2]|0;ed=Sc;fd=Tc;gd=Uc;hd=Vc;break}Cc=Dc|Sc;Dc=(gc|0)%4|0;mc=c[1544+(Sb<<2)>>2]&134217727;Ec=((e[1546+(Sb<<2)>>1]|0)>>>11&65535)+((gc|0)/4|0)|0;do{if((Ec|0)<0){kc=-Ec|0;if(kc>>>0>31>>>0){id=0;break}id=(1<<~Ec)+mc>>kc}else{id=(Ec|0)>4?2147483647:mc<<Ec}}while(0);if((Dc|0)==0){jd=id}else{jd=Z((c[34376+(Dc+3<<2)>>2]|0)+32768>>16,id+2048>>12)|0}c[p+(Sb<<2)>>2]=jd;dd=jd;ed=Cc;fd=Tc;gd=Uc;hd=Vc}}while(0);Sb=gd-1|0;c[wb+4>>2]=(1<<Sb&fd|0)!=0?-dd|0:dd;yc=ed;zc=fd;Ac=Sb;Bc=hd}}while(0);Tb=wb+8|0;if((Mb|0)==0){mb=gc;nb=fc;ob=Bc;pb=Ac;qb=Tb;rb=ec;sb=zc;tb=Zb;break}else{$a=gc;bb=fc;ub=Bc;vb=Ac;wb=Tb;xb=ec;yb=zc;zb=dc;Ab=cc;Bb=bc;Cb=ac;Eb=$b;Jb=yc;Kb=Zb;Lb=Mb}}}}while(0);Ja=ob+pb|0;if((Ja|0)<0){fb=568;break}fa=c[34808+((a[va]&1)<<2)>>2]|0;wa=(mb|0)%4|0;V=(mb|0)/4|0;Ba=V+2|0;do{if((Ba|0)<0){ra=-2-V|0;if(ra>>>0>31>>>0){kd=0;break}kd=(1<<-3-V)+67108864>>ra}else{kd=(Ba|0)>4?2147483647:67108864<<Ba}}while(0);if((wa|0)==0){ld=kd}else{ld=Z((c[34376+(wa+3<<2)>>2]|0)+32768>>16,kd+2048>>12)|0}Ba=t+(aa*2304|0)+2288|0;if((Ja|0)<1|qb>>>0>Ba>>>0){md=ob;nd=qb;od=Ja}else{V=mb;va=nb;ra=ob;qa=pb;Ia=qb;La=rb;Lb=sb;Kb=tb;Jb=ld;while(1){if((qa|0)<10){pd=Ya(D,16)|0|Lb<<16;qd=qa+16|0;rd=ra-16|0}else{pd=Lb;qd=qa;rd=ra}Eb=qd-4|0;Cb=fa+((pd>>>(Eb>>>0)&15)<<1)|0;Bb=b[Cb>>1]|0;if((Bb&1)==0){Ab=(Bb&65535)>>>1&7;zb=fa+((pd>>>((Eb-Ab|0)>>>0)&(1<<Ab)-1)+((Bb&65535)>>>4&65535)<<1)|0;sd=zb;td=Eb;ud=b[zb>>1]|0}else{sd=Cb;td=qd;ud=Bb}Bb=sd;Cb=td-((ud&65535)>>>1&7)|0;if((Ia|0)==(La|0)){zb=Kb+1|0;Eb=La+(d[Kb]<<2)|0;Ab=c[va>>2]|0;do{if((V|0)==(Ab|0)){vd=Jb;wd=V}else{yb=(Ab|0)%4|0;xb=(Ab|0)/4|0;wb=xb+2|0;do{if((wb|0)<0){vb=-2-xb|0;if(vb>>>0>31>>>0){xd=0;break}xd=(1<<-3-xb)+67108864>>vb}else{xd=(wb|0)>4?2147483647:67108864<<wb}}while(0);if((yb|0)==0){vd=xd;wd=Ab;break}vd=Z((c[34376+(yb+3<<2)>>2]|0)+32768>>16,xd+2048>>12)|0;wd=Ab}}while(0);yd=vd;zd=zb;Ad=Eb;Bd=va+4|0;Cd=wd}else{yd=Jb;zd=Kb;Ad=La;Bd=va;Cd=V}if((ud&16)==0){Dd=0;Ed=Cb}else{Ab=Cb-1|0;Dd=(1<<Ab&pd|0)!=0?-yd|0:yd;Ed=Ab}c[Ia>>2]=Dd;if((b[Bb>>1]&32)==0){Fd=0;Gd=Ed}else{Ab=Ed-1|0;Fd=(1<<Ab&pd|0)!=0?-yd|0:yd;Gd=Ab}c[Ia+4>>2]=Fd;Ab=Ia+8|0;if((Ab|0)==(Ad|0)){wb=zd+1|0;xb=Ad+(d[zd]<<2)|0;Mb=c[Bd>>2]|0;do{if((Cd|0)==(Mb|0)){Hd=yd;Id=Cd}else{vb=(Mb|0)%4|0;ub=(Mb|0)/4|0;bb=ub+2|0;do{if((bb|0)<0){$a=-2-ub|0;if($a>>>0>31>>>0){Jd=0;break}Jd=(1<<-3-ub)+67108864>>$a}else{Jd=(bb|0)>4?2147483647:67108864<<bb}}while(0);if((vb|0)==0){Hd=Jd;Id=Mb;break}Hd=Z((c[34376+(vb+3<<2)>>2]|0)+32768>>16,Jd+2048>>12)|0;Id=Mb}}while(0);Kd=Hd;Ld=wb;Md=xb;Nd=Bd+4|0;Od=Id}else{Kd=yd;Ld=zd;Md=Ad;Nd=Bd;Od=Cd}if((b[Bb>>1]&64)==0){Pd=0;Qd=Gd}else{Mb=Gd-1|0;Pd=(1<<Mb&pd|0)!=0?-Kd|0:Kd;Qd=Mb}c[Ab>>2]=Pd;if((b[Bb>>1]&128)==0){Rd=0;Sd=Qd}else{Mb=Qd-1|0;Rd=(1<<Mb&pd|0)!=0?-Kd|0:Kd;Sd=Mb}c[Ia+12>>2]=Rd;Mb=Ia+16|0;Cb=Sd+rd|0;if((Cb|0)<1|Mb>>>0>Ba>>>0){md=rd;nd=Mb;od=Cb;break}else{V=Od;va=Nd;ra=rd;qa=Sd;Ia=Mb;La=Md;Lb=pd;Kb=Ld;Jb=Kd}}}Jb=(od|0)<0?nd-16|0:nd;if((-md|0)>=65){ma=248;break a}Kb=t+(aa*2304|0)+2304|0;if(Jb>>>0<Kb>>>0){Td=Jb}else{fb=0;break}while(1){c[Td>>2]=0;c[Td+4>>2]=0;Jb=Td+8|0;if(Jb>>>0<Kb>>>0){Td=Jb}else{fb=0;break}}}}while(0);if((fb|0)==0){aa=aa+1|0}else{Ud=fb;break a}}do{if((c[C>>2]|0)==2){aa=c[ia>>2]|0;if((aa|0)==0){break}W=c[Y>>2]|0;_=a[x+10+(X*116|0)+9|0]|0;if(!(_<<24>>24==(a[x+10+(X*116|0)+67|0]|0))){Ud=569;break a}$=a[x+10+(X*116|0)+66|0]|0;if(!((($^a[x+10+(X*116|0)+8|0])&8)==0)){Ud=569;break a}ua=aa&65535;Aa=0;do{b[l+(Aa<<1)>>1]=ua;Aa=Aa+1|0;}while(Aa>>>0<39>>>0);e:do{if((aa&1|0)!=0){Aa=c[F>>2]|0;c[F>>2]=Aa|256;f:do{if(_<<24>>24==2){c[S>>2]=0;c[T>>2]=0;c[U>>2]=0;if(($&8)==0){Vd=0;Wd=0;Xd=L;Yd=0;ma=265}else{ea=0;Kb=L;Jb=0;Lb=0;while(1){Zd=Lb+1|0;La=d[W+Lb|0]|0;Ia=0;while(1){if(!(Ia>>>0<La>>>0)){_d=ea;break}if((c[Kb+(Ia<<2)>>2]|0)==0){Ia=Ia+1|0}else{_d=Zd;break}}$d=Kb+(La<<2)|0;ae=La+Jb|0;if(ae>>>0<36>>>0){ea=_d;Kb=$d;Jb=ae;Lb=Zd}else{break}}if(ae>>>0<576>>>0){Vd=Zd;Wd=_d;Xd=$d;Yd=ae;ma=265}else{be=0;ce=Zd;de=_d}}if((ma|0)==265){ma=0;Lb=0;Jb=0;Kb=Xd;ea=Yd;Bb=Vd;while(1){Ab=Bb+1|0;xb=d[W+Bb|0]|0;wb=0;while(1){if(!(wb>>>0<xb>>>0)){ee=Lb;break}if((c[Kb+(wb<<2)>>2]|0)==0){wb=wb+1|0}else{ma=269;break}}if((ma|0)==269){ma=0;c[m+(Jb<<2)>>2]=Ab;ee=Ab}wb=xb+ea|0;if(wb>>>0<576>>>0){Lb=ee;Jb=((Jb+1|0)>>>0)%3|0;Kb=Kb+(xb<<2)|0;ea=wb;Bb=Ab}else{be=ee;ce=Vd;de=Wd;break}}}Bb=(be|0)==0?de:ce;if((Bb|0)!=0){ea=ua&-2;Kb=0;do{b[l+(Kb<<1)>>1]=ea;Kb=Kb+1|0;}while(Kb>>>0<Bb>>>0)}if(!(ce>>>0<be>>>0)){break}Bb=ua&-2;Kb=0;ea=ce;while(1){if(ea>>>0<(c[m+(Kb<<2)>>2]|0)>>>0){b[l+(ea<<1)>>1]=Bb}Jb=ea+1|0;if(!(Jb>>>0<be>>>0)){break f}Kb=((Kb+1|0)>>>0)%3|0;ea=Jb}}else{ea=0;Kb=L;Bb=0;Jb=0;while(1){Lb=Jb+1|0;wb=d[W+Jb|0]|0;La=0;while(1){if(!(La>>>0<wb>>>0)){fe=ea;break}if((c[Kb+(La<<2)>>2]|0)==0){La=La+1|0}else{fe=Lb;break}}La=wb+Bb|0;if(La>>>0<576>>>0){ea=fe;Kb=Kb+(wb<<2)|0;Bb=La;Jb=Lb}else{break}}if((fe|0)==0){break}Jb=ua&-2;Bb=0;do{b[l+(Bb<<1)>>1]=Jb;Bb=Bb+1|0;}while(Bb>>>0<fe>>>0)}}while(0);if((Aa&4096|0)==0){Bb=0;Jb=0;while(1){Kb=a[W+Jb|0]|0;ea=Kb&255;La=l+(Jb<<1)|0;Ab=b[La>>1]|0;do{if(!((Ab&1)==0)){xb=a[x+10+(X*116|0)+76+Jb|0]|0;Ia=xb&255;if((xb&255)>>>0>6>>>0){b[La>>1]=Ab&-2;break}if(Kb<<24>>24==0){break}xb=(c[35128+(Ia<<2)>>2]|0)+32768>>16;vb=(c[35128+(6-Ia<<2)>>2]|0)+32768>>16;Ia=0;do{qa=Ia+Bb|0;ra=t+(qa<<2)|0;va=(c[ra>>2]|0)+2048>>12;c[ra>>2]=Z(va,xb)|0;c[t+2304+(qa<<2)>>2]=Z(va,vb)|0;Ia=Ia+1|0;}while(Ia>>>0<ea>>>0)}}while(0);Kb=ea+Bb|0;if(Kb>>>0<576>>>0){Bb=Kb;Jb=Jb+1|0}else{break e}}}Jb=b[x+10+(X*116|0)+64>>1]&1;Bb=X+1|0;Aa=0;Kb=0;while(1){Ab=a[W+Kb|0]|0;La=Ab&255;Ia=l+(Kb<<1)|0;vb=b[Ia>>1]|0;do{if(!((vb&1)==0)){if((a[x+10+(Bb*116|0)+76+Kb|0]|0)!=0){b[Ia>>1]=vb&-2;break}xb=a[x+10+(X*116|0)+76+Kb|0]|0;Lb=xb&255;if(Ab<<24>>24==0){break}wb=xb<<24>>24==0;xb=35160+(Jb*60|0)+((Lb-1|0)>>>1<<2)|0;va=(Lb&1|0)==0;Lb=0;do{qa=Lb+Aa|0;ra=t+(qa<<2)|0;V=c[ra>>2]|0;do{if(wb){c[t+2304+(qa<<2)>>2]=V}else{Ba=Z((c[xb>>2]|0)+32768>>16,V+2048>>12)|0;if(va){c[t+2304+(qa<<2)>>2]=Ba;break}else{c[ra>>2]=Ba;c[t+2304+(qa<<2)>>2]=V;break}}}while(0);Lb=Lb+1|0;}while(Lb>>>0<La>>>0)}}while(0);Ab=La+Aa|0;if(Ab>>>0<576>>>0){Aa=Ab;Kb=Kb+1|0}else{break}}}}while(0);if((aa&2|0)==0){break}c[F>>2]=c[F>>2]|512;ua=0;$=0;while(1){_=a[W+$|0]|0;Kb=_&255;if(!((b[l+($<<1)>>1]|0)!=2|_<<24>>24==0)){_=0;do{Aa=_+ua|0;Jb=t+(Aa<<2)|0;Bb=t+2304+(Aa<<2)|0;Aa=c[Bb>>2]|0;Ab=(c[Jb>>2]|0)+2048|0;c[Jb>>2]=(Ab+Aa>>12)*2896|0;c[Bb>>2]=(Ab-Aa>>12)*2896|0;_=_+1|0;}while(_>>>0<Kb>>>0)}_=Kb+ua|0;if(_>>>0<576>>>0){ua=_;$=$+1|0}else{break}}}}while(0);$=X*18|0;ua=$|1;W=$+3|0;aa=$+5|0;_=$+7|0;Aa=$+9|0;Ab=$+11|0;Bb=$+13|0;Jb=$+15|0;vb=$+17|0;Ia=$+2|0;ea=$+4|0;Lb=$+6|0;va=$+8|0;xb=$+10|0;wb=$+12|0;V=$+14|0;qa=$+16|0;ra=0;do{Ba=x+10+(X*116|0)+(ra*58|0)+9|0;fa=t+(ra*2304|0)|0;do{if((a[Ba]|0)==2){Ja=c[s+(ra<<2)>>2]|0;wa=x+10+(X*116|0)+(ra*58|0)+8|0;Mb=(a[wa]&8)==0;if(Mb){ge=0;he=Ja}else{Cb=Ja;Ja=0;while(1){Eb=Cb+1|0;zb=(d[Cb]|0)+Ja|0;if(zb>>>0<36>>>0){Cb=Eb;Ja=zb}else{ge=2;he=Eb;break}}}Hb(ha|0,0,12)|0;c[U>>2]=ge;c[T>>2]=ge;c[S>>2]=ge;Ja=ge*18|0;Cb=he+1|0;Kb=Ja;Eb=d[he]|0;zb=0;while(1){if((Eb|0)==0){ie=((zb+1|0)>>>0)%3|0;je=d[Cb]|0;ke=Cb+1|0}else{ie=zb;je=Eb;ke=Cb}bb=c[t+(ra*2304|0)+(Kb<<2)>>2]|0;ub=k+(ie<<2)|0;yb=c[ub>>2]|0;$a=yb+1|0;c[ub>>2]=$a;Na=m+(ie<<2)|0;Tb=c[Na>>2]|0;c[j+(Tb*72|0)+(ie*24|0)+(yb<<2)>>2]=bb;if(($a|0)==6){c[ub>>2]=0;c[Na>>2]=Tb+1}Tb=Kb+1|0;if(Tb>>>0<576>>>0){Cb=ke;Kb=Tb;Eb=je-1|0;zb=ie}else{break}}Gb(t+(ra*2304|0)+(Ja<<2)|0,j+(ge*72|0)|0,576-Ja<<2)|0;if(Mb){le=wa;break}zb=t+(ra*2304|0)+144|0;Eb=fa;Kb=t+(ra*2304|0)+72|0;while(1){Cb=0;do{Tb=Eb+(17-Cb<<2)|0;Na=c[Tb>>2]|0;ub=Eb+(Cb+18<<2)|0;$a=c[ub>>2]|0;if(($a|Na|0)!=0){bb=Na+2048>>12;Na=(c[39928+(Cb<<2)>>2]|0)+32768>>16;yb=Z(Na,bb)|0;Nb=(c[40472+(Cb<<2)>>2]|0)+32768>>16;c[Tb>>2]=(Z(Nb,2048-$a>>12)|0)+yb;c[ub>>2]=(Z(Nb,bb)|0)+(Z(Na,$a+2048>>12)|0)}Cb=Cb+1|0;}while((Cb|0)<8);Cb=Kb+72|0;if(Cb>>>0<zb>>>0){Eb=Kb;Kb=Cb}else{le=wa;break}}}else{wa=t+(ra*2304|0)+2304|0;Kb=fa;Eb=t+(ra*2304|0)+72|0;while(1){zb=0;do{Mb=Kb+(17-zb<<2)|0;Ja=c[Mb>>2]|0;Cb=Kb+(zb+18<<2)|0;La=c[Cb>>2]|0;if((La|Ja|0)!=0){$a=Ja+2048>>12;Ja=(c[39928+(zb<<2)>>2]|0)+32768>>16;Na=Z(Ja,$a)|0;bb=(c[40472+(zb<<2)>>2]|0)+32768>>16;c[Mb>>2]=(Z(bb,2048-La>>12)|0)+Na;c[Cb>>2]=(Z(bb,$a)|0)+(Z(Ja,La+2048>>12)|0)}zb=zb+1|0;}while((zb|0)<8);zb=Eb+72|0;if(zb>>>0<wa>>>0){Kb=Eb;Eb=zb}else{break}}le=x+10+(X*116|0)+(ra*58|0)+8|0}}while(0);Eb=a[Ba]|0;Kb=a[le]&8;if(Eb<<24>>24==2&Kb<<24>>24==0){ib(fa,ga);wa=c[A>>2]|0;zb=0;do{La=wa+(ra*2304|0)+(zb<<2)|0;c[g+48+(ra*4608|0)+(zb+$<<7)>>2]=(c[La>>2]|0)+(c[u+(zb<<2)>>2]|0);c[La>>2]=c[u+(zb+18<<2)>>2];zb=zb+1|0;}while(zb>>>0<18>>>0);ib(t+(ra*2304|0)+72|0,ga);zb=c[A>>2]|0;wa=0;do{La=zb+(ra*2304|0)+72+(wa<<2)|0;c[g+48+(ra*4608|0)+(wa+$<<7)+4>>2]=(c[La>>2]|0)+(c[u+(wa<<2)>>2]|0);c[La>>2]=c[u+(wa+18<<2)>>2];wa=wa+1|0;}while(wa>>>0<18>>>0)}else{wa=Kb<<24>>24==0?Eb&255:0;hb(fa,ga,wa);zb=c[A>>2]|0;La=0;do{Ja=zb+(ra*2304|0)+(La<<2)|0;c[g+48+(ra*4608|0)+(La+$<<7)>>2]=(c[Ja>>2]|0)+(c[u+(La<<2)>>2]|0);c[Ja>>2]=c[u+(La+18<<2)>>2];La=La+1|0;}while(La>>>0<18>>>0);hb(t+(ra*2304|0)+72|0,ga,wa);La=c[A>>2]|0;zb=0;do{fa=La+(ra*2304|0)+72+(zb<<2)|0;c[g+48+(ra*4608|0)+(zb+$<<7)+4>>2]=(c[fa>>2]|0)+(c[u+(zb<<2)>>2]|0);c[fa>>2]=c[u+(zb+18<<2)>>2];zb=zb+1|0;}while(zb>>>0<18>>>0)}zb=g+48+(ra*4608|0)+(ua<<7)+4|0;La=g+48+(ra*4608|0)+(W<<7)+4|0;wa=c[La>>2]|0;c[zb>>2]=-(c[zb>>2]|0);zb=g+48+(ra*4608|0)+(aa<<7)+4|0;fa=c[zb>>2]|0;c[La>>2]=-wa;wa=g+48+(ra*4608|0)+(_<<7)+4|0;La=c[wa>>2]|0;c[zb>>2]=-fa;fa=g+48+(ra*4608|0)+(Aa<<7)+4|0;zb=c[fa>>2]|0;c[wa>>2]=-La;La=g+48+(ra*4608|0)+(Ab<<7)+4|0;wa=c[La>>2]|0;c[fa>>2]=-zb;zb=g+48+(ra*4608|0)+(Bb<<7)+4|0;fa=c[zb>>2]|0;c[La>>2]=-wa;wa=g+48+(ra*4608|0)+(Jb<<7)+4|0;La=c[wa>>2]|0;c[zb>>2]=-fa;fa=g+48+(ra*4608|0)+(vb<<7)+4|0;zb=c[fa>>2]|0;c[wa>>2]=-La;c[fa>>2]=-zb;zb=576;while(1){if(!(zb>>>0>36>>>0)){break}fa=zb-1|0;if((c[t+(ra*2304|0)+(fa<<2)>>2]|0)==0){zb=fa}else{break}}fa=32-(((576-zb|0)>>>0)/18|0)|0;La=a[Ba]|0;wa=fa>>>0>2>>>0;g:do{if(La<<24>>24==2){if(wa){me=2;ne=36}else{oe=fa;ma=362;break}while(1){ib(t+(ra*2304|0)+(ne<<2)|0,ga);Eb=c[A>>2]|0;Kb=0;do{Ja=Eb+(ra*2304|0)+(me*72|0)+(Kb<<2)|0;c[g+48+(ra*4608|0)+(Kb+$<<7)+(me<<2)>>2]=(c[Ja>>2]|0)+(c[u+(Kb<<2)>>2]|0);c[Ja>>2]=c[u+(Kb+18<<2)>>2];Kb=Kb+1|0;}while(Kb>>>0<18>>>0);if((me&1|0)!=0){Kb=g+48+(ra*4608|0)+(ua<<7)+(me<<2)|0;Eb=g+48+(ra*4608|0)+(W<<7)+(me<<2)|0;Ja=c[Eb>>2]|0;c[Kb>>2]=-(c[Kb>>2]|0);Kb=g+48+(ra*4608|0)+(aa<<7)+(me<<2)|0;$a=c[Kb>>2]|0;c[Eb>>2]=-Ja;Ja=g+48+(ra*4608|0)+(_<<7)+(me<<2)|0;Eb=c[Ja>>2]|0;c[Kb>>2]=-$a;$a=g+48+(ra*4608|0)+(Aa<<7)+(me<<2)|0;Kb=c[$a>>2]|0;c[Ja>>2]=-Eb;Eb=g+48+(ra*4608|0)+(Ab<<7)+(me<<2)|0;Ja=c[Eb>>2]|0;c[$a>>2]=-Kb;Kb=g+48+(ra*4608|0)+(Bb<<7)+(me<<2)|0;$a=c[Kb>>2]|0;c[Eb>>2]=-Ja;Ja=g+48+(ra*4608|0)+(Jb<<7)+(me<<2)|0;Eb=c[Ja>>2]|0;c[Kb>>2]=-$a;$a=g+48+(ra*4608|0)+(vb<<7)+(me<<2)|0;Kb=c[$a>>2]|0;c[Ja>>2]=-Eb;c[$a>>2]=-Kb}Kb=me+1|0;if(Kb>>>0<fa>>>0){me=Kb;ne=ne+18|0}else{ma=361;break}}}else{if(wa){pe=2;qe=36;re=La}else{oe=fa;ma=362;break}while(1){hb(t+(ra*2304|0)+(qe<<2)|0,ga,re&255);Kb=c[A>>2]|0;$a=0;do{Eb=Kb+(ra*2304|0)+(pe*72|0)+($a<<2)|0;c[g+48+(ra*4608|0)+($a+$<<7)+(pe<<2)>>2]=(c[Eb>>2]|0)+(c[u+($a<<2)>>2]|0);c[Eb>>2]=c[u+($a+18<<2)>>2];$a=$a+1|0;}while($a>>>0<18>>>0);if((pe&1|0)!=0){$a=g+48+(ra*4608|0)+(ua<<7)+(pe<<2)|0;Kb=g+48+(ra*4608|0)+(W<<7)+(pe<<2)|0;Eb=c[Kb>>2]|0;c[$a>>2]=-(c[$a>>2]|0);$a=g+48+(ra*4608|0)+(aa<<7)+(pe<<2)|0;Ja=c[$a>>2]|0;c[Kb>>2]=-Eb;Eb=g+48+(ra*4608|0)+(_<<7)+(pe<<2)|0;Kb=c[Eb>>2]|0;c[$a>>2]=-Ja;Ja=g+48+(ra*4608|0)+(Aa<<7)+(pe<<2)|0;$a=c[Ja>>2]|0;c[Eb>>2]=-Kb;Kb=g+48+(ra*4608|0)+(Ab<<7)+(pe<<2)|0;Eb=c[Kb>>2]|0;c[Ja>>2]=-$a;$a=g+48+(ra*4608|0)+(Bb<<7)+(pe<<2)|0;Ja=c[$a>>2]|0;c[Kb>>2]=-Eb;Eb=g+48+(ra*4608|0)+(Jb<<7)+(pe<<2)|0;Kb=c[Eb>>2]|0;c[$a>>2]=-Ja;Ja=g+48+(ra*4608|0)+(vb<<7)+(pe<<2)|0;$a=c[Ja>>2]|0;c[Eb>>2]=-Kb;c[Ja>>2]=-$a}$a=pe+1|0;if(!($a>>>0<fa>>>0)){ma=361;break g}pe=$a;qe=qe+18|0;re=a[Ba]|0}}}while(0);if((ma|0)==361){ma=0;if(fa>>>0<32>>>0){oe=fa;ma=362}}if((ma|0)==362){while(1){ma=0;Ba=c[A>>2]|0;La=Ba+(ra*2304|0)+(oe*72|0)|0;c[g+48+(ra*4608|0)+($<<7)+(oe<<2)>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+4|0;wa=g+48+(ra*4608|0)+(ua<<7)+(oe<<2)|0;c[wa>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+8|0;c[g+48+(ra*4608|0)+(Ia<<7)+(oe<<2)>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+12|0;zb=g+48+(ra*4608|0)+(W<<7)+(oe<<2)|0;c[zb>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+16|0;c[g+48+(ra*4608|0)+(ea<<7)+(oe<<2)>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+20|0;$a=g+48+(ra*4608|0)+(aa<<7)+(oe<<2)|0;c[$a>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+24|0;c[g+48+(ra*4608|0)+(Lb<<7)+(oe<<2)>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+28|0;Ja=g+48+(ra*4608|0)+(_<<7)+(oe<<2)|0;c[Ja>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+32|0;c[g+48+(ra*4608|0)+(va<<7)+(oe<<2)>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+36|0;Kb=g+48+(ra*4608|0)+(Aa<<7)+(oe<<2)|0;c[Kb>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+40|0;c[g+48+(ra*4608|0)+(xb<<7)+(oe<<2)>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+44|0;Eb=g+48+(ra*4608|0)+(Ab<<7)+(oe<<2)|0;c[Eb>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+48|0;c[g+48+(ra*4608|0)+(wb<<7)+(oe<<2)>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+52|0;bb=g+48+(ra*4608|0)+(Bb<<7)+(oe<<2)|0;c[bb>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+56|0;c[g+48+(ra*4608|0)+(V<<7)+(oe<<2)>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+60|0;Cb=g+48+(ra*4608|0)+(Jb<<7)+(oe<<2)|0;c[Cb>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+64|0;c[g+48+(ra*4608|0)+(qa<<7)+(oe<<2)>>2]=c[La>>2];c[La>>2]=0;La=Ba+(ra*2304|0)+(oe*72|0)+68|0;Ba=g+48+(ra*4608|0)+(vb<<7)+(oe<<2)|0;c[Ba>>2]=c[La>>2];c[La>>2]=0;if((oe&1|0)!=0){La=c[zb>>2]|0;c[wa>>2]=-(c[wa>>2]|0);wa=c[$a>>2]|0;c[zb>>2]=-La;La=c[Ja>>2]|0;c[$a>>2]=-wa;wa=c[Kb>>2]|0;c[Ja>>2]=-La;La=c[Eb>>2]|0;c[Kb>>2]=-wa;wa=c[bb>>2]|0;c[Eb>>2]=-La;La=c[Cb>>2]|0;c[bb>>2]=-wa;wa=c[Ba>>2]|0;c[Cb>>2]=-La;c[Ba>>2]=-wa}wa=oe+1|0;if(wa>>>0<32>>>0){oe=wa;ma=362}else{break}}}ra=ra+1|0;}while(ra>>>0<E>>>0);ra=X+1|0;if(ra>>>0<ba>>>0){X=ra}else{Ud=0;break}}if((ma|0)==248){na(41144,41528,1253,41664);return 0}if((Ud|0)==0){se=0}else{c[f+60>>2]=Ud;se=-1}X=f+36|0;ba=c[v+4>>2]|0;c[X>>2]=c[v>>2];c[X+4>>2]=ba;c[f+44>>2]=(ka<<3)-ca;oa=se;pa=J}}while(0);if(!(pa>>>0<K>>>0)){Gb(c[z>>2]|0,(c[H>>2]|0)+(-K|0)|0,K)|0;c[f+52>>2]=K;B=oa;i=h;return B|0}se=c[G>>2]|0;do{if(ka>>>0<se>>>0){G=se-ka|0;ca=(G+pa|0)>>>0>K>>>0?K-pa|0:G;G=f+52|0;v=c[G>>2]|0;if(!(ca>>>0<v>>>0)){te=v;break}Ud=c[z>>2]|0;Ib(Ud|0,Ud+(v-ca)|0,ca|0)|0;c[G>>2]=ca;te=ca}else{c[f+52>>2]=0;te=0}}while(0);K=f+52|0;Gb((c[z>>2]|0)+te|0,(c[H>>2]|0)+(-pa|0)|0,pa)|0;c[K>>2]=(c[K>>2]|0)+pa;B=oa;i=h;return B|0}function hb(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;e=i;i=i+112|0;f=e|0;g=e+40|0;h=0;do{c[g+(h<<2)>>2]=Z((c[39856+(h<<2)>>2]|0)+32768>>16,(c[a+(h<<2)>>2]|0)+2048>>12)|0;j=h+1|0;c[g+(j<<2)>>2]=Z((c[39856+(j<<2)>>2]|0)+32768>>16,(c[a+(j<<2)>>2]|0)+2048>>12)|0;j=h+2|0;c[g+(j<<2)>>2]=Z((c[39856+(j<<2)>>2]|0)+32768>>16,(c[a+(j<<2)>>2]|0)+2048>>12)|0;h=h+3|0;}while((h|0)<18);h=b;a=c[g>>2]|0;j=(c[g+68>>2]|0)+a|0;k=f|0;c[k>>2]=j;l=(c[g+64>>2]|0)+(c[g+4>>2]|0)|0;m=f+4|0;c[m>>2]=l;n=(c[g+60>>2]|0)+(c[g+8>>2]|0)|0;o=f+8|0;c[o>>2]=n;p=(c[g+56>>2]|0)+(c[g+12>>2]|0)|0;q=f+12|0;c[q>>2]=p;r=(c[g+52>>2]|0)+(c[g+16>>2]|0)|0;s=f+16|0;c[s>>2]=r;t=(c[g+48>>2]|0)+(c[g+20>>2]|0)|0;u=f+20|0;c[u>>2]=t;v=(c[g+44>>2]|0)+(c[g+24>>2]|0)|0;w=f+24|0;c[w>>2]=v;x=(c[g+40>>2]|0)+(c[g+28>>2]|0)|0;y=f+28|0;c[y>>2]=x;z=(c[g+36>>2]|0)+(c[g+32>>2]|0)|0;A=f+32|0;c[A>>2]=z;B=t+p|0;C=v+n|0;D=v-n|0;n=x+l|0;v=z+j|0;E=z-j|0;j=C+B|0;z=p-t+2048|0;t=(D+z>>12)*-5266|0;p=z-E>>12;F=(D+2048+E>>12)*-2802|0;G=z-D+E>>12;E=(l+2048-x>>12)*-7094|0;x=(C+2048-v>>12)*-7698|0;l=B+2048|0;B=(l-v>>12)*-1423|0;D=(l-C>>12)*-6275|0;C=n+r|0;l=(r<<1)-n|0;n=E-F|0;r=t-E|0;z=D-l|0;H=x+l-B|0;I=C<<1;J=E+t|0;t=l+D|0;D=0;l=0;E=a;while(1){c[f+(D<<2)>>2]=Z((c[1304+(D<<2)>>2]|0)+32768>>16,E+2048-(c[g+(l+17<<2)>>2]|0)>>12)|0;a=D+1|0;c[f+(a<<2)>>2]=Z((c[1304+(a<<2)>>2]|0)+32768>>16,(c[g+(a<<2)>>2]|0)+2048-(c[g+(l+16<<2)>>2]|0)>>12)|0;a=D+2|0;c[f+(a<<2)>>2]=Z((c[1304+(a<<2)>>2]|0)+32768>>16,(c[g+(a<<2)>>2]|0)+2048-(c[g+(l+15<<2)>>2]|0)>>12)|0;a=D+3|0;if((a|0)>=9){break}K=-3-D|0;D=a;l=K;E=c[g+(a<<2)>>2]|0}g=j+v|0;v=p*8068|0;p=c[q>>2]|0;q=c[u>>2]|0;u=q+p|0;j=c[w>>2]|0;w=c[o>>2]|0;o=w+j|0;E=j-w|0;w=c[m>>2]|0;m=c[y>>2]|0;y=m+w|0;j=c[A>>2]|0;A=c[k>>2]|0;k=A+j|0;l=j-A|0;A=o+u+k|0;j=p-q+2048|0;q=(E+j>>12)*-5266|0;p=(j-l>>12)*8068|0;D=(E+2048+l>>12)*-2802|0;f=(w+2048-m>>12)*-7094|0;m=(o+2048-k>>12)*-7698|0;w=u+2048|0;u=(w-k>>12)*-1423|0;k=(w-o>>12)*-6275|0;o=c[s>>2]|0;s=o+y|0;w=(o<<1)-y|0;y=s+A|0;o=q-f-y+p|0;a=k-w+m-o|0;K=((j-E+l>>12)*-7094|0)-a|0;l=m+w-u-K|0;m=f-D+p-l|0;p=A-(s<<1)-m|0;s=f+q+D-p|0;D=(g+C|0)/2|0;C=((y|0)/2|0)-D|0;y=((r+v|0)/2|0)-C|0;r=((o|0)/2|0)-y|0;o=((z+x|0)/2|0)-r|0;x=((a|0)/2|0)-o|0;a=((G*-7094|0|0)/2|0)-x|0;G=((K|0)/2|0)-a|0;K=((H|0)/2|0)-G|0;H=((l|0)/2|0)-K|0;l=((n+v|0)/2|0)-H|0;v=((m|0)/2|0)-l|0;m=((g-I|0)/2|0)-v|0;I=((p|0)/2|0)-m|0;p=((J+F|0)/2|0)-I|0;F=((s|0)/2|0)-p|0;J=((t+B|0)/2|0)-F|0;B=((w+k+u-s|0)/2|0)-J|0;c[b>>2]=H;c[b+4>>2]=l;c[b+8>>2]=v;c[b+12>>2]=m;c[b+16>>2]=I;c[b+20>>2]=p;s=b+24|0;c[s>>2]=F;u=b+28|0;c[u>>2]=J;k=b+32|0;c[k>>2]=B;w=b+36|0;c[w>>2]=-B;t=b+40|0;c[t>>2]=-J;g=b+44|0;c[g>>2]=-F;c[b+48>>2]=-p;c[b+52>>2]=-I;c[b+56>>2]=-m;c[b+60>>2]=-v;c[b+64>>2]=-l;c[b+68>>2]=-H;l=-K|0;c[b+72>>2]=l;K=-G|0;c[b+76>>2]=K;G=-a|0;c[b+80>>2]=G;a=-x|0;c[b+84>>2]=a;x=-o|0;c[b+88>>2]=x;o=-r|0;c[b+92>>2]=o;r=-y|0;y=b+96|0;c[y>>2]=r;v=-C|0;C=b+100|0;c[C>>2]=v;m=-D|0;D=b+104|0;c[D>>2]=m;I=b+108|0;c[I>>2]=m;m=b+112|0;c[m>>2]=v;v=b+116|0;c[v>>2]=r;r=b+120|0;c[r>>2]=o;c[b+124>>2]=x;c[b+128>>2]=a;c[b+132>>2]=G;c[b+136>>2]=K;c[b+140>>2]=l;if((d|0)==3){Hb(h|0,0,24)|0;c[s>>2]=(F+2048>>12)*535|0;c[u>>2]=(J+2048>>12)*1567|0;c[k>>2]=(B+2048>>12)*2493|0;c[w>>2]=(2048-B>>12)*3250|0;c[t>>2]=(2048-J>>12)*3784|0;c[g>>2]=(2048-F>>12)*4061|0;F=18;g=l;while(1){c[b+(F<<2)>>2]=Z((c[56+(F<<2)>>2]|0)+32768>>16,g+2048>>12)|0;l=F+1|0;J=b+(l<<2)|0;c[J>>2]=Z((c[56+(l<<2)>>2]|0)+32768>>16,(c[J>>2]|0)+2048>>12)|0;J=F+2|0;l=b+(J<<2)|0;c[l>>2]=Z((c[56+(J<<2)>>2]|0)+32768>>16,(c[l>>2]|0)+2048>>12)|0;l=F+3|0;if(!(l>>>0<36>>>0)){break}F=l;g=c[b+(l<<2)>>2]|0}i=e;return}else if((d|0)==0){g=0;F=H;while(1){c[b+(g<<2)>>2]=Z((c[56+(g<<2)>>2]|0)+32768>>16,F+2048>>12)|0;l=g|1;J=b+(l<<2)|0;c[J>>2]=Z((c[56+(l<<2)>>2]|0)+32768>>16,(c[J>>2]|0)+2048>>12)|0;J=g|2;l=b+(J<<2)|0;c[l>>2]=Z((c[56+(J<<2)>>2]|0)+32768>>16,(c[l>>2]|0)+2048>>12)|0;l=g|3;J=b+(l<<2)|0;c[J>>2]=Z((c[56+(l<<2)>>2]|0)+32768>>16,(c[J>>2]|0)+2048>>12)|0;J=g+4|0;if(!(J>>>0<36>>>0)){break}g=J;F=c[b+(J<<2)>>2]|0}i=e;return}else if((d|0)==1){d=0;F=H;while(1){c[b+(d<<2)>>2]=Z((c[56+(d<<2)>>2]|0)+32768>>16,F+2048>>12)|0;H=d+1|0;g=b+(H<<2)|0;c[g>>2]=Z((c[56+(H<<2)>>2]|0)+32768>>16,(c[g>>2]|0)+2048>>12)|0;g=d+2|0;H=b+(g<<2)|0;c[H>>2]=Z((c[56+(g<<2)>>2]|0)+32768>>16,(c[H>>2]|0)+2048>>12)|0;H=d+3|0;if(!(H>>>0<18>>>0)){break}d=H;F=c[b+(H<<2)>>2]|0}c[y>>2]=((c[y>>2]|0)+2048>>12)*4061|0;c[C>>2]=((c[C>>2]|0)+2048>>12)*3784|0;c[D>>2]=((c[D>>2]|0)+2048>>12)*3250|0;c[I>>2]=((c[I>>2]|0)+2048>>12)*2493|0;c[m>>2]=((c[m>>2]|0)+2048>>12)*1567|0;c[v>>2]=((c[v>>2]|0)+2048>>12)*535|0;Hb(r|0,0,24)|0;i=e;return}else{i=e;return}}function ib(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;d=i;i=i+144|0;e=d|0;f=a;a=e;g=0;while(1){h=c[f>>2]|0;j=c[f+4>>2]|0;k=c[f+8>>2]|0;l=c[f+12>>2]|0;m=c[f+16>>2]|0;n=c[f+20>>2]|0;o=0;p=35280;while(1){q=h+2048>>12;r=Z((c[p>>2]|0)+32768>>16,q)|0;s=j+2048>>12;t=(Z((c[p+4>>2]|0)+32768>>16,s)|0)+r|0;r=k+2048>>12;u=t+(Z((c[p+8>>2]|0)+32768>>16,r)|0)|0;t=l+2048>>12;v=u+(Z((c[p+12>>2]|0)+32768>>16,t)|0)|0;u=m+2048>>12;w=v+(Z((c[p+16>>2]|0)+32768>>16,u)|0)|0;v=n+2048>>12;x=w+(Z((c[p+20>>2]|0)+32768>>16,v)|0)|0;c[a+(o<<2)>>2]=x;c[a+(5-o<<2)>>2]=-x;x=Z((c[p+24>>2]|0)+32768>>16,q)|0;q=(Z((c[p+28>>2]|0)+32768>>16,s)|0)+x|0;x=q+(Z((c[p+32>>2]|0)+32768>>16,r)|0)|0;r=x+(Z((c[p+36>>2]|0)+32768>>16,t)|0)|0;t=r+(Z((c[p+40>>2]|0)+32768>>16,u)|0)|0;u=t+(Z((c[p+44>>2]|0)+32768>>16,v)|0)|0;c[a+(o+6<<2)>>2]=u;c[a+(11-o<<2)>>2]=u;u=o+1|0;if((u|0)<3){o=u;p=p+48|0}else{break}}p=g+1|0;if((p|0)<3){f=f+24|0;a=a+48|0;g=p}else{y=e;z=8;A=0;break}}while(1){c[b+(A<<2)>>2]=0;c[b+(A+6<<2)>>2]=Z((c[z>>2]|0)+32768>>16,(c[y>>2]|0)+2048>>12)|0;e=z+24|0;g=Z((c[e>>2]|0)+32768>>16,(c[y+24>>2]|0)+2048>>12)|0;c[b+(A+12<<2)>>2]=(Z((c[z>>2]|0)+32768>>16,(c[y+48>>2]|0)+2048>>12)|0)+g;g=Z((c[e>>2]|0)+32768>>16,(c[y+72>>2]|0)+2048>>12)|0;c[b+(A+18<<2)>>2]=(Z((c[z>>2]|0)+32768>>16,(c[y+96>>2]|0)+2048>>12)|0)+g;c[b+(A+24<<2)>>2]=Z((c[e>>2]|0)+32768>>16,(c[y+120>>2]|0)+2048>>12)|0;c[b+(A+30<<2)>>2]=0;e=A+1|0;if((e|0)<6){y=y+4|0;z=z+4|0;A=e}else{break}}i=d;return}function jb(a){a=a|0;Hb(a|0,0,28)|0;Ua(a+28|0,0);Ua(a+36|0,0);Hb(a+44|0,0,20)|0;return}function kb(a){a=a|0;var b=0;b=a+48|0;a=c[b>>2]|0;if((a|0)==0){return}Eb(a|0);c[b>>2]=0;return}function lb(a,b,d){a=a|0;b=b|0;d=d|0;c[a>>2]=b;c[a+4>>2]=b+d;c[a+20>>2]=b;c[a+24>>2]=b;c[a+12>>2]=1;Ua(a+28|0,b);return}function mb(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0;d=b+28|0;e=Wa(d)|0;f=c[b+4>>2]|0;b=f-1|0;a:do{if(e>>>0<b>>>0){g=e;while(1){h=g+1|0;if((a[g]|0)==-1){if((a[h]&-32)<<24>>24==-32){i=g;break a}}if(h>>>0<b>>>0){g=h}else{i=h;break}}}else{i=e}}while(0);if((f-i|0)<8){j=-1;return j|0}Ua(d,i);j=0;return j|0}function nb(a){a=a|0;var b=0;switch(c[a+60>>2]|0){case 1:{b=41440;break};case 2:{b=41056;break};case 49:{b=41016;break};case 257:{b=40976;break};case 258:{b=40944;break};case 259:{b=40920;break};case 260:{b=40888;break};case 261:{b=40864;break};case 513:{b=40840;break};case 529:{b=41496;break};case 545:{b=41472;break};case 546:{b=41408;break};case 561:{b=41384;break};case 562:{b=41352;break};case 563:{b=41328;break};case 564:{b=41296;break};case 565:{b=41248;break};case 566:{b=41224;break};case 567:{b=41192;break};case 568:{b=41120;break};case 569:{b=41088;break};case 0:{b=41280;break};default:{b=0}}return b|0}function ob(a){a=a|0;pb(a);Hb(a+4096|0,0,12)|0;return}function pb(a){a=a|0;var b=0,d=0,e=0;b=0;while(1){c[a+1536+(b<<5)>>2]=0;c[a+1024+(b<<5)>>2]=0;c[a+512+(b<<5)>>2]=0;c[a+(b<<5)>>2]=0;c[a+1536+(b<<5)+4>>2]=0;c[a+1024+(b<<5)+4>>2]=0;c[a+512+(b<<5)+4>>2]=0;c[a+(b<<5)+4>>2]=0;c[a+1536+(b<<5)+8>>2]=0;c[a+1024+(b<<5)+8>>2]=0;c[a+512+(b<<5)+8>>2]=0;c[a+(b<<5)+8>>2]=0;c[a+1536+(b<<5)+12>>2]=0;c[a+1024+(b<<5)+12>>2]=0;c[a+512+(b<<5)+12>>2]=0;c[a+(b<<5)+12>>2]=0;c[a+1536+(b<<5)+16>>2]=0;c[a+1024+(b<<5)+16>>2]=0;c[a+512+(b<<5)+16>>2]=0;c[a+(b<<5)+16>>2]=0;c[a+1536+(b<<5)+20>>2]=0;c[a+1024+(b<<5)+20>>2]=0;c[a+512+(b<<5)+20>>2]=0;c[a+(b<<5)+20>>2]=0;c[a+1536+(b<<5)+24>>2]=0;c[a+1024+(b<<5)+24>>2]=0;c[a+512+(b<<5)+24>>2]=0;c[a+(b<<5)+24>>2]=0;c[a+1536+(b<<5)+28>>2]=0;c[a+1024+(b<<5)+28>>2]=0;c[a+512+(b<<5)+28>>2]=0;c[a+(b<<5)+28>>2]=0;d=b+1|0;if(d>>>0<16>>>0){b=d}else{e=0;break}}do{c[a+3584+(e<<5)>>2]=0;c[a+3072+(e<<5)>>2]=0;c[a+2560+(e<<5)>>2]=0;c[a+2048+(e<<5)>>2]=0;c[a+3584+(e<<5)+4>>2]=0;c[a+3072+(e<<5)+4>>2]=0;c[a+2560+(e<<5)+4>>2]=0;c[a+2048+(e<<5)+4>>2]=0;c[a+3584+(e<<5)+8>>2]=0;c[a+3072+(e<<5)+8>>2]=0;c[a+2560+(e<<5)+8>>2]=0;c[a+2048+(e<<5)+8>>2]=0;c[a+3584+(e<<5)+12>>2]=0;c[a+3072+(e<<5)+12>>2]=0;c[a+2560+(e<<5)+12>>2]=0;c[a+2048+(e<<5)+12>>2]=0;c[a+3584+(e<<5)+16>>2]=0;c[a+3072+(e<<5)+16>>2]=0;c[a+2560+(e<<5)+16>>2]=0;c[a+2048+(e<<5)+16>>2]=0;c[a+3584+(e<<5)+20>>2]=0;c[a+3072+(e<<5)+20>>2]=0;c[a+2560+(e<<5)+20>>2]=0;c[a+2048+(e<<5)+20>>2]=0;c[a+3584+(e<<5)+24>>2]=0;c[a+3072+(e<<5)+24>>2]=0;c[a+2560+(e<<5)+24>>2]=0;c[a+2048+(e<<5)+24>>2]=0;c[a+3584+(e<<5)+28>>2]=0;c[a+3072+(e<<5)+28>>2]=0;c[a+2560+(e<<5)+28>>2]=0;c[a+2048+(e<<5)+28>>2]=0;e=e+1|0;}while(e>>>0<16>>>0);return}function qb(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0;e=(c[d+4>>2]|0)!=0?2:1;f=c[d>>2]|0;if((f|0)==3){g=(c[d+28>>2]&4096|0)!=0?18:36;h=3}else if((f|0)==1){i=12}else{g=36;h=3}if((h|0)==3){i=g}g=c[d+20>>2]|0;h=a+4100|0;c[h>>2]=g;b[a+4104>>1]=e;f=a+4106|0;b[f>>1]=i<<5;if((c[d+44>>2]&2|0)==0){j=2}else{c[h>>2]=g>>>1;b[f>>1]=i<<4&32752;j=4}Ca[j&7](a,d,e,i);e=a+4096|0;c[e>>2]=(c[e>>2]|0)+i&15;return}function rb(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0;if((d|0)==0){return}f=a+4096|0;if((e|0)==0){return}g=0;h=a+1504|0;i=a+1472|0;while(1){j=h;k=i;l=a+4108+(g*4608|0)|0;m=0;n=c[f>>2]|0;while(1){o=n&1;p=a+(g<<11)+(o<<9)|0;tb(b+48+(g*4608|0)+(m<<7)|0,n>>>1,p,a+(g<<11)+1024+(o<<9)|0);q=n&-2;r=n+15&14;s=r|1;t=o^1;u=Z(c[41680+(s<<2)>>2]|0,c[a+(g<<11)+(t<<9)>>2]|0)|0;v=s+14|0;w=Z(c[41680+(v<<2)>>2]|0,c[a+(g<<11)+(t<<9)+4>>2]|0)|0;x=s+12|0;y=Z(c[41680+(x<<2)>>2]|0,c[a+(g<<11)+(t<<9)+8>>2]|0)|0;z=s+10|0;A=Z(c[41680+(z<<2)>>2]|0,c[a+(g<<11)+(t<<9)+12>>2]|0)|0;B=s+8|0;C=Z(c[41680+(B<<2)>>2]|0,c[a+(g<<11)+(t<<9)+16>>2]|0)|0;D=s+6|0;E=Z(c[41680+(D<<2)>>2]|0,c[a+(g<<11)+(t<<9)+20>>2]|0)|0;F=s+4|0;G=Z(c[41680+(F<<2)>>2]|0,c[a+(g<<11)+(t<<9)+24>>2]|0)|0;H=s+2|0;I=Z(c[41680+(H<<2)>>2]|0,c[a+(g<<11)+(t<<9)+28>>2]|0)|0;J=(Z(c[41680+(q<<2)>>2]|0,c[p>>2]|0)|0)-(w+u+y+A+C+E+G+I)|0;I=q+14|0;G=J+(Z(c[41680+(I<<2)>>2]|0,c[a+(g<<11)+(o<<9)+4>>2]|0)|0)|0;J=q+12|0;E=G+(Z(c[41680+(J<<2)>>2]|0,c[a+(g<<11)+(o<<9)+8>>2]|0)|0)|0;G=q+10|0;C=E+(Z(c[41680+(G<<2)>>2]|0,c[a+(g<<11)+(o<<9)+12>>2]|0)|0)|0;E=q+8|0;A=C+(Z(c[41680+(E<<2)>>2]|0,c[a+(g<<11)+(o<<9)+16>>2]|0)|0)|0;C=q+6|0;y=A+(Z(c[41680+(C<<2)>>2]|0,c[a+(g<<11)+(o<<9)+20>>2]|0)|0)|0;A=q+4|0;u=y+(Z(c[41680+(A<<2)>>2]|0,c[a+(g<<11)+(o<<9)+24>>2]|0)|0)|0;y=q+2|0;c[l>>2]=u+(Z(c[41680+(y<<2)>>2]|0,c[a+(g<<11)+(o<<9)+28>>2]|0)|0)>>2;o=15-q|0;u=17-q|0;w=19-q|0;K=21-q|0;L=23-q|0;M=25-q|0;N=27-q|0;O=29-q|0;P=29-s|0;Q=27-s|0;R=25-s|0;S=23-s|0;T=21-s|0;U=19-s|0;V=17-s|0;W=r^14;r=n&1^1;X=j+(r<<9)|0;Y=1;_=l+124|0;$=p;p=a+(g<<11)+1024+(t<<9)|0;t=41680;aa=l;while(1){ba=aa+4|0;ca=$+32|0;da=p|0;ea=Z(c[t+128+(s<<2)>>2]|0,c[da>>2]|0)|0;fa=p+4|0;ga=Z(c[t+128+(v<<2)>>2]|0,c[fa>>2]|0)|0;ha=p+8|0;ia=Z(c[t+128+(x<<2)>>2]|0,c[ha>>2]|0)|0;ja=p+12|0;ka=Z(c[t+128+(z<<2)>>2]|0,c[ja>>2]|0)|0;la=p+16|0;ma=Z(c[t+128+(B<<2)>>2]|0,c[la>>2]|0)|0;na=p+20|0;oa=Z(c[t+128+(D<<2)>>2]|0,c[na>>2]|0)|0;pa=p+24|0;qa=Z(c[t+128+(F<<2)>>2]|0,c[pa>>2]|0)|0;ra=p+28|0;sa=Z(c[t+128+(H<<2)>>2]|0,c[ra>>2]|0)|0;ta=$+60|0;ua=(Z(c[t+128+(y<<2)>>2]|0,c[ta>>2]|0)|0)-(ga+ea+ia+ka+ma+oa+qa+sa)|0;sa=$+56|0;qa=ua+(Z(c[t+128+(A<<2)>>2]|0,c[sa>>2]|0)|0)|0;ua=$+52|0;oa=qa+(Z(c[t+128+(C<<2)>>2]|0,c[ua>>2]|0)|0)|0;qa=$+48|0;ma=oa+(Z(c[t+128+(E<<2)>>2]|0,c[qa>>2]|0)|0)|0;oa=$+44|0;ka=ma+(Z(c[t+128+(G<<2)>>2]|0,c[oa>>2]|0)|0)|0;ma=$+40|0;ia=ka+(Z(c[t+128+(J<<2)>>2]|0,c[ma>>2]|0)|0)|0;ka=$+36|0;ea=ia+(Z(c[t+128+(I<<2)>>2]|0,c[ka>>2]|0)|0)|0;ia=ca|0;c[ba>>2]=ea+(Z(c[t+128+(q<<2)>>2]|0,c[ia>>2]|0)|0)>>2;ea=Z(c[t+128+(o<<2)>>2]|0,c[ia>>2]|0)|0;ia=(Z(c[t+128+(u<<2)>>2]|0,c[ka>>2]|0)|0)+ea|0;ea=ia+(Z(c[t+128+(w<<2)>>2]|0,c[ma>>2]|0)|0)|0;ma=ea+(Z(c[t+128+(K<<2)>>2]|0,c[oa>>2]|0)|0)|0;oa=ma+(Z(c[t+128+(L<<2)>>2]|0,c[qa>>2]|0)|0)|0;qa=oa+(Z(c[t+128+(M<<2)>>2]|0,c[ua>>2]|0)|0)|0;ua=qa+(Z(c[t+128+(N<<2)>>2]|0,c[sa>>2]|0)|0)|0;sa=ua+(Z(c[t+128+(O<<2)>>2]|0,c[ta>>2]|0)|0)|0;ta=sa+(Z(c[t+128+(P<<2)>>2]|0,c[ra>>2]|0)|0)|0;ra=ta+(Z(c[t+128+(Q<<2)>>2]|0,c[pa>>2]|0)|0)|0;pa=ra+(Z(c[t+128+(R<<2)>>2]|0,c[na>>2]|0)|0)|0;na=pa+(Z(c[t+128+(S<<2)>>2]|0,c[la>>2]|0)|0)|0;la=na+(Z(c[t+128+(T<<2)>>2]|0,c[ja>>2]|0)|0)|0;ja=la+(Z(c[t+128+(U<<2)>>2]|0,c[ha>>2]|0)|0)|0;ha=ja+(Z(c[t+128+(V<<2)>>2]|0,c[fa>>2]|0)|0)|0;c[_>>2]=ha+(Z(c[t+128+(W<<2)>>2]|0,c[da>>2]|0)|0)>>2;da=Y+1|0;if(da>>>0<16>>>0){Y=da;_=_-4|0;$=ca;p=p+32|0;t=t+128|0;aa=ba}else{break}}aa=Z(c[43728+(s<<2)>>2]|0,c[X>>2]|0)|0;t=aa+(Z(c[43728+(v<<2)>>2]|0,c[k+(r<<9)+36>>2]|0)|0)|0;aa=t+(Z(c[43728+(x<<2)>>2]|0,c[k+(r<<9)+40>>2]|0)|0)|0;t=aa+(Z(c[43728+(z<<2)>>2]|0,c[k+(r<<9)+44>>2]|0)|0)|0;aa=t+(Z(c[43728+(B<<2)>>2]|0,c[k+(r<<9)+48>>2]|0)|0)|0;t=aa+(Z(c[43728+(D<<2)>>2]|0,c[k+(r<<9)+52>>2]|0)|0)|0;aa=t+(Z(c[43728+(F<<2)>>2]|0,c[k+(r<<9)+56>>2]|0)|0)|0;c[l+64>>2]=-(aa+(Z(c[43728+(H<<2)>>2]|0,c[k+(r<<9)+60>>2]|0)|0)|0)>>2;aa=m+1|0;if(aa>>>0<e>>>0){l=l+128|0;m=aa;n=n+1&15}else{break}}n=g+1|0;if(n>>>0<d>>>0){g=n;h=h+2048|0;i=i+2048|0}else{break}}return}function sb(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0;if((d|0)==0){return}f=a+4096|0;if((e|0)==0){return}g=0;h=a+1504|0;i=a+1472|0;while(1){j=h;k=i;l=a+4108+(g*4608|0)|0;m=0;n=c[f>>2]|0;while(1){o=n&1;p=a+(g<<11)+(o<<9)|0;tb(b+48+(g*4608|0)+(m<<7)|0,n>>>1,p,a+(g<<11)+1024+(o<<9)|0);q=n&-2;r=n+15&14;s=r|1;t=o^1;u=Z(c[41680+(s<<2)>>2]|0,c[a+(g<<11)+(t<<9)>>2]|0)|0;v=s+14|0;w=Z(c[41680+(v<<2)>>2]|0,c[a+(g<<11)+(t<<9)+4>>2]|0)|0;x=s+12|0;y=Z(c[41680+(x<<2)>>2]|0,c[a+(g<<11)+(t<<9)+8>>2]|0)|0;z=s+10|0;A=Z(c[41680+(z<<2)>>2]|0,c[a+(g<<11)+(t<<9)+12>>2]|0)|0;B=s+8|0;C=Z(c[41680+(B<<2)>>2]|0,c[a+(g<<11)+(t<<9)+16>>2]|0)|0;D=s+6|0;E=Z(c[41680+(D<<2)>>2]|0,c[a+(g<<11)+(t<<9)+20>>2]|0)|0;F=s+4|0;G=Z(c[41680+(F<<2)>>2]|0,c[a+(g<<11)+(t<<9)+24>>2]|0)|0;H=s+2|0;I=Z(c[41680+(H<<2)>>2]|0,c[a+(g<<11)+(t<<9)+28>>2]|0)|0;J=(Z(c[41680+(q<<2)>>2]|0,c[p>>2]|0)|0)-(w+u+y+A+C+E+G+I)|0;I=q+14|0;G=J+(Z(c[41680+(I<<2)>>2]|0,c[a+(g<<11)+(o<<9)+4>>2]|0)|0)|0;J=q+12|0;E=G+(Z(c[41680+(J<<2)>>2]|0,c[a+(g<<11)+(o<<9)+8>>2]|0)|0)|0;G=q+10|0;C=E+(Z(c[41680+(G<<2)>>2]|0,c[a+(g<<11)+(o<<9)+12>>2]|0)|0)|0;E=q+8|0;A=C+(Z(c[41680+(E<<2)>>2]|0,c[a+(g<<11)+(o<<9)+16>>2]|0)|0)|0;C=q+6|0;y=A+(Z(c[41680+(C<<2)>>2]|0,c[a+(g<<11)+(o<<9)+20>>2]|0)|0)|0;A=q+4|0;u=y+(Z(c[41680+(A<<2)>>2]|0,c[a+(g<<11)+(o<<9)+24>>2]|0)|0)|0;y=q+2|0;c[l>>2]=u+(Z(c[41680+(y<<2)>>2]|0,c[a+(g<<11)+(o<<9)+28>>2]|0)|0)>>2;o=29-s|0;u=27-s|0;w=25-s|0;K=23-s|0;L=21-s|0;M=19-s|0;N=17-s|0;O=r^14;r=15-q|0;P=17-q|0;Q=19-q|0;R=21-q|0;S=23-q|0;T=25-q|0;U=27-q|0;V=29-q|0;W=n&1^1;X=j+(W<<9)|0;Y=1;_=l+4|0;$=l+60|0;aa=p;p=a+(g<<11)+1024+(t<<9)|0;t=41680;while(1){ba=aa+32|0;if((Y&1|0)==0){ca=p|0;da=Z(c[t+128+(s<<2)>>2]|0,c[ca>>2]|0)|0;ea=p+4|0;fa=Z(c[t+128+(v<<2)>>2]|0,c[ea>>2]|0)|0;ga=p+8|0;ha=Z(c[t+128+(x<<2)>>2]|0,c[ga>>2]|0)|0;ia=p+12|0;ja=Z(c[t+128+(z<<2)>>2]|0,c[ia>>2]|0)|0;ka=p+16|0;la=Z(c[t+128+(B<<2)>>2]|0,c[ka>>2]|0)|0;ma=p+20|0;na=Z(c[t+128+(D<<2)>>2]|0,c[ma>>2]|0)|0;oa=p+24|0;pa=Z(c[t+128+(F<<2)>>2]|0,c[oa>>2]|0)|0;qa=p+28|0;ra=Z(c[t+128+(H<<2)>>2]|0,c[qa>>2]|0)|0;sa=aa+60|0;ta=(Z(c[t+128+(y<<2)>>2]|0,c[sa>>2]|0)|0)-(fa+da+ha+ja+la+na+pa+ra)|0;ra=aa+56|0;pa=ta+(Z(c[t+128+(A<<2)>>2]|0,c[ra>>2]|0)|0)|0;ta=aa+52|0;na=pa+(Z(c[t+128+(C<<2)>>2]|0,c[ta>>2]|0)|0)|0;pa=aa+48|0;la=na+(Z(c[t+128+(E<<2)>>2]|0,c[pa>>2]|0)|0)|0;na=aa+44|0;ja=la+(Z(c[t+128+(G<<2)>>2]|0,c[na>>2]|0)|0)|0;la=aa+40|0;ha=ja+(Z(c[t+128+(J<<2)>>2]|0,c[la>>2]|0)|0)|0;ja=aa+36|0;da=ha+(Z(c[t+128+(I<<2)>>2]|0,c[ja>>2]|0)|0)|0;ha=ba|0;c[_>>2]=da+(Z(c[t+128+(q<<2)>>2]|0,c[ha>>2]|0)|0)>>2;da=Z(c[t+128+(o<<2)>>2]|0,c[qa>>2]|0)|0;qa=(Z(c[t+128+(u<<2)>>2]|0,c[oa>>2]|0)|0)+da|0;da=qa+(Z(c[t+128+(w<<2)>>2]|0,c[ma>>2]|0)|0)|0;ma=da+(Z(c[t+128+(K<<2)>>2]|0,c[ka>>2]|0)|0)|0;ka=ma+(Z(c[t+128+(L<<2)>>2]|0,c[ia>>2]|0)|0)|0;ia=ka+(Z(c[t+128+(M<<2)>>2]|0,c[ga>>2]|0)|0)|0;ga=ia+(Z(c[t+128+(N<<2)>>2]|0,c[ea>>2]|0)|0)|0;ea=ga+(Z(c[t+128+(O<<2)>>2]|0,c[ca>>2]|0)|0)|0;ca=ea+(Z(c[t+128+(r<<2)>>2]|0,c[ha>>2]|0)|0)|0;ha=ca+(Z(c[t+128+(P<<2)>>2]|0,c[ja>>2]|0)|0)|0;ja=ha+(Z(c[t+128+(Q<<2)>>2]|0,c[la>>2]|0)|0)|0;la=ja+(Z(c[t+128+(R<<2)>>2]|0,c[na>>2]|0)|0)|0;na=la+(Z(c[t+128+(S<<2)>>2]|0,c[pa>>2]|0)|0)|0;pa=na+(Z(c[t+128+(T<<2)>>2]|0,c[ta>>2]|0)|0)|0;ta=pa+(Z(c[t+128+(U<<2)>>2]|0,c[ra>>2]|0)|0)|0;c[$>>2]=ta+(Z(c[t+128+(V<<2)>>2]|0,c[sa>>2]|0)|0)>>2;ua=$-4|0;va=_+4|0}else{ua=$;va=_}sa=Y+1|0;if(sa>>>0<16>>>0){Y=sa;_=va;$=ua;aa=ba;p=p+32|0;t=t+128|0}else{break}}t=Z(c[43728+(s<<2)>>2]|0,c[X>>2]|0)|0;p=t+(Z(c[43728+(v<<2)>>2]|0,c[k+(W<<9)+36>>2]|0)|0)|0;t=p+(Z(c[43728+(x<<2)>>2]|0,c[k+(W<<9)+40>>2]|0)|0)|0;p=t+(Z(c[43728+(z<<2)>>2]|0,c[k+(W<<9)+44>>2]|0)|0)|0;t=p+(Z(c[43728+(B<<2)>>2]|0,c[k+(W<<9)+48>>2]|0)|0)|0;p=t+(Z(c[43728+(D<<2)>>2]|0,c[k+(W<<9)+52>>2]|0)|0)|0;t=p+(Z(c[43728+(F<<2)>>2]|0,c[k+(W<<9)+56>>2]|0)|0)|0;c[va>>2]=-(t+(Z(c[43728+(H<<2)>>2]|0,c[k+(W<<9)+60>>2]|0)|0)|0)>>2;t=m+1|0;if(t>>>0<e>>>0){l=va+32|0;m=t;n=n+1&15}else{break}}n=g+1|0;if(n>>>0<d>>>0){g=n;h=h+2048|0;i=i+2048|0}else{break}}return}function tb(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0;f=c[a>>2]|0;g=c[a+124>>2]|0;h=g+f|0;i=(f+2048-g>>12)*4091|0;g=c[a+60>>2]|0;f=c[a+64>>2]|0;j=f+g|0;k=(g+2048-f>>12)*201|0;f=k+i|0;g=(i+2048-k>>12)*4076|0;k=j+h|0;i=(h+2048-j>>12)*4076|0;j=c[a+28>>2]|0;h=c[a+96>>2]|0;l=h+j|0;m=(j+2048-h>>12)*3035|0;h=c[a+32>>2]|0;j=c[a+92>>2]|0;n=j+h|0;o=(h+2048-j>>12)*2751|0;j=o+m|0;h=(m+2048-o>>12)*401|0;o=n+l|0;m=(l+2048-n>>12)*401|0;n=c[a+12>>2]|0;l=c[a+112>>2]|0;p=l+n|0;q=(n+2048-l>>12)*3857|0;l=c[a+48>>2]|0;n=c[a+76>>2]|0;r=n+l|0;s=(l+2048-n>>12)*1380|0;n=s+q|0;l=(q+2048-s>>12)*3166|0;s=r+p|0;q=(p+2048-r>>12)*3166|0;r=c[a+16>>2]|0;p=c[a+108>>2]|0;t=p+r|0;u=(r+2048-p>>12)*3703|0;p=c[a+44>>2]|0;r=c[a+80>>2]|0;v=r+p|0;w=(p+2048-r>>12)*1751|0;r=w+u|0;p=(u+2048-w>>12)*2598|0;w=v+t|0;u=(t+2048-v>>12)*2598|0;v=c[a+4>>2]|0;t=c[a+120>>2]|0;x=t+v|0;y=(v+2048-t>>12)*4052|0;t=c[a+56>>2]|0;v=c[a+68>>2]|0;z=v+t|0;A=(t+2048-v>>12)*601|0;v=A+y|0;t=(y+2048-A>>12)*3920|0;A=z+x|0;y=(x+2048-z>>12)*3920|0;z=c[a+24>>2]|0;x=c[a+100>>2]|0;B=x+z|0;C=(z+2048-x>>12)*3290|0;x=c[a+36>>2]|0;z=c[a+88>>2]|0;D=z+x|0;E=(x+2048-z>>12)*2440|0;z=E+C|0;x=(C+2048-E>>12)*1189|0;E=D+B|0;C=(B+2048-D>>12)*1189|0;D=c[a+8>>2]|0;B=c[a+116>>2]|0;F=B+D|0;G=(D+2048-B>>12)*3973|0;B=c[a+52>>2]|0;D=c[a+72>>2]|0;H=D+B|0;I=(B+2048-D>>12)*995|0;D=I+G|0;B=(G+2048-I>>12)*3612|0;I=H+F|0;G=(F+2048-H>>12)*3612|0;H=c[a+20>>2]|0;F=c[a+104>>2]|0;J=F+H|0;K=(H+2048-F>>12)*3513|0;F=c[a+40>>2]|0;H=c[a+84>>2]|0;a=H+F|0;L=(F+2048-H>>12)*2106|0;H=L+K|0;F=(K+2048-L>>12)*1931|0;L=a+J|0;K=(J+2048-a>>12)*1931|0;a=o+k|0;J=(k+2048-o>>12)*4017|0;o=w+s|0;k=(s+2048-w>>12)*799|0;w=E+A|0;s=(A+2048-E>>12)*3406|0;E=L+I|0;A=(I+2048-L>>12)*2276|0;L=j+f|0;I=(f+2048-j>>12)*4017|0;j=r+n|0;f=(n+2048-r>>12)*799|0;r=z+v|0;n=(v+2048-z>>12)*3406|0;z=H+D|0;v=(D+2048-H>>12)*2276|0;H=m+i|0;D=(i+2048-m>>12)*4017|0;m=u+q|0;i=(q+2048-u>>12)*799|0;u=C+y|0;q=(y+2048-C>>12)*3406|0;C=K+G|0;y=(G+2048-K>>12)*2276|0;K=h+g|0;G=(g+2048-h>>12)*4017|0;h=p+l|0;g=(l+2048-p>>12)*799|0;p=x+t|0;l=(t+2048-x>>12)*3406|0;x=F+B|0;t=(B+2048-F>>12)*2276|0;F=E+w|0;B=o+a+2048|0;c[e+480+(b<<2)>>2]=B+F>>12;c[d+(b<<2)>>2]=((B-F>>12)*2896|0)+2048>>12;F=j+L|0;B=z+r|0;M=B+F|0;c[e+448+(b<<2)>>2]=M+2048>>12;N=m+H|0;O=C+u|0;P=O+N|0;c[e+416+(b<<2)>>2]=P+2048>>12;Q=h+K|0;R=x+p|0;S=R+Q|0;T=(S<<1)-M|0;c[e+384+(b<<2)>>2]=T+2048>>12;M=k+J|0;U=A+s|0;V=U+M|0;c[e+352+(b<<2)>>2]=V+2048>>12;W=f+I|0;X=v+n|0;Y=X+W|0;Z=(Y<<1)-T|0;c[e+320+(b<<2)>>2]=Z+2048>>12;T=i+D|0;_=y+q|0;$=_+T|0;aa=($<<1)-P|0;c[e+288+(b<<2)>>2]=aa+2048>>12;P=g+G|0;ba=t+l|0;ca=ba+P|0;da=(ca<<1)-S|0;S=(da<<1)-Z|0;c[e+256+(b<<2)>>2]=S+2048>>12;Z=(a+2048-o>>12)*3784|0;o=(w+2048-E>>12)*1567|0;E=o+Z|0;c[e+224+(b<<2)>>2]=E+2048>>12;c[d+256+(b<<2)>>2]=2048-E+((Z+2048-o>>12)*5792|0)>>12;o=(L+2048-j>>12)*3784|0;j=(r+2048-z>>12)*1567|0;z=j+o|0;r=(z<<1)-S|0;c[e+192+(b<<2)>>2]=r+2048>>12;S=(H+2048-m>>12)*3784|0;m=(u+2048-C>>12)*1567|0;C=m+S|0;u=(C<<1)-aa|0;c[e+160+(b<<2)>>2]=u+2048>>12;aa=(K+2048-h>>12)*3784|0;h=(p+2048-x>>12)*1567|0;x=h+aa|0;p=(x<<1)-da|0;da=(p<<1)-r|0;c[e+128+(b<<2)>>2]=da+2048>>12;r=(J+2048-k>>12)*3784|0;k=(s+2048-A>>12)*1567|0;A=k+r|0;s=(A<<1)-V|0;c[e+96+(b<<2)>>2]=s+2048>>12;V=((M+2048-U>>12)*5792|0)-s|0;c[d+128+(b<<2)>>2]=V+2048>>12;c[d+384+(b<<2)>>2]=2048-V+(((r+2048-k>>12)*5792|0)-A<<1)>>12;A=(I+2048-f>>12)*3784|0;f=(n+2048-v>>12)*1567|0;v=f+A|0;n=(v<<1)-Y|0;Y=(n<<1)-da|0;c[e+64+(b<<2)>>2]=Y+2048>>12;da=((W+2048-X>>12)*5792|0)-n|0;n=(D+2048-i>>12)*3784|0;i=(q+2048-y>>12)*1567|0;y=i+n|0;q=(y<<1)-$|0;$=(q<<1)-u|0;c[e+32+(b<<2)>>2]=$+2048>>12;u=((N+2048-O>>12)*5792|0)-$|0;c[d+64+(b<<2)>>2]=u+2048>>12;$=((T+2048-_>>12)*5792|0)-q|0;q=($<<1)-u|0;c[d+192+(b<<2)>>2]=q+2048>>12;u=(((S+2048-m>>12)*5792|0)-C<<1)-q|0;c[d+320+(b<<2)>>2]=u+2048>>12;c[d+448+(b<<2)>>2]=((((n+2048-i>>12)*5792|0)-y<<1)-$<<1)+2048-u>>12;u=(G+2048-g>>12)*3784|0;g=(l+2048-t>>12)*1567|0;t=g+u|0;l=(t<<1)-ca|0;ca=(l<<1)-p|0;p=((Q+2048-R>>12)*5792|0)-ca|0;R=(ca<<1)-Y|0;c[e+(b<<2)>>2]=R+2048>>12;e=((F+2048-B>>12)*5792|0)-R|0;c[d+32+(b<<2)>>2]=e+2048>>12;R=(p<<1)-e|0;c[d+96+(b<<2)>>2]=R+2048>>12;e=(da<<1)-R|0;c[d+160+(b<<2)>>2]=e+2048>>12;R=((P+2048-ba>>12)*5792|0)-l|0;l=(R<<1)-p|0;p=(l<<1)-e|0;c[d+224+(b<<2)>>2]=p+2048>>12;e=(((o+2048-j>>12)*5792|0)-z<<1)-p|0;c[d+288+(b<<2)>>2]=e+2048>>12;p=(((aa+2048-h>>12)*5792|0)-x<<1)-l|0;l=(p<<1)-e|0;c[d+352+(b<<2)>>2]=l+2048>>12;e=((((A+2048-f>>12)*5792|0)-v<<1)-da<<1)-l|0;c[d+416+(b<<2)>>2]=e+2048>>12;c[d+480+(b<<2)>>2]=(((((u+2048-g>>12)*5792|0)-t<<1)-R<<1)-p<<1)+2048-e>>12;return}function ub(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=a|0;c[f>>2]=b;if(d>>>0>=e>>>0&(e|0)!=0){c[f>>2]=((d>>>0)/(e>>>0)|0)+b;g=(d>>>0)%(e>>>0)|0}else{g=d}if((e|0)==12e3){d=g*29400|0;c[a+4>>2]=d;h=d}else if((e|0)==16e3){d=g*22050|0;c[a+4>>2]=d;h=d}else if((e|0)==3528e5){c[a+4>>2]=g;h=g}else if((e|0)==0|(e|0)==1){c[a+4>>2]=0;return}else if((e|0)==22050){d=g*16e3|0;c[a+4>>2]=d;h=d}else if((e|0)==24e3){d=g*14700|0;c[a+4>>2]=d;h=d}else if((e|0)==32e3){d=g*11025|0;c[a+4>>2]=d;h=d}else if((e|0)==44100){d=g*8e3|0;c[a+4>>2]=d;h=d}else if((e|0)==48e3){d=g*7350|0;c[a+4>>2]=d;h=d}else if((e|0)==1e3){d=g*352800|0;c[a+4>>2]=d;h=d}else if((e|0)==8e3){d=g*44100|0;c[a+4>>2]=d;h=d}else if((e|0)==11025){d=g*32e3|0;c[a+4>>2]=d;h=d}else{d=vb(g,e,3528e5)|0;c[a+4>>2]=d;h=d}if(!(h>>>0>352799999>>>0)){return}c[f>>2]=(c[f>>2]|0)+((h>>>0)/3528e5|0);c[a+4>>2]=(h>>>0)%3528e5|0;return}function vb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,i=0;if((b|0)==0){d=a}else{e=b;f=a;while(1){g=(f>>>0)%(e>>>0)|0;if((g|0)==0){d=e;break}else{f=e;e=g}}}if((d|0)==0){na(41040,41376,127,41632);return 0}e=(a>>>0)/(d>>>0)|0;a=(b>>>0)/(d>>>0)|0;if((a|0)==0){h=c}else{d=a;b=c;while(1){f=(b>>>0)%(d>>>0)|0;if((f|0)==0){h=d;break}else{b=d;d=f}}}if((h|0)==0){na(41040,41376,127,41632);return 0}d=(c>>>0)/(h>>>0)|0;c=(a>>>0)/(h>>>0)|0;if((c|0)==0){na(41e3,41376,144,41616);return 0}if(c>>>0<d>>>0){i=(((Z((d>>>0)%(c>>>0)|0,e)|0)>>>0)/(c>>>0)|0)+(Z((d>>>0)/(c>>>0)|0,e)|0)|0;return i|0}if(c>>>0<e>>>0){i=(((Z((e>>>0)%(c>>>0)|0,d)|0)>>>0)/(c>>>0)|0)+(Z((e>>>0)/(c>>>0)|0,d)|0)|0;return i|0}else{i=((Z(d,e)|0)>>>0)/(c>>>0)|0;return i|0}return 0}function wb(b){b=b|0;var c=0,e=0,f=0;if(!((a[b]|0)==73&(a[b+1|0]|0)==68&(a[b+2|0]|0)==51)){c=-1;return c|0}e=(a[b+5|0]&16)==0?0:10;f=b+6|0;b=la(d[f]|d[f+1|0]<<8|d[f+2|0]<<16|d[f+3|0]<<24|0)|0;c=(((b>>>1&1065353216|b&8323072)>>>1|b&32512)>>>1|b&127)+e|0;return c|0}function xb(){var a=0;a=Db(22664)|0;c[a>>2]=0;jb(a+4|0);_a(a+68|0);ob(a+9336|0);c[a+22660>>2]=Db(16384)|0;return a|0}function yb(a){a=a|0;$a(a+68|0);kb(a+4|0);Eb(c[a+22660>>2]|0);Eb(a);return}function zb(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0;do{if((c[a+4>>2]|0)!=0){if((c[a+64>>2]|0)==1){break}qa(a|0);return}}while(0);b=c[a+28>>2]|0;if((b|0)==0){d=c[a+22660>>2]|0;e=0;f=16384}else{g=(c[a+8>>2]|0)-b|0;h=a+22660|0;Ib(c[h>>2]|0,b|0,g|0)|0;d=(c[h>>2]|0)+g|0;e=g;f=16384-g|0}ta(a|0,d|0,c[a>>2]|0,f|0,e|0);return}function Ab(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;e=a|0;c[e>>2]=(c[e>>2]|0)+b;lb(a+4|0,c[a+22660>>2]|0,d+b|0);c[a+64>>2]=0;qa(a|0);return}function Bb(a){a=a|0;var b=0,d=0,e=0,f=0;b=a+68|0;d=a+4|0;do{if((cb(b,d)|0)!=0){e=c[a+64>>2]|0;if((e&65280|0)!=0|(e|0)==1){f=1;return f|0}else{sa(nb(d)|0);break}}}while(0);qb(a+9336|0,b);f=0;return f|0}function Cb(a,b,d,f,h){a=a|0;b=b|0;d=d|0;f=f|0;h=h|0;var i=0,j=0;c[b>>2]=(c[a+72>>2]|0)!=0?2:1;c[d>>2]=e[a+13442>>1]|0;c[f>>2]=c[a+13436>>2];c[h>>2]=c[a+84>>2];h=c[b>>2]|0;b=Db(h)|0;if((h|0)<=0){return b|0}f=c[d>>2]|0;d=0;do{i=Db(f<<2)|0;c[b+(d<<2)>>2]=i;if((f|0)>0){j=0;do{g[i+(j<<2)>>2]=+(c[a+13444+(d*4608|0)+(j<<2)>>2]|0)*3.725290298461914e-9;j=j+1|0;}while((j|0)<(f|0))}d=d+1|0;}while((d|0)<(h|0));return b|0}function Db(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,la=0,na=0,oa=0,qa=0,ra=0,sa=0,ta=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0;do{if(a>>>0<245>>>0){if(a>>>0<11>>>0){b=16}else{b=a+11&-8}d=b>>>3;e=c[10972]|0;f=e>>>(d>>>0);if((f&3|0)!=0){g=(f&1^1)+d|0;h=g<<1;i=43928+(h<<2)|0;j=43928+(h+2<<2)|0;h=c[j>>2]|0;k=h+8|0;l=c[k>>2]|0;do{if((i|0)==(l|0)){c[10972]=e&~(1<<g)}else{if(l>>>0<(c[10976]|0)>>>0){ka();return 0}m=l+12|0;if((c[m>>2]|0)==(h|0)){c[m>>2]=i;c[j>>2]=l;break}else{ka();return 0}}}while(0);l=g<<3;c[h+4>>2]=l|3;j=h+(l|4)|0;c[j>>2]=c[j>>2]|1;n=k;return n|0}if(!(b>>>0>(c[10974]|0)>>>0)){o=b;break}if((f|0)!=0){j=2<<d;l=f<<d&(j|-j);j=(l&-l)-1|0;l=j>>>12&16;i=j>>>(l>>>0);j=i>>>5&8;m=i>>>(j>>>0);i=m>>>2&4;p=m>>>(i>>>0);m=p>>>1&2;q=p>>>(m>>>0);p=q>>>1&1;r=(j|l|i|m|p)+(q>>>(p>>>0))|0;p=r<<1;q=43928+(p<<2)|0;m=43928+(p+2<<2)|0;p=c[m>>2]|0;i=p+8|0;l=c[i>>2]|0;do{if((q|0)==(l|0)){c[10972]=e&~(1<<r)}else{if(l>>>0<(c[10976]|0)>>>0){ka();return 0}j=l+12|0;if((c[j>>2]|0)==(p|0)){c[j>>2]=q;c[m>>2]=l;break}else{ka();return 0}}}while(0);l=r<<3;m=l-b|0;c[p+4>>2]=b|3;q=p;e=q+b|0;c[q+(b|4)>>2]=m|1;c[q+l>>2]=m;l=c[10974]|0;if((l|0)!=0){q=c[10977]|0;d=l>>>3;l=d<<1;f=43928+(l<<2)|0;k=c[10972]|0;h=1<<d;do{if((k&h|0)==0){c[10972]=k|h;s=f;t=43928+(l+2<<2)|0}else{d=43928+(l+2<<2)|0;g=c[d>>2]|0;if(!(g>>>0<(c[10976]|0)>>>0)){s=g;t=d;break}ka();return 0}}while(0);c[t>>2]=q;c[s+12>>2]=q;c[q+8>>2]=s;c[q+12>>2]=f}c[10974]=m;c[10977]=e;n=i;return n|0}l=c[10973]|0;if((l|0)==0){o=b;break}h=(l&-l)-1|0;l=h>>>12&16;k=h>>>(l>>>0);h=k>>>5&8;p=k>>>(h>>>0);k=p>>>2&4;r=p>>>(k>>>0);p=r>>>1&2;d=r>>>(p>>>0);r=d>>>1&1;g=c[44192+((h|l|k|p|r)+(d>>>(r>>>0))<<2)>>2]|0;r=g;d=g;p=(c[g+4>>2]&-8)-b|0;while(1){g=c[r+16>>2]|0;if((g|0)==0){k=c[r+20>>2]|0;if((k|0)==0){break}else{u=k}}else{u=g}g=(c[u+4>>2]&-8)-b|0;k=g>>>0<p>>>0;r=u;d=k?u:d;p=k?g:p}r=d;i=c[10976]|0;if(r>>>0<i>>>0){ka();return 0}e=r+b|0;m=e;if(!(r>>>0<e>>>0)){ka();return 0}e=c[d+24>>2]|0;f=c[d+12>>2]|0;do{if((f|0)==(d|0)){q=d+20|0;g=c[q>>2]|0;if((g|0)==0){k=d+16|0;l=c[k>>2]|0;if((l|0)==0){v=0;break}else{w=l;x=k}}else{w=g;x=q}while(1){q=w+20|0;g=c[q>>2]|0;if((g|0)!=0){w=g;x=q;continue}q=w+16|0;g=c[q>>2]|0;if((g|0)==0){break}else{w=g;x=q}}if(x>>>0<i>>>0){ka();return 0}else{c[x>>2]=0;v=w;break}}else{q=c[d+8>>2]|0;if(q>>>0<i>>>0){ka();return 0}g=q+12|0;if((c[g>>2]|0)!=(d|0)){ka();return 0}k=f+8|0;if((c[k>>2]|0)==(d|0)){c[g>>2]=f;c[k>>2]=q;v=f;break}else{ka();return 0}}}while(0);a:do{if((e|0)!=0){f=c[d+28>>2]|0;i=44192+(f<<2)|0;do{if((d|0)==(c[i>>2]|0)){c[i>>2]=v;if((v|0)!=0){break}c[10973]=c[10973]&~(1<<f);break a}else{if(e>>>0<(c[10976]|0)>>>0){ka();return 0}q=e+16|0;if((c[q>>2]|0)==(d|0)){c[q>>2]=v}else{c[e+20>>2]=v}if((v|0)==0){break a}}}while(0);if(v>>>0<(c[10976]|0)>>>0){ka();return 0}c[v+24>>2]=e;f=c[d+16>>2]|0;do{if((f|0)!=0){if(f>>>0<(c[10976]|0)>>>0){ka();return 0}else{c[v+16>>2]=f;c[f+24>>2]=v;break}}}while(0);f=c[d+20>>2]|0;if((f|0)==0){break}if(f>>>0<(c[10976]|0)>>>0){ka();return 0}else{c[v+20>>2]=f;c[f+24>>2]=v;break}}}while(0);if(p>>>0<16>>>0){e=p+b|0;c[d+4>>2]=e|3;f=r+(e+4)|0;c[f>>2]=c[f>>2]|1}else{c[d+4>>2]=b|3;c[r+(b|4)>>2]=p|1;c[r+(p+b)>>2]=p;f=c[10974]|0;if((f|0)!=0){e=c[10977]|0;i=f>>>3;f=i<<1;q=43928+(f<<2)|0;k=c[10972]|0;g=1<<i;do{if((k&g|0)==0){c[10972]=k|g;y=q;z=43928+(f+2<<2)|0}else{i=43928+(f+2<<2)|0;l=c[i>>2]|0;if(!(l>>>0<(c[10976]|0)>>>0)){y=l;z=i;break}ka();return 0}}while(0);c[z>>2]=e;c[y+12>>2]=e;c[e+8>>2]=y;c[e+12>>2]=q}c[10974]=p;c[10977]=m}f=d+8|0;if((f|0)==0){o=b;break}else{n=f}return n|0}else{if(a>>>0>4294967231>>>0){o=-1;break}f=a+11|0;g=f&-8;k=c[10973]|0;if((k|0)==0){o=g;break}r=-g|0;i=f>>>8;do{if((i|0)==0){A=0}else{if(g>>>0>16777215>>>0){A=31;break}f=(i+1048320|0)>>>16&8;l=i<<f;h=(l+520192|0)>>>16&4;j=l<<h;l=(j+245760|0)>>>16&2;B=14-(h|f|l)+(j<<l>>>15)|0;A=g>>>((B+7|0)>>>0)&1|B<<1}}while(0);i=c[44192+(A<<2)>>2]|0;b:do{if((i|0)==0){C=0;D=r;E=0}else{if((A|0)==31){F=0}else{F=25-(A>>>1)|0}d=0;m=r;p=i;q=g<<F;e=0;while(1){B=c[p+4>>2]&-8;l=B-g|0;if(l>>>0<m>>>0){if((B|0)==(g|0)){C=p;D=l;E=p;break b}else{G=p;H=l}}else{G=d;H=m}l=c[p+20>>2]|0;B=c[p+16+(q>>>31<<2)>>2]|0;j=(l|0)==0|(l|0)==(B|0)?e:l;if((B|0)==0){C=G;D=H;E=j;break}else{d=G;m=H;p=B;q=q<<1;e=j}}}}while(0);if((E|0)==0&(C|0)==0){i=2<<A;r=k&(i|-i);if((r|0)==0){o=g;break}i=(r&-r)-1|0;r=i>>>12&16;e=i>>>(r>>>0);i=e>>>5&8;q=e>>>(i>>>0);e=q>>>2&4;p=q>>>(e>>>0);q=p>>>1&2;m=p>>>(q>>>0);p=m>>>1&1;I=c[44192+((i|r|e|q|p)+(m>>>(p>>>0))<<2)>>2]|0}else{I=E}if((I|0)==0){J=D;K=C}else{p=I;m=D;q=C;while(1){e=(c[p+4>>2]&-8)-g|0;r=e>>>0<m>>>0;i=r?e:m;e=r?p:q;r=c[p+16>>2]|0;if((r|0)!=0){p=r;m=i;q=e;continue}r=c[p+20>>2]|0;if((r|0)==0){J=i;K=e;break}else{p=r;m=i;q=e}}}if((K|0)==0){o=g;break}if(!(J>>>0<((c[10974]|0)-g|0)>>>0)){o=g;break}q=K;m=c[10976]|0;if(q>>>0<m>>>0){ka();return 0}p=q+g|0;k=p;if(!(q>>>0<p>>>0)){ka();return 0}e=c[K+24>>2]|0;i=c[K+12>>2]|0;do{if((i|0)==(K|0)){r=K+20|0;d=c[r>>2]|0;if((d|0)==0){j=K+16|0;B=c[j>>2]|0;if((B|0)==0){L=0;break}else{M=B;N=j}}else{M=d;N=r}while(1){r=M+20|0;d=c[r>>2]|0;if((d|0)!=0){M=d;N=r;continue}r=M+16|0;d=c[r>>2]|0;if((d|0)==0){break}else{M=d;N=r}}if(N>>>0<m>>>0){ka();return 0}else{c[N>>2]=0;L=M;break}}else{r=c[K+8>>2]|0;if(r>>>0<m>>>0){ka();return 0}d=r+12|0;if((c[d>>2]|0)!=(K|0)){ka();return 0}j=i+8|0;if((c[j>>2]|0)==(K|0)){c[d>>2]=i;c[j>>2]=r;L=i;break}else{ka();return 0}}}while(0);c:do{if((e|0)!=0){i=c[K+28>>2]|0;m=44192+(i<<2)|0;do{if((K|0)==(c[m>>2]|0)){c[m>>2]=L;if((L|0)!=0){break}c[10973]=c[10973]&~(1<<i);break c}else{if(e>>>0<(c[10976]|0)>>>0){ka();return 0}r=e+16|0;if((c[r>>2]|0)==(K|0)){c[r>>2]=L}else{c[e+20>>2]=L}if((L|0)==0){break c}}}while(0);if(L>>>0<(c[10976]|0)>>>0){ka();return 0}c[L+24>>2]=e;i=c[K+16>>2]|0;do{if((i|0)!=0){if(i>>>0<(c[10976]|0)>>>0){ka();return 0}else{c[L+16>>2]=i;c[i+24>>2]=L;break}}}while(0);i=c[K+20>>2]|0;if((i|0)==0){break}if(i>>>0<(c[10976]|0)>>>0){ka();return 0}else{c[L+20>>2]=i;c[i+24>>2]=L;break}}}while(0);do{if(J>>>0<16>>>0){e=J+g|0;c[K+4>>2]=e|3;i=q+(e+4)|0;c[i>>2]=c[i>>2]|1}else{c[K+4>>2]=g|3;c[q+(g|4)>>2]=J|1;c[q+(J+g)>>2]=J;i=J>>>3;if(J>>>0<256>>>0){e=i<<1;m=43928+(e<<2)|0;r=c[10972]|0;j=1<<i;do{if((r&j|0)==0){c[10972]=r|j;O=m;P=43928+(e+2<<2)|0}else{i=43928+(e+2<<2)|0;d=c[i>>2]|0;if(!(d>>>0<(c[10976]|0)>>>0)){O=d;P=i;break}ka();return 0}}while(0);c[P>>2]=k;c[O+12>>2]=k;c[q+(g+8)>>2]=O;c[q+(g+12)>>2]=m;break}e=p;j=J>>>8;do{if((j|0)==0){Q=0}else{if(J>>>0>16777215>>>0){Q=31;break}r=(j+1048320|0)>>>16&8;i=j<<r;d=(i+520192|0)>>>16&4;B=i<<d;i=(B+245760|0)>>>16&2;l=14-(d|r|i)+(B<<i>>>15)|0;Q=J>>>((l+7|0)>>>0)&1|l<<1}}while(0);j=44192+(Q<<2)|0;c[q+(g+28)>>2]=Q;c[q+(g+20)>>2]=0;c[q+(g+16)>>2]=0;m=c[10973]|0;l=1<<Q;if((m&l|0)==0){c[10973]=m|l;c[j>>2]=e;c[q+(g+24)>>2]=j;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break}if((Q|0)==31){R=0}else{R=25-(Q>>>1)|0}l=J<<R;m=c[j>>2]|0;while(1){if((c[m+4>>2]&-8|0)==(J|0)){break}S=m+16+(l>>>31<<2)|0;j=c[S>>2]|0;if((j|0)==0){T=151;break}else{l=l<<1;m=j}}if((T|0)==151){if(S>>>0<(c[10976]|0)>>>0){ka();return 0}else{c[S>>2]=e;c[q+(g+24)>>2]=m;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break}}l=m+8|0;j=c[l>>2]|0;i=c[10976]|0;if(m>>>0<i>>>0){ka();return 0}if(j>>>0<i>>>0){ka();return 0}else{c[j+12>>2]=e;c[l>>2]=e;c[q+(g+8)>>2]=j;c[q+(g+12)>>2]=m;c[q+(g+24)>>2]=0;break}}}while(0);q=K+8|0;if((q|0)==0){o=g;break}else{n=q}return n|0}}while(0);K=c[10974]|0;if(!(o>>>0>K>>>0)){S=K-o|0;J=c[10977]|0;if(S>>>0>15>>>0){R=J;c[10977]=R+o;c[10974]=S;c[R+(o+4)>>2]=S|1;c[R+K>>2]=S;c[J+4>>2]=o|3}else{c[10974]=0;c[10977]=0;c[J+4>>2]=K|3;S=J+(K+4)|0;c[S>>2]=c[S>>2]|1}n=J+8|0;return n|0}J=c[10975]|0;if(o>>>0<J>>>0){S=J-o|0;c[10975]=S;J=c[10978]|0;K=J;c[10978]=K+o;c[K+(o+4)>>2]=S|1;c[J+4>>2]=o|3;n=J+8|0;return n|0}do{if((c[10964]|0)==0){J=ja(30)|0;if((J-1&J|0)==0){c[10966]=J;c[10965]=J;c[10967]=-1;c[10968]=-1;c[10969]=0;c[11083]=0;c[10964]=(ua(0)|0)&-16^1431655768;break}else{ka();return 0}}}while(0);J=o+48|0;S=c[10966]|0;K=o+47|0;R=S+K|0;Q=-S|0;S=R&Q;if(!(S>>>0>o>>>0)){n=0;return n|0}O=c[11082]|0;do{if((O|0)!=0){P=c[11080]|0;L=P+S|0;if(L>>>0<=P>>>0|L>>>0>O>>>0){n=0}else{break}return n|0}}while(0);d:do{if((c[11083]&4|0)==0){O=c[10978]|0;e:do{if((O|0)==0){T=181}else{L=O;P=44336;while(1){U=P|0;M=c[U>>2]|0;if(!(M>>>0>L>>>0)){V=P+4|0;if((M+(c[V>>2]|0)|0)>>>0>L>>>0){break}}M=c[P+8>>2]|0;if((M|0)==0){T=181;break e}else{P=M}}if((P|0)==0){T=181;break}L=R-(c[10975]|0)&Q;if(!(L>>>0<2147483647>>>0)){W=0;break}m=ma(L|0)|0;e=(m|0)==((c[U>>2]|0)+(c[V>>2]|0)|0);X=e?m:-1;Y=e?L:0;Z=m;_=L;T=190}}while(0);do{if((T|0)==181){O=ma(0)|0;if((O|0)==-1){W=0;break}g=O;L=c[10965]|0;m=L-1|0;if((m&g|0)==0){$=S}else{$=S-g+(m+g&-L)|0}L=c[11080]|0;g=L+$|0;if(!($>>>0>o>>>0&$>>>0<2147483647>>>0)){W=0;break}m=c[11082]|0;if((m|0)!=0){if(g>>>0<=L>>>0|g>>>0>m>>>0){W=0;break}}m=ma($|0)|0;g=(m|0)==(O|0);X=g?O:-1;Y=g?$:0;Z=m;_=$;T=190}}while(0);f:do{if((T|0)==190){m=-_|0;if(!((X|0)==-1)){aa=Y;ba=X;T=201;break d}do{if((Z|0)!=-1&_>>>0<2147483647>>>0&_>>>0<J>>>0){g=c[10966]|0;O=K-_+g&-g;if(!(O>>>0<2147483647>>>0)){ca=_;break}if((ma(O|0)|0)==-1){ma(m|0)|0;W=Y;break f}else{ca=O+_|0;break}}else{ca=_}}while(0);if((Z|0)==-1){W=Y}else{aa=ca;ba=Z;T=201;break d}}}while(0);c[11083]=c[11083]|4;da=W;T=198}else{da=0;T=198}}while(0);do{if((T|0)==198){if(!(S>>>0<2147483647>>>0)){break}W=ma(S|0)|0;Z=ma(0)|0;if(!((Z|0)!=-1&(W|0)!=-1&W>>>0<Z>>>0)){break}ca=Z-W|0;Z=ca>>>0>(o+40|0)>>>0;Y=Z?W:-1;if(!((Y|0)==-1)){aa=Z?ca:da;ba=Y;T=201}}}while(0);do{if((T|0)==201){da=(c[11080]|0)+aa|0;c[11080]=da;if(da>>>0>(c[11081]|0)>>>0){c[11081]=da}da=c[10978]|0;g:do{if((da|0)==0){S=c[10976]|0;if((S|0)==0|ba>>>0<S>>>0){c[10976]=ba}c[11084]=ba;c[11085]=aa;c[11087]=0;c[10981]=c[10964];c[10980]=-1;S=0;do{Y=S<<1;ca=43928+(Y<<2)|0;c[43928+(Y+3<<2)>>2]=ca;c[43928+(Y+2<<2)>>2]=ca;S=S+1|0;}while(S>>>0<32>>>0);S=ba+8|0;if((S&7|0)==0){ea=0}else{ea=-S&7}S=aa-40-ea|0;c[10978]=ba+ea;c[10975]=S;c[ba+(ea+4)>>2]=S|1;c[ba+(aa-36)>>2]=40;c[10979]=c[10968]}else{S=44336;while(1){fa=c[S>>2]|0;ga=S+4|0;ha=c[ga>>2]|0;if((ba|0)==(fa+ha|0)){T=213;break}ca=c[S+8>>2]|0;if((ca|0)==0){break}else{S=ca}}do{if((T|0)==213){if((c[S+12>>2]&8|0)!=0){break}ca=da;if(!(ca>>>0>=fa>>>0&ca>>>0<ba>>>0)){break}c[ga>>2]=ha+aa;Y=(c[10975]|0)+aa|0;Z=da+8|0;if((Z&7|0)==0){ia=0}else{ia=-Z&7}Z=Y-ia|0;c[10978]=ca+ia;c[10975]=Z;c[ca+(ia+4)>>2]=Z|1;c[ca+(Y+4)>>2]=40;c[10979]=c[10968];break g}}while(0);if(ba>>>0<(c[10976]|0)>>>0){c[10976]=ba}S=ba+aa|0;Y=44336;while(1){la=Y|0;if((c[la>>2]|0)==(S|0)){T=223;break}ca=c[Y+8>>2]|0;if((ca|0)==0){break}else{Y=ca}}do{if((T|0)==223){if((c[Y+12>>2]&8|0)!=0){break}c[la>>2]=ba;S=Y+4|0;c[S>>2]=(c[S>>2]|0)+aa;S=ba+8|0;if((S&7|0)==0){na=0}else{na=-S&7}S=ba+(aa+8)|0;if((S&7|0)==0){oa=0}else{oa=-S&7}S=ba+(oa+aa)|0;ca=S;Z=na+o|0;W=ba+Z|0;_=W;K=S-(ba+na)-o|0;c[ba+(na+4)>>2]=o|3;do{if((ca|0)==(c[10978]|0)){J=(c[10975]|0)+K|0;c[10975]=J;c[10978]=_;c[ba+(Z+4)>>2]=J|1}else{if((ca|0)==(c[10977]|0)){J=(c[10974]|0)+K|0;c[10974]=J;c[10977]=_;c[ba+(Z+4)>>2]=J|1;c[ba+(J+Z)>>2]=J;break}J=aa+4|0;X=c[ba+(J+oa)>>2]|0;if((X&3|0)==1){$=X&-8;V=X>>>3;h:do{if(X>>>0<256>>>0){U=c[ba+((oa|8)+aa)>>2]|0;Q=c[ba+(aa+12+oa)>>2]|0;R=43928+(V<<1<<2)|0;do{if((U|0)!=(R|0)){if(U>>>0<(c[10976]|0)>>>0){ka();return 0}if((c[U+12>>2]|0)==(ca|0)){break}ka();return 0}}while(0);if((Q|0)==(U|0)){c[10972]=c[10972]&~(1<<V);break}do{if((Q|0)==(R|0)){qa=Q+8|0}else{if(Q>>>0<(c[10976]|0)>>>0){ka();return 0}m=Q+8|0;if((c[m>>2]|0)==(ca|0)){qa=m;break}ka();return 0}}while(0);c[U+12>>2]=Q;c[qa>>2]=U}else{R=S;m=c[ba+((oa|24)+aa)>>2]|0;P=c[ba+(aa+12+oa)>>2]|0;do{if((P|0)==(R|0)){O=oa|16;g=ba+(J+O)|0;L=c[g>>2]|0;if((L|0)==0){e=ba+(O+aa)|0;O=c[e>>2]|0;if((O|0)==0){ra=0;break}else{sa=O;ta=e}}else{sa=L;ta=g}while(1){g=sa+20|0;L=c[g>>2]|0;if((L|0)!=0){sa=L;ta=g;continue}g=sa+16|0;L=c[g>>2]|0;if((L|0)==0){break}else{sa=L;ta=g}}if(ta>>>0<(c[10976]|0)>>>0){ka();return 0}else{c[ta>>2]=0;ra=sa;break}}else{g=c[ba+((oa|8)+aa)>>2]|0;if(g>>>0<(c[10976]|0)>>>0){ka();return 0}L=g+12|0;if((c[L>>2]|0)!=(R|0)){ka();return 0}e=P+8|0;if((c[e>>2]|0)==(R|0)){c[L>>2]=P;c[e>>2]=g;ra=P;break}else{ka();return 0}}}while(0);if((m|0)==0){break}P=c[ba+(aa+28+oa)>>2]|0;U=44192+(P<<2)|0;do{if((R|0)==(c[U>>2]|0)){c[U>>2]=ra;if((ra|0)!=0){break}c[10973]=c[10973]&~(1<<P);break h}else{if(m>>>0<(c[10976]|0)>>>0){ka();return 0}Q=m+16|0;if((c[Q>>2]|0)==(R|0)){c[Q>>2]=ra}else{c[m+20>>2]=ra}if((ra|0)==0){break h}}}while(0);if(ra>>>0<(c[10976]|0)>>>0){ka();return 0}c[ra+24>>2]=m;R=oa|16;P=c[ba+(R+aa)>>2]|0;do{if((P|0)!=0){if(P>>>0<(c[10976]|0)>>>0){ka();return 0}else{c[ra+16>>2]=P;c[P+24>>2]=ra;break}}}while(0);P=c[ba+(J+R)>>2]|0;if((P|0)==0){break}if(P>>>0<(c[10976]|0)>>>0){ka();return 0}else{c[ra+20>>2]=P;c[P+24>>2]=ra;break}}}while(0);va=ba+(($|oa)+aa)|0;wa=$+K|0}else{va=ca;wa=K}J=va+4|0;c[J>>2]=c[J>>2]&-2;c[ba+(Z+4)>>2]=wa|1;c[ba+(wa+Z)>>2]=wa;J=wa>>>3;if(wa>>>0<256>>>0){V=J<<1;X=43928+(V<<2)|0;P=c[10972]|0;m=1<<J;do{if((P&m|0)==0){c[10972]=P|m;xa=X;ya=43928+(V+2<<2)|0}else{J=43928+(V+2<<2)|0;U=c[J>>2]|0;if(!(U>>>0<(c[10976]|0)>>>0)){xa=U;ya=J;break}ka();return 0}}while(0);c[ya>>2]=_;c[xa+12>>2]=_;c[ba+(Z+8)>>2]=xa;c[ba+(Z+12)>>2]=X;break}V=W;m=wa>>>8;do{if((m|0)==0){za=0}else{if(wa>>>0>16777215>>>0){za=31;break}P=(m+1048320|0)>>>16&8;$=m<<P;J=($+520192|0)>>>16&4;U=$<<J;$=(U+245760|0)>>>16&2;Q=14-(J|P|$)+(U<<$>>>15)|0;za=wa>>>((Q+7|0)>>>0)&1|Q<<1}}while(0);m=44192+(za<<2)|0;c[ba+(Z+28)>>2]=za;c[ba+(Z+20)>>2]=0;c[ba+(Z+16)>>2]=0;X=c[10973]|0;Q=1<<za;if((X&Q|0)==0){c[10973]=X|Q;c[m>>2]=V;c[ba+(Z+24)>>2]=m;c[ba+(Z+12)>>2]=V;c[ba+(Z+8)>>2]=V;break}if((za|0)==31){Aa=0}else{Aa=25-(za>>>1)|0}Q=wa<<Aa;X=c[m>>2]|0;while(1){if((c[X+4>>2]&-8|0)==(wa|0)){break}Ba=X+16+(Q>>>31<<2)|0;m=c[Ba>>2]|0;if((m|0)==0){T=296;break}else{Q=Q<<1;X=m}}if((T|0)==296){if(Ba>>>0<(c[10976]|0)>>>0){ka();return 0}else{c[Ba>>2]=V;c[ba+(Z+24)>>2]=X;c[ba+(Z+12)>>2]=V;c[ba+(Z+8)>>2]=V;break}}Q=X+8|0;m=c[Q>>2]|0;$=c[10976]|0;if(X>>>0<$>>>0){ka();return 0}if(m>>>0<$>>>0){ka();return 0}else{c[m+12>>2]=V;c[Q>>2]=V;c[ba+(Z+8)>>2]=m;c[ba+(Z+12)>>2]=X;c[ba+(Z+24)>>2]=0;break}}}while(0);n=ba+(na|8)|0;return n|0}}while(0);Y=da;Z=44336;while(1){Ca=c[Z>>2]|0;if(!(Ca>>>0>Y>>>0)){Da=c[Z+4>>2]|0;Ea=Ca+Da|0;if(Ea>>>0>Y>>>0){break}}Z=c[Z+8>>2]|0}Z=Ca+(Da-39)|0;if((Z&7|0)==0){Fa=0}else{Fa=-Z&7}Z=Ca+(Da-47+Fa)|0;W=Z>>>0<(da+16|0)>>>0?Y:Z;Z=W+8|0;_=ba+8|0;if((_&7|0)==0){Ga=0}else{Ga=-_&7}_=aa-40-Ga|0;c[10978]=ba+Ga;c[10975]=_;c[ba+(Ga+4)>>2]=_|1;c[ba+(aa-36)>>2]=40;c[10979]=c[10968];c[W+4>>2]=27;c[Z>>2]=c[11084];c[Z+4>>2]=c[11085];c[Z+8>>2]=c[11086];c[Z+12>>2]=c[11087];c[11084]=ba;c[11085]=aa;c[11087]=0;c[11086]=Z;Z=W+28|0;c[Z>>2]=7;if((W+32|0)>>>0<Ea>>>0){_=Z;while(1){Z=_+4|0;c[Z>>2]=7;if((_+8|0)>>>0<Ea>>>0){_=Z}else{break}}}if((W|0)==(Y|0)){break}_=W-da|0;Z=Y+(_+4)|0;c[Z>>2]=c[Z>>2]&-2;c[da+4>>2]=_|1;c[Y+_>>2]=_;Z=_>>>3;if(_>>>0<256>>>0){K=Z<<1;ca=43928+(K<<2)|0;S=c[10972]|0;m=1<<Z;do{if((S&m|0)==0){c[10972]=S|m;Ha=ca;Ia=43928+(K+2<<2)|0}else{Z=43928+(K+2<<2)|0;Q=c[Z>>2]|0;if(!(Q>>>0<(c[10976]|0)>>>0)){Ha=Q;Ia=Z;break}ka();return 0}}while(0);c[Ia>>2]=da;c[Ha+12>>2]=da;c[da+8>>2]=Ha;c[da+12>>2]=ca;break}K=da;m=_>>>8;do{if((m|0)==0){Ja=0}else{if(_>>>0>16777215>>>0){Ja=31;break}S=(m+1048320|0)>>>16&8;Y=m<<S;W=(Y+520192|0)>>>16&4;Z=Y<<W;Y=(Z+245760|0)>>>16&2;Q=14-(W|S|Y)+(Z<<Y>>>15)|0;Ja=_>>>((Q+7|0)>>>0)&1|Q<<1}}while(0);m=44192+(Ja<<2)|0;c[da+28>>2]=Ja;c[da+20>>2]=0;c[da+16>>2]=0;ca=c[10973]|0;Q=1<<Ja;if((ca&Q|0)==0){c[10973]=ca|Q;c[m>>2]=K;c[da+24>>2]=m;c[da+12>>2]=da;c[da+8>>2]=da;break}if((Ja|0)==31){Ka=0}else{Ka=25-(Ja>>>1)|0}Q=_<<Ka;ca=c[m>>2]|0;while(1){if((c[ca+4>>2]&-8|0)==(_|0)){break}La=ca+16+(Q>>>31<<2)|0;m=c[La>>2]|0;if((m|0)==0){T=331;break}else{Q=Q<<1;ca=m}}if((T|0)==331){if(La>>>0<(c[10976]|0)>>>0){ka();return 0}else{c[La>>2]=K;c[da+24>>2]=ca;c[da+12>>2]=da;c[da+8>>2]=da;break}}Q=ca+8|0;_=c[Q>>2]|0;m=c[10976]|0;if(ca>>>0<m>>>0){ka();return 0}if(_>>>0<m>>>0){ka();return 0}else{c[_+12>>2]=K;c[Q>>2]=K;c[da+8>>2]=_;c[da+12>>2]=ca;c[da+24>>2]=0;break}}}while(0);da=c[10975]|0;if(!(da>>>0>o>>>0)){break}_=da-o|0;c[10975]=_;da=c[10978]|0;Q=da;c[10978]=Q+o;c[Q+(o+4)>>2]=_|1;c[da+4>>2]=o|3;n=da+8|0;return n|0}}while(0);c[(pa()|0)>>2]=12;n=0;return n|0}function Eb(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;if((a|0)==0){return}b=a-8|0;d=b;e=c[10976]|0;if(b>>>0<e>>>0){ka()}f=c[a-4>>2]|0;g=f&3;if((g|0)==1){ka()}h=f&-8;i=a+(h-8)|0;j=i;a:do{if((f&1|0)==0){k=c[b>>2]|0;if((g|0)==0){return}l=-8-k|0;m=a+l|0;n=m;o=k+h|0;if(m>>>0<e>>>0){ka()}if((n|0)==(c[10977]|0)){p=a+(h-4)|0;if((c[p>>2]&3|0)!=3){q=n;r=o;break}c[10974]=o;c[p>>2]=c[p>>2]&-2;c[a+(l+4)>>2]=o|1;c[i>>2]=o;return}p=k>>>3;if(k>>>0<256>>>0){k=c[a+(l+8)>>2]|0;s=c[a+(l+12)>>2]|0;t=43928+(p<<1<<2)|0;do{if((k|0)!=(t|0)){if(k>>>0<e>>>0){ka()}if((c[k+12>>2]|0)==(n|0)){break}ka()}}while(0);if((s|0)==(k|0)){c[10972]=c[10972]&~(1<<p);q=n;r=o;break}do{if((s|0)==(t|0)){u=s+8|0}else{if(s>>>0<e>>>0){ka()}v=s+8|0;if((c[v>>2]|0)==(n|0)){u=v;break}ka()}}while(0);c[k+12>>2]=s;c[u>>2]=k;q=n;r=o;break}t=m;p=c[a+(l+24)>>2]|0;v=c[a+(l+12)>>2]|0;do{if((v|0)==(t|0)){w=a+(l+20)|0;x=c[w>>2]|0;if((x|0)==0){y=a+(l+16)|0;z=c[y>>2]|0;if((z|0)==0){A=0;break}else{B=z;C=y}}else{B=x;C=w}while(1){w=B+20|0;x=c[w>>2]|0;if((x|0)!=0){B=x;C=w;continue}w=B+16|0;x=c[w>>2]|0;if((x|0)==0){break}else{B=x;C=w}}if(C>>>0<e>>>0){ka()}else{c[C>>2]=0;A=B;break}}else{w=c[a+(l+8)>>2]|0;if(w>>>0<e>>>0){ka()}x=w+12|0;if((c[x>>2]|0)!=(t|0)){ka()}y=v+8|0;if((c[y>>2]|0)==(t|0)){c[x>>2]=v;c[y>>2]=w;A=v;break}else{ka()}}}while(0);if((p|0)==0){q=n;r=o;break}v=c[a+(l+28)>>2]|0;m=44192+(v<<2)|0;do{if((t|0)==(c[m>>2]|0)){c[m>>2]=A;if((A|0)!=0){break}c[10973]=c[10973]&~(1<<v);q=n;r=o;break a}else{if(p>>>0<(c[10976]|0)>>>0){ka()}k=p+16|0;if((c[k>>2]|0)==(t|0)){c[k>>2]=A}else{c[p+20>>2]=A}if((A|0)==0){q=n;r=o;break a}}}while(0);if(A>>>0<(c[10976]|0)>>>0){ka()}c[A+24>>2]=p;t=c[a+(l+16)>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[10976]|0)>>>0){ka()}else{c[A+16>>2]=t;c[t+24>>2]=A;break}}}while(0);t=c[a+(l+20)>>2]|0;if((t|0)==0){q=n;r=o;break}if(t>>>0<(c[10976]|0)>>>0){ka()}else{c[A+20>>2]=t;c[t+24>>2]=A;q=n;r=o;break}}else{q=d;r=h}}while(0);d=q;if(!(d>>>0<i>>>0)){ka()}A=a+(h-4)|0;e=c[A>>2]|0;if((e&1|0)==0){ka()}do{if((e&2|0)==0){if((j|0)==(c[10978]|0)){B=(c[10975]|0)+r|0;c[10975]=B;c[10978]=q;c[q+4>>2]=B|1;if((q|0)!=(c[10977]|0)){return}c[10977]=0;c[10974]=0;return}if((j|0)==(c[10977]|0)){B=(c[10974]|0)+r|0;c[10974]=B;c[10977]=q;c[q+4>>2]=B|1;c[d+B>>2]=B;return}B=(e&-8)+r|0;C=e>>>3;b:do{if(e>>>0<256>>>0){u=c[a+h>>2]|0;g=c[a+(h|4)>>2]|0;b=43928+(C<<1<<2)|0;do{if((u|0)!=(b|0)){if(u>>>0<(c[10976]|0)>>>0){ka()}if((c[u+12>>2]|0)==(j|0)){break}ka()}}while(0);if((g|0)==(u|0)){c[10972]=c[10972]&~(1<<C);break}do{if((g|0)==(b|0)){D=g+8|0}else{if(g>>>0<(c[10976]|0)>>>0){ka()}f=g+8|0;if((c[f>>2]|0)==(j|0)){D=f;break}ka()}}while(0);c[u+12>>2]=g;c[D>>2]=u}else{b=i;f=c[a+(h+16)>>2]|0;t=c[a+(h|4)>>2]|0;do{if((t|0)==(b|0)){p=a+(h+12)|0;v=c[p>>2]|0;if((v|0)==0){m=a+(h+8)|0;k=c[m>>2]|0;if((k|0)==0){E=0;break}else{F=k;G=m}}else{F=v;G=p}while(1){p=F+20|0;v=c[p>>2]|0;if((v|0)!=0){F=v;G=p;continue}p=F+16|0;v=c[p>>2]|0;if((v|0)==0){break}else{F=v;G=p}}if(G>>>0<(c[10976]|0)>>>0){ka()}else{c[G>>2]=0;E=F;break}}else{p=c[a+h>>2]|0;if(p>>>0<(c[10976]|0)>>>0){ka()}v=p+12|0;if((c[v>>2]|0)!=(b|0)){ka()}m=t+8|0;if((c[m>>2]|0)==(b|0)){c[v>>2]=t;c[m>>2]=p;E=t;break}else{ka()}}}while(0);if((f|0)==0){break}t=c[a+(h+20)>>2]|0;u=44192+(t<<2)|0;do{if((b|0)==(c[u>>2]|0)){c[u>>2]=E;if((E|0)!=0){break}c[10973]=c[10973]&~(1<<t);break b}else{if(f>>>0<(c[10976]|0)>>>0){ka()}g=f+16|0;if((c[g>>2]|0)==(b|0)){c[g>>2]=E}else{c[f+20>>2]=E}if((E|0)==0){break b}}}while(0);if(E>>>0<(c[10976]|0)>>>0){ka()}c[E+24>>2]=f;b=c[a+(h+8)>>2]|0;do{if((b|0)!=0){if(b>>>0<(c[10976]|0)>>>0){ka()}else{c[E+16>>2]=b;c[b+24>>2]=E;break}}}while(0);b=c[a+(h+12)>>2]|0;if((b|0)==0){break}if(b>>>0<(c[10976]|0)>>>0){ka()}else{c[E+20>>2]=b;c[b+24>>2]=E;break}}}while(0);c[q+4>>2]=B|1;c[d+B>>2]=B;if((q|0)!=(c[10977]|0)){H=B;break}c[10974]=B;return}else{c[A>>2]=e&-2;c[q+4>>2]=r|1;c[d+r>>2]=r;H=r}}while(0);r=H>>>3;if(H>>>0<256>>>0){d=r<<1;e=43928+(d<<2)|0;A=c[10972]|0;E=1<<r;do{if((A&E|0)==0){c[10972]=A|E;I=e;J=43928+(d+2<<2)|0}else{r=43928+(d+2<<2)|0;h=c[r>>2]|0;if(!(h>>>0<(c[10976]|0)>>>0)){I=h;J=r;break}ka()}}while(0);c[J>>2]=q;c[I+12>>2]=q;c[q+8>>2]=I;c[q+12>>2]=e;return}e=q;I=H>>>8;do{if((I|0)==0){K=0}else{if(H>>>0>16777215>>>0){K=31;break}J=(I+1048320|0)>>>16&8;d=I<<J;E=(d+520192|0)>>>16&4;A=d<<E;d=(A+245760|0)>>>16&2;r=14-(E|J|d)+(A<<d>>>15)|0;K=H>>>((r+7|0)>>>0)&1|r<<1}}while(0);I=44192+(K<<2)|0;c[q+28>>2]=K;c[q+20>>2]=0;c[q+16>>2]=0;r=c[10973]|0;d=1<<K;do{if((r&d|0)==0){c[10973]=r|d;c[I>>2]=e;c[q+24>>2]=I;c[q+12>>2]=q;c[q+8>>2]=q}else{if((K|0)==31){L=0}else{L=25-(K>>>1)|0}A=H<<L;J=c[I>>2]|0;while(1){if((c[J+4>>2]&-8|0)==(H|0)){break}M=J+16+(A>>>31<<2)|0;E=c[M>>2]|0;if((E|0)==0){N=129;break}else{A=A<<1;J=E}}if((N|0)==129){if(M>>>0<(c[10976]|0)>>>0){ka()}else{c[M>>2]=e;c[q+24>>2]=J;c[q+12>>2]=q;c[q+8>>2]=q;break}}A=J+8|0;B=c[A>>2]|0;E=c[10976]|0;if(J>>>0<E>>>0){ka()}if(B>>>0<E>>>0){ka()}else{c[B+12>>2]=e;c[A>>2]=e;c[q+8>>2]=B;c[q+12>>2]=J;c[q+24>>2]=0;break}}}while(0);q=(c[10980]|0)-1|0;c[10980]=q;if((q|0)==0){O=44344}else{return}while(1){q=c[O>>2]|0;if((q|0)==0){break}else{O=q+8|0}}c[10980]=-1;return}function Fb(a,b){a=a|0;b=b|0;var d=0,e=0;do{if((a|0)==0){d=0}else{e=Z(b,a)|0;if(!((b|a)>>>0>65535>>>0)){d=e;break}d=((e>>>0)/(a>>>0)|0|0)==(b|0)?e:-1}}while(0);b=Db(d)|0;if((b|0)==0){return b|0}if((c[b-4>>2]&3|0)==0){return b|0}Hb(b|0,0,d|0)|0;return b|0}function Gb(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((e|0)>=4096)return va(b|0,d|0,e|0)|0;f=b|0;if((b&3)==(d&3)){while(b&3){if((e|0)==0)return f|0;a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function Hb(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=b+e|0;if((e|0)>=20){d=d&255;g=b&3;h=d|d<<8|d<<16|d<<24;i=f&~3;if(g){g=b+4-g|0;while((b|0)<(g|0)){a[b]=d;b=b+1|0}}while((b|0)<(i|0)){c[b>>2]=h;b=b+4|0}}while((b|0)<(f|0)){a[b]=d;b=b+1|0}return b-e|0}function Ib(b,c,d){b=b|0;c=c|0;d=d|0;var e=0;if((c|0)<(b|0)&(b|0)<(c+d|0)){e=b;c=c+d|0;b=b+d|0;while((d|0)>0){b=b-1|0;c=c-1|0;d=d-1|0;a[b]=a[c]|0}b=e}else{Gb(b,c,d)|0}return b|0}function Jb(b){b=b|0;var c=0;c=b;while(a[c]|0){c=c+1|0}return c-b|0}function Kb(a,b){a=a|0;b=b|0;ya[a&1](b|0)}function Lb(a,b){a=a|0;b=b|0;return za[a&1](b|0)|0}function Mb(a){a=a|0;Aa[a&1]()}function Nb(a,b,c){a=a|0;b=b|0;c=c|0;return Ba[a&7](b|0,c|0)|0}function Ob(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;Ca[a&7](b|0,c|0,d|0,e|0)}function Pb(a){a=a|0;_(0)}function Qb(a){a=a|0;_(1);return 0}function Rb(){_(2)}function Sb(a,b){a=a|0;b=b|0;_(3);return 0}function Tb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;_(4)}




// EMSCRIPTEN_END_FUNCS
var ya=[Pb,Pb];var za=[Qb,Qb];var Aa=[Rb,Rb];var Ba=[Sb,Sb,db,Sb,eb,Sb,gb,Sb];var Ca=[Tb,Tb,rb,Tb,sb,Tb,Tb,Tb];return{_mad_js_fill_buffer:zb,_strlen:Jb,_mad_js_id3_len:wb,_free:Eb,_mad_js_after_read:Ab,_memmove:Ib,_mad_js_close:yb,_memset:Hb,_mad_js_decode_frame:Bb,_malloc:Db,_memcpy:Gb,_mad_js_init:xb,_mad_js_pack_frame:Cb,_calloc:Fb,runPostSets:Ta,stackAlloc:Da,stackSave:Ea,stackRestore:Fa,setThrew:Ga,setTempRet0:Ja,setTempRet1:Ka,setTempRet2:La,setTempRet3:Ma,setTempRet4:Na,setTempRet5:Oa,setTempRet6:Pa,setTempRet7:Qa,setTempRet8:Ra,setTempRet9:Sa,dynCall_vi:Kb,dynCall_ii:Lb,dynCall_v:Mb,dynCall_iii:Nb,dynCall_viiii:Ob}})


// EMSCRIPTEN_END_ASM
({ "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array }, { "abort": abort, "assert": assert, "asmPrintInt": asmPrintInt, "asmPrintFloat": asmPrintFloat, "min": Math_min, "invoke_vi": invoke_vi, "invoke_ii": invoke_ii, "invoke_v": invoke_v, "invoke_iii": invoke_iii, "invoke_viiii": invoke_viiii, "_llvm_lifetime_end": _llvm_lifetime_end, "_sysconf": _sysconf, "_abort": _abort, "_htonl": _htonl, "_sbrk": _sbrk, "___assert_fail": ___assert_fail, "___setErrNo": ___setErrNo, "___errno_location": ___errno_location, "__mad_js_decode_callback": __mad_js_decode_callback, "_llvm_lifetime_start": _llvm_lifetime_start, "__mad_js_raise": __mad_js_raise, "__mad_js_read": __mad_js_read, "_time": _time, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_fflush": _fflush, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "NaN": NaN, "Infinity": Infinity }, buffer);
var _mad_js_fill_buffer = Module["_mad_js_fill_buffer"] = asm["_mad_js_fill_buffer"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var _mad_js_id3_len = Module["_mad_js_id3_len"] = asm["_mad_js_id3_len"];
var _free = Module["_free"] = asm["_free"];
var _mad_js_after_read = Module["_mad_js_after_read"] = asm["_mad_js_after_read"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _mad_js_close = Module["_mad_js_close"] = asm["_mad_js_close"];
var _memset = Module["_memset"] = asm["_memset"];
var _mad_js_decode_frame = Module["_mad_js_decode_frame"] = asm["_mad_js_decode_frame"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _mad_js_init = Module["_mad_js_init"] = asm["_mad_js_init"];
var _mad_js_pack_frame = Module["_mad_js_pack_frame"] = asm["_mad_js_pack_frame"];
var _calloc = Module["_calloc"] = asm["_calloc"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];

Runtime.stackAlloc = function(size) { return asm['stackAlloc'](size) };
Runtime.stackSave = function() { return asm['stackSave']() };
Runtime.stackRestore = function(top) { asm['stackRestore'](top) };

// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;

// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
    Module.printErr('preload time: ' + (Date.now() - preloadStartTime) + ' ms');
  }

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    if (!Module['noExitRuntime']) {
      exit(ret);
    }
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    ensureInitRuntime();

    preMain();

    if (Module['_main'] && shouldRunNow) {
      Module['callMain'](args);
    }

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      if (!ABORT) doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  // TODO We should handle this differently based on environment.
  // In the browser, the best we can do is throw an exception
  // to halt execution, but in node we could process.exit and
  // I'd imagine SM shell would have something equivalent.
  // This would let us set a proper exit status (which
  // would be great for checking test exit statuses).
  // https://github.com/kripken/emscripten/issues/1371

  // throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  throw 'abort() at ' + stackTrace();
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}





// libmad function wrappers

var float32Len = Module.HEAPF32.BYTES_PER_ELEMENT;
var ptrLen   = Module.HEAP32.BYTES_PER_ELEMENT;
var int8Len = Module.HEAP8.BYTES_PER_ELEMENT;
var int16Len = Module.HEAP16.BYTES_PER_ELEMENT;

var decoders = {};

Mad = function (opts) {
 this._file = opts.file;
 this._processing = false;
 this._pending = [];
 this._channels = _malloc(int8Len);
 this._samples = _malloc(int16Len);
 this._samplerate = _malloc(int16Len);
 this._bitrate = _malloc(int16Len);

 return this;
};

Mad.getDecoder = function (ptr) {
  return decoders[ptr]; 
};

Mad.prototype.getCurrentFormat = function () {
  return {
    channels: getValue(this._channels, "i8"),
    sampleRate: getValue(this._samplerate, "i32"),
    bitRate: getValue(this._bitrate, "i32")
  }
};

Mad.prototype.close = function () {
  if (!this._mad) {
    _mad_js_close(this._mad);
  }
  _free(this._channels);
  _free(this._samples);
  _free(this._samplerate);
  _free(this._bitrate);

  this._mad = decoders[this._mad] = null;
  this._processing = false;
  this._pending = [];
  return;
};

Mad.prototype.decodeFrame = function(callback) {
  var mad = this;
  var _mad = this._mad;

  if (this._processing) {
    this._pending.push(function () {
      mad.decodeFrame(callback);
    });
    return;
  }

  this._processing = true;

  var fill = function () {
    _mad_js_fill_buffer(_mad);
  };

  this._decode_callback = function (err) {
    if (err) {
      mad.close();
      return callback(null, err);
    }

    if (_mad_js_decode_frame(_mad) === 1) {
      return fill();
    }

    var _data = _mad_js_pack_frame(_mad, mad._channels, mad._samples, mad._samplerate, mad._bitrate);

    var chans = getValue(mad._channels, "i8");
    var samples = getValue(mad._samples, "i16");

    var data = new Array(chans);
    var ptr, chanData, chan;
    for (chan = 0; chan<chans; chan++) {
      ptr = getValue(_data+chan*ptrLen, "*");
      chanData = Module.HEAPF32.subarray(ptr/float32Len, ptr/float32Len+samples);
      data[chan] = new Float32Array(samples);
      data[chan].set(chanData);
      _free(ptr);
    }
    _free(_data);

    callback(data);

    this._processing = false;
    var pending = this._pending.shift();
    if (pending == null) {
      return;
    }
    return pending();
  };

  return fill();
}

var createMadDecoder = function (file, callback) {
 var header = _malloc(10);
 var headerData = Module.HEAPU8.subarray(header, header+10);
 var reader = new FileReader();
 reader.onload = function(e) {
    headerData.set(new Uint8Array(e.target.result));

    var id3Len = _mad_js_id3_len(header);
    _free(header);

    if (id3Len > 0) {
      file = file.slice(10+id3Len);
    }

    var mad = new Mad({file: file});
    // Decode an initial frame
    mad._mad = _mad_js_init();
    decoders[mad._mad] = mad;
    mad.decodeFrame(function (data, err) {
      if (err) {
        return callback(null, null, err);
      }

      // Reinitialize decoder
      _mad_js_close(mad._mad);
      mad._mad = _mad_js_init();
      decoders[mad._mad] = mad;

      return callback(mad, mad.getCurrentFormat(), null);
    });
 }
 reader.readAsArrayBuffer(file.slice(0, 10));
};

if (typeof window != "undefined") {
  window.File.prototype.createMadDecoder = function (callback) {
    createMadDecoder.call(window, this, callback);
  };
} else {
  self.createMadDecoder = createMadDecoder;
}

}).call(context)})();

// Generated by CoffeeScript 1.6.3
(function() {
  var AudioContext, MadSource,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  MadSource = (function() {
    function MadSource(opts) {
      var i, _i, _ref,
        _this = this;
      if (opts == null) {
        opts = {};
      }
      this.processBuffer = __bind(this.processBuffer, this);
      this.decodeBuffer = __bind(this.decodeBuffer, this);
      this.bufferSize = opts.bufferSize;
      this.reampler = opts.resampler || Samplerate.FASTEST;
      this.decoder = opts.decoder;
      this.format = opts.format;
      this.context = opts.context;
      this.remaining = [];
      this.resamplers = [];
      this.pending = [];
      for (i = _i = 0, _ref = this.format.channels - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        this.remaining[i] = new Float32Array;
        this.pending[i] = new Float32Array;
        this.resamplers[i] = new Samplerate({
          type: this.resampler
        });
      }
      this.oscillator = this.context.createOscillator();
      this.source = this.context.createScriptProcessor(this.bufferSize, this.format.channels, this.format.channels);
      this.source.onaudioprocess = this.processBuffer;
      this.oscillator.connect(this.source);
      setTimeout(this.decodeBuffer, 0);
      this.source.start = function(pos) {
        var bufferDuration;
        bufferDuration = parseFloat(_this.bufferSize) / parseFloat(_this.context.sampleRate);
        _this.handler = setInterval(_this.decodeBuffer, 1000 * bufferDuration);
        return _this.oscillator.start(pos);
      };
      this.source.stop = function(pos) {
        _this.oscillator.stop(pos);
        _this.oscillator.disconnect();
        if (_this.handler != null) {
          clearInterval(_this.handler);
        }
        return _this.handler = null;
      };
    }

    MadSource.prototype.concat = function(a, b) {
      var ret;
      if (typeof b === "undefined" || b.length === 0) {
        return a;
      }
      if (a.length === 0) {
        return b;
      }
      ret = new Float32Array(a.length + b.length);
      ret.set(a);
      ret.subarray(a.length).set(b);
      return ret;
    };

    MadSource.prototype.decodeBuffer = function() {
      var fn,
        _this = this;
      fn = function(buffer, err) {
        var data, i, used, _base, _i, _ref, _ref1;
        if (err != null) {
          return typeof (_base = _this.source).onerror === "function" ? _base.onerror(err) : void 0;
        }
        for (i = _i = 0, _ref = buffer.length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
          if (_this.format.sampleRate !== _this.context.sampleRate) {
            buffer[i] = _this.concat(_this.remaining[i], buffer[i]);
            _ref1 = _this.resamplers[i].process({
              data: buffer[i],
              ratio: parseFloat(_this.context.sampleRate) / parseFloat(_this.format.sampleRate)
            }), data = _ref1.data, used = _ref1.used;
            _this.remaining[i] = buffer[i].subarray(used);
            buffer[i] = data;
          }
          _this.pending[i] = _this.concat(_this.pending[i], buffer[i]);
        }
        if (_this.pending[0].length >= _this.bufferSize) {
          return;
        }
        return _this.decoder.decodeFrame(fn);
      };
      return this.decoder.decodeFrame(fn);
    };

    MadSource.prototype.processBuffer = function(buf) {
      var channelData, i, samples, _i, _ref, _results;
      _results = [];
      for (i = _i = 0, _ref = this.format.channels - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        channelData = buf.outputBuffer.getChannelData(i);
        samples = Math.min(this.pending[i].length, channelData.length);
        channelData.set(this.pending[i].subarray(0, samples));
        _results.push(this.pending[i] = this.pending[i].subarray(samples, this.pending[i].length));
      }
      return _results;
    };

    return MadSource;

  })();

  AudioContext = window.webkitAudioContext || window.AudioContext;

  AudioContext.prototype.createMadSource = function(bufferSize, decoder, format, resampler) {
    var mad;
    mad = new MadSource({
      bufferSize: bufferSize,
      context: this,
      decoder: decoder,
      format: format
    });
    return mad.source;
  };

}).call(this);


