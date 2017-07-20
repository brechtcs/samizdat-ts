var test = require('tape')
var keyUtil = require('./')

test('validate input string as database key', function (t) {
  t.ok(keyUtil.validateKey('456dst7z5-000000000-entry'), 'basic entry correctly validated')
  t.ok(keyUtil.validateKey('456dst7z5-000000000-multi-level'), 'multi-level entry correctly validated')

  t.notOk(keyUtil.validateKey('456dst7z5--000000000'), 'catches empty entry id')
  t.notOk(keyUtil.validateKey('456dst7z5-000000000'), 'catches missing entry id')
  t.notOk(keyUtil.validateKey('456dst7z5-entry'), 'catches missing timestamp')
  t.notOk(keyUtil.validateKey('000000000-000000000-entry'), 'catches wrongly encoded creation timestamp')
  t.end()
})

test('extract entry information from database key', function (t) {
  // extract IDs
  ['456dst7z5-000000000-entry', '456dst7z5-000000000-multi-level'].forEach(function (key) {
    var id = keyUtil.getId(key)

    t.ok(id.length > 0, key + ': returned non-empty id')
    t.ok(key.includes(id), key + ': found id inside database key')
  })

  // extract creation date
  var now = Date.now()
  var key = keyUtil.newKey('entry')
  var date = keyUtil.getDate(key)

  t.equals(date.getTime(), now, 'extract accurate time from database key')

  // extract ancestor timestamp
  var key = '214ffg781-2130bser0-key'

  t.equals(keyUtil.getPrev(key), '2130bser0', 'extract correct ancestor timestamp from key')
  t.end()
})

test('create new database key from entry id', function (t) {
  ['entry', 'multi-level'].forEach(function (id) {
    var key = keyUtil.newKey(id)
    var splitKey = key.split('-')
    var splitId = id.split('-')

    for (var i = 0; i < splitId.length; i++) {
      t.equal(splitId[i], splitKey[i + 2], `${id}: part ${i + 1} of id corresponds to key`)
    }
    t.equal(splitId.length, splitKey.length - 2, id + ': key has correct number of hyphen-seperated parts')

    var testTime = Date.now()
    var keyTime =  new Date(parseInt(splitKey[0], 33))
    t.ok(keyTime > testTime - 5, id + ': first part of key should display present time')
    t.ok(keyUtil.validateKey(key), id + ': generated key is valid')
  })

  t.end()
})

test('create database key for updated entry', function (t)  {
  ['456dst7z5-000000000-entry', '456dst7z5-000000000-multi-level'].forEach(function (prev) {
    var key = keyUtil.updateKey(prev)
    var splitKey = key.split('-')
    var splitPrev = prev.split('-')

    for (var i = 2; i < splitPrev.length - 1; i++) {
      t.equal(splitPrev[i], splitKey[i], `${prev}: part ${i} of id corresponds in both keys`)
    }
    t.equal(splitPrev.length, splitKey.length, prev + ': both keys have same number of hyphen-seperated parts')
    t.equal(splitPrev[0], splitKey[1], prev + ': second part of new key should be timestamp of original key')

    var testTime = Date.now()
    var keyTime =  new Date(parseInt(splitKey[0], 33))
    t.ok(keyTime > testTime - 5, prev + ': first part of key should display present time')
    t.ok(keyUtil.validateKey(key), prev + ': generated key is valid')
  })

  t.end()
})
