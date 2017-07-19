var assert = require('assert')
var keyUtil = require('./key')

function Samizdat (level) {
  if (!(this instanceof Samizdat)) return new Samizdat(level)

  this._level = level
}

module.exports = Samizdat

/**
 * CRUD operations
 */
Samizdat.prototype.create = function (doc, value, cb) {
  assert.equal(typeof doc, 'string' || 'number', 'Document ID must be a string or number')
  assert.equal(typeof cb, 'function', 'Create callback must be a function')

  if (keyUtil.validateKey(doc)) {
    return cb({invalidId: true})
  }

  var key = keyUtil.newKey(doc)
  var self = this

  self.read(doc, function (err) {
    if (!err) {
      return cb({docExists: true})
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

Samizdat.prototype.read = function (version, cb) {
  assert.equal(typeof cb, 'function', 'Read callback must be a function')

  this._level.get(version, cb)
}

Samizdat.prototype.update = function (version, value, cb) {
  assert.equal(typeof cb, 'function', 'Update callback must be a function')

  if (!keyUtil.validateKey(version)) {
    return cb({invalidKey: true})
  }
  var update = keyUtil.updateKey(version)
  var self = this

  self._level.put(update, value, function (err) {
    if (err) {
      return cb(err)
    }
    cb(null, {
      key: update,
      prev: version,
      value: value
    })
  })
}

Samizdat.prototype.del = function (version, cb) {
  assert.equal(typeof cb, 'function', 'Delete callback must be a function')

  this._level.del(version, cb)
}

/**
 * Basic queries
 */
Samizdat.prototype.docs = function (cb) {
  assert.equal(typeof cb, 'function', 'Docs query callback must be a function')

  var docs = []

  this._level.createKeyStream().on('data', function (key) {
    var id = keyUtil.getId(key)

    if (!docs.includes(id)) {
      docs.push(id)
    }
  }).on('end', function () {
    cb(null, docs)
  }).on('error', cb)
}

Samizdat.prototype.versions = function (doc, cb) {
  assert.equal(typeof doc, 'string' || 'number', 'Document ID must be a string or number')
  assert.equal(typeof cb, 'function', 'Versions query callback must be a function')

  var versions = []

  this._level.createKeyStream().on('data', function (key) {
    var id = keyUtil.getId(key)
    
    if (id === doc && !versions.includes(key)) {
      versions.push(key)
    }
  }).on('end', function () {
    cb(null, versions)
  }).on('error', cb)
}
