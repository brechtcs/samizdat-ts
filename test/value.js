var test = require('tape')
var levelup = require('levelup')
var memdown = require('memdown')
var samizdat = require('../')
var keyUtil = require('../key')

var level = levelup(memdown)
var db = samizdat(level)

test('create and read new entries', function (t) {
  t.plan(7)

  db.create('dit', 'deze', function (err, first) {
    t.notOk(err, 'create first entry')
    t.ok(keyUtil.validateKey(first.key), 'created entry key is valid')

    db.create('dat', 'die', function (err, second) {
      t.notOk(err, 'create second entry')

      db.read(first.key, function (err, value) {
        t.notOk(err, 'read first entry')
        t.equal(value, 'deze', 'first entry value matches input')
      })

      db.read(second.key, function (err, value) {
        t.notOk(err, 'read second entry')
        t.equal(value, 'die', 'second entry value matches input')
      })
    })
  })
})

test('create and update entry, read both versions, and run purge job', function (t) {
  t.plan(6)

  db.create('qds74e412-000000000-entry', 'stuff', function (err) {
    t.ok(err && err.invalidId, 'new entry id cannot be valid database key')
  })

  db.create('some', 'stuff', function (err, data) {
    db.update(data.key, 'things', function (err, data) {
      t.notOk(err, 'update entry')
      t.ok(keyUtil.validateKey(data.key), 'updated entry key is valid')
      t.ok(keyUtil.validateKey(data.prev), 'previous entry key is valid')

      db.read(data.prev, function (err, value) {
        t.notOk(err, 'read older version of updated entry')
        t.equal(value, 'stuff', 'requested version returns correctly')
      })
    })
  })
})
