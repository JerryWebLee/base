class TargetObj {
  constructor(age, name) {
    this.name = name;
    this.age = age;
  }
  set name(val) {
    Observer(this.name, val);
    this.name = val;
  }
}

function Observer(oldval, newval) {
  console.info('name属性的值从 ' + oldval + ' 改变为 ' + newval);
}

let targetObj2 = new TargetObj(1, 'www');
targetObj2.name = "mmm";
console.info(targetObj2);