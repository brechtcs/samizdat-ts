var assert = require('assert')
var levelup = require('levelup')
var nanobus = require('nanobus')
var shortid = require('shortid')
var util = require('./util')

function Samizdat (opts) {
  if (!(this instanceof Samizdat)) return new Samizdat(opts)

  this._level = levelup(opts)
}

Samizdat.prototype.create = function (id, entry, cb) {
  assert.equal(typeof id, 'string' || 'number', 'Entry ID must be a string or number')
  assert.equal(typeof cb, 'function', 'Create callback must be a function')

  if (util.validateKey(id)) {
    return cb({invalidId: true})
  }

  var key = util.newKey(id)
  var value = stringifyEntry(entry)
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
        entry: entry
      })
    })
  })
}

Samizdat.prototype.read = function (keyOrId, cb) {
  assert.equal(typeof cb, 'function', 'Read callback must be a function')

  var self = this
  var stream = self._level.createKeyStream({
    reverse: true
  })

  stream.on('data', function (key) {
    if (keyOrId === key || keyOrId === util.getId(key)) {
      self._level.get(key, function (err, value) {
        if (err) {
          return cb(err)
        }
        stream.destroy()

        cb(null, {
          key: key,
          entry: parseEntry(value)
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
    cb({notFound: true})
  })
}

Samizdat.prototype.update = function (key, entry, cb) {
  assert.equal(typeof cb, 'function', 'Update callback must be a function')

  if (!util.validateKey(key)) {
    return cb({invalidKey: true})
  }
  var update = util.updateKey(key)

  this._level.put(update, stringifyEntry(entry), function (err) {
    if (err) {
      return cb(err)
    }
    cb(null, {
      key: update,
      prev: key,
      entry: entry
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

  bus.on('*', function (event, data) {
    if (event === 'error') return

    self._level.get(data.key, function (err) {
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

/**
 * Private helper functions
 */
function stringifyEntry (entry) {
  return typeof entry === 'string' ? entry : JSON.stringify(entry)
}

function parseEntry (value) {
  try {
    return JSON.parse(value)
  }
  catch (err) {
    if (err.name === 'SyntaxError') {
      return value
    }
    throw new Error(err)
  }
}
