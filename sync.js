module.exports = function(first, second, cb) {
  first.insert(second.query(), function (err) {
    if (err) {
      return cb(err)
    }

    second.insert(first.query(), function (err) {
      if (err) {
        return cb(err)
      }
      cb(null)
    })
  })
}
