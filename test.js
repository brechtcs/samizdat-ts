var assert = require('assert')
var levelup = require('levelup')
var memdown = require('memdown')
var samizdat = require('./')

var level = levelup({db: memdown})
var test = samizdat(level)

/**
 * Add, change & open serializable entry
 */
var slug = 'stuff'
var v1 = {some: 'stuff'}
var v2 = {other: 'stuff'}

test.add(slug, v1, function (err, data) {
  if (err) {
    console.error(err)
  }
  assert.ok(!err, 'Failed to create serializable entry')
  assert.ok(data.key.includes(slug), 'Added entry key wrong')
  assert.equal(data.value, v1, 'Added entry value wrong')
  console.info('Success: created serializable entry')

  test.open(data.key, function (err, entry) {
    if (err) {
      console.error(err)
    }
    assert.ok(!err, 'Failed to open entry')
    assert.deepEqual(entry, v1, 'Opened entry value wrong')
    console.info('Success: opened serializable entry')

    test.change(data.key, v2, function (err, update) {
      if (err) {
        console.error(err)
      }
      assert.ok(!err, 'Failed to change serializable entry')
      assert.ok(update.key.includes(slug), 'Changed entry key wrong')
      assert.notEqual(update.key, data.key, 'Changed entry key unchanged')
      assert.equal(update.value, v2, 'Changed entry value wrong')
      console.info('Success: changed serializable entry')

      test.open(update.key, function (err, entry) {
        if (err) {
          console.error(err)
        }
        assert.ok(!err, 'Failed to open entry')
        assert.deepEqual(entry, v2, 'Opened entry wrong after change')
        console.info('Success: opened entry after change')
      })

      test.open(data.key, function (err, entry) {
        if (err) {
          console.error(err)
        }
        assert.ok(!err, 'Failed to open entry')
        assert.deepEqual(entry, v2, 'Opened entry wrong with old key')
        console.info('Success: opened updated version with old key')
      })

      test.rm(data.key, function (err) {
        assert.deepEqual(err, {entryUpdated: true}, 'Removing updated entry does not return correct error')
        console.info('Success: older version of updated entry cannot be removed')
      })
    })
  })
})

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
