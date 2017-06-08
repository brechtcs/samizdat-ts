var assert = require('assert')
var levelup = require('levelup')
var memdown = require('memdown')
var samizdat = require('../')

var level = levelup({db: memdown})
var test = samizdat(level)

/**
 * Add, open & remove string entry
 */
test.add('more', 'stuff', function (err, data) {
  if (err) {
    console.error(err)
  }
  assert.ok(!err, 'Failed to create string entry')
  console.info('Success: created string entry')

  test.open(data.key, function (err, entry) {
    if (err) {
      console.error(err)
    }
    assert.ok(!err, 'Failed to open entry')
    assert.equal(entry, 'stuff', 'Opened string entry value wrong')
    console.info('Success: opened string entry')

    test.rm(data.key, function (err, entry) {
      if (err) {
        console.error(err)
      }
      assert.ok(!err, 'Failed to remove entry')
      assert.equal(entry, 'stuff', 'Removed entry callback value wrong')

      test.open(data.key, function (err, entry) {
        assert.equal(entry, null, 'Removed entry not null when opened')
        assert.deepEqual(err, {entryDeleted: true}, 'Opening removed entry does not return correct error')
        console.info('Success: removed string entry')
      })
    })
  })
})
