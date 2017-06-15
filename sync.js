module.exports = function(first, second, cb) {
  first._enter(second._level.createReadStream(), function (err) {
    if (err) {
      return cb(err)
    }

    second._enter(first._level.createReadStream(), function (err) {
      if (err) {
        return cb(err)
      }
      cb(null)
    })
  })
}
