var test = require('tape')
var memdown = require('memdown')
var samizdat = require('../')
var util = require('../util')

var db = samizdat({
  db: memdown
})

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

test('create and update entry, and read both versions', function (t) {
  t.plan(8)

  db.create('qds74e412/entry/000000000', 'stuff', function (err) {
    t.ok(err && err.invalidId, 'new entry id cannot be valid database key')
  })

  db.create('some', 'stuff', function (err, data) {
    db.update(data.key, 'things', function (err, data) {
      t.notOk(err, 'update entry')
      t.ok(util.validateKey(data.key), 'updated entry key is valid')
      t.ok(util.validateKey(data.prev), 'previous entry key is valid')

      db.read('some', function (err, data) {
        t.notOk(err, 'read updated entry')
        t.equal(data.value, 'things', 'updated entry matches last version')
      })

      db.read(data.prev, function (err, data) {
        t.notOk(err, 'read older version of updated entry')
        t.equal(data.value, 'stuff', 'requested version returns correctly')
      })
    })
  })
})
