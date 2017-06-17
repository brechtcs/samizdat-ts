var assert = require('assert')
var keyUtil = require('./key')

function Samizdat (level) {
  if (!(this instanceof Samizdat)) return new Samizdat(level)

  this._level = level
}

module.exports = Samizdat

/**
 * Public methods:
 * - create
 * - read
 * - update
 * - purge
 * - sync
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

  this._level.put(update, value, function (err) {
    if (err) {
      return cb(err)
    }
    cb(null, {
      key: update,
      prev: key,
      value: value
    })
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
        hitlist.push(prev + '/' + id)
      }
    }
  })

  stream.on('error', cb)
  stream.on('end', cb)
}

Samizdat.prototype.sync = function(peer, cb) {
  var self = this

  self._pull(peer._push(), function (err) {
    if (err) {
      return cb(err)
    }

    peer._pull(self._push(), function (err) {
      if (err) {
        return cb(err)
      }
      cb(null)
    })
  })
}

/**
 * Private methods:
 */
Samizdat.prototype._pull = function (stream, cb) {
  var self = this

  stream.on('data', function (data) {
    self._level.get(data.key, function (err) {
      // Only insert entries not already present
      if (err && err.notFound) {
        self._level.put(data.key, data.value, function (err) {
          if (err) {
            input.destroy()
            cb(err)
          }
        })
      }
    })
  })

  stream.on('error', cb)
  stream.on('end', cb)
}

Samizdat.prototype._push = function (opts) {
  return this._level.createReadStream(opts)
}
