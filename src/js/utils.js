"use strict";

import * as THREE from 'three/build/three.module';
import axios from 'axios';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
// import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader';
import { PMREMGenerator } from 'three/examples/jsm/pmrem/PMREMGenerator';
import { PMREMCubeUVPacker } from 'three/examples/jsm/pmrem/PMREMCubeUVPacker';
import { getCubeUrls } from './utils';
// import * as dat from 'dat.gui';
class CanvansRenderBase {
  constructor(canvas) {
    // console.log(canvas)
    this.getdeviceType(); // 设备类型
    this.canvas = canvas; // canvas元素
    this.initRenderBase(); // 初始化渲染操作
    this.initLight(); // 初始化关照
    this.initLoaders(); // 初始化模型加载器
    this.eventManager = new EventManager(); // 事件处理器
    this.baseUrl = '../'; //为了处理上传到外网时路径的变换 貌似没啥用
    this.showing = false; // isShow

  }
  // 初始化渲染函数
  initRenderBase() {
    console.log(this.canvas.offsetWidth, this.canvas.offsetHeight);
    // 透视投影相机
    let camera = new THREE.PerspectiveCamera(45, this.canvas.offsetWidth / this.canvas.offsetHeight, 0.01, 100);
    // 场景对象
    let scene = new THREE.Scene();
    // 渲染器
    let renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true, // 执行抗锯齿
      alpha: true // canvas包含透明度
    })

    renderer.setClearColor(new THREE.Color(1, 1, 1), 0); // 画布颜色
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    // 处理高清屏
    if (this.deviceType == 'phone')
      this.renderer.setPixelRatio(window.devicePixelRatio * 4);
    else
      this.renderer.setPixelRatio(window.devicePixelRatio * 4 * 2);
    // 响应式设计
    // window.onresize = this.onWindowResize.bind(this);
  }
  // 响应式设计
  // onWindowResize() {
  // console.log(this.canvas.offsetWidth, this.canvas.offsetHeight);
  //   this.camera.aspect = this.canvas.offsetWidth / this.canvas.offsetHeight;
  //   this.camera.updateProjectionMatrix();
  // }
  // 获取设备类型
  getdeviceType() {
    if (getdeviceType()) {
      this.deviceType = 'phone';
    }
    else {
      this.deviceType = 'pc';
    }
  }
  // 初始化关照
  initLight() {
    let light = new THREE.DirectionalLight();
    light.color.set(0xffffff);
    light.position.set(5, 10, 7.5);
    light.intensity = 1;

    this.scene.add(light);
    let adLight = new THREE.AmbientLight(new THREE.Color(1, 1, 1));
    this.scene.add(adLight);

    this.directLight = light;
    this.adLight = adLight;
    // 物体的层级关系。 物体只有和一个正在使用的Camera至少在同一个层时才可见。
    light.layers.enable(2);
    adLight.layers.enable(2);

  }
  // 初始化加载器
  initLoaders() {
    let fbxLoader = new FBXLoader();
    let gltfLoader = new GLTFLoader();
    let objLoader = new OBJLoader();
    let textureLoader = new THREE.TextureLoader();
    let hdrTextureLoader = new HDRCubeTextureLoader();
    hdrTextureLoader.setDataType(THREE.UnsignedByteType);

    this.loadFBX = async function (url) {
      url = url.replace('../', this.baseUrl);
      return new Promise((resolve) => {

        fbxLoader.load(url, obj => {
          resolve(obj);
        })
      });
    }
    this.loadGLTF = async function (url) {
      url = url.replace('../', this.baseUrl)
      return new Promise((resolve) => {
        gltfLoader.load(url, obj => {
          resolve(obj);
        })
      });
    }
    this.loadObj = async function (url) {
      url = url.replace('../', this.baseUrl)
      return new Promise((resolve) => {

        objLoader.load(url, obj => {
          resolve(obj);
        })
      });
    }
    this.loadTexture = async function (url) {
      url = url.replace('../', this.baseUrl)
      return new Promise((resolve) => {
        textureLoader.load(url, obj => {
          resolve(obj);
        })

      })
    }
    this.HDRCubeMaoLoader = async function (url, type) {
      url = url.replace('../', this.baseUrl);
      let hdrUrls = getCubeUrls(url, '.hdr', type);
      return new Promise((resolve) => {
        hdrTextureLoader.load(hdrUrls, envCubeMap => {
          let pmremGenerator = new PMREMGenerator(envCubeMap);
          pmremGenerator.update(this.renderer);
          let pmremCubeUVPacker = new PMREMCubeUVPacker(pmremGenerator.cubeLods);
          pmremCubeUVPacker.update(this.renderer);
          this.hdrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;

          envCubeMap.minFilter = THREE.LinearFilter;
          envCubeMap.magFilter = THREE.LinearFilter;
          envCubeMap.needsUpdate = true;

          pmremGenerator.dispose();
          pmremCubeUVPacker.dispose();
          resolve(envCubeMap);
        });
      })
    }


  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  rayTest(e, testObjectArr) {
    // console.log(e);
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    // console.log(e)
    mouse.x = (e.x / this.canvas.offsetWidth) * 2 - 1;
    mouse.y = - (e.y / this.canvas.offsetHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObjects(testObjectArr);
    if (intersects.length > 0) {
      return intersects[0].object;
    }
    else {
      return null;
    }
  }

  createBox(pos) {
    let geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    let material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    let cube = new THREE.Mesh(geometry, material);
    cube.position.copy(pos);
    this.scene.add(cube);
    return cube;
  }
  // 根据z-index显示隐藏
  show(targetIndex = 2) {
    this.canvas.style.zIndex = targetIndex;
    this.showing = true;
  }
  // 根据z-index显示隐藏
  hide(targetIndex = 1) {
    console.log('this is farther hide')
    this.canvas.style.zIndex = targetIndex;
    this.showing = false;
  }
  // 注册新事件
  registeNewEvent(name) {
    this.eventManager.registeNewEvent(name);

  }
  // 添加事件监听
  addEventListener(name, fuc) {
    this.eventManager.addEventListener(name, fuc);
  }
  // 处理事件
  handleEvent(name, e) {
    this.eventManager.handleEvent(name, e);
  }
}

// 事件处理
class EventManager {
  constructor() {
    this.eventList = [];
    // this.eventList = {};
  }
  registeNewEvent(name) {
    if (!this.eventList[name]) {
      this.eventList[name] = new myEvent(name);
      this.eventList[name].EventIndex = this.eventList.length - 1;
      return this.eventList.length - 1;
    }
  }

  addEventListener(name, fuc) {
    if (!this.eventList[name]) {
      console.log('this event is not registed');
    }
    else {
      this.eventList[name].addEventListener(name, fuc);
    }

  }
  handleEvent(name, e) {
    if (!this.eventList[name]) {
      console.log('this event is not registed');
    } else {
      this.eventList[name].sendMassage(e);
    }
  }

  dispose() {
    for (let i = 0; i < this.listenerList.length; i++) {
      let event = this.eventList.shift();
      event.dispose();
    }
    this.eventList = null;
  }


}

class myEvent {
  constructor(name) {
    this.name = name;
    this.listenerList = [];
    this.EventIndex = -1;
  }
  sendMassage(e) {
    this.listenerList.forEach((fuc) => {
      fuc(e);
    })
  }
  addEventListener(name, fuc) {
    if (name != this.name) {
      console.log('wrong type event');
    }
    else {
      this.listenerList.push(fuc);
      fuc.listenerIndex = this.listenerList.length - 1;
      return this.listenerList.length - 1;
    }
  }

  dispose() {
    for (let i = 0; i < this.listenerList.length; i++) {
      this.listenerList.shift();
    }
    this.listenerList = null;
  }
}

class MyClick {
  constructor(element) {
    this.element = element
    if (getdeviceType()) {
      this.deviceType = 'phone';
    }
    else {
      this.deviceType = 'pc';
    }

    this.eventManager = new EventManager();
    this.eventManager.registeNewEvent('click');
    this.eventManager.registeNewEvent('mousemove');
    this.eventManager.registeNewEvent('mousedown');
    this.eventManager.registeNewEvent('mouseup');
    this.eventManager.registeNewEvent('dblclick');
    this.eventManager.registeNewEvent('wheel');
  }

  addEventListener(type = 'click', fuc) {
    //支持事件 点击-click 鼠标按下-mousedown 鼠标抬起-mouseup  
    if (type == 'click') {
      this.element.addEventListener(this.getClickStartName(), this.clickStart.bind(this));
      this.element.addEventListener(this.getClickEndName(), this.clickEnd.bind(this));
      this.eventManager.addEventListener('click', fuc);
    }
    else if (type == 'dblclick') {

      if (this.deviceType == 'phone') {
        // this.date=new Date();
        // this.dbclickTimer=this.date.getTime();
        // this.element.addEventListener(this.getClickStartName(), this.dbclickStart.bind(this));
        // this.element.addEventListener(this.getClickEndName(), this.dbclickEnd.bind(this));
        // this.eventManager.addEventListener('dblclick', fuc);
      }
      else {
        this.element.addEventListener('dblclick', fuc);
      }


    }
    else if (type == 'mousemove') {
      this.element.addEventListener('mousemove', fuc);
    }
    else if (type == 'mousedown') {
      this.element.addEventListener(this.getClickStartName(), fuc);
    }
    else if (type == 'mouseup') {
      this.element.addEventListener(this.getClickEndName(), fuc);
    }
    else if (type == 'wheel') {
      this.element.addEventListener('wheel', fuc);
    }
  }


  getClickStartName() {
    if (this.deviceType == 'phone')
      return 'touchstart';
    else
      return 'mousedown';
  }

  getClickEndName() {
    if (this.deviceType == 'phone')
      return 'touchend';
    else
      return 'mouseup';
  }

  clickStart(e) {
    this.clickStartPos = e;
  }

  clickEnd(e) {
    if (this.checkClickPos(e)) {
      // this.clickHandle(this.getClickPos(e))
      let msg = e;
      if (this.deviceType == 'phone') {
        msg = {
          x: e.changedTouches[0].clientX,
          y: e.changedTouches[0].clientY
        }
      }
      this.eventManager.handleEvent('click', msg);
    }
    else {
      console.log('无效点击');
    }
  }
  dbclickStart(e) {

  }
  dbclickEnd(e) {

  }



  checkClickPos(e) {
    if (this.deviceType == 'pc') {
      return e.x == this.clickStartPos.x && e.y == this.clickStartPos.y;
    }
    else {
      return e.changedTouches[0].clientX == this.clickStartPos.changedTouches[0].clientX && e.changedTouches[0].clientY == this.clickStartPos.changedTouches[0].clientY;
    }
  }

  getClickPos(e) {
    let pos = { x: e.x, y: e.y };
    if (this.deviceType == 'phone')
      pos = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return pos;
  }

}

function getdeviceType() {
  return (navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i));
}

exports.CanvansRenderBase = CanvansRenderBase;
exports.MyClick = MyClick;
