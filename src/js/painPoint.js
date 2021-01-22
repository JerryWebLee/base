import * as THREE from 'three/build/three.module';
import axios from 'axios';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CanvansRenderBase, MyClick } from './utils';
import { nameArr } from './name'

// import { CanvansRenderBase } from './utils'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import * as dat from 'dat.gui'

let painPointShader={
    uniforms: {
    },
    
    vertexShader: [
        // "varying float a;",
        "varying vec3 worldPos;",
        "varying vec3 worldnormal;",
     
        
        "void main() {",
            // "a = 0.5;",
            // "a = dot(normalize(cameraPosition-(modelMatrix*vec4(position, 1.0)).xyz),normal)-0.5;",
            "worldPos = (modelViewMatrix*vec4(position, 1.0)).xyz;",
            "worldnormal = normalMatrix*normal;",
            // "worldnormal = normal;",


            "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
    
        "}"
    
    ].join( "\n" ),
    
    
    fragmentShader: [
        // "varying float a;",
        "varying vec3 worldPos;",
        "varying vec3 worldnormal;",
        "void main() {",
            "float a =-dot(normalize(worldnormal),normalize(worldPos))-0.05;",
            "a = pow(a,5.0);",
            "gl_FragColor = vec4(46.0/255.0,6.0/255.0,1.0/255.0,a);",
        "}"
    
    ].join( "\n" )
}

let billboarShader={
    uniforms: {
    },
    
    vertexShader: [
        "void main() {",

            "vec3 center = vec3(0, 0, 0);",
            "vec3 viewer = (modelMatrix*vec4(cameraPosition, 1.0)).xyz;",
            "vec3 normalDir = viewer - center;",
            "normalDir.y =normalDir.y * 1.0;",
            "normalDir = normalize(normalDir);",
            "vec3 upDir = abs(normalDir.y) > 0.999 ? vec3(0, 0, 1) : vec3(0, 1, 0);",
            "vec3 rightDir = normalize(cross(upDir, normalDir));",
            "upDir = normalize(cross(normalDir, rightDir));",
            "vec3 centerOffs = position - center;",
            "vec3 localPos = center + rightDir * centerOffs.x + upDir * centerOffs.y + normalDir * centerOffs.z;",
            "gl_Position = projectionMatrix * modelViewMatrix * vec4( localPos, 1.0 );",
    
        "}"
    
    ].join( "\n" ),
    fragmentShader: [
        // "varying float a;",

        "void main() {",
            "gl_FragColor = vec4(46.0/255.0,6.0/255.0,1.0/255.0,0.5);",
        "}"
    
    ].join( "\n" )
}
    

const ENTIRE_SCENE = 0, BLOOM_SCENE = 2;


class mainCanvasRenderer extends CanvansRenderBase {
    constructor(canvas) {
        super(canvas);
    }

    async run() {
        let obj = await this.loadFBX('../resource/models/XIAOBI(2).FBX');

        this.createBloom();
        this.scene.add(obj);
        // console.log(obj);
        this.painPointEffect(obj);
        this.camera.position.set(0, 1.4, 2);

        // let obj_billboard=await this.loadFBX('../resource/models/chongzhibianhua.FBX')
        // // obj_billboard=await this.loadGLTF('../resource/models/scene.gltf');
        // // obj_billboard=obj_billboard.scene.children[0];
        // console.log(obj_billboard);
        // this.scene.add(obj_billboard);
        // this.painPointEffect(obj_billboard);


        // let  geometry = new THREE.PlaneGeometry( 1,1, 1 );
        // let  material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
        // let  plane = new THREE.Mesh( geometry, material );
        // this.createBB(plane);
        // this.scene.add( plane );
     
 
        // console.log(this.camera);

        // let sphere= await this.loadObj('../resource/models/QIU.obj');
        // this.scene.add(sphere);
        // sphere.position.set(0,0,0);
        // console.log(sphere);
        // this.createInSideObj(sphere.children[0]);




        // let sphere= await this.loadObj('../resource/models/QIU(1).obj');
        // this.scene.add(sphere);
        // sphere.position.set(-0.5,1.4,0);
        // // console.log(sphere);
        // this.createInSideObj(sphere.children[0]);

        let controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.target.set(0, 1.4, 0);
        controls.update();
        this.controls = controls;
        this.controls.maxDistance = 50;
        this.controls.minDistance = 0;


      

        this.animate();
    }

    animate() {
        this.controls.update();
       
        // this.renderer.render(this.scene, this.camera);
        // console.log(this.bbArr[0].matrix.elements)
        // this.camera.layers.set(BLOOM_SCENE); 
       
       this.render()
      

         
      
        requestAnimationFrame(this.animate.bind(this));
    }

    painPointEffect(obj) {

        let bbArr=[];

        obj.traverse((obj) => {
           
           
            // obj.visible=false;
            if (obj.name.substr(0, 5) === 'point') {
                // console.log(obj.name);
                if (obj.name.substr(6, 6) === 'inside') {
                    // console.log('inside:' + obj.name);
                    // this.createInSideObj(obj);
                    this.createInSideObj(obj);
                }
                else  {
    
                    // this.scene.attach(obj);
                    this.createOutSideObj(obj);
                  
                    // obj.visible = false;
                }
               

            }
            else if(obj.name.substr(0, 5) === 'Plane') {
                // obj.visible = false;
                // console.log(obj);
               
                // this.createBB(obj);
                obj.visible=false;
                // bbArr.push(obj);
            }
        })

    // bbArr.forEach(this.createBB.bind(this))
    // this.bbArr=bbArr;

    // console.log(this.bbArr[0].matrix.elements)
    // console.log(this.bbArr[1])
    }
    createOutSideObj(obj) {
      
        // obj.material=new THREE.ShaderMaterial(painPointShaer);
        obj.material.transparent = true;
        obj.material.opacity = 0.5;
        obj.material.depthWrite = false;
        // obj.material.color.setRGB(1,1,0,);
        obj.visible=false

    }

    createInSideObj(obj) {
        obj=obj.clone();
        console.log(obj);
        obj.scale.set(obj.scale.x*0.9,obj.scale.x*0.9,obj.scale.x*0.9);
     
        this.scene.attach(obj);    

        obj.material=new THREE.MeshBasicMaterial();
        obj.material.color.setRGB(0.5,0,0);
        // obj.material=obj.material.clone();
        // obj.material.color.setRGB(1,0,0,);
        // obj.layers.enable(ENTIRE_SCENE);
        obj.layers.enable(BLOOM_SCENE);
        // obj.layers.set(1);
        // obj.visible=true;
       
    }


    createBB(obj){
        this.scene.attach(obj);
        obj.rotation.set(0,0,0);
        obj.scale.set(1,1,1);
        obj.updateMatrix ();
        let bbShader=new THREE.ShaderMaterial(billboarShader);
        obj.material=bbShader;

    }

    createBloom(){
      
        const bloomLayer = new THREE.Layers();
        bloomLayer.set( BLOOM_SCENE );
        
        const params = {
            exposure: 1,
            bloomStrength: 5,
            bloomThreshold: 0,
            bloomRadius: 0,
            scene: "Scene with Glow"
        };

        const renderScene = new RenderPass( this.scene, this.camera );

        const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
        bloomPass.threshold = params.bloomThreshold;
        bloomPass.strength = params.bloomStrength;
        bloomPass.radius = params.bloomRadius;

        const bloomComposer = new EffectComposer( this.renderer );
        bloomComposer.renderToScreen = false;
        bloomComposer.addPass( renderScene );
        bloomComposer.addPass( bloomPass );

        const finalPass = new ShaderPass(
            new THREE.ShaderMaterial( {
                uniforms: {
                    baseTexture: { value: null },
                    bloomTexture: { value: bloomComposer.renderTarget2.texture }
                },
                vertexShader: document.getElementById( 'vertexshader' ).textContent,
                fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
                defines: {}
            } ), "baseTexture"
        );
        finalPass.needsSwap = true;

        const finalComposer = new EffectComposer( this.renderer );
        finalComposer.addPass( renderScene );
        finalComposer.addPass( finalPass );

        const gui = new dat.GUI();
        let that=this;
        gui.add( params, 'scene', [ 'Scene with Glow', 'Glow only', 'Scene only' ] ).onChange( function ( value ) {

            switch ( value ) 	{

                case 'Scene with Glow':
                    bloomComposer.renderToScreen = false;
                    break;
                case 'Glow only':
                    bloomComposer.renderToScreen = true;
                    break;
                case 'Scene only':
                    // nothing to do
                    break;

            }   
          

            that.render();

        } );

        const folder = gui.addFolder( 'Bloom Parameters' );

        folder.add( params, 'exposure', 0.1, 2 ).onChange( function ( value ) {

         
            that.renderer.toneMappingExposure = Math.pow( value, 4.0 );
            that.render();

        } );

        folder.add( params, 'bloomThreshold', 0.0, 1.0 ).onChange( function ( value ) {

            bloomPass.threshold = Number( value );
            that.render();

        } );

        folder.add( params, 'bloomStrength', 0.0, 10.0 ).onChange( function ( value ) {

            bloomPass.strength = Number( value );
            that.render();

        } );

        folder.add( params, 'bloomRadius', 0.0, 1.0 ).step( 0.01 ).onChange( function ( value ) {

            bloomPass.radius = Number( value );
            that.render();

        } );






        this.bloomComposer=bloomComposer;
        this.finalComposer=finalComposer;
        // this.camera.layers.enable(BLOOM_SCENE);

    }

    render(){
        this.camera.layers.set(BLOOM_SCENE);  
        this.bloomComposer.render();
        this.camera.layers.set(ENTIRE_SCENE);  
        this.finalComposer.render();
        
    }


    darkenNonBloomed( obj ) {

        if ( obj.isMesh && bloomLayer.test( obj.layers ) === false ) {

            materials[ obj.uuid ] = obj.material;
            obj.material = darkMaterial;

        }

    }
     restoreMaterial( obj ) {

        if ( materials[ obj.uuid ] ) {

            obj.material = materials[ obj.uuid ];
            delete materials[ obj.uuid ];

        }

    }

}


exports.mainCanvasRenderer = mainCanvasRenderer;