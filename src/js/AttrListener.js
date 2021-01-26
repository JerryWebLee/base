function AttrListener(object) {
  function descripterFun(value) {
    return {
      enumerable: true,
      get: function () {
        console.log('get it');
        return value;
      },
      set: function (newvalue) {
        if (value !== newvalue) {
          value = newvalue;
          console.log(value);
          if (typeof newvalue === 'boolean') {
            console.log(newvalue ? '显示' : '隐藏');
          } else if (typeof newvalue === 'number') {
            console.log('更改另一块肌肉显示');
          }
        }
      },
    };
  }
  for (var i in object) {
    Object.defineProperty(object, i, descripterFun(object[i]));
  }
}

export default AttrListener