var test = require('tape')
var stamp = require('./')

var plain = '1k16kg171e0-00000000000-entry'
var hyphens = '1k16kg171e0-00000000000-with-hyphens'

test('validate input string as database key', function (t) {
  t.ok(stamp.validate(plain), 'basic entry correctly validated')
  t.ok(stamp.validate(hyphens), 'multi-level entry correctly validated')

  t.notOk(stamp.validate('1k16kg171e0--00000000000'), 'catches empty entry id')
  t.notOk(stamp.validate('1k16kg171e0-00000000000'), 'catches missing entry id')
  t.notOk(stamp.validate('1k16kg171e0-entry'), 'catches missing timestamp')
  t.notOk(stamp.validate('00000000000-00000000000-entry'), 'catches wrongly encoded creation timestamp')
  t.end()
})

test('extract entry information from database key', function (t) {
  // extract IDs
  [plain, hyphens].forEach(function (key) {
    var id = stamp.getId(key)

    t.ok(id.length > 0, key + ': returned non-empty id')
    t.ok(key.includes(id), key + ': found id inside database key')
  })

  // extract creation date
  var key = stamp.newKey('entry')
  var date = stamp.parse(key)[0]

  // slightly round of milliseconds
  t.equals(Math.floor(date.getTime() / 3) * 3, Math.floor(Date.now() / 3) * 3, 'extract accurate time from database key')

  // extract ancestor timestamp
  var key = '1k16kg171ex-1k16kg171e0-entry'

  t.equals(stamp.getCurrent(key), '1k16kg171ex', 'extract correct current timestamp from key')
  t.equals(stamp.getPrev(key), '1k16kg171e0', 'extract correct ancestor timestamp from key')
  t.end()
})

test('create new database key from entry id', function (t) {
  ['entry', 'with-hyphens'].forEach(function (id) {
    var key = stamp.newKey(id)
    var splitKey = key.split('-')
    var splitId = id.split('-')

    for (var i = 0; i < splitId.length; i++) {
      t.equal(splitId[i], splitKey[i + 2], `${id}: part ${i + 1} of id corresponds to key`)
    }
    t.equal(splitId.length, splitKey.length - 2, id + ': key has correct number of hyphen-seperated parts')

    var testTime = new Date()
    var keyTime =  stamp.parse(key)[0]

    // don't test milliseconds, already tested above
    testTime.setMilliseconds(0)
    keyTime.setMilliseconds(0)
    t.equal(testTime.toISOString(), keyTime.toISOString(), id + ': first part of key should display present time')
    t.ok(stamp.validate(key), id + ': generated key is valid')
  })

  t.end()
})

test('create database key for updated entry', function (t)  {
  [plain, hyphens].forEach(function (prev) {
    var key = stamp.updateKey(prev)
    var splitKey = key.split('-')
    var splitPrev = prev.split('-')

    for (var i = 2; i < splitPrev.length - 1; i++) {
      t.equal(splitPrev[i], splitKey[i], `${prev}: part ${i} of id corresponds in both keys`)
    }
    t.equal(splitPrev.length, splitKey.length, prev + ': both keys have same number of hyphen-seperated parts')
    t.equal(splitPrev[0], splitKey[1], prev + ': second part of new key should be timestamp of original key')

    var testTime = new Date()
    var keyTime =  stamp.parse(key)[0]

    // don't test milliseconds, already tested above
    testTime.setMilliseconds(0)
    keyTime.setMilliseconds(0)
    t.equal(testTime.toISOString(), keyTime.toISOString(), prev + ': first part of key should display present time')
    t.ok(stamp.validate(key), prev + ': generated key is valid')
  })

  t.end()
})
