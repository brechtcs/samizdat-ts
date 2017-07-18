var assert = require('assert')
var level = require('pull-level')
var keyUtil = require('./key')

function Samizdat (level) {
  if (!(this instanceof Samizdat)) return new Samizdat(level)

  this._level = level
}

module.exports = Samizdat

/**
 * standard io operations
 */
Samizdat.prototype.create = function (id, value, cb) {
  assert.equal(typeof id, 'string' || 'number', 'Entry ID must be a string or number')
  assert.equal(typeof cb, 'function', 'Create callback must be a function')

  if (keyUtil.validateKey(id)) {
    return cb({invalidId: true})
  }

  var key = keyUtil.newKey(id)
  var self = this

  self.read(id, function (err) {
    if (!err) {
      return cb({idExists: true})
    }
    else if (!err.notFound) {
      return cb(err)
    }

    self._level.put(key, value, function (err) {
      if (err) {
        return cb(err)
      }
      cb(null, {
        key: key,
        value: value
      })
    })
  })
}

Samizdat.prototype.read = function (keyOrId, cb) {
  assert.equal(typeof cb, 'function', 'Read callback must be a function')

  var self = this
  var found = false
  var stream = self._level.createKeyStream({
    reverse: true
  })

  stream.on('data', function (key) {
    if (keyOrId === key || keyOrId === keyUtil.getId(key)) {
      found = true

      self._level.get(key, function (err, value) {
        if (err) {
          return cb(err)
        }
        stream.destroy()

        cb(null, {
          key: key,
          value: value
        })
      })
    }
  })

  stream.on('error', function (err) {
    if (err) {
      cb(err)
    }
  })

  stream.on('end', function () {
    if (!found) {
      cb({notFound: keyOrId})
    }
  })
}

Samizdat.prototype.update = function (key, value, cb) {
  assert.equal(typeof cb, 'function', 'Update callback must be a function')

  if (!keyUtil.validateKey(key)) {
    return cb({invalidKey: true})
  }
  var update = keyUtil.updateKey(key)
  var self = this

  self._level.put(update, value, function (err) {
    if (err) {
      return cb(err)
    }
    cb(null, {
      key: update,
      prev: key,
      value: value
    })

    // remove indexes associated with old version
    self._level.createReadStream().on('data', function (data) {
      if (data.value === key) self._level.del(data.key, function (err) {
        if (err) throw err
      })
    }).on('error', function (err) {
      throw err
    })
  })
}

Samizdat.prototype.index = function (prop, key, cb) {
  assert.equal(typeof cb, 'function', 'Update callback must be a function')

  if (!keyUtil.validateKey(key)) {
    return cb({invalidKey: true})
  }
  var index = keyUtil.indexKey(prop)

  this._level.put(index, key, function (err) {
    if (err) {
      return cb(err)
    }
  })
}

Samizdat.prototype.purge = function (cb) {
  var hitlist = []
  var self = this
  var stream = self._level.createKeyStream({reverse: true})

  stream.on('data', function (key) {
    var purge = hitlist.some(function (chunk) {
      return key.includes(chunk)
    })

    if (purge) {
      self._level.put(key, '', function (err) {
        if (err) {
          stream.destroy()
          cb(err)
        }
      })
    }
    else {
      var prev = keyUtil.getPrev(key)
      var id = keyUtil.getId(key)

      if (prev !== keyUtil.BLANK) {
        hitlist.push(prev + '-' + id)
      }
    }
  })

  stream.on('error', cb)
  stream.on('end', cb)
}

/**
 * pull-stream based operations
 */
Samizdat.prototype.live = function (opts) {
  if (!opts) {
    opts = {}
  }
  if (!opts.min) {
    opts.min = '000000001'
  }

  return level.live(this._level, opts)
}

Samizdat.prototype.query = function (opts) {
  if (!opts) {
    opts = {}
  }
  if (!opts.min) {
    opts.min = '000000001'
  }

  return level.read(this._level, opts)
}

Samizdat.prototype.write = function (cb) {
  return level.write(this._level, cb)
}
