var test = require('tape')
var levelup = require('levelup')
var memdown = require('memdown')
var pull = require('pull-stream')
var samizdat = require('../')

var first = samizdat(levelup('first', {db: memdown}))
var second = samizdat(levelup('second', {db: memdown}))

test('synchronise two samizdat databases', function (t) {
  t.plan(4)

  first.create('first', 'one', function (err, one) {
    second.create('second', 'two', function (err, two) {
      // use consecutive pull streams to synchronise
      pull(first.query(), second.write(function () {
        pull(second.query(), first.write())
      }))

      setTimeout(function () {
        first.read('second', function (err, data) {
          t.notOk(err, 'successfully retrieve entry from second database in first')
          t.equals(data.value, two.value, 'entry value synced properly from second to first')
        })

        second.read('first', function (err, data) {
          t.notOk(err, 'successfully retrieve entry from first database in second')
          t.equals(data.value, one.value, 'entry value synced properly from first to second')
        })
      }, 1500)
    })
  })
})
