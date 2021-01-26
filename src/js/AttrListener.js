function AttrListener(object, muscleArr, highLightToogle) {
  console.log('监听器中的muscleArr:');
  console.log(muscleArr);
  let ischecked = false, mulID = '', mesh
  function descripterFun(value) {
    return {
      enumerable: true,
      set: function (newvalue) {
        if (value !== newvalue) {
          // value = newvalue;
          // console.log(value);
          // if (typeof value === 'boolean') {
          //   ischecked = value
          //   console.log('操作当前肌肉' + (value ? '显示' : '隐藏'));
          // } else if (typeof value === 'string') {
          //   console.log('更改另一块肌肉显示');
          //   mulID = value
          //   mesh = muscleArr[mulID]
          //   // highLightToogle.toogle(mesh.name)
          // }
        }
      },
    };
  }
  for (var i in object) {
    Object.defineProperty(object, i, descripterFun(object[i]));
  }
}

export default AttrListener