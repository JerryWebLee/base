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
import { showPoint } from './bodyShowDemo_V1';

const ENTIRE_SCENE = 0, BLOOM_SCENE = 2;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);
const muscleClassNameArr = ['头颈部', '肩颈部', '手臂部', '胸腹部', '腰背部', '腿脚部', '其他'];
class MainCanvasRenderer extends CanvansRenderBase {
  constructor(canvas) {
    super(canvas);


  }

  async run() {
    // loadmodel createffect
    let body = await this.loadFBX('../resource/models/ALL3.FBX');
    this.scene.add(body);
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0.0, 1.0, 3.0);
    this.body = body;
    this.createBloom();
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

    this.animate();
    document.getElementById('loading').className = 'loading-wrapper hide';
  }
  //keep render
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.render();
  }
  //bloom and nomal render 
  render() {
    this.camera.layers.set(BLOOM_SCENE);
    this.bloomComposer.render();
    this.camera.layers.set(ENTIRE_SCENE);
    this.finalComposer.render();
    // this.renderer.render(this.scene, this.camera);
  }
  //control
  initControl() {
    this.click.addEventListener('mousedown', (e) => { });
  }
  //analyze
  bodyEffect() {
    const boxArr = [];
    const skinArr = [];
    const boneArr = [];
    const muscleArr = [];
    this.muscleArr = [];
    this.muscleArr.indexArr = [];
    const showPointArr = [];
    const hurtPointArr = [];
    const hightLightArr = [];
    let index = 0
    this.body.traverse((obj) => {

      let type = obj.name.split('_')[0];

      if (type == 'Box') {
        obj.layers.disable(0);
        boxArr.push(obj);
        return;
      }
      else if (type == 'Skin') {
        skinArr.push(obj);
        return;
      }
      else if (type == 'Skeletal') {
        boneArr.push(obj);
        return;
      }
      else if (obj.name.substr(0, 5) == 'Point') {
        // console.log(obj.name);
        let index = parseInt(obj.name.substr(5, 3));
        showPointArr[index] = obj;
        // console.log(obj.name, index);
        return;
      }
      else if (obj.name.substr(0, 5) == 'point' && obj.name.substr(8, 6) == 'inside') {
        console.log('Point inside');
        console.log(obj.name);
        this.createHurtPoint(obj);
        let index = parseInt(obj.name.substr(5, 3));
        console.log(obj.name, index);
        hurtPointArr[index] = obj;
        return;
      }
      else if (obj.material && obj.material.name == 'Muscular_System') {

        let cName = obj.name.split('_');
        cName = cName[cName.length - 1];
        obj.cName = cName;
        obj.index = obj.name.slice(0, obj.name.length - obj.cName.length - 1);
        if (obj.index.match('A') || obj.index.match('B')) {
          obj.index = obj.index.slice(0, obj.index.length - 2);
        }
        this.initMuscle(obj);
        index += 1;
        return;
      }

    })
    console.log('共有' + index + '块肌肉');
    console.log(this.muscleArr);
    this.initUI();

    // let arr = [];
    // arr['name1'] = 123;

    // console.log(arr.length);
    // console.log(arr.name1)
  }

  createHurtPoint(obj) {
    let oMat = obj.material;
    obj.material = new THREE.MeshBasicMaterial();
    obj.material.map = oMat.map;
    obj.scale.set(obj.scale.x * 0.5, obj.scale.x * 0.5, obj.scale.x * 0.6)
    let bloomObj = obj.clone();
    // console.log(obj);
    bloomObj.scale.set(obj.scale.x * 0.9, obj.scale.x * 0.9, obj.scale.x * 0.9);
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

  initMuscle(obj) {
    // console.log('uuuu', this.muscleArr);
    if (!this.muscleArr[obj.index]) {
      this.muscleArr[obj.index] = new Muscular(obj);
      this.muscleArr.indexArr.push(obj.index);
    } else {
      this.muscleArr[obj.index].addMesh(obj);
    }
    this.muscleArr.push(new Muscular(obj));
    // console.log('tttt', this.muscleArr);
  }

  initUI() {
    console.log(this.muscleArr);
    this.createFirtElement();
    this.createSecondElement();
    console.log(this.uiData);
    this.renderTreeUI(this.uiData);
    this.flag = 0;

  }

  createFirtElement() {
    this.uiData = [];
    for (let i = 0; i < muscleClassNameArr.length; i++) {
      const data = {
        title: muscleClassNameArr[i],
        type: 'firstClass',
        spread: false,
        id: muscleClassNameArr[i],
        // disabled:true,
        children: []
      }
      this.uiData.push(data);

    }
  }


  createSecondElement() {
    // console.log(this.muscleArr);
    let i = 0;

    this.muscleArr.indexArr.forEach((index) => {
      const muscle = this.muscleArr[index];
      // console.log(muscle.obj.cName);
      const data = {
        title: muscle.obj.cName,
        type: 'secondeClass',
        id: i,
        class: muscle.class

      }
      i++;

      this.uiData[muscle.class].children.push(data);
    })


  }


  renderTreeUI(data) {

    const that = this;
    layui.use('tree', function () {
      const tree = layui.tree;
      //渲染
      const inst1 = tree.render({
        elem: '#test1'  //绑定元素
        , data: data,
        showCheckbox: true,
        id: "mainTree",
        // accordion:true,
        click: this.handleElementClick.bind(this),
        oncheck: this.handleElementCheck.bind(this)

      });
      this.uiTree = tree;
      console.log(this.uiTree);
    }.bind(this))
  }

  reloadTreeUI(index, classIndex) {
    if (!this.uiTree) {
      return;
    }
    this.createFirtElement();
    this.createSecondElement();
    for (let i = 0; i < this.uiData.length; i++) {
      this.uiData[i].spread = false;
    }
    this.uiData[classIndex].spread = true;
    this.renderTreeUI(this.uiData);
    this.uiTree.setChecked('mainTree', index);
    console.log('reload')
  }
  /* abandon 
      reloadTreeUI(index,classIndex){
          for(let i=0;i<this.uiData.length;i++){
              this.uiData[i].spread=true;
              console.log(this.uiData[i]);
            
          }
          console.log(this.uiData);
          this.uiTree.reload('mainTree', this.uiData);
          this.uiTree.setChecked('mainTree',index);
  
  
      }
  */
  handleElementClick(obj) {
    console.log(obj);
    // console.log(obj.elem[0].className);
    // if(obj.data.type==='secondeClass'){
    //     if (!this.oldUICkeckedElement){
    //         this.oldUICkeckedElement=obj;
    //         obj.elem[0].className=obj.elem[0].className+' layui-bg-red';
    //     }else if(this.oldUICkeckedElement.data.id==obj.id){
    //         obj.elem[0].className='layui-tree-set';

    //     }else{
    //         this.oldUICkeckedElement.elem[0].className='layui-tree-set';
    //         this.oldUICkeckedElement=obj;
    //         obj.elem[0].className=obj.elem[0].className+' layui-bg-red';

    //     }

    if (obj.data.type === 'secondeClass') {
      this.reloadTreeUI(obj.data.id, obj.data.class);
    }
  }

  handleElementCheck(obj) {

    if (this.flag == 0) {
      this.flag++
      if (obj.data.type === 'secondeClass') {
        this.reloadTreeUI(obj.data.id, obj.data.class);
      }
    }
    else {
      this.flag = 0;
      return
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

class UI {
  constructor() {

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



class Muscular {
  constructor(obj) {
    // console.log(obj.name);
    // console.log(obj.index);
    this.obj = obj;
    this.id = obj.index;
    this.class = parseInt(this.id.split("_")[0]) - 1;
    this.className = muscleClassNameArr[this.className];
    this.index = parseInt(this.id.split("_")[1]);
    // console.log(this.class, this.index);
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