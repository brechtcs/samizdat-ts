var assert = require('assert')

function Samizdat (db) {
  if (!(this instanceof Samizdat)) return new Samizdat(db)

  this._level = db
}

Samizdat.prototype.add = function (id, entry, cb) {
  assert.equal(typeof id, 'string' || 'number', 'Entry ID must be a string or number')

  var key = createKey(id)
  var value = createValue(entry)
  var self = this

  self._level.get(key, function (err) {
    if (!err) {
      return cb({keyExists: true})
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
        value: entry
      })
    })
  })
}

Samizdat.prototype.change = function (req, entry, cb) {
  var id = req.slice(37)
  var key = createKey(id)
  var value = createValue(entry)
  var self = this

  self._level.get(req, function (err) {
    if (err) {
      return cb(err)
    }

    self._level.put(key, value, function (err) {
      if (err) {
        return cb(err)
      }

      self._level.put(req, JSON.stringify({updated: key}), function (err) {
        if (err) {
          return cb(err)
        }

        cb(null, {
          key: key,
          value: entry
        })
      })
    })
  })
}

Samizdat.prototype.open = function (key, cb) {
  var self = this
  var read = function (key, req, cb) {
    self._level.get(key, function (err, value) {
      if (err) {
        return cb(err)
      }

      try {
        var entry = JSON.parse(value)

        if (entry.updated) {
          read(entry.updated, req, cb)
        }
        else if (entry.deleted) {
          cb({entryDeleted: true})
        }
        else {
          cb(null, entry)
        }
      }
      catch (err) {
        if (err.name === 'SyntaxError') {
          cb(null, value)
        }
        else {
          cb(err)
        }
      }
    })
  }

  read(key, key, cb);
}

Samizdat.prototype.rm = function (key, cb) {
  var self = this
  self._level.get(key, function (err, value) {
    if (err) {
      return cb(err)
    }
    var entry

    try {
      entry = JSON.parse(value)

      if (entry.updated) {
        return cb({entryUpdated: true})
      }
    }
    catch (err) {
      if (err.name === 'SyntaxError' && typeof value === 'string') {
        entry = value
      }
      else {
        return cb(err)
      }
    }

    self._level.put(key, JSON.stringify({deleted: true}), function (err) {
      if (err) {
        return cb(err)
      }
      cb(null, entry)
    })
  })
}

function createStamp () {
  var time = Date.now().toString(29)
  var stamp = ('000000000' + time).slice(-9)
  return stamp.substring(0, 3) + '-' + stamp.substring(3)
}

function createKey (id) {
  return createStamp() + '/' + id
}

function createValue (entry) {
  return typeof entry === 'string' ? entry : JSON.stringify(entry)
}

module.exports = Samizdat
