var assert = require('assert')
var util = require('./util')

module.exports = Samizdat

/**
 * Constructor:
 */
function Samizdat (level) {
  if (!(this instanceof Samizdat)) return new Samizdat(level)

  this._level = level
}

/**
 * Entry operations:
 */
Samizdat.prototype.create = function (id, value, cb) {
  assert.equal(typeof id, 'string' || 'number', 'Entry ID must be a string or number')
  assert.equal(typeof cb, 'function', 'Create callback must be a function')

  if (util.validateKey(id)) {
    return cb({invalidId: true})
  }

  var key = util.newKey(id)
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
    if (keyOrId === key || keyOrId === util.getId(key)) {
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
      cb({notFound: true})
    }
  })
}

Samizdat.prototype.update = function (key, value, cb) {
  assert.equal(typeof cb, 'function', 'Update callback must be a function')

  if (!util.validateKey(key)) {
    return cb({invalidKey: true})
  }
  var update = util.updateKey(key)

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

Samizdat.prototype.purge = function (opts, cb) {
  if (!cb && typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  //TODO
}

Samizdat.prototype.io = function (query, opts) {
  if (!opts && typeof query === 'object') {
    opts = query
    query = function () {
      return true
    }
  }

  assert.equal(typeof query, 'function', 'Sync query has to be a function')
  assert.equal(typeof opts, 'object', 'Sync opts has to be an object')

  var bus = opts.instance || nanobus()
  var session = shortid.generate()
  var stream = this._level.createReadStream()
  var self = this

  bus.on('*', function (channel, data) {
    if (channel === 'error') return

    if (channel !== session) self._level.get(data.key, function (err) {
      if (err.notFound) self._level.put(data.key, data.value, function (err) {
        if (err) bus.emit('error', err)
      })
    })
  })

  stream.on('data', function (data) {
    var id = util.getId(data.key)
    var match = query(id, data)

    assert.equal(typeof match, 'boolean', 'Query function has to return boolean')

    if (match) {
      bus.emit(session, data)
    }
  })

  stream.on('error', function (err) {
    err._session = session
    bus.emit('error', err)
  })

  return bus
}

module.exports = Samizdat
