(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * The buffer module from node.js, for the browser.
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install buffer`
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
   // Detect if browser supports Typed Arrays. Supported browsers are IE 10+,
   // Firefox 4+, Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+.
  if (typeof Uint8Array !== 'function' || typeof ArrayBuffer !== 'function')
    return false

  // Does the browser support adding properties to `Uint8Array` instances? If
  // not, then that's the same as no `Uint8Array` support. We need to be able to
  // add all the node Buffer API methods.
  // Bug in Firefox 4-29, now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var arr = new Uint8Array(0)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // Assume object is an array
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof Uint8Array === 'function' &&
      subject instanceof Uint8Array) {
    // Speed optimization -- use set if we're copying from a Uint8Array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  // copy!
  for (var i = 0; i < end - start; i++)
    target[i + target_start] = this[i + start]
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array === 'function') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment the Uint8Array *instance* (not the class!) with Buffer methods
 */
function augment (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":2,"ieee754":3}],2:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var ZERO   = '0'.charCodeAt(0)
	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	module.exports.toByteArray = b64ToByteArray
	module.exports.fromByteArray = uint8ToBase64
}())

},{}],3:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],4:[function(require,module,exports){

function Connector(peripheral) {
    this.peripheral = peripheral;
}

module.exports = Connector;

},{}],5:[function(require,module,exports){
(function (Buffer){
var Connector = require('./Connector');

var NobleConnector = function (peripheral) {
    Connector.call(this, peripheral);
};

NobleConnector.prototype = new Connector();
NobleConnector.prototype.constructor = NobleConnector;

NobleConnector.prototype.services = function(win, fail) {
    var self = this;
    
    self.peripheral.discoverServices(
        [], 
        function(error, services) {
            if(error) {
                fail(error);
            } else {
                win(services);
            }
        }
    );
};

NobleConnector.prototype.characteristics = function(service, win, fail) {
    service.discoverCharacteristics(
        [], 
        function(error, characteristics) {
            if(error) {
                fail(error);
            } else {
                win(characteristics);
            }
        }
    );
};

NobleConnector.prototype.descriptors = function(characteristic, win, fail) {
    characteristic.discoverDescriptors(function(error, descriptors) {
        if(error) {
            fail(error);
        } else {
            win(descriptors);
        }
    });
};

NobleConnector.prototype.writeCharacteristic = function(characteristic, data, win, fail) {
    var buffer = new Buffer(data);
    
    characteristic.write(buffer, true, function(error) {
        if(error) {
            fail(error);
        } else {
            win();
        }
    });
};

NobleConnector.prototype.readCharacteristic = function(characteristic, win, fail) {
    characteristic.read(function(error, data) {
        if(error) {
            fail(error);
        } else {
            win(data);
        }
    });
};

NobleConnector.prototype.writeDescriptor = function(descriptor, data, win, fail) {
    var buffer = new Buffer(data);
    
    descriptor.writeValue(buffer, function(error) {
        if(error) {
            fail(error);
        } else {
            win();
        }
    });
};

NobleConnector.prototype.enableNotification = function(characteristic, win, fail) {
    characteristic.on('read', win);
    
    characteristic.notify(true, function(error) {
        if(error) {
            fail(error);
        }
    });
};

NobleConnector.prototype.disableNotification = function(characteristic, win, fail) {
    characteristic.notify(false, function(error) {
        if(error) {
            fail(error);
        } else {
            win();
        }
    });
};

NobleConnector.prototype.close = function() {
    var self = this;
    
    self.peripheral.disconnect();
};

NobleConnector.prototype.toString = function() {
    return this.peripheral.uuid;
};

module.exports = NobleConnector;

}).call(this,require("buffer").Buffer)
},{"./Connector":4,"buffer":1}],6:[function(require,module,exports){

module.exports = {
	GATT_CLIENT_CHAR_CFG_UUID: '00002902-0000-1000-8000-00805f9b34fb',

	ACCELEROMETER_UUID_SERVICE: "f000aa10-0451-4000-b000-000000000000",
	ACCELEROMETER_UUID_DATA: "f000aa11-0451-4000-b000-000000000000",
	ACCELEROMETER_UUID_CONF: "f000aa12-0451-4000-b000-000000000000",
	ACCELEROMETER_UUID_PERIOD: "f000aa13-0451-4000-b000-000000000000",
	
	BAROMETRICPRESSURE_UUID_SERVICE: "f000aa40-0451-4000-b000-000000000000",
	BAROMETRICPRESSURE_UUID_DATA: "f000aa41-0451-4000-b000-000000000000",
	BAROMETRICPRESSURE_UUID_CONF: "f000aa42-0451-4000-b000-000000000000",
	BAROMETRICPRESSURE_UUID_PERIOD: "f000aa44-0451-4000-b000-000000000000",
	BAROMETRICPRESSURE_UUID_CALIBRATION: "f000aa43-0451-4000-b000-000000000000",
	
	GYROSCOPE_UUID_SERVICE: "f000aa50-0451-4000-b000-000000000000",
	GYROSCOPE_UUID_DATA: "f000aa51-0451-4000-b000-000000000000",
	GYROSCOPE_UUID_CONF: "f000aa52-0451-4000-b000-000000000000",
	GYROSCOPE_UUID_PERIOD: "f000aa53-0451-4000-b000-000000000000",
	
	HUMIDITY_UUID_SERVICE: "f000aa20-0451-4000-b000-000000000000",
	HUMIDITY_UUID_DATA: "f000aa21-0451-4000-b000-000000000000",
    HUMIDITY_UUID_CONF: "f000aa22-0451-4000-b000-000000000000",
    HUMIDITY_UUID_PERIOD: "f000aa23-0451-4000-b000-000000000000",
    
    IRTEMPERATURE_UUID_SERVICE: "f000aa00-0451-4000-b000-000000000000",
    IRTEMPERATURE_UUID_DATA: "f000aa01-0451-4000-b000-000000000000",
    IRTEMPERATURE_UUID_CONF: "f000aa02-0451-4000-b000-000000000000",
    IRTEMPERATURE_UUID_PERIOD: "f000aa03-0451-4000-b000-000000000000",
    
    MAGNETOMETER_UUID_SERVICE: "f000aa30-0451-4000-b000-000000000000",
    MAGNETOMETER_UUID_DATA: "f000aa31-0451-4000-b000-000000000000",
    MAGNETOMETER_UUID_CONF: "f000aa32-0451-4000-b000-000000000000",
    MAGNETOMETER_UUID_PERIOD: "f000aa33-0451-4000-b000-000000000000",
    
    SIMPLEKEY_UUID_SERVICE: "0000ffe0-0000-1000-8000-00805f9b34fb",
    SIMPLEKEY_UUID_DATA: "0000ffe1-0000-1000-8000-00805f9b34fb",
    
    GUID_PATTERN: /([a-f0-9]{8})-?([a-f0-9]{4})-?([a-f0-9]{4})-?([a-f0-9]{4})-?([a-f0-9]{12})/g,
    GUID_REPLACEMENT: '$1-$2-$3-$4-$5'
};

},{}],7:[function(require,module,exports){
var Constants = require('./Constants.js');

/**
* The base class representing each sensor
* @param {string} name The name of the sensor
* @param {SensorTag} sensorTag The SensorTag object this sensor belongs to
* @param {uuid} UUID_DATA The UUID of the data characteristic
* @param {uuid} UUID_CONF The UUID of the configuration characteristic
* @param {uuid} UUID_PERIOD The UUID of the period characteristic
*/
var SensorBase = function (name, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD) {
    this.identifier = name;

    this.sensorTag = sensorTag;
    this.UUID_DATA = UUID_DATA;
    this.UUID_CONF = UUID_CONF;
    this.UUID_PERIOD = UUID_PERIOD;

    this.enabled = false;

    this.characteristics = {
        config: null,
        period: null,
        data: null,
    };
    
    this.descriptors = {
        notification: null
    };

    this._listeners = [];
};

/**
* Initializes the sensor with the SensorTag service information
* @param {service} service The SensorTag service object
*/
SensorBase.prototype.init = function (service) {
    for (var ci in service.characteristics) {
        var characteristic = service.characteristics[ci],
            cGuid = characteristic.uuid.replace(Constants.GUID_PATTERN, Constants.GUID_REPLACEMENT);
        
        switch (cGuid) {
            case this.UUID_CONF:
                this.characteristics.config = characteristic;
                break;
            case this.UUID_PERIOD:
                this.characteristics.period = characteristic;
                break;
            case this.UUID_DATA:
                this.characteristics.data = characteristic;

                for (var di in characteristic.descriptors) {
                    var descriptor = characteristic.descriptors[di],
                        dGuid = descriptor.uuid.replace(Constants.GUID_PATTERN, Constants.GUID_REPLACEMENT);
                    
                    if (dGuid == Constants.GATT_CLIENT_CHAR_CFG_UUID || dGuid==2902) {
                        this.descriptors.notification = descriptor;
                    }
                }
                break;
        }
    }
    
    this.log("Initialized");
};

/**
* Logs a message on behalf of the sensor
* @param {string} message The message to log
*/
SensorBase.prototype.log = function (message) {
    this.sensorTag.log(this.identifier + ': ' + message);
};

/**
* Enables the sensor
* @param {Integer} [value] The value to initialize the sensor with
*/
SensorBase.prototype.enable = function (value) {
    var ON = 1,
        self = this;

    self.sensorTag.device.writeCharacteristic(
        self.characteristics.config,
        new Uint8Array([value || ON]),
        function () {
            self.enabled = true;
            self.log("Enabled");
        },
        function (errorCode) {
            self.log("enable error: " + errorCode);
        }
    );
};

/**
* Disables the sensor
*/
SensorBase.prototype.disable = function () {
    var OFF = 0,
        self = this;

    self.sensorTag.device.writeCharacteristic(
        self.characteristics.config,
        new Uint8Array([OFF]),
        function () {
            self.enabled = true;
            self.log("Disabled");
        },
        function (errorCode) {
            self.log("disable error: " + errorCode);
        }
    );
};

/**
* Enables notifications for the sensor
*/
SensorBase.prototype.enableNotification = function () {
    var ENABLE_NOTIFICATIONS = [1, 0],
        self = this;
    
    self.sensorTag.device.writeDescriptor(
        self.descriptors.notification,
        new Uint8Array(ENABLE_NOTIFICATIONS),
        function () {
            self.log("Notifications enabled");
        },
        function (errorCode) {
            self.log("enableNotifications write error: " + errorCode);
        }
    );
    
    self.sensorTag.device.enableNotification(
        self.characteristics.data,
        function() {
            self.onDataNotify.apply(self, arguments);
        },
        function (errorCode) {
            self.log("enableNotifications subscribe error: " + errorCode);
        }
    );
};

/**
* Disables notifications for the sensor
*/
SensorBase.prototype.disableNotification = function () {
    var DISABLE_NOTIFICATIONS = [0, 0],
        self = this;

    self.sensorTag.device.writeDescriptor(
        self.descriptors.notification,
        new Uint8Array(DISABLE_NOTIFICATIONS),
        function () {
            self.log("Notifications disabled");
        },
        function (errorCode) {
            self.log("disableNotification write error: " + errorCode);
        }
    );
    
    self.sensorTag.device.disableNotification(
        self.characteristics.data,
        function() {
            // Do nothing
        },
        function (errorCode) {
            self.log("disableNotification subscribe error: " + errorCode);
        }
    );
};

/**
* Adds a notification listener
* @param {callback} callback The callback to receive updates from the sensor
* @returns {handle} The callback handle
*/
SensorBase.prototype.addListener = function (callback) {
    this._listeners.push(callback);

    // Return a handle
    return this._listeners.length - 1;
};

/**
* Removes a notification listener
* @param {handle} handle The handle for the callback
*/
SensorBase.prototype.removeListener = function (handle) {
    this._listeners.splice(handle, 1);
};

/**
* Notifies all the listeners
*/
SensorBase.prototype.onDataNotify = function () {
    for (var li in this._listeners) {
        var listener = this._listeners[li];
        listener.apply(this, arguments);
    }
};

module.exports = SensorBase;

},{"./Constants.js":6}],8:[function(require,module,exports){

var Constants = require('./Constants'),
    Connector = require('./Connectors/Connector');

/**
* A class representing the TI SensorTag
* @constructor
* @param {handle} device The device handle from the 
* connection object
*/
var SensorTag = function (device) {
    if(!(device instanceof Connector)) {
        throw "Invalid device connector";
    }

    this.device = device;
    this.services = [];
    
    this.Accelerometer = new SensorTag.Accelerometer(this);
    this.BarometricPressure = new SensorTag.BarometricPressure(this);
    this.Gyroscope = new SensorTag.Gyroscope(this);
    this.Humidity = new SensorTag.Humidity(this);
    this.IRTemperature = new SensorTag.IRTemperature(this);
    this.Magnetometer = new SensorTag.Magnetometer(this);
    this.SimpleKey = new SensorTag.SimpleKey(this);
};

// Sensors
SensorTag.Accelerometer = require('./Sensors/Accelerometer');
SensorTag.BarometricPressure = require('./Sensors/BarometricPressure');
SensorTag.Gyroscope = require('./Sensors/Gyroscope');
SensorTag.Humidity = require('./Sensors/Humidity');
SensorTag.IRTemperature = require('./Sensors/Humidity');
SensorTag.Magnetometer = require('./Sensors/Magnetometer');
SensorTag.SimpleKey = require('./Sensors/SimpleKey');

// Connectors
SensorTag.NobleConnector = require('./Connectors/NobleConnector');

/**
* Logs a message on behalf of the SensorTag
* @param {string} message The message to log
*/
SensorTag.prototype.log = function (message) {
    console.log('SensorTag #' + this.device + ' ' + message);
};

/**
* Initializes all of the discovered SensorTag sensors
*/
SensorTag.prototype.init = function () {
    var self = this;

    for (var i = 0; i < self.services.length; ++i) {
        var service = self.services[i],
            guid = service.uuid.replace(Constants.GUID_PATTERN, Constants.GUID_REPLACEMENT);
        
        switch (guid) {
            case Constants.ACCELEROMETER_UUID_SERVICE:
                self.Accelerometer.init(service);
                break;
                
            case Constants.BAROMETRICPRESSURE_UUID_SERVICE:
                self.BarometricPressure.init(service);
                break;
                
            case Constants.GYROSCOPE_UUID_SERVICE:
                self.Gyroscope.init(service);
                break;
                
            case Constants.HUMIDITY_UUID_SERVICE:
                self.Humidity.init(service);
                break;

            case Constants.IRTEMPERATURE_UUID_SERVICE:
                self.IRTemperature.init(service);
                break;

            case Constants.MAGNETOMETER_UUID_SERVICE:
                self.Magnetometer.init(service);
                break;

            case Constants.SIMPLEKEY_UUID_SERVICE:
                self.SimpleKey.init(service);
                break;
        }
    }
    
    self.log('Initialized');
};

// Traces async calls when building device tree.
var gCallTracer = 0;

function incrementCallTracer() {
    ++gCallTracer;
}

function decrementCallTracer() {
    --gCallTracer;
}

/**
* Discovers and initializes all the SensorTag sensors
* @param {callback} win A callback on success
* @param {callback} fail A callback on failure
*/
SensorTag.prototype.discover = function (win, fail) {
    var self = this;

    self.log('Discovering Services');

    incrementCallTracer();
    
    self.device.services(
        function(services) {
            decrementCallTracer();

            self.services = services;

            for (var i = 0; i < services.length; ++i) {
                var service = services[i];

                self.discoverCharacteristics(service, win, fail);
            }

            if (gCallTracer === 0) {
                self.init();

                if (win !== undefined)
                    win.call(self);
            }
        },
        function(error) {
            decrementCallTracer();
            self.log('Services error: ' + error);

            if (fail !== undefined)
                fail.call(self, error);
        }
    );
};

/**
* Discovers all of the characteristics for the given service
* @param {service} service The service
* @param {callback} win A callback on success
* @param {callback} fail A callback on failure
*/
SensorTag.prototype.discoverCharacteristics = function (service, win, fail) {
    var self = this;

    incrementCallTracer();
    self.device.characteristics(
        service,
        function (characteristics) {
            decrementCallTracer();

            service.characteristics = characteristics;

            for (var j = 0; j < characteristics.length; ++j) {
                var characteristic = characteristics[j];

                self.discoverDescriptors(characteristic, win, fail);
            }

            if (gCallTracer === 0) {
                self.init();

                if (win !== undefined)
                    win.call(self);
            }
        },
        function (errorCode) {
            decrementCallTracer();
            self.log('Characteristics error: ' + errorCode);

            if (fail !== undefined)
                fail.call(self, errorCode);
        }
    );
};

/**
* Discovers all of the descriptors for the given characteristic
* @param {characteristic} characteristic The characteristic
* @param {callback} win A callback on success
* @param {callback} fail A callback on failure
*/
SensorTag.prototype.discoverDescriptors = function (characteristic, win, fail) {
    var self = this;

    incrementCallTracer();
    self.device.descriptors(
        characteristic,
        function (descriptors) {
            decrementCallTracer();
            characteristic.descriptors = descriptors;
            
            if (gCallTracer === 0) {
                self.init();

                if (win !== undefined)
                    win.call(self);
            }
        },
        function (errorCode) {
            decrementCallTracer();
            self.log('Descriptors error: ' + errorCode);

            if (fail !== undefined)
                fail.call(self, errorCode);
        }
    );
};

/**
* Closes the connection to the SensorTag
*/
SensorTag.prototype.close = function () {
    this.device.close();
};

module.exports = SensorTag;

},{"./Connectors/Connector":4,"./Connectors/NobleConnector":5,"./Constants":6,"./Sensors/Accelerometer":9,"./Sensors/BarometricPressure":10,"./Sensors/Gyroscope":11,"./Sensors/Humidity":12,"./Sensors/Magnetometer":13,"./Sensors/SimpleKey":14}],9:[function(require,module,exports){

var Constants = require('../Constants'),
    SensorBase = require('../SensorBase');

/** 
 * A class representing the Accelerometer sensor
 * @param {SensorTag} sensorTag The SensorTag this sensor belongs to
 */
var Accelerometer = function (sensorTag) {
	SensorBase.call(this, 
			"Accelerometer", 
			sensorTag, 
			Constants.ACCELEROMETER_UUID_DATA, 
			Constants.ACCELEROMETER_UUID_CONF, 
			Constants.ACCELEROMETER_UUID_PERIOD);
};

Accelerometer.prototype = new SensorBase();
Accelerometer.prototype.constructor = Accelerometer;

/**
 * Sets the refresh period for notifications
 * @param {Integer} sampleRate The sample rate in milliseconds
 */
Accelerometer.prototype.setPeriod = function (sampleRate) {
	// The period is in 10ms increments
	var period = Math.round(sampleRate / 10),
		self = this;

    self.sensorTag.device.writeCharacteristic(
        self.characteristics.period,
        new Uint8Array([period]),
        function () {
            self.log("Period set to " + sampleRate + "ms");
        },
        function (errorCode) {
            self.log("setPeriod error: " + errorCode);
        }
    );
};

function getAxisAcceleration(value, scale) {
	// The precision in g's
	var precision = 1.0 / 64.0,
		s = scale || 1.0,
		a = value * s * precision;

	return Math.round(a * 100) / 100;
}

/**
 * Calculates the acceleration in terms of g
 * @param {Array} data The raw sensor data
 * @param {Number} [scale] The scaling coefficient
 * @returns {Object} 
 */
Accelerometer.prototype.calculateAcceleration = function (data, scale) {
	var a = new Int8Array(data);

	return {
		x: getAxisAcceleration(a[0], scale),
		y: getAxisAcceleration(a[1], scale),
		z: getAxisAcceleration(a[2], scale)
	};
};

module.exports = Accelerometer;

},{"../Constants":6,"../SensorBase":7}],10:[function(require,module,exports){

var Constants = require('../Constants'),
    SensorBase = require('../SensorBase');

/**
* A class representing the BarometricPressure sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var BarometricPressure = function (sensorTag) {
    SensorBase.call(this,
        "BarometricPressure",
        sensorTag, 
        Constants.BAROMETRICPRESSURE_UUID_DATA, 
        Constants.BAROMETRICPRESSURE_UUID_CONF, 
        Constants.BAROMETRICPRESSURE_UUID_PERIOD);

    this.calibration = [0, 0, 0, 0, 0, 0, 0, 0];
    this.characteristics.calibration = null;
};

BarometricPressure.prototype = new SensorBase();
BarometricPressure.prototype.constructor = BarometricPressure;

BarometricPressure.prototype.init = function (service) {
    for (var ci in service.characteristics) {
        var characteristic = service.characteristics[ci],
            cGuid = characteristic.uuid.replace(Constants.GUID_PATTERN, Constants.GUID_REPLACEMENT);
        
        switch (cGuid) {
            case Constants.BAROMETRICPRESSURE_UUID_CALIBRATION:
                this.characteristics.calibration = characteristic;
                break;
        }
    }

    SensorBase.prototype.init.call(this, service);
};

/**
* Reads the calibration data from the sensor
* @param {callback} win The success callback
* @param {callback} fail The failure callback
*/
BarometricPressure.prototype.readCalibration = function (win, fail) {
    var self = this,
        CALIBRATE = 2,
        error;
    
    error = function(description, errorCode) {
        self.log(description + ' error: ' + errorCode);

        if(fail !== undefined)
            fail.call(self, errorCode);
    };
    
    self.sensorTag.device.writeCharacteristic(
        self.characteristics.config,
        new Uint8Array([CALIBRATE]),
        function() {
            self.sensorTag.device.readCharacteristic(
                self.characteristics.calibration,
                function (data) {
                    self.calibration = new Uint16Array(data);

                    if (win !== undefined)
                        win.call(self, self.calibration);
                }, function (errorCode) {
                    error('readCalibration read', errorCode);
                }
            );
        },
        function (errorCode) {
            error('readCalibration write', errorCode);
        }
    );
};

BarometricPressure.prototype.enable = function () {
    this.readCalibration(SensorBase.prototype.enable);
};

/** 
* Calculates the pressure
* @param {Array} data The raw sensor data
* returns {Number}
*/
BarometricPressure.prototype.calculatePressure = function (data) {
    var d = new Int16Array(data),
        t_r = d[0],
        p_r = d[1],
        t_a = (100 * (this.calibration[0] * t_r / Math.Pow(2, 8) +
            this.calibration[1] * Math.Pow(2, 6))) / Math.Pow(2, 16),
        S = this.calibration[2] + this.calibration[3] * t_r / Math.Pow(2, 17) +
            ((this.calibration[4] * t_r / Math.Pow(2, 15)) * t_r) / Math.Pow(2, 19),
        O = this.calibration[5] * Math.Pow(2, 14) + this.calibration[6] * t_r / Math.Pow(2, 3) +
            ((this.calibration[7] * t_r / Math.Pow(2, 15)) * t_r) / Math.Pow(2, 4);

    return (S * p_r + O) / Math.Pow(2, 14);
};

module.exports = BarometricPressure;

},{"../Constants":6,"../SensorBase":7}],11:[function(require,module,exports){

var Constants = require('../Constants'),
    SensorBase = require('../SensorBase');

/**
* A class representing the Gyroscope sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var Gyroscope = function (sensorTag) {
    SensorBase.call(this, 
        "Gyroscope", 
        sensorTag, 
        Constants.GYROSCOPE_UUID_DATA, 
        Constants.GYROSCOPE_UUID_CONF, 
        Constants.GYROSCOPE_UUID_PERIOD);

    this.Axis = Gyroscope.Axis.XYZ;
};

Gyroscope.Axis = {
    X: 1,
    Y: 2,
    XY: 3,
    Z: 4,
    XZ: 5,
    YZ: 6,
    XYZ: 7,
};

Gyroscope.prototype = new SensorBase();
Gyroscope.prototype.constructor = Gyroscope;

Gyroscope.prototype.enable = function () {
    SensorBase.prototype.enable.call(this, this.Axis);
};


// Converting from raw data to degrees/second.
function getDegreesPerSecond(value) {
    // Calculate rotation, unit deg/s, range -250, +250
    var d = value * (500.0 / 65536.0);
    
    // Round to 2 decimal places
    return Math.round(d * 100) / 100;
}

/**
* Calculates the offset of the axis in degrees
* @param {Array} data The raw sensor data
* @returns {Number}
*/
Gyroscope.prototype.calculateAxisValue = function (data) {
    var v = new Int16Array(data);
    
    // x, y, z has a wierd order
    return {
        y: getDegreesPerSecond(v[0]),
        x: getDegreesPerSecond(v[1]),
        z: getDegreesPerSecond(v[2]),
    };
};

module.exports = Gyroscope;

},{"../Constants":6,"../SensorBase":7}],12:[function(require,module,exports){

var Constants = require('../Constants'),
    SensorBase = require('../SensorBase');

/**
* A class representing the Humidity sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var Humidity = function (sensorTag) {
    SensorBase.call(this, 
        "Humidity",
        sensorTag, 
        Constants.HUMIDITY_UUID_DATA, 
        Constants.HUMIDITY_UUID_CONF, 
        Constants.HUMIDITY_UUID_PERIOD);
};

Humidity.prototype = new SensorBase();
Humidity.prototype.constructor = Humidity;

/**
* Calculates the humidity as a percentage
* @param {Array} data The raw sensor data
* @returns {Number} 
*/
Humidity.prototype.calculateHumidity = function (data) {
    var a = new Uint16Array(data),
        hum;
        
    // bits [1..0] are status bits and need to be cleared according 
    // to the userguide, but the iOS code doesn't bother. It should
    // have minimal impact.
    hum = a[1] - (a[1] % 4);

    return -6.0 + 125.0 * (hum / 65535.0);
};

module.exports = Humidity;

},{"../Constants":6,"../SensorBase":7}],13:[function(require,module,exports){

var Constants = require('../Constants'),
    SensorBase = require('../SensorBase'),
    Accelerometer = require('./Accelerometer');

/**
* A class representing the Magnetometer sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var Magnetometer = function (sensorTag) {
    SensorBase.call(this, 
        "Magnetometer", 
        sensorTag, 
        Constants.MAGNETOMETER_UUID_DATA, 
        Constants.MAGNETOMETER_UUID_CONF, 
        Constants.MAGNETOMETER_UUID_PERIOD);
};

Magnetometer.prototype = new SensorBase();
Magnetometer.prototype.constructor = Magnetometer;

/**
* Sets the refresh period for notifications
* @param {Integer} sampleRate The sample rate in milliseconds
*/
Magnetometer.prototype.setPeriod = Accelerometer.prototype.setPeriod;

function scaleAxis(value) {
    return value * (2000.0 / 65336.0);
}

/**
* Calculates the coordinates
* @param {Array} data The raw sensor data
* @returns {Object} 
*/
Magnetometer.prototype.calculateCoordinates = function (data) {
    var m = new Int16Array(data);
    
    return {
        x: scaleAxis(m[0]),
        y: scaleAxis(m[1]),
        z: scaleAxis(m[2])
    };
};

module.exports = Magnetometer;

},{"../Constants":6,"../SensorBase":7,"./Accelerometer":9}],14:[function(require,module,exports){

var Constants = require('../Constants'),
    SensorBase = require('../SensorBase');
    
/**
* A class representing the SimpleKey sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var SimpleKey = function (sensorTag) {
    SensorBase.call(this, 
        "SimpleKey", 
        Constants.SIMPLEKEY_UUID_DATA);
};

SimpleKey.Keys = {
    RIGHT: 0x01,
    LEFT: 0x02,
    CENTER: 0x04
};

SimpleKey.prototype = new SensorBase();
SimpleKey.prototype.constructor = SimpleKey;

// Remove unsupported prototype functions
delete SimpleKey.prototype.enable;
delete SimpleKey.prototype.disable;

module.exports = SimpleKey;

},{"../Constants":6,"../SensorBase":7}]},{},[8]);