var assert = require('assert')

var BLANK = '00000000000'
var HOUR = 3600000

function getId (key) {
  assert.ok(validate(key), 'entered key is invalid')
  return key.split('-').slice(2).join('-')
}

function getCurrent (key) {
  assert.ok(validate(key), 'entered key is invalid')
  return key.split('-')[0]
}

function getPrev (key) {
  assert.ok(validate(key), 'entered key is invalid')
  return key.split('-')[1]
}

function newKey (id) {
  assert.equal(typeof id, 'string' || 'number', 'database id must be a string or number')
  assert.notEqual(id, '', 'database id cannot be an empty string')

  var date = new Date()
  var ts = (date.getYear() + 1900).toString(36)
  ts += date.getMonth().toString(12)
  ts += date.getDate().toString(31)
  ts += date.getHours().toString(24)
  ts += ('00000' + (date.getTime() % HOUR).toString(36)).slice(-5)

  return [ts, BLANK, id].join('-')
}

function updateKey (prev) {
  assert.ok(validate(prev), 'entered key is invalid')
  return newKey(getId(prev)).replace(BLANK, getCurrent(prev))
}

function parse (key) {
  return key.split('-').slice(0, 2).map(function (ts) {
    var date = new Date(parseInt(ts.substring(6), 36))
    var year = parseInt(ts.substring(0, 3), 36)
    date.setYear(year === 0 ? 1 : year)
    date.setMonth(parseInt(ts.substring(3, 4), 12))
    date.setDate(parseInt(ts.substring(4, 5), 31))
    date.setHours(parseInt(ts.substring(5, 6), 24))
    return date
  })
}

function validate (key) {
  var parts = key.split('-')
  var dates = parse(key)

  if (parts.length < 3) {
    return false
  }
  if (parts.length === 3 && parts[1] === '') {
    return false
  }
  if (parts[1] >= parts[0]) {
    return false
  }

  return dates.every(function (date) {
    return date.getTime()
  })
}

module.exports = {
  getId: getId, 
  getCurrent: getCurrent,
  getPrev: getPrev, 
  newKey: newKey, 
  updateKey: updateKey, 
  parse: parse,
  validate: validate
}
