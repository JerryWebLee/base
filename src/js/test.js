function listener(obj, fn) {
  Object.defineProperty(obj, 'state', {
    get: function () {
      console.log('bbb');
      return this.state
    },
    set: function (state) {
      this.state = state
      console.log('aaa');
      fn()
    }
  })
}

module.exports = listener