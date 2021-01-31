import * as THREE from 'three/build/three.module';
import axios from 'axios';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CanvansRenderBase, MyClick } from './utils';
// import { nameArr } from './name'
// import { CanvansRenderBase } from './utils'
// 该类管理了产生最终视觉效果的后期处理过程链。 后期处理过程根据它们添加/插入的顺序来执行，最后一个过程会被自动渲染到屏幕上。
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
// 渲染通道
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
// Bloom主要用来模拟生活中的泛光或说眩光效果,通过threejs后期处理的扩展库UnrealBloomPass通道可实现一个泛光效果。
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

import { hurtMuscleEffectShader } from './shader'

// 设置图层
const ENTIRE_SCENE = 0, BLOOM_SCENE = 2;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);
const muscleClassNameArr = ['头颈部', '肩颈部', '手臂部', '胸腹部', '腰背部', '腿脚部'];
// canvas渲染
class MainCanvasRenderer extends CanvansRenderBase {
  constructor(canvas) {
    super(canvas);
  }
  // 模型加载渲染引擎
  async run() {

    let body = await this.loadFBX('../resource/models/ALL4_2.FBX');
    this.scene.add(body);
    this.camera.far = 1000;

    this.camera.position.set(0.0, 1.0, 3.0);
    this.body = body;
    this.createBloom();
    this.bodyEffect();
    this.render();
    // 是否展示全部疼痛点

    this.showCurrentPointsArr = []
    this.showFlag = false
    this.showCurrenFlag = false

    this.showPointArr.forEach((obj) => {
      obj.hurtObj.bloomObj.layers.toggle(BLOOM_SCENE);
      obj.hurtObj.visible = false;
      obj.hurtObj.bloomObj.visible = false;
    })
    // 响应式设计
    window.onresize = function () {
      if (this.showFlag) {
        this.showPointsTest()
      }
      if (this.showCurrenFlag) {
        this.showCurrentPointsTest(this.showCurrentPointsArr)
      }
      this.camera.aspect = this.canvas.offsetWidth / this.canvas.offsetHeight;
      this.camera.updateProjectionMatrix();
    }.bind(this)

    this.cameraControls()
    this.createMouseEvent();
    this.animate();
    document.getElementById('loading').className = 'loading-wrapper hide';
  }

  cameraControls() {
    let controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();
    this.controls = controls;
    this.controls.maxDistance = 8;
    this.controls.minDistance = 0
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.render();
  }

  bodyEffect() {
    let boxArr = [];
    let skinArr = [];
    let boneArr = [];
    let muscleArr = [];
    let showPointArr = [];
    let hurtPointArr = [];
    let highLightArr = [];
    this.muscleContainer = []
    this.muscleContainer.indexArr = []
    this.hurtMuscleArr = []
    this.checkedMuscle = null
    // 遍历组中的对象属性
    this.body.traverse((obj) => {
      // console.log(obj);
      if (obj.name == 'ache_area') {
        obj.visible = false;
      }
      let type = obj.name.split('_')[0];
      if (type == 'Skin') {
        skinArr.push(obj);
        highLightArr.push(obj);
        obj.material.side = THREE.DoubleSide;
        return;
      }
      else if (type == 'Skeletal') {
        boneArr.push(obj);
        return;
      }
      else if (type == 'Box') {
        boxArr.push(obj);
        obj.layers.disable(0);
        return;
      }
      else if (obj.name.substr(0, 5) == 'Point') {
        let index = parseInt(obj.name.substr(5, 3));
        showPointArr[index] = obj;
        return;
      }
      else if (obj.name.substr(0, 5) == 'point' && obj.name.substr(8, 6) == 'inside') {
        this.createHurtPoint(obj);
        let index = parseInt(obj.name.substr(5, 3));
        hurtPointArr[index] = obj;
        return;
      }
      else if (obj.material && obj.material.name == 'Muscular_System') {
        let cName = obj.name.split('_');
        if (cName.length == 1) {
          console.log('this obj only have cName')
          cName = cName[0];
        } else {
          cName = cName[cName.length - 1];
        }

        obj.cName = cName;
        obj.index = obj.name.slice(0, obj.name.length - obj.cName.length - 1)
        // console.log(obj);
        this.initMuscle(obj)
        obj.material = new THREE.MeshBasicMaterial({
          map: obj.material.map,
          transparent: true,
          opacity: 0.7
          // opacity: 1
        })

        highLightArr.push(obj);
        muscleArr[obj.index] = obj;

        if (obj.index.match('B'))
          obj.visible = true;
        return;
      }
    })
    this.boxArr = boxArr;
    this.boneArr = boneArr;
    this.skinArr = skinArr;
    this.muscleArr = muscleArr;
    this.highLightToogle = new highLightToogle(highLightArr);
    // console.log('肌肉信息:');
    // console.log(this.muscleArr);

    this.initUI()
    // console.log(hurtPointArr);
    // 疼痛点图标初始化
    this.showPointArr = [];
    for (let i = 1; i < showPointArr.length; i++) {
      if (showPointArr[i]) {
        let point = new showPoint(showPointArr[i], hurtPointArr[i], this, this.canvas, this.camera);
        this.showPointArr.push(point);
        let hurtMuscle = point.initMuscleArr(muscleArr)[0];
        this.hurtMuscleArr.push(hurtMuscle)
      }
    }
    this.hideArr = [];
    // 肌肉UI操作
    let disableButton = document.getElementById('disableButton');
    let undoButton = document.getElementById('undoButton');
    // let cancelButton = document.getElementById('cancelButton');
    let restartButton = document.getElementById('restartButton');
    let allHurtPointShow = document.getElementById('allShow');
    let allHurtPointHidden = document.getElementById('allHidden');
    let currentShow = document.getElementById('currentShow')
    let currenHidden = document.getElementById('currenHidden')
    let muscleStatusBtn = document.getElementById('muscleStatusBtn')
    this.muscleStatusBtn = muscleStatusBtn

    disableButton.addEventListener('click', this.onDisableBtnClick.bind(this));
    undoButton.addEventListener('click', this.onUndoBtnClick.bind(this));
    restartButton.addEventListener('click', this.onRestartBtnClick.bind(this));
    allHurtPointShow.addEventListener('click', this.onShowPointClick.bind(this));
    allHurtPointHidden.addEventListener('click', this.onHidePointClick.bind(this));
    currentShow && currentShow.addEventListener('click', this.onCurrentShowClick.bind(this));
    currenHidden && currenHidden.addEventListener('click', this.onCurrenHiddenClick.bind(this));
    this.muscleStatusBtn && this.changeMuscleStatus()

    this.showPoints_HideAll();
  }
  changeMuscleStatus() {
    layui.use('form', function () {
      let form = layui.form;
      form.on('switch(toogleStatus)', function (data) {
        if (this.checkedMuscle && this.showPointArr.length > 0) {
          this.showPointArr.forEach((point) => {
            if (point.muscleArr[0].name === this.checkedMuscle.name) {
              this.point = point
            }
          })
          if (data.elem.checked) {
            this.point.bloomEnable()
            this.checkedMuscle.changeStatus = true
          } else {
            this.point.bloomDisable()
            this.checkedMuscle.changeStatus = false
          }
        }
      }.bind(this));

    }.bind(this));
  }
  onCurrentShowClick(e) {
    this.doAdd = true
    this.currentPointArr()
    this.showCurrentPointsTest(this.showCurrentPointsArr)
    this.showCurrenFlag = true
  }
  onCurrenHiddenClick(e) {
    this.doAdd = false
    this.currentPointArr()
    if (this.showCurrentPointsArr.length === 0) {
      this.showCurrenFlag = false
    }
  }
  currentPointArr() {
    let currentMuscle = this.checkedMuscle.clone()
    if (this.doAdd) {
      if (currentMuscle) {
        let flag = this.showCurrentPointsArr.find((point) => {
          return point.muscleArr[0].name === currentMuscle.name
        })
        if (flag) {
          return
        }
        this.showPointArr.forEach(point => {
          if (currentMuscle.name === point.muscleArr[0].name
            && this.showPointVisibleTest(point.obj)) {
            this.showCurrentPointsArr.push(point)
          }
        })
      }
    } else {
      if (currentMuscle && this.showCurrentPointsArr.length > 0) {
        let index = this.showCurrentPointsArr.findIndex((point) => {
          return point.muscleArr[0].name === currentMuscle.name
        })
        if (index >= 0) {
          this.showCurrentPointsArr[index].hide()
          this.showCurrentPointsArr.splice(index, 1)
        }
        // if (this.showFlag) {
        //   console.log(111);
        //   let indexOfShowPointArr = this.showPointArr.findIndex((point) => {
        //     return point.muscleArr[0].name === currentMuscle.name
        //   })
        //   if (indexOfShowPointArr >= 0) {
        //     this.showPointArr.splice(index, 1)
        //     this.showPointsTest()
        //   }
        // }
      }
    }
  }
  showCurrentPointsTest(showCurrentPointsArr) {
    if (showCurrentPointsArr) {
      showCurrentPointsArr.forEach((point) => {
        if (this.showPointVisibleTest(point.obj)) {
          point.show();
        }
        else {
          // console.log(222)
          point.hide();
        }
        point.updataImagePos()
      })
    }
  }
  onShowPointClick(e) {
    if (this.skinArr.length > 0) {
      this.skinArr.forEach((skin) => { skin.visible = false })
    }
    this.showPointsTest()
    this.showFlag = true
  }
  onHidePointClick(e) {
    this.showPoints_HideAll()
    this.showFlag = false
    this.showPointArr.forEach((item) => {
      item.bloomDisable()
    })
    this.hideBloomStatus()
  }
  hideBloomStatus() {
    layui.use('form', function () {
      let form = layui.form;
      let muscleStatusBtn = document.getElementById('muscleStatusBtn')
      if (muscleStatusBtn.checked) {
        muscleStatusBtn.checked = false
        form.render('checkbox')
      }
    })
  }
  // 隐藏肌肉
  onDisableBtnClick(e) {
    if (this.highLightToogle.currentElement) {
      if (!this.hideMuscleArr) {
        this.hideMuscleArr = [];
      }
      this.hideMuscleArr.push(this.highLightToogle.currentElement.obj);
      this.highLightToogle.currentElement.obj.visible = false;
      this.highLightToogle.unLightAll();
      this.UI.hideUI()
      this.renderTreeUI(this.uiData)
    }
  }
  // 撤销隐藏肌肉操作
  onUndoBtnClick(e) {
    if (this.hideMuscleArr && this.hideMuscleArr.length > 0) {
      const obj = this.hideMuscleArr.pop();
      let classIndex = obj.name.split('_')[0] - 1
      this.muscleHighLightToogle(obj)
      this.highLightToogle.toogle(obj.name);
      this.UI.showUI(obj, classIndex)
      obj.visible = true;
    }
  }
  // 模型复位
  onRestartBtnClick(e) {
    if (this.hideMuscleArr && this.hideMuscleArr.length > 0) {
      this.hideMuscleArr.forEach(obj => {
        // this.toogle.toogle(obj.name);
        obj.visible = true;
      });
    }
    this.highLightToogle.unLightAll();
    this.hideMuscleArr = [];
    this.camera.position.set(0.0, 1.0, 3.0);
    this.controls.target.set(0.0, 1.0, 0.0);
    this.showPoints_HideAll()
    this.UI.hideUI()
    this.showPoints_HideAll()
    this.showFlag = false
    this.uiData.forEach(item => { item.spread = false })
    this.renderTreeUI(this.uiData)
    this.showPointArr.forEach((item) => {
      item.bloomDisable()
    })
    this.hideBloomStatus()
  }

  initMuscle(obj) {
    if (!this.muscleContainer[obj.index]) {
      this.muscleContainer[obj.index] = new Muscular(obj);
      this.muscleContainer.indexArr.push(obj.index);
    } else {
      this.muscleContainer[obj.index].addMesh(obj);
    }
    this.muscleContainer.push(new Muscular(obj));
  }

  initUI() {
    this.createFirstElement();
    this.createSecondElement();
    this.renderTreeUI(this.uiData);
    this.checked = false;
    this.checkObj = {
      checked: false,
      mulID: ''
    }
    this.UI = new UI(this.hurtMuscleArr)
  }
  // tree父级
  createFirstElement() {
    this.uiData = [];
    for (let i = 0; i < muscleClassNameArr.length; i++) {
      const data = {
        title: muscleClassNameArr[i],
        type: 'firstClass',
        spread: false,
        id: muscleClassNameArr[i],
        children: []
      }
      this.uiData.push(data);
    }
  }
  // tree子级
  createSecondElement() {
    let i = 0
    this.muscleContainer.indexArr.forEach((index) => {
      const muscle = this.muscleContainer[index];
      const data = {
        title: muscle.obj.cName,
        type: 'secondeClass',
        id: i,
        class: muscle.class,
        mulID: muscle.id
      }
      i++;
      this.uiData[muscle.class].children.push(data);
    })
  }
  // 渲染 tree
  renderTreeUI(data) {
    // console.log(JSON.stringify(data));
    layui.use('tree', function () {
      const tree = layui.tree;
      this.tree = tree
      //渲染
      tree.render({
        elem: '#test1',
        data: data,
        showCheckbox: true,
        id: "mainTree",
        // accordion: true,
        click: this.handleElementClick.bind(this),
        oncheck: this.handleElementCheck.bind(this)
      });
      this.uiTree = tree;
    }.bind(this))
  }
  // 列表点击事件
  handleElementClick(obj) {
    let classIndex = obj.data.class
    if (obj.data.type === 'secondeClass') {
      if (this.index !== obj.data.id || !this.checked) {
        this.index = obj.data.id
        this.reloadTreeUI(this.index, classIndex);
        // this.uiTree.setChecked('mainTree', this.flag);
        this.checked = true
      }
      else {
        this.checked = false
        this.index = -1
        this.reloadTreeUI(this.index, classIndex);
      }
      this.stateChange(obj)
    }
  }
  // 列表选择事件
  handleElementCheck(obj) {
    if (obj.data.type === 'secondeClass') {
      if (this.index !== obj.data.id) {
        this.index = obj.data.id
        this.reloadTreeUI(obj.data.id, obj.data.class);
      }
      this.checked = obj.checked
    }
    this.stateChange(obj)
  }
  // 状态改变
  stateChange(obj) {
    const muscle = this.muscleArr[obj.data.mulID]
    this.moveCamera2Target(muscle)
    this.skinArr.forEach((skin) => { skin.visible = false })
    this.checkObj.checked = this.checked
    this.checkObj.mulID = obj.data.mulID
    let index = obj.data.mulID.split('_')[0] - 1
    if (this.checkObj.checked) {
      this.highLightToogle.toogle(muscle.name)
      this.checkedMuscle = muscle
      this.UI.showUI(muscle, index)
      this.reRenderMuscleStatusBtn(this.checkedMuscle)
    } else {
      this.highLightToogle.unLightAll()
      this.checkedMuscle = null
      this.UI.hideUI()
    }
  }
  // 更新渲染肌肉状态按钮
  reRenderMuscleStatusBtn(checkedMuscle) {
    layui.use('form', function () {
      let form = layui.form;
      let muscleStatusBtn = document.getElementById('muscleStatusBtn')
      if (muscleStatusBtn) {
        muscleStatusBtn.checked = checkedMuscle.changeStatus
        form.render('checkbox')
      }
    }.bind(this))
  }

  // 重载layui树
  reloadTreeUI(index, classIndex) {
    if (!this.uiTree) {
      return;
    }
    for (let i = 0; i < this.uiData.length; i++) {
      this.uiData[i].spread = false;
    }
    this.uiData[classIndex].spread = true;
    this.uiData.forEach((data) => {
      if (data.id === index) {
        data.checked = true
      }
    })
    this.tree.reload('mainTree', { data: this.uiData });
    this.uiTree.setChecked('mainTree', index);
  }

  // 事件绑定
  createMouseEvent() {
    let canvasClick = new MyClick(this.canvas);
    const envetTarget = canvasClick;
    this.clickTimer = '';
    envetTarget.addEventListener('dblclick', this.onMouseDBClick.bind(this));
    envetTarget.addEventListener('click', this.onMouseClick.bind(this));
    envetTarget.addEventListener('mousedown', this.onMouseDown.bind(this));
    envetTarget.addEventListener('mousemove', this.onMouseMove.bind(this));
    envetTarget.addEventListener('mouseup', this.onMouseUP.bind(this));
    envetTarget.addEventListener('wheel', this.onMouseWheel.bind(this));
  }

  // 鼠标移动时,皮肤和肌肉高亮显示
  onMouseMove(e) {
    this.mouseState = e;
    // 如果鼠标按下,开启拖拽事件
    if (this.mouseDown) {
      this.dragChange = true
      this.didDrag = true;
      this.showPoints_HideAll();
    }
  }
  // 鼠标按下事件,开始拖拽
  onMouseDown(e) {
    // console.log('start drag')
    this.mouseDown = true;
    this.dragChange = false;
    this.didDrag = false;
  }
  // 鼠标抬起事件,结束拖拽
  onMouseUP(e) {
    // console.log('end  drag')
    this.mouseDown = false
    if (this.dragChange) {
      if (this.showFlag) {
        this.showPointsTest()
      }
      if (this.showCurrenFlag) {
        this.showCurrentPointsTest(this.showCurrentPointsArr)
      }
    }
  }
  // 鼠标滚动时,根据模型更新图标点的位置
  onMouseWheel(e) {
    // console.log('my whell handle')
    if (this.showFlag) {
      this.showPointsTest()
    }
    if (this.showCurrenFlag) {
      this.showCurrentPointsTest(this.showCurrentPointsArr)
    }

  }

  onMouseClick(e) {
    // 单击移动camera2镜头
    if (this.didDrag)
      return;
    clearInterval(this.clickTimer);
    // 点击肌肉高亮显示
    this.clickTimer = setTimeout(function () {
      let obj = this.getMouseTarget();
      this.muscleHighLightToogle(obj)
    }.bind(this), 30);

  }
  // 肌肉高亮显示切换,且更新layui tree
  muscleHighLightToogle(obj) {
    if (obj && !obj.name.match('Skin')) {
      if (this.obj !== obj) {
        this.showCurrentMuscleUI(obj)
        this.obj = obj
      } else {
        this.hideCurrentMuscleUI()
        this.obj = null
      }
    }
  }
  hideCurrentMuscleUI() {
    // this.checked = false
    this.checkedMuscle = null
    // 取消高亮
    // this.uiData[classIndex].spread = false;
    this.highLightToogle.unLightAll();
    this.renderTreeUI(this.uiData)
    this.UI.hideUI()
  }

  showCurrentMuscleUI(obj) {
    // 解析点击的肌肉信息
    let mulID = obj.name.split('_')
    let classIndex = mulID[0] - 1
    let dataArr
    let newObj = null
    mulID.pop()
    mulID = mulID.join('_')

    // 移动相机,肌肉高亮
    this.moveCamera2Target(obj);
    this.checkedMuscle = obj
    if (this.uiData) {
      dataArr = this.uiData[classIndex].children
    }
    dataArr.forEach((item) => {
      if (item.mulID === mulID) {
        newObj = item
      }
    })
    this.reloadTreeUI(newObj.id, newObj.class)
  }

  // 双击皮肤和肌肉的隐藏
  onMouseDBClick(e) {
    clearTimeout(this.clickTimer);
    let obj = this.getMouseTarget();
    // console.log(obj);
    if (obj) {
      if (obj.name.match('Skin')) {
        // console.log(obj.name);
        obj.visible = false;
      }
      // obj.material.opacity = 0.7
      // obj.material.opacity = 1
      // obj.material.transparent = true;
      if (!this.hideMuscleArr) {
        this.hideMuscleArr = [];
      }
      if (!obj.name.match('Skin')) {
        this.hideMuscleArr.push(obj);
      }
      obj.visible = false;
      this.renderTreeUI(this.uiData)
      this.highLightToogle.unLightAll()
      this.UI.hideUI()
      if (this.showFlag) {
        this.showPointsTest()
      }
      if (this.showCurrenFlag) {
        this.showCurrentPointsTest(this.showCurrentPointsArr)
      }
    }
    // console.log('dbclick');
  }
  // 图标点的显示/隐藏
  showPointsTest() {
    this.showPointArr.forEach((point) => {
      if (this.showPointVisibleTest(point.obj)) {
        point.show();
      }
      else {
        point.hide();
      }
      point.updataImagePos()
    })
  }
  // 三维模型对应损伤点的显示隐藏
  showPointVisibleTest(obj) {
    let v = obj.getWorldPosition(new THREE.Vector3(0, 0, 0));
    v.sub(this.camera.position);
    let length = v.length();
    v = v.normalize();
    let raycaster = new THREE.Raycaster(this.camera.position, v, 0, length);
    let intersects = raycaster.intersectObjects(this.skinArr);
    if (intersects.length > 0) {
      return false;
    }
    intersects = raycaster.intersectObjects(this.boxArr);
    if (intersects.length > 0) {
      // console.log(intersects);
      intersects = intersects[0].object
      intersects = raycaster.intersectObjects(intersects.children[0].children);
      if (intersects.length > 0)
        return false;
      else
        return true;
    }
    else {
      return true;
    }
  }
  // 将camera2移动到鼠标选定的目标
  moveCamera2Target(obj) {
    let targetV = obj.localToWorld(new THREE.Vector3());
    this.controls.target = targetV;
    this.controls.update();
    this.camera.updateMatrixWorld();
    if (this.showFlag) {
      this.showPointsTest()
    }
    if (this.showCurrenFlag) {
      this.showCurrentPointsTest(this.showCurrentPointsArr)
    }

    // console.log(this.camera);
    let dir = this.camera.position.clone();
    dir.sub(targetV);
  }
  // 获取鼠标事件触发的目标
  getMouseTarget() {
    let obj = this.rayTest(this.mouseState, this.skinArr);
    if (obj) {
      // console.log("getMouseTarget:");
      // console.log(obj);
      return obj;
    }
    else {
      obj = this.rayTest(this.mouseState, this.boxArr);
      if (obj) {
        // console.log(obj.children[0].children);
        obj = this.rayTest(this.mouseState, obj.children[0].children);
        if (obj)
          return obj;
      }
    }
  }
  // 隐藏图标点
  showPoints_HideAll() {
    this.showPointArr.forEach((point) => {
      point.hide();
    })
  }
  // 撤销隐藏肌肉操作
  cancelClick() {
    if (this.hideArr.length > 0) {
      let obj = this.hideArr.pop();
      obj.visible = true;
      if (obj.showPoint) {
        obj.showPoint.visible = true;
        obj.showPoint.show();
      }
      if (this.showFlag) {
        this.showPointsTest()
      }
      this.showCurrentPointsTest(this.showCurrentPointsArr)
    }
  }


  // 辉光
  createBloom() {
    // 分配图层
    const bloomLayer = new THREE.Layers();
    bloomLayer.set(BLOOM_SCENE);
    const params = {
      exposure: 1,
      bloomStrength: 5,
      bloomThreshold: 0,
      bloomRadius: 0,
      scene: "Scene with Glow"
    };
    const renderScene = new RenderPass(this.scene, this.camera);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = params.bloomThreshold;
    bloomPass.strength = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;

    const bloomComposer = new EffectComposer(this.renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        defines: {}
      }), "baseTexture"
    );
    finalPass.needsSwap = true;

    const finalComposer = new EffectComposer(this.renderer);
    finalComposer.addPass(renderScene);
    finalComposer.addPass(finalPass);

    this.bloomComposer = bloomComposer;
    this.finalComposer = finalComposer;
  }
  // 创建疼痛点
  createHurtPoint(obj) {
    let oMat = obj.material;
    obj.material = new THREE.MeshBasicMaterial();
    obj.material.map = oMat.map;
    // obj.scale.set(obj.scale.x * 0.5, obj.scale.x * 0.5, obj.scale.x * 0.6)
    let bloomObj = obj.clone();
    // console.log(obj);
    // bloomObj.scale.set(obj.scale.x * 0.9, obj.scale.x * 0.9, obj.scale.x * 0.9);
    // bloomObj.scale.set(obj.scale.x * 1.9, obj.scale.x * 1.9, obj.scale.x * 1.9);

    this.scene.attach(bloomObj);

    bloomObj.material = new THREE.MeshBasicMaterial();
    bloomObj.material.color.setRGB(1, 0, 0);
    // obj.material=obj.material.clone();
    // obj.material.color.setRGB(1,0,0,);
    // obj.layers.enable(ENTIRE_SCENE);
    bloomObj.layers.enable(BLOOM_SCENE);
    // obj.layers.toggle(BLOOM_SCENE); 
    // obj.layers.set(1);
    // obj.visible=true;
    obj.bloomObj = bloomObj;

  }
  render() {
    this.camera.layers.set(BLOOM_SCENE);
    this.bloomComposer.render();
    this.camera.layers.set(ENTIRE_SCENE);
    this.finalComposer.render();
    // this.renderer.render(this.scene,this.camera);
  }
}

class highLightToogle {
  constructor(arr) {
    // make sure obj has mat
    let elementArr = []
    let highLightMatArr = []
    let highLightMat;
    // console.log(arr);
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].material.length) {
        if (!highLightMatArr[arr[i].material[0].name]) {
          highLightMat = [];
          let mat = arr[i].material[0].clone();
          mat.color = new THREE.Color(0xff5555);
          highLightMat.push(mat);
          mat = arr[i].material[1].clone();
          mat.color = new THREE.Color(0xff5555);
          highLightMat.push(mat);
          highLightMatArr[arr[i].material[0].name] = highLightMat;
        }
        highLightMat = highLightMatArr[arr[i].material[0].name];
      } else {
        if (!highLightMatArr[arr[i].material.name]) {
          highLightMat = arr[i].material.clone();
          highLightMat.color = new THREE.Color(0xff0000);
          highLightMatArr[arr[i].material.name] = highLightMat;
        }
        highLightMat = highLightMatArr[arr[i].material.name];
        // console.log(highLightMatArr);
      }

      let element = new highLightToogleElement(arr[i], highLightMat);
      // console.log(arr[i].name)
      elementArr[arr[i].name] = element;
      // arr[i].highLightManager = this;
    }
    this.elementArr = elementArr;


  }
  // 鼠标状态默认为空
  toogle(name, mouseState = null) {
    if (this.currentElement) {
      if (name != this.currentElement.obj.name) {
        this.currentElement.unLight();
        this.currentElement = this.elementArr[name];
        this.currentElement.highLight();
      }
    }
    else {
      // console.log(name,this.elementArr[name])
      this.currentElement = this.elementArr[name];
      this.currentElement.highLight();
    }
  }

  unLightAll() {
    if (this.currentElement) {
      this.currentElement.unLight();
    }
    this.currentElement = null;

  }
}

class highLightToogleElement {
  constructor(obj, highLightMat) {
    this.obj = obj;
    this.obj.highLightAble = true;
    this.oldMat = obj.material;
    // highLightMat =obj.material.clone();
    // highLightMat.color=new THREE.Color(0xff5555);
    this.highLightMat = highLightMat
    this.cName = obj.cName;
  }

  highLight() {

    if (this.obj.highLightAble == false) {
      // console.log(this.obj.highLightAble);
      return;
    }
    else {
      this.obj.material = this.highLightMat;
    }
  }

  unLight() {
    if (this.obj.highLightAble == false) {
      return;
    }
    else {
      this.obj.material = this.oldMat
    }
  }
}

class showPoint_base {
  constructor(obj, canvas, camera, iconUrl = '../resource/point.png', baseSize = [15, 15], bigSize = [20, 20]) {
    let main = document.body;
    let image = new Image();
    main.appendChild(image);
    image.src = iconUrl;
    image.style.position = 'absolute';
    image.style.zIndex = '2';
    this.baseSize = baseSize;
    this.bigSize = bigSize

    this.image = image;
    this.image.width = this.baseSize[0];
    this.image.height = this.baseSize[1];

    this.obj = obj;
    // this.parent = obj.parent;

    this.canvas = canvas;
    this.camera = camera;
    this.updataImagePos();
    // this.parent.showPoint = this;
    this.visible = true;

    let nameSplitArr = obj.name.split('_');
    this.groupIndex = (parseInt(nameSplitArr[0]) - 1);
    this.partIndex = (parseInt(nameSplitArr[1]) - 1);
    // this.chinesName = nameArr[this.groupIndex][this.partIndex];
  }

  updataImagePos() {
    this.cal_pos(this.obj, this.camera, this.canvas);
  }

  cal_pos(obj, camera, canvas) {
    // console.log(obj,camera,canvas)
    let v3 = obj.localToWorld(new THREE.Vector3(0, 0, 0));
    let v2 = v3.project(camera);
    // console.log(this.image.width)  
    let left = (v2.x + 1) * 0.5 * canvas.offsetWidth
    let top = (-v2.y + 1) * 0.5 * canvas.offsetHeight

    if ((left + 75) > canvas.offsetWidth) {
      this.hide();
      return;
    }
    left -= this.image.width / 2;
    top -= this.image.height / 2;
    this.image.style.left = left + 'px';
    this.image.style.top = top + 'px';

  }
  hide() {
    this.image.hidden = true;
  }
  show() {
    if (this.visible) {
      this.image.hidden = false;
    }
    else {
      this.image.hidden = true;
    }
  }
  creatEvent() {
    this.image.addEventListener('mouseover', this.onMouseOver.bind(this));
    this.image.addEventListener('mouseout', this.onMouseOut.bind(this));
    this.image.addEventListener('click', this.onClick.bind(this));
    this.image.addEventListener('dblclick', this.onDblClick.bind(this));

  }
  onMouseOver(e) {
    this.image.width = this.bigSize[0];
    this.image.height = this.bigSize[1];
  }
  onMouseOut(e) {
    this.image.width = this.baseSize[0];
    this.image.height = this.baseSize[1];
  }
  onClick(e) {
    // console.log(this.obj.name);
  }
  onDblClick(e) {
    // console.log(e)
    let obj = this.parent;
    obj.visible = false;
    obj.showPoint.visible = false;
    obj.showPoint.hide();
  }
}

// 疼痛点显示
class showPoint extends showPoint_base {
  constructor(obj, hurtObj, manager, canvas, camera, iconUrl = '../resource/point5.png', baseSize = [15, 15], bigSize = [20, 20]) {
    super(obj, canvas, camera, iconUrl, baseSize = [15, 15], bigSize = [20, 20])
    // console.log(obj, hurtObj)
    this.hurtObj = hurtObj;
    // this.hurtObj.visible=false;
    // this.hurtObj.bloomObj.visible=false;
    this.manager = manager;
    this.creatEvent();
  }

  // 疼痛点肌肉
  initMuscleArr(muscleArr) {
    let muscleIndexArr = (this.hurtObj.name.slice(15)).split('*');
    this.muscleArr = [];
    // console.log(muscleIndexArr);
    for (let i = 0; i < muscleIndexArr.length; i++) {
      if (muscleArr[muscleIndexArr[i]]) {
        if (muscleIndexArr[i].match('B')) {
          continue
        }
        this.muscleArr.push(muscleArr[muscleIndexArr[i]])
      }
    }
    this.oldMat = this.muscleArr[0].material;
    this.newMat = this.muscleArr[0].material.clone();
    // console.log(this.muscleArr);
    let channelIndex = 0.0;
    let channelInName = this.hurtObj.name.split('*')[1];
    if (channelInName == 'G' || channelInName == 'g')
      channelIndex = 1.0;
    else if (channelInName == 'B' || channelInName == 'b')
      channelIndex = 2.0

    this.channelIndex = channelIndex
    this.newMat = new THREE.ShaderMaterial({
      uniforms: {
        diffuseTex: { value: this.oldMat.map },
        channelIndex: { value: channelIndex }
      },

      vertexShader: hurtMuscleEffectShader.vShader,
      fragmentShader: hurtMuscleEffectShader.fShader,

      defines: {
        USE_COLOR: true
      }
    })
    this.newMat.transparent = true;
    this.newMat.opacity = 0.7;
    // this.newMat.opacity = 1;

    return this.muscleArr
  }


  creatEvent() {
    this.image.addEventListener('mouseover', this.onMouseOver.bind(this));
    this.image.addEventListener('mouseout', this.onMouseOut.bind(this));
    this.image.addEventListener('click', this.onClick.bind(this));
    this.image.addEventListener('dblclick', this.onDblClick.bind(this));

  }
  onMouseOver(e) {
    super.onMouseOver(e);
    if (this.manager.checkedMuscle) {
      this.manager.highLightToogle.unLightAll()
    }
  }
  onMouseOut(e) {
    super.onMouseOut(e);
  }
  onClick(e) {
    // console.log(this.hurtObj.name);
    this.bloomToogle()
  }
  bloomToogle() {
    this.hurtObj.bloomObj.layers.toggle(BLOOM_SCENE);
    let muscleIndex = this.hurtObj.name.split('*')[this.hurtObj.name.split('*').length - 1]
    let muscle = this.manager.muscleArr[muscleIndex]
    this.manager.showCurrentMuscleUI(muscle)
    if (this.hurtObj.bloomObj.layers.test(bloomLayer)) {
      this.bloomEnable()
      this.manager.checkedMuscle.changeStatus = true
    }
    else {
      this.bloomDisable()
      this.manager.checkedMuscle.changeStatus = false
    }
    this.manager.reRenderMuscleStatusBtn(this.manager.checkedMuscle)
  }
  bloomEnable() {
    // console.log("bloomOBj is in bloom layer")
    this.hurtObj.visible = true;
    this.hurtObj.bloomObj.visible = true;
    this.manager.moveCamera2Target(this.hurtObj);
    this.muscleArr.forEach((obj) => {
      // console.log(obj)
      obj.material = this.newMat;
      obj.renderOrder = 1;
      obj.highLightAble = false;
      obj.visible = true;
      obj.renderOrder = 1;
    })
  }
  bloomDisable() {
    this.hurtObj.visible = false;
    this.hurtObj.bloomObj.visible = false;
    this.muscleArr.forEach((obj) => {
      obj.material = this.oldMat;
      obj.renderOrder = 0;
      obj.highLightAble = true;
      obj.renderOrder = 10;
    })
  }
  onDblClick(e) {

  }

}

class UI {
  constructor(hurtMuscleArr) {

    this.hurtMuscleArr = hurtMuscleArr
    this.txtarea = document.getElementById('txtarea');
    this.cNameTxt = document.getElementById('nameTxt');
    this.bodyClassNameTxt = document.getElementById('bodyClassNameTxt')
    this.hurtPoint = document.getElementById('hurtPoint');
    this.muscleStatusBtn = document.getElementById('muscleStatusBtn')
  }
  showUI(obj, index) {
    let showFlag = true
    this.cNameTxt.innerText = obj.cName;
    this.bodyClassNameTxt.innerText = muscleClassNameArr[index]
    this.txtarea.hidden = false
    this.hurtMuscleArr.forEach((hurtMuscle) => {
      if (obj.name === hurtMuscle.name) {
        showFlag = false
      }
    })
    this.hurtPoint.hidden = showFlag
  }

  hideUI() {
    this.txtarea.hidden = true;
  }
}

class Manager {
  constructor() {

  }
}

class Box {
  constructor() {

  }

}

class Skin {
  constructor() {

  }

}

class Bone {
  constructor() {

  }

}
// 肌肉类
class Muscular {
  constructor(obj) {

    this.obj = obj;
    // console.log(obj);
    this.id = obj.index;
    // console.log(this.id);
    this.class = parseInt(this.id.split("_")[0]) - 1;
    // console.log('this.class:' + this.class);
    this.className = muscleClassNameArr[this.className];
    this.index = parseInt(this.id.split("_")[1]);

    if (this.id.match('02')) {
      // console.log('this is righ part');
    }
  }

  addMesh(obj) {
    this.obj_b = obj;
  }

  showHurt() {

  }

}

class clickObjBase {
  constructor() {

  }
}

exports.MainCanvasRenderer = MainCanvasRenderer;

exports.showPoint = showPoint;



