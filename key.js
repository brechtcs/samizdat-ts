var assert = require('assert')

var BASE = 33
var BLANK = '000000000'

function getId (key) {
  assert.ok(validateKey(key), 'entered key is invalid')
  return key.slice(20)
}

function getDate (key) {
  assert.ok(validateKey(key), 'entered key is invalid')
  return new Date(parseInt(key.substring(0, 9), BASE))
}

function getPrev (key) {
  return key.substring(10, 19)
}

function newKey (id) {
  assert.equal(typeof id, 'string' || 'number', 'database id must be a string or number')
  assert.notEqual(id, '', 'dataBASE id cannot be an empty string')

  var time = Date.now().toString(BASE)
  var stamp = ('000000000' + time).slice(-9)

  return stamp + '-' + BLANK + '-' + id
}

function updateKey (prev) {
  assert.ok(validateKey(prev), 'entered key is invalid')
  return newKey(getId(prev)).replace(BLANK, prev.substring(0, 9))
}

function validateKey (key) {
  var parts = key.split('-')
  var timestamp = parts[0]
  var ancestor = parts[1]

  if (parts.length < 3) {
    return false
  }
  if (parts.length === 3 && parts[1] === '') {
    return false
  }
  if (parseInt(timestamp, BASE) <= parseInt(ancestor, BASE)) {
    return false
  }

  return true
}

module.exports = {BASE, BLANK, getId, getDate, getPrev, newKey, updateKey, validateKey}
