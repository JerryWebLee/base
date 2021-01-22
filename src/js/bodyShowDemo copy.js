import * as THREE from 'three/build/three.module';
import axios from 'axios';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CanvansRenderBase, MyClick } from './utils';
import { nameArr } from './name'
import { Material } from 'three';
// import { CanvansRenderBase } from './utils'

class mainCanvasRenderer extends CanvansRenderBase {
    constructor(canvas) {
        super(canvas);

    }

    async run() {

        let body = await this.loadFBX('../resource/models/ALL.FBX');

        // let body = await this.loadObj('../resource/models/body.obj');
        // console.log(body)
        this.scene.add(body);
        var axisHelper = new THREE.AxisHelper(10);
        this.scene.add(axisHelper);
        this.camera.far = 1000;
        this.camera.updateProjectionMatrix();
        this.camera.position.set(0, 1.4, 1.2);
        this.body = body;
        this.bodyEffect();



        let controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.target.set(0, 1.4, 0);
        controls.update();
        this.controls = controls;
        this.controls.maxDistance = 5;
        this.controls.minDistance = 0;
        this.createMouseEvent();
        this.animate();
        document.getElementById('loading').className = 'loading-wrapper hide';
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        this.controls.update();
        if (this.currentShowPoint != null){
            console.log(this.currentShowPoint.obj);
            if (this.currentShowPoint.obj.children[0].scale.x > 0.1){
                this.currentShowPoint.obj.children[0].scale.x *= 0.9;
                this.currentShowPoint.obj.children[0].scale.y *= 0.9;
                this.currentShowPoint.obj.children[0].scale.z *= 0.9;
            }
                

        }
        

        // this.showPointsTest();
        
        this.renderer.render(this.scene, this.camera);
    }

    bodyEffect() {

        let skinArr = [];
        let boneArr = [];
        let muscleArr = {};
        let showPointArr = [];
        let allObjArr_byName = [];
        let allObjArr = [];
        let boxArr = [];

        this.body.traverse((obj) => {
            // console.log(obj.name);
            if (obj.name.substr(0,5) == "Point"){
                // console.log("push point"+obj.name);
                let point = new showPoint_base(obj, this.canvas, this.camera, this,  '../resource/point5.png');
                showPointArr.push(point);
            }
            else{
                if (obj.name && obj.material){
                    allObjArr_byName[obj.name] = obj;
                    allObjArr.push(obj);
                }
                if (obj.name.substr(0,3) == "Box"){
                    boxArr.push(obj);
                    // console.log("box "+obj.children[0].name + ": " + obj.children[0].children[0].name);
                    // obj.material.transparent = true;
                    // obj.material.opacity = 0;
                }
                if (obj.name.substr(0,4) == "Skin"){
                    // console.log("push skin: "+obj.name);
                    skinArr.push(obj);
                }
                if (obj.name.substr(0,8) == "Skeletal"){
                    boneArr.push(obj);
                }
                if (obj.material && obj.material.name == "Muscular_System"){
                    let name = obj.name;
                    let _pos = name.lastIndexOf('_');
                    muscleArr[name.substring(0, _pos)] = obj;
                }
            }



        })


        // muscleArr[0].material.bumpMap = null;
        // muscleArr[0].material.side = 2;

        // console.log(skinArr);
        console.log(muscleArr);
        // console.log(showPointArr);
        // console.log(allObjArr);

        this.boxArr = boxArr;
        this.skinArr = skinArr;
        this.muscleArr = muscleArr;
        this.showPointArr = showPointArr;
        this.currentShowPoint = null;
        this.allObjArr_byName = allObjArr_byName;
        this.allObjArr = allObjArr;
        // this.highLightToogle = new highLightToogle(allObjArr);
        this.highLightToogle = new highLightToogle(Object.values(muscleArr));
        this.transparentManager = new transparentManager(muscleArr);
        for (var point in this.showPointArr) {
            showPointArr[point].transparentManager = this.transparentManager;
        }
        this.hideArr = [];

        let cancelButton = document.getElementById('cancelButton');
        let restartButton = document.getElementById('restartButton');
        // this.showPointsTest();
        this.showPoints_HideAll();
        cancelButton.addEventListener('click', this.cancelClick.bind(this));
        restartButton.addEventListener('click', this.restartClick.bind(this));

    }

    createMouseEvent() {

        let canvasClick = new MyClick(this.canvas);
        this.canvas.addEventListener('dblclick', this.onMouseClick.bind(this));
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUP.bind(this));
        this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this));

    }


    onMouseMove(e) {
        // console.log(111);
        let hit_skin = this.rayTest(e, this.skinArr);
        if (!hit_skin){
            let raycaster = new THREE.Raycaster();
            let mouse = new THREE.Vector2();
            mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
	        mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
            raycaster.setFromCamera( mouse, this.camera );
            let boxes = raycaster.intersectObjects(e, this.boxArr);
            var objects_in_boxes = [];
            if (boxes){
                // console.log("move upon box");
                // console.log(boxes)
                for (var i=0; i<boxes.length; i++){
                    objects_in_boxes.push.apply(objects_in_boxes, boxes[i].children[0].children);
                }
            }
            let obj = this.rayTest(e, objects_in_boxes);
            if (!obj){
                obj = this.rayTest(e, Object.values(this.muscleArr));
            }
            if (obj && obj.material && obj.material.name == "Muscular_System"){
                if (obj.material.opacity != 1){ // 目前是透明的

                }
                else{
                    this.highLightToogle.toogle(obj.name);
                }                
                document.getElementById("tip").innerText = obj.name;
                document.getElementById("tipbox").style.left = (parseInt(e.clientX)+10)+"px";
                document.getElementById("tipbox").style.top = (parseInt(e.clientY)+10)+"px";
            }
            else{
                this.highLightToogle.unLightAll();
            }

        }
        else{
            this.dragChange = true
            // this.showPoints_HideAll();
            document.getElementById("tip").innerText = "";
        }
        
        // let obj = this.rayTest(e, this.muscleArr);
        // if (obj) {
        //     this.highLightToogle.toogle(obj.name);
        //     document.getElementById("tip").innerText = obj.name;
        //     document.getElementById("tipbox").style.top = e.clientX;
        //     document.getElementById("tipbox").style.left = e.clientY;
        // }
        // else {
        //     this.highLightToogle.unLightAll();
        // }


        if (this.mouseDown) {
            // console.log('drag');
            this.dragChange = true
            this.showPoints_HideAll();
            document.getElementById("tip").innerText = "";
        }
    }

    onMouseDown(e) {
        // console.log('start drag')
        this.mouseDown = true
        this.dragChange = false

    }

    onMouseUP(e) {
        // console.log('end  drag')
        this.mouseDown = false
        if (this.dragChange) {
            this.showPointsTest();

        }

    }

    onMouseWheel(e) {
        // console.log('my whell handle')

        this.showPointsTest();

    }

    onMouseClick(e) {
        // console.log('on click');
        let obj = this.rayTest(e, this.skinArr);
        if (obj){ // 首先检测是否点击了皮肤，因为皮肤是最外层的
            this.hideObject(obj);
        }
        else{
            let raycaster = new THREE.Raycaster();
            let mouse = new THREE.Vector2();
            mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
	        mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
            raycaster.setFromCamera( mouse, this.camera );
            let boxes = raycaster.intersectObjects(e, this.boxArr);
            var objects_in_boxes = [];
            if (boxes){
                for (var i=0; i<boxes.length; i++){
                    objects_in_boxes.push.apply(objects_in_boxes, boxes[i].children[0].children);
                }
            }
            obj = this.rayTest(e, objects_in_boxes);
            if (!obj){
                obj = this.rayTest(e, Object.values(this.muscleArr));
            }
            if (obj && obj.material && obj.material.name == "Muscular_System"){
                this.hideObject(obj);
                document.getElementById('name').innerText = obj.name;
            }
        }

        // let boxes = this.rayTest(e, this.boxArr);
        // var objects_in_boxes = [];
        // boxes.forEach((box_obj) => {
        //     objects_in_boxes.push.apply(objects_in_boxes, box_obj.children[0].children);
        // })
        // obj = this.rayTest(e, objects_in_boxes);
        // if (obj) {
        //     if (obj.name.substr(0,4) == "Skin" || obj.name.substr(0,8) == "Skeletal"){
        //         console.log("click " + obj.name);
        //         this.hideObject(obj);
        //     }
        //     if (obj && obj.material && obj.material.name == "Muscular_System"){
        //         this.hideObject(obj);
        //         document.getElementById('name').innerText = obj.name;
        //     }
        // }
        

        // let obj = this.rayTest(e, this.allObjArr);
        // if (obj) {
        //     if (obj.name.substr(0,4) == "Skin" || obj.name.substr(0,8) == "Skeletal"){
        //         console.log("click " + obj.name);
        //         this.hideObject(obj);
        //     }
        //     if (obj.name.substr(0,3) == "Box"){
        //         console.log("click box: " + obj.name);
        //         let box_obj = obj;
        //         obj = this.rayTest(e, box_obj.children[0].children);
        //         if (obj){
        //             console.log("click " + obj.name);
        //             this.hideObject(obj);
        //         }
        //     }
        //     if (obj && obj.material && obj.material.name == "Muscular_System"){
        //         this.hideObject(obj);
        //         document.getElementById('name').innerText = obj.name;
        //     }
            
        //     // obj.visible = false;

        //     // if (obj.showPoint) {
        //     //     console.log("show point "+obj.showPoint);
        //     //     obj.showPoint.visible = false;
        //     //     obj.showPoint.hide();

        //     // }
        //     // this.hideArr.push(obj);
        //     // this.showPointsTest();
        // }

        if (document.getElementById('testVideo')) {
            let video = document.getElementById('testVideo');
            video.pause();
            video.hidden = true;
        }

    }

    hideObject(obj){
        obj.visible = false;
        if (obj.showPoint) {
            console.log("show point "+obj.showPoint);
            obj.showPoint.visible = false;
            obj.showPoint.hide();
        }
        this.hideArr.push(obj);
        this.showPointsTest();
    }

    showPointsTest() {

        this.showPointArr.forEach((point) => {

            if (this.showPointVisibleTest(point.obj)) {
                // console.log(1111)
                point.show();
            }
            else {
                // console.log(222) 
                point.hide();
            }
            point.updataImagePos()
        })
    }

    showPointVisibleTest(obj) {
        let v = obj.getWorldPosition(new THREE.Vector3(0, 0, 0));
        v.sub(this.camera.position);
        let length = v.length();
        v = v.normalize();
        let raycaster = new THREE.Raycaster(this.camera.position, v, 0, length);
        let intersects = raycaster.intersectObjects(this.boxArr);
        if (intersects.length > 0) {
            console.log(intersects[0]['object'].name);
            let hit_box = intersects[0]['object'];
            let intersect_objects = raycaster.intersectObjects(hit_box.children[0].children);
            if (intersect_objects.length > 0){
                return false;
            }
            else {
                return true;
            }
        }
        else {
            return true;
        }

    }

    showPoints_HideAll() {
        this.showPointArr.forEach((point) => {
            point.hide();
        })
    }

    cancelClick() {
        if (this.hideArr.length > 0) {
            let obj = this.hideArr.pop();
            obj.visible = true;
            if (obj.showPoint) {
                obj.showPoint.visible = true;
                obj.showPoint.show();
            }
        }



    }

    restartClick() {
        while (this.hideArr.length > 0) {
            let obj = this.hideArr.pop();
            obj.visible = true;
            if (obj.showPoint) {
                obj.showPoint.visible = true;
                obj.showPoint.show();
            }
        }
    }


}




class highLightToogle {
    constructor(arr) {
        // let highLightMat = new THREE.MeshBasicMaterial();
        // let highLightMat =arr[0].material.clone();
        // highLightMat.color=new THREE.Color(0xaaaaaa);
        // highLightMat.wireframe=true

        // make sure obj has mat
        let elementArr = []
        let highLightMatArr = []
        let highLightMat;
        // console.log(arr);
        for (let i = 0; i < arr.length; i++) {
            // console.log("highlight arr: "+arr[i].name);
            if (arr[i].material.length) {
                // console.log(arr[i])
                if (!highLightMatArr[arr[i].material[0].name]) {
                    highLightMat = [];
                    let mat = arr[i].material[0].clone();
                    mat.color = new THREE.Color(0xff5555);
                    console.log(highLightMat.push);
                    highLightMat.push(mat);
                    mat = arr[i].material[1].clone();
                    mat.color = new THREE.Color(0xff5555);
                    highLightMat.push(mat);
                    highLightMatArr[arr[i].material[0].name] = highLightMat;

                }

                highLightMat = highLightMatArr[arr[i].material[0].name];

            }

            else {


                if (!highLightMatArr[arr[i].material.name]) {
                    highLightMat = arr[i].material.clone();
                    highLightMat.color = new THREE.Color(0xff5555);
                    highLightMatArr[arr[i].material.name] = highLightMat;
                }
                highLightMat = highLightMatArr[arr[i].material.name];

            }

            let element = new highLightToogleElement(arr[i], highLightMat);
            // console.log(arr[i].name)
            elementArr[arr[i].name] = element;
            arr[i].highLightManager = this;
        }
        this.elementArr = elementArr;


    }

    toogle(name) {
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
        this.obj = obj
        this.oldMat = obj.material;
        // highLightMat =obj.material.clone();
        // highLightMat.color=new THREE.Color(0xff5555);
        this.highLightMat = highLightMat

    }
    highLight() {

        this.obj.material = this.highLightMat

    }
    unLight() {
        this.obj.material = this.oldMat
    }

}

class showPoint {
    constructor(obj, canvas, camera, videoUrl = '../resource/p1.mp4') {
        console.log(obj)
        let main = document.body;
        let image = new Image()
        main.appendChild(image);
        image.src = '../resource/point.png';
        image.style.position = 'absolute';
        image.style.zIndex = '2';
        // image.style.left=10+'px';
        // image.style.top=10+'px';
        this.image = image;
        image.width = 75;
        image.height = 75;

        image.addEventListener('mouseover', function () {
            image.width = 150
            image.height = 150
        })
        image.addEventListener('mouseout', function () {
            image.width = 75
            image.height = 75
        })
        image.addEventListener('click', function () {
            let video = document.getElementById('testVideo')
            if (!video) {

                video = document.createElement('video');
                document.body.append(video);
                video.id = 'testVideo';
                video.style.zIndex = '5'
                video.style.position = 'absolute'
                video.style.width = '500px'
                video.style.height = '500px'
                video.controls = true



                video.oncanplay = function () {

                    let main = document.getElementById('canvasGroup');

                    video.style.width = video.videoWidth + 'px'
                    video.style.height = video.videoHeight + 'px'
                    video.style.left = (main.offsetWidth - video.videoWidth) / 2 + 'px'
                    video.style.top = (main.offsetHeight - video.videoHeight) / 2 + 'px'
                }




            }
            video.src = videoUrl;
            video.load();
            video.play();
            video.hidden = false
        })


        this.obj = obj;
        this.parent = obj.parent;

        this.canvas = canvas;
        this.camera = camera;
        this.updataImagePos();
        this.parent.showPoint = this;
        this.visible = true;



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

    //check visable

    //show in h5 element

    // hide

    // meshparent

}

class transparentManager{
    constructor(muscleArr){
        this.muscleArr = muscleArr;
        // this.transparentMat = Object.values(muscleArr)[0].material.clone();
        // this.oldMat = Object.values(muscleArr)[0].material.clone();
        this.transparentMat = [];
        this.oldMat = [];
        // this.transparentMat.transparent = true;
        // this.transparentMat.opacity = 0.5;
        this.transparentArr = [];
    }
    setTransparent(indexArr){
        this.transparentMat = Object.values(this.muscleArr)[0].material.clone();
        this.oldMat = Object.values(this.muscleArr)[0].material.clone();
        this.transparentMat.transparent = true;
        this.transparentMat.opacity = 0.5;
        console.log(indexArr)
        for (var i=0; i<indexArr.length; i++){
            this.transparentArr.push(indexArr[i]);
            console.log(indexArr[i])
            console.log(this.muscleArr[indexArr[i]])
            this.muscleArr[indexArr[i]].material = this.transparentMat;
            
        }
    }
    unTransparentAll(){
        for (var i=0; i<this.transparentArr.length; i++){
            this.muscleArr[this.transparentArr[i]].material = this.oldMat;
        }
    }
}

class showPoint_base {
    constructor(obj, canvas, camera, body, iconUrl = '../resource/point.png', baseSize = [15, 15], bigSize = [20, 20]) {
        let main = document.body;
        let image = new Image();
        main.appendChild(image);
        image.src = iconUrl;
        image.style.position = 'absolute';
        image.style.zIndex = '2';
        this.baseSize = baseSize;
        this.bigSize = bigSize
        this.body = body

        this.image = image;
        this.image.width = this.baseSize[0];
        this.image.height = this.baseSize[1];
        this.obj = obj;

        this.parent = obj.parent;
       
        this.canvas = canvas;
        this.camera = camera;
        this.updataImagePos();
        this.parent.showPoint = this;
        this.visible = true;

        let nameSplitArr = obj.name.split('_');
        this.groupIndex = (parseInt(nameSplitArr[0]) - 1);
        this.partIndex = (parseInt(nameSplitArr[1]) - 1);
        // this.chinesName = nameArr[this.groupIndex][this.partIndex];
        this.chinesName = obj.name;
        // console.log(obj.children[0].name);
        this.adjMuscleIndex = obj.children[0].name.split('*');
        this.adjMuscleIndex.shift();
        this.transparentManager = new transparentManager();
        this.creatEvent();
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
    creatEvent(e) {
        this.image.addEventListener('mouseover', this.onMouseOver.bind(this));
        this.image.addEventListener('mouseout', this.onMouseOut.bind(this));
        this.image.addEventListener('click', this.onClick.bind(this));
        this.image.addEventListener('dblclick', this.onDblClick.bind(this));

    }
    onMouseOver(e) {

        this.image.width = this.bigSize[0];
        this.image.height = this.bigSize[1];
        console.log(this.obj.name);
        document.getElementById('name').innerText=this.chinesName;
        this.transparentManager.setTransparent(this.adjMuscleIndex);

    }
    onMouseOut(e) {

        this.image.width = this.baseSize[0];
        this.image.height = this.baseSize[1];


    }
    onClick(e) {
        console.log("click")
        this.body.currentShowPoint = this;
        // TODO:摄像机视角移到点处
        // console.log(this.camera.position);

        // let v1 = this.obj.localToWorld(new THREE.Vector3(0, 0, 0));
        // console.log(v1);
        // let v2 = this.camera.position.sub(v1);
        // console.log(v2);
        // this.camera.position.set(v1.x, v1.y, v1.z+1);
        // // this.camera.lookAt(v1);
        // console.log(this.camera.position);

        
    }
    onDblClick(e){
        console.log("dbclick")
    }


}


exports.mainCanvasRenderer = mainCanvasRenderer;