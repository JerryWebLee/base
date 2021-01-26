/*

*/
"use strict";
//库加载 Threejs
import * as THREE from 'three/build/three.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

//库加载 UI
import * as dat from 'dat.gui';

//库加载 自建
import { CanvansRenderBase, MyClick } from './utils';

const ENTIRE_SCENE = 0, BLOOM_SCENE = 2;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);
class MainCanvasRenderer extends CanvansRenderBase {
  constructor(canvas) {
    super(canvas);
  }

  async run() {
    // loadmodel createffect
    let body = await this.loadFBX('../resource/models/ALL2.FBX');
    this.scene.add(body);
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0.0, 1.0, 3.0);
    this.body = body;
    // this.createBloom();
    this.bodyEffect();
    //create camera control
    let controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.target.set(0.0, 1.0, 0.0);
    controls.update();
    this.controls = controls;
    this.controls.maxDistance = 8;
    this.controls.minDistance = 0;

    this.click = new MyClick(this.renderer.domElement);
    this.initControl();
    this.canRender = true;

    let undoButton = document.getElementById('undoButton');
    let restartButton = document.getElementById('restartButton');
    let disableButton = document.getElementById('disableButton');

    disableButton.addEventListener('click', this.onDisableBtnClick.bind(this));
    undoButton.addEventListener('click', this.onUndoBtnClick.bind(this));
    restartButton.addEventListener('click', this.onRestartBtnClick.bind(this));

    this.animate();
    document.getElementById('loading').className = 'loading-wrapper hide';


    const canvas = document.getElementById('muscleCanvas');
    this.muscleCavans = new muscleCanvasRender(canvas, this.scene, this);



  }
  //keep render
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    if (this.canRender) {
      this.render();
    }

  }
  //bloom and nomal render
  render() {
    // this.camera.layers.set(BLOOM_SCENE);
    // this.bloomComposer.render();
    // this.camera.layers.set(ENTIRE_SCENE);
    // this.finalComposer.render();
    this.renderer.render(this.scene, this.camera);
  }

  //analyze
  bodyEffect() {
    const boxArr = [];
    const skinArr = [];
    const boneArr = [];
    const muscleArr = [];
    const showPointArr = [];
    const hurtPointArr = [];
    const hightLightArr = [];
    let index = 0
    this.body.traverse((obj) => {
      index += 1;
      console.log(obj.name);
      let type = obj.name.split('_')[0];

      if (type == 'Box') {
        obj.layers.disable(0);
        boxArr.push(obj);


        return;
      }
      else if (type == 'Skin') {
        skinArr.push(obj);
        obj.visible = false;
        return;
      }
      else if (type == 'Skeletal') {
        boneArr.push(obj);
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
        obj.index = obj.name.slice(0, obj.name.length - obj.cName.length - 1);
        console.log(obj.index);
        if (obj.index.match('A')) {
          console.log('this muscular has two mesh and this ' + obj.index.split("_")[2]);
          obj.index = obj.index.slice(0, obj.index.length - 2);
          // console.log(obj.index);
          // obj.meshIndex = ''

        }
        if (obj.index.match('B')) {
          obj.visible = false;
          return;
        }

        obj.material = new THREE.MeshBasicMaterial({
          map: obj.material.map,
          // transparent:true,
          // opacity:0.5

        })

        obj.material = new THREE.MeshPhongMaterial({
          map: obj.material.map,
          // transparent:true,
          // opacity:0.5

        })
        muscleArr.push(obj)

        return;
      }

      else if (obj.name.substr(0, 5) == 'Point') {
        return;
      }
      else if (obj.name.substr(0, 5) == 'point' && obj.name.substr(8, 6) == 'inside') {
        return;
      }

    })

    console.log(index);
    this.boxArr = boxArr;
    this.skinArr = skinArr;
    this.boneArr = boneArr;

    this.toogle = new highLightToogle(muscleArr);

  }



  //control
  initControl() {
    const envetTarget = this.click;
    this.clickTimer = '';
    // envetTarget.addEventListener('dblclick', this.onMouseDBClick.bind(this));
    envetTarget.addEventListener('click', this.onMouseClick.bind(this));
    envetTarget.addEventListener('mousedown', this.onMouseDown.bind(this));
    envetTarget.addEventListener('mousemove', this.onMouseMove.bind(this));
    envetTarget.addEventListener('mouseup', this.onMouseUP.bind(this));
    envetTarget.addEventListener('wheel', this.onMouseWheel.bind(this));
  }

  onMouseMove(e) {
    this.mouseState = e;
    if (this.mouseDown) {
      // console.log('drag');
      this.dragChange = true
      this.didDrag = true;
    }

  }

  onMouseDown(e) {
    // console.log('start drag')
    this.mouseDown = true;
    this.dragChange = false;
    this.didDrag = false;

  }

  onMouseUP(e) {
    // console.log('end  drag')
    this.mouseDown = false
    if (this.dragChange) {
      // this.showPointsTest();

    }

  }

  onMouseWheel(e) {
    // console.log('my whell handle')

    // this.showPointsTest();

  }

  onMouseClick(e) {
    console.log('点击事件');
    if (this.didDrag)
      return;
    clearInterval(this.clickTimer);
    this.mouseState = e;
    this.clickTimer = setTimeout(function () {
      let obj = this.getMouseTarget();
      if (obj) {
        this.moveCamera2Target(obj);
        console.log('点击事件');
        console.log('objname' + obj.name);
        // obj.visible = false
        // obj.material.transparent = true;
        // obj.material.opacity = 0.5;
        if (this.toogle.currentElement)
          if (obj.name === this.toogle.currentElement.obj.name) {


            this.canRender = false;
            const cN = this.toogle.currentElement.cName;
            this.toogle.unLightAll();
            this.muscleCavans.show(obj, this.camera);
            this.toogle.cNameTxt.innerText = cN;

            return;
          }
        this.toogle.toogle(obj.name);
      }
    }.bind(this), 300);
  }


  getMouseTarget() {

    let obj = this.rayTest(this.mouseState, this.skinArr);

    if (obj) {
      // this.highLightToogle.toogle(obj.name);

      return obj;
    }
    else {
      obj = this.rayTest(this.mouseState, this.boxArr);
      if (obj) {
        // console.log(obj.children[0].children);
        obj = this.rayTest(this.mouseState, obj.children[0].children);
        if (obj) {
          console.log('getmouseTarget' + obj);
          console.log(obj);
          return obj;
        }

      }
    }
  }

  moveCamera2Target(obj) {
    // console.log(this.camera);
    let targetV = obj.localToWorld(new THREE.Vector3());
    this.controls.target = targetV;
    this.controls.update();
    this.camera.updateMatrixWorld();
    // this.showPointsTest();
    // console.log(this.camera);

    let dir = this.camera.position.clone();
    dir.sub(targetV);
    console.log(dir.length())
    // if(dir.length()>1){
    //     dir.normalize();
    //     dir.multiplyScalar(1);
    //     // console.log(targetV.add(dir))
    //     this.camera.position.copy(targetV.add(dir));

    // }


  }


  onRestartBtnClick(e) {

    if (this.hideMuscleArr && this.hideMuscleArr.length > 0) {
      this.hideMuscleArr.forEach(obj => {
        // this.toogle.toogle(obj.name);
        obj.visible = true;

      });


    }
    this.toogle.unLightAll();
    this.hideMuscleArr = [];
    this.camera.position.set(0.0, 1.0, 3.0);
    this.controls.target.set(0.0, 1.0, 0.0);

  }

  onUndoBtnClick(e) {

    if (this.hideMuscleArr && this.hideMuscleArr.length > 0) {
      const obj = this.hideMuscleArr.pop();
      this.toogle.toogle(obj.name);
      obj.visible = true;
    }


  }

  onDisableBtnClick(e) {
    if (this.toogle.currentElement) {
      if (!this.hideMuscleArr) {
        this.hideMuscleArr = [];
      }
      this.hideMuscleArr.push(this.toogle.currentElement.obj);
      this.toogle.currentElement.obj.visible = false;
      this.toogle.unLightAll();
    }

  }


  createBloom() {
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

}






class muscleCanvasRender extends CanvansRenderBase {
  constructor(canvas, scene, mainCanvas) {
    super(canvas);
    this.scene = scene;
    this.renderer.setClearColor(new THREE.Color(1, 1, 0), 0.5)
    this.camera.layers.disable(0);
    this.camera.layers.enable(2);
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.target.set(0, 1.4, 0);
    controls.update();
    controls.maxDistance = 8;
    controls.minDistance = 0;
    this.controls = controls;
    this.renderNext = true;
    this.mainCanvas = mainCanvas;



    this.undoButton = document.getElementById('undoButton');
    this.restartButton = document.getElementById('restartButton');
    this.disableButton = document.getElementById('disableButton');
    this.cancelButton = document.getElementById('cancelButton');
    this.buttonArr = [];
    this.buttonArr.push(this.undoButton);
    this.buttonArr.push(this.restartButton);
    this.buttonArr.push(this.disableButton);
    this.buttonArr.push(this.cancelButton);


    this.cancelButton.addEventListener('click', this.onCancelButtonClick.bind(this));

    this.hide(0);



  }

  onCancelButtonClick() {
    this.hide(0);
    this.mainCanvas.canRender = true;
    this.mainCanvas.toogle.toogle(this.currentObj.name);
    this.renderNext = false;
    this.currentObj.layers.disable(2);
    this.renderer.setClearColor(new THREE.Color(1, 1, 0), 0);
    this.renderer.clearColor();
  }

  hide(index) {
    console.log('this is hide');
    super.hide(index);
    if (this.currentObj) {
      this.currentObj.layers.disable(2);
    }
    this.renderNext = false;

    this.buttonArr.forEach(element => {
      element.hidden = false;
    })
    this.cancelButton.hidden = true;
  }

  show(obj, maincamera) {
    super.show(2);
    this.renderer.setClearColor(new THREE.Color(1, 1, 0), 1)
    this.currentObj = obj;
    obj.layers.enable(2);
    this.camera.position.copy(maincamera.position);
    const targetV = obj.localToWorld(new THREE.Vector3(0, 0, 0));
    this.camera.position.add(targetV);
    this.camera.position.multiplyScalar(0.5);
    this.camera.lookAt(targetV);
    this.controls.target = obj.localToWorld(targetV);
    this.renderNext = true;
    const mat = obj.material.clone();
    mat.transparent = true;
    mat.opacity = 0.5;
    obj.material = mat;
    // obj.material.side=2;
    // const cube= this.createBox(obj.localToWorld(new THREE.Vector3(0,0,0)));
    // cube.layers.enable(2);
    // cube.scale.multiplyScalar(0.03)
    this.buttonArr.forEach(element => {
      element.hidden = true;
    })
    this.cancelButton.hidden = false;


    this.animate();
  }


  animate() {
    if (this.renderNext) {
      requestAnimationFrame(this.animate.bind(this));
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }



  }
}



class UI {
  constructor() {
    //

  }

}

class Manager {
  constructor() {

  }
}



class Box {

}

class Skin {

}

class Bone {

}



class Muscular {

}

class highLightToogle {
  constructor(arr) {
    let elementArr = []
    let highLightMatArr = []
    let highLightMat;
    // console.log(arr);
    for (let i = 0; i < arr.length; i++) {
      // if (arr[i].material.length) {
      //     // console.log(arr[i])
      //     if (!highLightMatArr[arr[i].material[0].name]) {
      //         highLightMat = [];
      //         let mat = arr[i].material[0].clone();
      //         mat.color = new THREE.Color(0xff5555);
      //         highLightMat.push(mat);
      //         mat = arr[i].material[1].clone();
      //         mat.color = new THREE.Color(0xff5555);
      //         highLightMat.push(mat);


      //         highLightMatArr[arr[i].material[0].name] = highLightMat;

      //     }

      //     highLightMat = highLightMatArr[arr[i].material[0].name];

      // }

      // else {


      //     if (!highLightMatArr[arr[i].material.name]) {
      //         highLightMat = arr[i].material.clone();
      //         highLightMat.color = new THREE.Color(0xff5555);
      //         highLightMatArr[arr[i].material.name] = highLightMat;
      //     }
      //     highLightMat = highLightMatArr[arr[i].material.name];

      // }

      highLightMat = arr[i].material.clone();
      highLightMat.color = new THREE.Color(0xff0000);
      highLightMatArr[arr[i].material.name] = highLightMat;

      let element = new highLightToogleElement(arr[i], highLightMat);
      // console.log(arr[i].name)
      elementArr[arr[i].name] = element;
      // arr[i].highLightManager = this;
    }
    this.elementArr = elementArr;

    this.txtarea = document.getElementById('txtarea');
    this.cNameTxt = document.getElementById('name');
  }

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
    this.cNameTxt.innerText = this.currentElement.obj.cName;

  }

  unLightAll() {

    if (this.currentElement) {

      this.currentElement.unLight();
    }
    this.currentElement = null;
    this.cNameTxt.innerText = '未选中'

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
      console.log(22222)
      return;
    }
    else {
      console.log(111111111111)

      // console.log(this.oldMat);
      this.obj.material = this.oldMat;
      console.log(this.obj.material)
    }

  }

}



exports.MainCanvasRenderer = MainCanvasRenderer;