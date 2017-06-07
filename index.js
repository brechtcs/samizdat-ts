var uuid = require('uuid/v1')

function Samizdat (db) {
  if (!(this instanceof Samizdat)) return new Samizdat(db)

  this._level = db
}

Samizdat.prototype.add = function (name, entry, cb) {
  var key = name ? `${name}/${uuid()}` : uuid()
  var value = typeof entry === 'string' ? entry : JSON.stringify(entry)
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
  var name = req.replace(req.slice(-37), '')
  var key = name ? `${name}/${uuid()}` : uuid()
  var value = typeof entry === 'string' ? entry : JSON.stringify(entry)
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

Samizdat.prototype.trash = function (key, cb) {
  cb(true)
}

module.exports = Samizdat
