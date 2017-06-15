var test = require('tape')
var levelup = require('levelup')
var memdown = require('memdown')
var samizdat = require('../')
var util = require('../util')

var level = levelup(memdown)
var db = samizdat(level)

test('create and read new entries', function (t) {
  t.plan(7)

  db.create('dit', 'deze', function (err, data) {
    t.notOk(err, 'create first entry')
    t.ok(util.validateKey(data.key), 'created entry key is valid')

    db.create('dat', 'die', function (err) {
      t.notOk(err, 'create second entry')

      db.read('dit', function (err, data) {
        t.notOk(err, 'read first entry')
        t.equal(data.value, 'deze', 'first entry value matches input')
      })

      db.read('dat', function (err, data) {
        t.notOk(err, 'read second entry')
        t.equal(data.value, 'die', 'second entry value matches input')
      })
    })
  })
})

test('create and update entry, read both versions, and run purge job', function (t) {
  t.plan(11)

  db.create('qds74e412/entry/000000000', 'stuff', function (err) {
    t.ok(err && err.invalidId, 'new entry id cannot be valid database key')
  })

  db.create('some', 'stuff', function (err, data) {
    db.update(data.key, 'things', function (err, data) {
      t.notOk(err, 'update entry')
      t.ok(util.validateKey(data.key), 'updated entry key is valid')
      t.ok(util.validateKey(data.prev), 'previous entry key is valid')
      var prev = data.prev

      db.read(prev, function (err, data) {
        t.notOk(err, 'read older version of updated entry')
        t.equal(data.value, 'stuff', 'requested version returns correctly')

        db.purge(function (err) {
          t.notOk(err, 'run database purge job')

          db.read('some', function (err, data) {
            t.notOk(err, 'read updated entry')
            t.equal(data.value, 'things', 'updated entry matches last version')
          })

          db.read(prev, function (err, data) {
            t.notOk(err, 'leave accessible document for purged entry')
            t.equal(data.value, '', 'value of purged entry should be empty string')
          })
        })
      })
    })
  })
})
